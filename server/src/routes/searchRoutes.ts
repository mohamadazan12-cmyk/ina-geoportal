import { Router } from 'express';
import { getSearchSuggestions } from '../controllers/searchController';

const router = Router();
router.get('/suggest', getSearchSuggestions);

export default router;
