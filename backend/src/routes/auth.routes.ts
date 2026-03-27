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

const router = Router();

router.post('/login', loginValidation, validate, login);
router.get('/profile', authenticate, getProfile);
router.patch('/change-password', authenticate, changePasswordValidation, validate, changePassword);

export default router;
