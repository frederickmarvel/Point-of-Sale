import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { errorResponse } from '../utils/response.util';

export interface AuthenticatedRequest extends Request {
  admin?: { id: string; email: string; name: string };
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json(errorResponse('Authentication required'));
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json(errorResponse('Server configuration error'));
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as {
      id: string;
      email: string;
      name: string;
    };
    req.admin = { id: payload.id, email: payload.email, name: payload.name };
    next();
  } catch {
    res.status(401).json(errorResponse('Invalid or expired token'));
  }
}
