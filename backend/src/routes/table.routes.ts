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
import { param } from 'express-validator';

const router = Router();

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/:id/public', [param('id').isUUID()], validate, getTableByIdPublic);

// ── Admin ────────────────────────────────────────────────────────────────────
router.get('/', authenticate, listTables);
router.get('/:id', authenticate, [param('id').isUUID()], validate, getTable);
router.post('/', authenticate, createTableValidation, validate, createTable);
router.patch('/:id', authenticate, updateTableValidation, validate, updateTable);
router.delete('/:id', authenticate, [param('id').isUUID()], validate, deleteTable);
router.post('/:id/qr', authenticate, [param('id').isUUID()], validate, regenerateQrCode);

export default router;
