import { Router } from 'express';
import * as shareController from '../controllers/share.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All share routes require authentication
router.use(authenticate);

// Share management
router.post('/sheets/:id/share', shareController.shareSheet);
router.get('/sheets/:id/shares', shareController.getSheetShares);
router.delete('/shares/:shareId', shareController.removeShare);

export default router;
