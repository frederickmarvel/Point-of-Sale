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
import { param } from 'express-validator';

const router = Router();

// ── Public (Customer) ────────────────────────────────────────────────────────
router.post('/', placeOrderValidation, validate, placeOrder);
router.get('/:id', [param('id').isUUID()], validate, getOrder);

// ── Admin ────────────────────────────────────────────────────────────────────
router.get('/', authenticate, listOrders);
router.get('/stats/today', authenticate, getOrderStats);
router.patch('/:id/status', authenticate, updateOrderStatusValidation, validate, updateOrderStatus);
router.patch('/:id/cancel', authenticate, [param('id').isUUID()], validate, cancelOrder);

export default router;
