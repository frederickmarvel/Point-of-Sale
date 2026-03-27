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
import { orderRateLimiter } from '../middleware/rate-limit.middleware';
import { param } from 'express-validator';

const router = Router();

// ── Public (Customer) ─────────────────────────────────────────────────────
router.post('/orders/:orderId', orderRateLimiter, createPaymentValidation, validate, createPayment);
router.get('/orders/:orderId', orderRateLimiter, [param('orderId').isUUID()], validate, getPayment);
router.get('/orders/:orderId/status', orderRateLimiter, [param('orderId').isUUID()], validate, checkPaymentStatus);

// ── Webhooks ─────────────────────────────────────────────────────────────────
router.post('/webhooks/xendit', xenditWebhook);
router.post('/webhooks/durianpay', durianpayWebhook);

export default router;
