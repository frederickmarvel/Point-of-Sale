import { Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import crypto from 'crypto';
import prisma from '../utils/prisma.util';
import { getPaymentGateway } from '../services/payment.service';
import { successResponse, errorResponse } from '../utils/response.util';
import logger from '../utils/logger.util';

export const createPaymentValidation = [
  param('orderId').isUUID().withMessage('Invalid order ID'),
  body('method')
    .isIn(['QRIS', 'VIRTUAL_ACCOUNT'])
    .withMessage('Method must be QRIS or VIRTUAL_ACCOUNT'),
  body('gateway')
    .optional()
    .isIn(['XENDIT', 'DURIANPAY'])
    .withMessage('Gateway must be XENDIT or DURIANPAY'),
  body('bankCode')
    .if(body('method').equals('VIRTUAL_ACCOUNT'))
    .notEmpty()
    .withMessage('bankCode is required for VIRTUAL_ACCOUNT payments'),
];

export async function createPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = String(req.params['orderId']);
    const { method, gateway, bankCode, customerEmail } = req.body as {
      method: 'QRIS' | 'VIRTUAL_ACCOUNT';
      gateway?: string;
      bankCode?: string;
      customerEmail?: string;
    };

    // Fetch the order with table info
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { table: { select: { number: true, name: true } } },
    });

    if (!order) {
      res.status(404).json(errorResponse('Order not found'));
      return;
    }

    if (order.status !== 'PENDING') {
      res.status(400).json(
        errorResponse(`Cannot create payment for order with status ${order.status}`),
      );
      return;
    }

    // Check if payment already exists
    const existingPayment = await prisma.payment.findUnique({ where: { orderId } });
    if (existingPayment && existingPayment.status === 'PENDING') {
      res.json(successResponse('Payment already exists', existingPayment));
      return;
    }

    // Create payment via gateway
    const gatewayService = getPaymentGateway(gateway);
    const tableNumber = (order as typeof order & { table: { number: number } }).table.number;
    const description = `Order #${order.id.slice(0, 8)} - Table ${tableNumber}`;

    let result;
    if (method === 'QRIS') {
      result = await gatewayService.createQrisPayment({
        orderId: order.id,
        amount: order.totalAmount,
        customerName: order.customerName ?? undefined,
        description,
      });
    } else {
      result = await gatewayService.createVirtualAccountPayment({
        orderId: order.id,
        amount: order.totalAmount,
        customerName: order.customerName ?? undefined,
        customerEmail,
        description,
        bankCode: bankCode!,
      });
    }

    const gatewayName = (gateway ?? process.env['DEFAULT_PAYMENT_GATEWAY'] ?? 'XENDIT').toUpperCase();

    const payment = await prisma.payment.create({
      data: {
        orderId,
        gateway: gatewayName,
        method,
        externalId: result.externalId,
        gatewayPaymentId: result.gatewayPaymentId,
        status: 'PENDING',
        amount: order.totalAmount,
        paymentUrl: result.paymentUrl,
        qrString: result.qrString,
        expiredAt: result.expiredAt,
        rawResponse: result.rawResponse,
      },
    });

    res.status(201).json(successResponse('Payment created', payment));
  } catch (err) {
    next(err);
  }
}

export async function getPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = String(req.params['orderId']);
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
            table: { select: { number: true, name: true } },
          },
        },
      },
    });
    if (!payment) {
      res.status(404).json(errorResponse('Payment not found for this order'));
      return;
    }
    res.json(successResponse('Payment retrieved', payment));
  } catch (err) {
    next(err);
  }
}

