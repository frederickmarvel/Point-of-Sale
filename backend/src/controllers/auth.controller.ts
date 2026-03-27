import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import prisma from '../utils/prisma.util';
import { successResponse, errorResponse } from '../utils/response.util';

export const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };

    const admin = await prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      res.status(401).json(errorResponse('Invalid credentials'));
      return;
    }

    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) {
      res.status(401).json(errorResponse('Invalid credentials'));
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expiresIn = (process.env.JWT_EXPIRES_IN ?? '24h') as any;
    const token = jwt.sign(
      { id: admin.id, email: admin.email, name: admin.name },
      secret,
      { expiresIn },
    );

    res.json(
      successResponse('Login successful', {
        token,
        admin: { id: admin.id, email: admin.email, name: admin.name },
      }),
    );
  } catch (err) {
    next(err);
  }
}

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const adminReq = req as Request & { admin?: { id: string } };
    const admin = await prisma.admin.findUnique({
      where: { id: adminReq.admin!.id },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!admin) {
      res.status(404).json(errorResponse('Admin not found'));
      return;
    }
    res.json(successResponse('Profile retrieved', admin));
  } catch (err) {
    next(err);
  }
}

export const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters'),
];

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const adminReq = req as Request & { admin?: { id: string } };
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    const admin = await prisma.admin.findUnique({ where: { id: adminReq.admin!.id } });
    if (!admin) {
      res.status(404).json(errorResponse('Admin not found'));
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isValid) {
      res.status(400).json(errorResponse('Current password is incorrect'));
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { password: hashedPassword },
    });

    res.json(successResponse('Password changed successfully'));
  } catch (err) {
    next(err);
  }
}
