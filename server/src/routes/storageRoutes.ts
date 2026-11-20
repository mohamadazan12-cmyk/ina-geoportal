import { Router } from 'express';
import { getStorageStatus, streamR2Object } from '../controllers/storageController';

const router = Router();

router.get('/status', getStorageStatus);
router.all('/r2/*', streamR2Object);
router.all('/public/*', streamR2Object);

export default router;
