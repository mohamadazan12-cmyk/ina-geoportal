import { Router } from 'express';
import {
  getUserProfile,
  getUserDownloads,
  getUserBookmarks,
  toggleBookmark,
} from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/profile', getUserProfile);
router.get('/downloads', getUserDownloads);
router.get('/bookmarks', getUserBookmarks);
router.post('/bookmarks', toggleBookmark);

export default router;
