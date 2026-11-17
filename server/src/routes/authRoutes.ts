import { Router } from 'express';
import { register, login, googleLogin, getCurrentUser } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';
import { loginRateLimiter, registerRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/google', loginRateLimiter, googleLogin);
router.post('/register', registerRateLimiter, register);
router.post('/login', loginRateLimiter, login);
router.get('/me', authMiddleware, getCurrentUser);

export default router;
