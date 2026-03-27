import { Router } from 'express';
import {
  createPayment,
  getPayment,
  checkPaymentStatus,
  createPaymentValidation,
  xenditWebhook,
  durianpayWebhook,
} from '../controllers/payment.controller';
import { validate } from '../middleware/error.middleware';
import { param } from 'express-validator';

const router = Router();

// ── Public (Customer) ─────────────────────────────────────────────────────
router.post('/orders/:orderId', createPaymentValidation, validate, createPayment);
router.get('/orders/:orderId', [param('orderId').isUUID()], validate, getPayment);
router.get('/orders/:orderId/status', [param('orderId').isUUID()], validate, checkPaymentStatus);

// ── Webhooks ─────────────────────────────────────────────────────────────────
router.post('/webhooks/xendit', xenditWebhook);
router.post('/webhooks/durianpay', durianpayWebhook);

export default router;
