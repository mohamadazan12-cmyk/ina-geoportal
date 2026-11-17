import { Router } from 'express';
import { getNodes, getNodeById } from '../controllers/nodeController';

const router = Router();

router.get('/', getNodes);
router.get('/:nodeId', getNodeById);

export default router;
