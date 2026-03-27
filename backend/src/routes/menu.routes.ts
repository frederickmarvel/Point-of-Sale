import { Router } from 'express';
import {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  createCategoryValidation,
  updateCategoryValidation,
  listMenuItems,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createMenuItemValidation,
  updateMenuItemValidation,
  getPublicMenu,
} from '../controllers/menu.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/error.middleware';
import { param } from 'express-validator';

const router = Router();

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/public', getPublicMenu);
router.get('/items', listMenuItems);

// ── Admin: Categories ────────────────────────────────────────────────────────
router.get('/categories', authenticate, listCategories);
router.get(
  '/categories/:id',
  authenticate,
  [param('id').isUUID()],
  validate,
  getCategory,
);
router.post('/categories', authenticate, createCategoryValidation, validate, createCategory);
router.patch(
  '/categories/:id',
  authenticate,
  updateCategoryValidation,
  validate,
  updateCategory,
);
router.delete(
  '/categories/:id',
  authenticate,
  [param('id').isUUID().withMessage('Invalid category ID')],
  validate,
  deleteCategory,
);

// ── Admin: Menu Items ────────────────────────────────────────────────────────
router.get('/items/:id', authenticate, [param('id').isUUID()], validate, getMenuItem);
router.post('/items', authenticate, createMenuItemValidation, validate, createMenuItem);
router.patch('/items/:id', authenticate, updateMenuItemValidation, validate, updateMenuItem);
router.delete(
  '/items/:id',
  authenticate,
  [param('id').isUUID().withMessage('Invalid menu item ID')],
  validate,
  deleteMenuItem,
);

export default router;
