import { Router } from 'express';
import {
  createPivotTable,
  getPivotTables,
  getPivotTable,
  updatePivotTable,
  deletePivotTable,
  computePivotData,
  getSheetColumns,
} from '../controllers/pivotTable.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All pivot table routes require authentication
router.use(authenticate);

// Pivot table CRUD operations
router.post('/sheets/:sheetId/pivot-tables', createPivotTable);
router.get('/sheets/:sheetId/pivot-tables', getPivotTables);
router.get('/pivot-tables/:pivotTableId', getPivotTable);
router.put('/pivot-tables/:pivotTableId', updatePivotTable);
router.delete('/pivot-tables/:pivotTableId', deletePivotTable);

// Compute pivot table data
router.get('/pivot-tables/:pivotTableId/compute', computePivotData);

// Get available columns for pivot table configuration
router.get('/sheets/:sheetId/pivot-columns', getSheetColumns);

export default router;
