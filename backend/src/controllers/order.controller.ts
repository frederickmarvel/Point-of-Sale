import { Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import prisma from '../utils/prisma.util';
import { successResponse, errorResponse } from '../utils/response.util';

export type OrderStatus = 'PENDING' | 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

const VALID_STATUSES: OrderStatus[] = ['PENDING', 'PAID', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CANCELLED'],
  PAID: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

export const placeOrderValidation = [
  body('tableId').isUUID().withMessage('Valid tableId is required'),
  body('customerName').optional().trim(),
  body('customerNote').optional().trim(),
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  body('items.*.menuItemId').isUUID().withMessage('Valid menuItemId is required for each item'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1 for each item'),
  body('items.*.notes').optional().trim(),
];

export const updateOrderStatusValidation = [
  param('id').isUUID().withMessage('Invalid order ID'),
  body('status')
    .isIn(VALID_STATUSES)
    .withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
];

export async function listOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const status = req.query['status'] as string | undefined;
    const tableId = req.query['tableId'] as string | undefined;
    const date = req.query['date'] as string | undefined;

    const page = Math.max(1, parseInt(req.query['page'] as string ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(req.query['limit'] as string ?? '20', 10)));

    const where: Record<string, unknown> = {};
    if (status && VALID_STATUSES.includes(status as OrderStatus)) {
      where['status'] = status;
    }
    if (tableId) where['tableId'] = tableId;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      where['createdAt'] = { gte: start, lte: end };
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          table: { select: { id: true, number: true, name: true } },
          orderItems: {
            include: { menuItem: { select: { id: true, name: true } } },
          },
          payment: { select: { id: true, status: true, method: true, gateway: true, paidAt: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    res.json(
      successResponse('Orders retrieved', orders, {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params['id']);
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        table: { select: { id: true, number: true, name: true } },
        orderItems: {
          include: { menuItem: { select: { id: true, name: true, imageUrl: true } } },
        },
        payment: true,
      },
    });
    if (!order) {
      res.status(404).json(errorResponse('Order not found'));
      return;
    }
    res.json(successResponse('Order retrieved', order));
  } catch (err) {
    next(err);
  }
}

export async function placeOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { tableId, customerName, customerNote, items } = req.body as {
      tableId: string;
      customerName?: string;
      customerNote?: string;
      items: Array<{ menuItemId: string; quantity: number; notes?: string }>;
    };

    // Validate table exists and is active
    const table = await prisma.table.findFirst({ where: { id: tableId, isActive: true } });
    if (!table) {
      res.status(404).json(errorResponse('Table not found or inactive'));
      return;
    }

    // Validate all menu items exist and are available
    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, isAvailable: true },
    });

    if (menuItems.length !== menuItemIds.length) {
      const foundIds = menuItems.map((m) => m.id);
      const missing = menuItemIds.filter((id) => !foundIds.includes(id));
      res.status(400).json(
        errorResponse('Some menu items are not available', missing.map((id) => `Item ${id} not found or unavailable`)),
      );
      return;
    }

    const menuItemMap = new Map(menuItems.map((m) => [m.id, m]));

    // Calculate totals
    const orderItemsData = items.map((item) => {
      const menuItem = menuItemMap.get(item.menuItemId)!;
      const subtotal = menuItem.price * item.quantity;
      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        subtotal,
        notes: item.notes,
      };
    });

    const totalAmount = orderItemsData.reduce((sum, item) => sum + item.subtotal, 0);

    const order = await prisma.order.create({
      data: {
        tableId,
        customerName,
        customerNote,
        totalAmount,
        orderItems: { create: orderItemsData },
      },
      include: {
        table: { select: { id: true, number: true, name: true } },
        orderItems: {
          include: { menuItem: { select: { id: true, name: true, price: true } } },
        },
      },
    });

    res.status(201).json(successResponse('Order placed successfully', order));
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params['id']);
    const { status } = req.body as { status: OrderStatus };

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      res.status(404).json(errorResponse('Order not found'));
      return;
    }

    const currentStatus = order.status as OrderStatus;
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus];

    if (!allowedTransitions.includes(status)) {
      res.status(400).json(
        errorResponse(
          `Cannot transition order from ${currentStatus} to ${status}. Allowed: ${allowedTransitions.join(', ') || 'none'}`,
        ),
      );
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        table: { select: { id: true, number: true, name: true } },
        orderItems: {
          include: { menuItem: { select: { id: true, name: true } } },
        },
        payment: { select: { id: true, status: true, method: true } },
      },
    });

    res.json(successResponse('Order status updated', updatedOrder));
  } catch (err) {
    next(err);
  }
}

export async function cancelOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params['id']);
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      res.status(404).json(errorResponse('Order not found'));
      return;
    }

    if (!['PENDING', 'PAID', 'PREPARING'].includes(order.status)) {
      res.status(400).json(
        errorResponse(`Cannot cancel order with status ${order.status}`),
      );
      return;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    res.json(successResponse('Order cancelled', updated));
  } catch (err) {
    next(err);
  }
}

export async function getOrderStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalToday, revenueToday, byStatus, topItems] = await Promise.all([
      prisma.order.count({
        where: {
          createdAt: { gte: today, lt: tomorrow },
          status: { not: 'CANCELLED' },
        },
      }),
      prisma.order.aggregate({
        where: {
          createdAt: { gte: today, lt: tomorrow },
          status: { in: ['PAID', 'PREPARING', 'READY', 'COMPLETED'] },
        },
        _sum: { totalAmount: true },
      }),
      prisma.order.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { createdAt: { gte: today, lt: tomorrow } },
      }),
      prisma.orderItem.groupBy({
        by: ['menuItemId'],
        _sum: { quantity: true },
        where: { order: { createdAt: { gte: today, lt: tomorrow }, status: { not: 'CANCELLED' } } },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    // Enrich top items with names
    const topItemsEnriched = await Promise.all(
      topItems.map(async (item) => {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
          select: { name: true },
        });
        return { ...item, name: menuItem?.name ?? 'Unknown' };
      }),
    );

    res.json(
      successResponse('Order statistics', {
        today: {
          totalOrders: totalToday,
          revenue: revenueToday._sum.totalAmount ?? 0,
          byStatus: byStatus.reduce(
            (acc, s) => ({ ...acc, [s.status]: s._count.status }),
            {} as Record<string, number>,
          ),
        },
        topItems: topItemsEnriched,
      }),
    );
  } catch (err) {
    next(err);
  }
}

export { query };
