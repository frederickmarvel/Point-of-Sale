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
import { adminRateLimiter, orderRateLimiter } from '../middleware/rate-limit.middleware';
import { param } from 'express-validator';

const router = Router();

// ── Public ──────────────────────────────────────────────────────────────────
router.get('/public', orderRateLimiter, getPublicMenu);
router.get('/items', orderRateLimiter, listMenuItems);

// ── Admin: Categories ────────────────────────────────────────────────────────
router.get('/categories', adminRateLimiter, authenticate, listCategories);
router.get(
  '/categories/:id',
  adminRateLimiter,
  authenticate,
  [param('id').isUUID()],
  validate,
  getCategory,
);
router.post('/categories', adminRateLimiter, authenticate, createCategoryValidation, validate, createCategory);
router.patch(
  '/categories/:id',
  adminRateLimiter,
  authenticate,
  updateCategoryValidation,
  validate,
  updateCategory,
);
router.delete(
  '/categories/:id',
  adminRateLimiter,
  authenticate,
  [param('id').isUUID().withMessage('Invalid category ID')],
  validate,
  deleteCategory,
);

// ── Admin: Menu Items ────────────────────────────────────────────────────────
router.get('/items/:id', adminRateLimiter, authenticate, [param('id').isUUID()], validate, getMenuItem);
router.post('/items', adminRateLimiter, authenticate, createMenuItemValidation, validate, createMenuItem);
router.patch('/items/:id', adminRateLimiter, authenticate, updateMenuItemValidation, validate, updateMenuItem);
router.delete(
  '/items/:id',
  adminRateLimiter,
  authenticate,
  [param('id').isUUID().withMessage('Invalid menu item ID')],
  validate,
  deleteMenuItem,
);

export default router;