export async function checkPaymentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const orderId = String(req.params['orderId']);
    const payment = await prisma.payment.findUnique({ where: { orderId } });
    if (!payment) {
      res.status(404).json(errorResponse('Payment not found'));
      return;
    }

    if (payment.status !== 'PENDING') {
      res.json(successResponse('Payment status', { status: payment.status, paidAt: payment.paidAt }));
      return;
    }

    // Check if expired
    if (payment.expiredAt && new Date() > payment.expiredAt) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'EXPIRED' } });
      res.json(successResponse('Payment status', { status: 'EXPIRED' }));
      return;
    }

    // Poll gateway for status
    try {
      const gatewayService = getPaymentGateway(payment.gateway);
      const statusResult = await gatewayService.getPaymentStatus(payment.externalId);

      if (statusResult.status !== payment.status) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: statusResult.status,
            paidAt: statusResult.paidAt,
            rawResponse: statusResult.rawResponse,
          },
        });

        // If paid, update order status
        if (statusResult.status === 'PAID') {
          await prisma.order.update({
            where: { id: orderId },
            data: { status: 'PAID' },
          });
        }
      }

      res.json(
        successResponse('Payment status', {
          status: statusResult.status,
          paidAt: statusResult.paidAt,
        }),
      );
    } catch (pollErr) {
      logger.warn('Failed to poll payment status from gateway', {
        error: (pollErr as Error).message,
        paymentId: payment.id,
      });
      res.json(successResponse('Payment status', { status: payment.status }));
    }
  } catch (err) {
    next(err);
  }
}

// ─── Xendit Webhook ──────────────────────────────────────────────────────────

export async function xenditWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const webhookToken = process.env['XENDIT_WEBHOOK_TOKEN'];
    const callbackToken = req.headers['x-callback-token'];

    if (webhookToken && callbackToken !== webhookToken) {
      logger.warn('Xendit webhook token mismatch');
      res.status(401).json(errorResponse('Unauthorized webhook'));
      return;
    }

    const event = req.body as {
      event?: string;
      data?: {
        reference_id?: string;
        status?: string;
        created?: string;
      };
      external_id?: string;
      status?: string;
    };

    logger.info('Xendit webhook received', { event: event.event ?? 'unknown' });

    // Handle QR code payment
    const externalId = event.data?.reference_id ?? event.external_id;
    const status = event.data?.status ?? event.status;

    if (!externalId || !status) {
      res.json({ received: true });
      return;
    }

    await handlePaymentWebhook(externalId, status, 'XENDIT', JSON.stringify(req.body));
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

// ─── Durianpay Webhook ───────────────────────────────────────────────────────

export async function durianpayWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Verify Durianpay signature
    const webhookSecret = process.env['DURIANPAY_SECRET_KEY'];
    const signature = req.headers['durianpay-signature'] as string | undefined;

    if (webhookSecret && signature) {
      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(JSON.stringify(req.body) as string);
      const expectedSignature = hmac.digest('hex');
      if (signature !== expectedSignature) {
        logger.warn('Durianpay signature mismatch');
        res.status(401).json(errorResponse('Unauthorized webhook'));
        return;
      }
    }

    const event = req.body as {
      event?: string;
      data?: {
        order_ref_id?: string;
        status?: string;
      };
    };

    logger.info('Durianpay webhook received', { event: event.event ?? 'unknown' });

    const externalId = event.data?.order_ref_id;
    const status = event.data?.status;

    if (!externalId || !status) {
      res.json({ received: true });
      return;
    }

    await handlePaymentWebhook(externalId, status, 'DURIANPAY', JSON.stringify(req.body));
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
}

async function handlePaymentWebhook(
  externalId: string,
  status: string,
  gateway: string,
  rawResponse: string,
): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { externalId } });
  if (!payment) {
    logger.warn('Webhook received for unknown payment', { externalId, gateway });
    return;
  }

  const lowerStatus = status.toLowerCase();
  let newStatus: string;
  if (['completed', 'paid', 'settlement', 'succeeded'].includes(lowerStatus)) {
    newStatus = 'PAID';
  } else if (['failed', 'cancelled', 'voided'].includes(lowerStatus)) {
    newStatus = 'FAILED';
  } else if (['expired'].includes(lowerStatus)) {
    newStatus = 'EXPIRED';
  } else {
    newStatus = 'PENDING';
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: newStatus,
      paidAt: newStatus === 'PAID' ? new Date() : undefined,
      rawResponse,
    },
  });

  if (newStatus === 'PAID') {
    await prisma.order.update({
      where: { id: payment.orderId },
      data: { status: 'PAID' },
    });
    logger.info('Order marked as PAID via webhook', { orderId: payment.orderId });
  }
}
