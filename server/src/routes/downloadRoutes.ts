import { Router } from 'express';
import { getDownloadHistory } from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/downloads/history — authenticated user's download activity log
router.get('/history', getDownloadHistory);

export default router;
