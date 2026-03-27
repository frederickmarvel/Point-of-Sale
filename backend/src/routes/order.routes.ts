import { Router } from 'express';
import {
  listOrders,
  getOrder,
  placeOrder,
  updateOrderStatus,
  cancelOrder,
  getOrderStats,
  placeOrderValidation,
  updateOrderStatusValidation,
} from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/error.middleware';
import { adminRateLimiter, orderRateLimiter } from '../middleware/rate-limit.middleware';
import { param } from 'express-validator';

const router = Router();

// ── Public (Customer) ────────────────────────────────────────────────────────
router.post('/', orderRateLimiter, placeOrderValidation, validate, placeOrder);
router.get('/:id', orderRateLimiter, [param('id').isUUID()], validate, getOrder);

// ── Admin ────────────────────────────────────────────────────────────────────
router.get('/', adminRateLimiter, authenticate, listOrders);
router.get('/stats/today', adminRateLimiter, authenticate, getOrderStats);
router.patch('/:id/status', adminRateLimiter, authenticate, updateOrderStatusValidation, validate, updateOrderStatus);
router.patch('/:id/cancel', adminRateLimiter, authenticate, [param('id').isUUID()], validate, cancelOrder);

export default router;
