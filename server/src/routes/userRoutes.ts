import { Router } from 'express';
import {
  getUserProfile,
  updateUserProfile,
  getUserDownloads,
  getUserBookmarks,
  toggleBookmark,
} from '../controllers/userController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);
router.get('/downloads', getUserDownloads);
router.get('/bookmarks', getUserBookmarks);
router.post('/bookmarks', toggleBookmark);

export default router;
