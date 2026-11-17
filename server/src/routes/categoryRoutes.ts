import { Router } from 'express';
import { getCategories } from '../controllers/datasetController';

const router = Router();
router.get('/', getCategories);

export default router;
