import { Router } from 'express';
import {
  createDataValidation,
  getDataValidations,
  getDataValidation,
  updateDataValidation,
  deleteDataValidation,
  validateCell,
  getCellValidation,
} from '../controllers/dataValidation.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All data validation routes require authentication
router.use(authenticate);

// Data validation CRUD operations
router.post('/sheets/:sheetId/validations', createDataValidation);
router.get('/sheets/:sheetId/validations', getDataValidations);
router.get('/validations/:validationId', getDataValidation);
router.put('/validations/:validationId', updateDataValidation);
router.delete('/validations/:validationId', deleteDataValidation);

// Cell validation
router.post('/sheets/:sheetId/validate-cell', validateCell);
router.get('/sheets/:sheetId/cell-validation/:cellRef', getCellValidation);

export default router;
