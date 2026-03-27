import { Router } from 'express';
import {
  login,
  loginValidation,
  getProfile,
  changePassword,
  changePasswordValidation,
} from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/error.middleware';
import { authRateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

router.post('/login', authRateLimiter, loginValidation, validate, login);
router.get('/profile', authRateLimiter, authenticate, getProfile);
router.patch('/change-password', authRateLimiter, authenticate, changePasswordValidation, validate, changePassword);

export default router;
