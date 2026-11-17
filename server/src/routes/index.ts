import { Router } from 'express';
import statsRoutes from './statsRoutes';
import searchRoutes from './searchRoutes';
import datasetRoutes from './datasetRoutes';
import categoryRoutes from './categoryRoutes';
import nodeRoutes from './nodeRoutes';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import documentRoutes from './documentRoutes';

const apiRouter = Router();

apiRouter.use('/stats', statsRoutes);
apiRouter.use('/search', searchRoutes);
apiRouter.use('/datasets', datasetRoutes);
apiRouter.use('/documents', documentRoutes);
apiRouter.use('/categories', categoryRoutes);
apiRouter.use('/nodes', nodeRoutes);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/user', userRoutes);

export default apiRouter;
