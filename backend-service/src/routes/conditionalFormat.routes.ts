import { Router } from 'express';
import {
  createConditionalFormat,
  getConditionalFormats,
  updateConditionalFormat,
  deleteConditionalFormat,
} from '../controllers/conditionalFormat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All conditional format routes require authentication
router.use(authenticate);

// Conditional formatting CRUD operations
router.post('/sheets/:sheetId/formats', createConditionalFormat);
router.get('/sheets/:sheetId/formats', getConditionalFormats);
router.put('/formats/:formatId', updateConditionalFormat);
router.delete('/formats/:formatId', deleteConditionalFormat);

export default router;
