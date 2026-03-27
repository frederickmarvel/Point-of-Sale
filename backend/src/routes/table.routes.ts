import { Router } from 'express';
import {
  listTables,
  getTable,
  createTable,
  updateTable,
  deleteTable,
  regenerateQrCode,
  getTableByIdPublic,
  createTableValidation,
  updateTableValidation,
} from '../controllers/table.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/error.middleware';
import { adminRateLimiter, orderRateLimiter } from '../middleware/rate-limit.middleware';
import { param } from 'express-validator';

const router = Router();

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/:id/public', orderRateLimiter, [param('id').isUUID()], validate, getTableByIdPublic);

// ── Admin ────────────────────────────────────────────────────────────────────
router.get('/', adminRateLimiter, authenticate, listTables);
router.get('/:id', adminRateLimiter, authenticate, [param('id').isUUID()], validate, getTable);
router.post('/', adminRateLimiter, authenticate, createTableValidation, validate, createTable);
router.patch('/:id', adminRateLimiter, authenticate, updateTableValidation, validate, updateTable);
router.delete('/:id', adminRateLimiter, authenticate, [param('id').isUUID()], validate, deleteTable);
router.post('/:id/qr', adminRateLimiter, authenticate, [param('id').isUUID()], validate, regenerateQrCode);

export default router;
