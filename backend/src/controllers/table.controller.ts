import { Request, Response, NextFunction } from 'express';
import { body, param } from 'express-validator';
import QRCode from 'qrcode';
import prisma from '../utils/prisma.util';
import { successResponse, errorResponse } from '../utils/response.util';

const QR_BASE_URL = process.env.QR_BASE_URL ?? 'http://localhost:5173';

function generateQrUrl(tableId: string): string {
  return `${QR_BASE_URL}/order/${tableId}`;
}

export const createTableValidation = [
  body('number').isInt({ min: 1 }).withMessage('Table number must be a positive integer'),
  body('name').trim().notEmpty().withMessage('Table name is required'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export const updateTableValidation = [
  param('id').isUUID().withMessage('Invalid table ID'),
  body('number').optional().isInt({ min: 1 }).withMessage('Table number must be a positive integer'),
  body('name').optional().trim().notEmpty().withMessage('Table name cannot be empty'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be a positive integer'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
];

export async function listTables(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const tables = await prisma.table.findMany({
      orderBy: { number: 'asc' },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });
    res.json(successResponse('Tables retrieved', tables));
  } catch (err) {
    next(err);
  }
}

export async function getTable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params['id']);
    const table = await prisma.table.findUnique({
      where: { id },
    });
    if (!table) {
      res.status(404).json(errorResponse('Table not found'));
      return;
    }
    res.json(successResponse('Table retrieved', table));
  } catch (err) {
    next(err);
  }
}

export async function createTable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { number, name, capacity, isActive } = req.body as {
      number: number;
      name: string;
      capacity?: number;
      isActive?: boolean;
    };

    const existing = await prisma.table.findUnique({ where: { number } });
    if (existing) {
      res.status(409).json(errorResponse('Table with this number already exists'));
      return;
    }

    const table = await prisma.table.create({
      data: { number, name, capacity: capacity ?? 4, isActive: isActive ?? true },
    });

    // Generate QR code
    const qrUrl = generateQrUrl(table.id);
    const qrCode = await QRCode.toDataURL(qrUrl, { errorCorrectionLevel: 'M' });
    const updatedTable = await prisma.table.update({
      where: { id: table.id },
      data: { qrCode },
    });

    res.status(201).json(successResponse('Table created', updatedTable));
  } catch (err) {
    next(err);
  }
}

export async function updateTable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params['id']);
    const existing = await prisma.table.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json(errorResponse('Table not found'));
      return;
    }

    if (req.body.number !== undefined && req.body.number !== existing.number) {
      const duplicate = await prisma.table.findUnique({ where: { number: req.body.number as number } });
      if (duplicate) {
        res.status(409).json(errorResponse('Table with this number already exists'));
        return;
      }
    }

    const table = await prisma.table.update({
      where: { id },
      data: {
        number: req.body.number as number | undefined,
        name: req.body.name as string | undefined,
        capacity: req.body.capacity as number | undefined,
        isActive: req.body.isActive as boolean | undefined,
      },
    });
    res.json(successResponse('Table updated', table));
  } catch (err) {
    next(err);
  }
}

export async function deleteTable(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params['id']);
    type TableWithCount = { _count: { orders: number } };
    const existing = await prisma.table.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    }) as (Awaited<ReturnType<typeof prisma.table.findUnique>> & TableWithCount) | null;
    if (!existing) {
      res.status(404).json(errorResponse('Table not found'));
      return;
    }
    if (existing._count.orders > 0) {
      res.status(409).json(errorResponse('Cannot delete table with order history. Deactivate it instead.'));
      return;
    }
    await prisma.table.delete({ where: { id } });
    res.json(successResponse('Table deleted'));
  } catch (err) {
    next(err);
  }
}

export async function regenerateQrCode(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params['id']);
    const existing = await prisma.table.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json(errorResponse('Table not found'));
      return;
    }

    const qrUrl = generateQrUrl(id);
    const qrCode = await QRCode.toDataURL(qrUrl, { errorCorrectionLevel: 'M' });
    const table = await prisma.table.update({
      where: { id },
      data: { qrCode },
    });
    res.json(successResponse('QR code regenerated', { qrCode: table.qrCode, qrUrl }));
  } catch (err) {
    next(err);
  }
}

export async function getTableByIdPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params['id']);
    const table = await prisma.table.findFirst({
      where: { id, isActive: true },
      select: { id: true, number: true, name: true, capacity: true },
    });
    if (!table) {
      res.status(404).json(errorResponse('Table not found'));
      return;
    }
    res.json(successResponse('Table retrieved', table));
  } catch (err) {
    next(err);
  }
}
