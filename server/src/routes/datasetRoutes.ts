import { Router } from 'express';
import {
  getDatasets,
  getDatasetById,
  getCategories,
  getDatasetGeoJSON,
  getDatasetLiveStatus,
  requestDownload,
  downloadFile,
} from '../controllers/datasetController';
import { optionalAuthMiddleware } from '../middleware/authMiddleware';
import { downloadRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/', getDatasets);
router.get('/:id', getDatasetById);
router.get('/:id/geojson', getDatasetGeoJSON);
router.get('/:id/live-status', getDatasetLiveStatus);
router.get('/:id/download-file', downloadRateLimiter, optionalAuthMiddleware, downloadFile);
router.post('/:id/download', downloadRateLimiter, optionalAuthMiddleware, requestDownload);

export default router;
