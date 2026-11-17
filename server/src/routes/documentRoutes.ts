import { Router } from 'express';
import { getDocuments, getDocumentById, downloadDocument } from '../controllers/documentController';
import { optionalAuthMiddleware } from '../middleware/authMiddleware';
import { downloadRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/', optionalAuthMiddleware, getDocuments);
router.get('/:id', optionalAuthMiddleware, getDocumentById);
router.get('/:id/download', downloadRateLimiter, optionalAuthMiddleware, downloadDocument);

export default router;
