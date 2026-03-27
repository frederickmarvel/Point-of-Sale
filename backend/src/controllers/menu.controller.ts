import { Request, Response, NextFunction } from 'express';
import { body, param, query } from 'express-validator';
import prisma from '../utils/prisma.util';
import { successResponse, errorResponse } from '../utils/response.util';

// ─── Category Validations ────────────────────────────────────────────────────

export const createCategoryValidation = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('description').optional().trim(),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('sortOrder must be a non-negative integer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const updateCategoryValidation = [
  param('id').isUUID().withMessage('Invalid category ID'),
  body('name').optional().trim().notEmpty().withMessage('Category name cannot be empty'),
  body('description').optional().trim(),
  body('sortOrder').optional().isInt({ min: 0 }).withMessage('sortOrder must be a non-negative integer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

// ─── Menu Item Validations ───────────────────────────────────────────────────

export const createMenuItemValidation = [
  body('name').trim().notEmpty().withMessage('Menu item name is required'),
  body('description').optional().trim(),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('imageUrl').optional().isURL().withMessage('imageUrl must be a valid URL'),
  body('isAvailable').optional().isBoolean().withMessage('isAvailable must be a boolean'),
  body('categoryId').isUUID().withMessage('Valid categoryId is required'),
];

export const updateMenuItemValidation = [
  param('id').isUUID().withMessage('Invalid menu item ID'),
  body('name').optional().trim().notEmpty().withMessage('Menu item name cannot be empty'),
  body('description').optional().trim(),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a non-negative number'),
  body('imageUrl').optional({ nullable: true }).isURL().withMessage('imageUrl must be a valid URL'),
  body('isAvailable').optional().isBoolean().withMessage('isAvailable must be a boolean'),
  body('categoryId').optional().isUUID().withMessage('categoryId must be a valid UUID'),
];

// ─── Category Controllers ────────────────────────────────────────────────────

export async function listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const activeOnly = req.query['activeOnly'] === 'true';
    const categories = await prisma.category.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { menuItems: true } } },
    });
    res.json(successResponse('Categories retrieved', categories));
  } catch (err) {
    next(err);
  }
}

export async function getCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params['id']);
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        menuItems: {
          where: { isAvailable: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    if (!category) {
      res.status(404).json(errorResponse('Category not found'));
      return;
    }
    res.json(successResponse('Category retrieved', category));
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description, sortOrder, isActive } = req.body as {
      name: string;
      description?: string;
      sortOrder?: number;
      isActive?: boolean;
    };

    const existing = await prisma.category.findUnique({ where: { name } });
    if (existing) {
      res.status(409).json(errorResponse('Category with this name already exists'));
      return;
    }

    const category = await prisma.category.create({
      data: { name, description, sortOrder: sortOrder ?? 0, isActive: isActive ?? true },
    });
    res.status(201).json(successResponse('Category created', category));
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params['id']);
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json(errorResponse('Category not found'));
      return;
    }

    if (req.body.name && req.body.name !== existing.name) {
      const duplicate = await prisma.category.findUnique({ where: { name: req.body.name as string } });
      if (duplicate) {
        res.status(409).json(errorResponse('Category with this name already exists'));
        return;
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: req.body.name as string | undefined,
        description: req.body.description as string | undefined,
        sortOrder: req.body.sortOrder as number | undefined,
        isActive: req.body.isActive as boolean | undefined,
      },
    });
    res.json(successResponse('Category updated', category));
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params['id']);
    type CategoryWithCount = {
      _count: { menuItems: number };
    };
    const existing = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { menuItems: true } } },
    }) as (Awaited<ReturnType<typeof prisma.category.findUnique>> & CategoryWithCount) | null;
    if (!existing) {
      res.status(404).json(errorResponse('Category not found'));
      return;
    }
    if (existing._count.menuItems > 0) {
      res.status(409).json(
        errorResponse('Cannot delete category with menu items. Remove items first or deactivate the category.'),
      );
      return;
    }
    await prisma.category.delete({ where: { id } });
    res.json(successResponse('Category deleted'));
  } catch (err) {
    next(err);
  }
}

// ─── Menu Item Controllers ───────────────────────────────────────────────────

export async function listMenuItems(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categoryId = req.query['categoryId'] as string | undefined;
    const available = req.query['available'] as string | undefined;
    const menuItems = await prisma.menuItem.findMany({
      where: {
        ...(categoryId ? { categoryId } : {}),
        ...(available === 'true' ? { isAvailable: true } : {}),
      },
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });
    res.json(successResponse('Menu items retrieved', menuItems));
  } catch (err) {
    next(err);
  }
}

export async function getMenuItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params['id']);
    const item = await prisma.menuItem.findUnique({
      where: { id },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!item) {
      res.status(404).json(errorResponse('Menu item not found'));
      return;
    }
    res.json(successResponse('Menu item retrieved', item));
  } catch (err) {
    next(err);
  }
}

export async function createMenuItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, description, price, imageUrl, isAvailable, categoryId } = req.body as {
      name: string;
      description?: string;
      price: number;
      imageUrl?: string;
      isAvailable?: boolean;
      categoryId: string;
    };

    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      res.status(404).json(errorResponse('Category not found'));
      return;
    }

    const item = await prisma.menuItem.create({
      data: { name, description, price, imageUrl, isAvailable: isAvailable ?? true, categoryId },
      include: { category: { select: { id: true, name: true } } },
    });
    res.status(201).json(successResponse('Menu item created', item));
  } catch (err) {
    next(err);
  }
}

export async function updateMenuItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params['id']);
    const existing = await prisma.menuItem.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json(errorResponse('Menu item not found'));
      return;
    }

    if (req.body.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: req.body.categoryId as string } });
      if (!category) {
        res.status(404).json(errorResponse('Category not found'));
        return;
      }
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        name: req.body.name as string | undefined,
        description: req.body.description as string | undefined,
        price: req.body.price as number | undefined,
        imageUrl: req.body.imageUrl as string | null | undefined,
        isAvailable: req.body.isAvailable as boolean | undefined,
        categoryId: req.body.categoryId as string | undefined,
      },
      include: { category: { select: { id: true, name: true } } },
    });
    res.json(successResponse('Menu item updated', item));
  } catch (err) {
    next(err);
  }
}

export async function deleteMenuItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params['id']);
    type ItemWithCount = { _count: { orderItems: number } };
    const existing = await prisma.menuItem.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    }) as (Awaited<ReturnType<typeof prisma.menuItem.findUnique>> & ItemWithCount) | null;
    if (!existing) {
      res.status(404).json(errorResponse('Menu item not found'));
      return;
    }
    if (existing._count.orderItems > 0) {
      // Soft delete: just mark as unavailable
      await prisma.menuItem.update({ where: { id }, data: { isAvailable: false } });
      res.json(successResponse('Menu item deactivated (has associated orders)'));
      return;
    }
    await prisma.menuItem.delete({ where: { id } });
    res.json(successResponse('Menu item deleted'));
  } catch (err) {
    next(err);
  }
}

// ─── Public Menu Endpoint ────────────────────────────────────────────────────

export async function getPublicMenu(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        menuItems: {
          where: { isAvailable: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    res.json(successResponse('Menu retrieved', categories));
  } catch (err) {
    next(err);
  }
}

// Re-export query validator for reuse
export { query };
