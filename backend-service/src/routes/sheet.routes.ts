import { Router } from 'express';
import {
  createSheet,
  getSheet,
  getAllSheets,
  updateSheet,
  deleteSheet,
  createColumn,
  updateColumn,
  createRow,
  updateRow,
  updateCell,
  deleteColumn,
  deleteRow,
  exportSheet,
  toggleFavorite,
} from '../controllers/sheet.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All sheet routes require authentication
router.use(authenticate);

// Sheet CRUD
router.post('/', createSheet);
router.get('/', getAllSheets);
router.get('/:id', getSheet);
router.put('/:id', updateSheet);
router.delete('/:id', deleteSheet);

// Favorite operations
router.put('/:id/favorite', toggleFavorite);

// Column operations
router.post('/:id/columns', createColumn);
router.put('/:id/columns/:columnId', updateColumn);
router.delete('/:id/columns/:columnId', deleteColumn);

// Row operations
router.post('/:id/rows', createRow);
router.put('/:id/rows/:rowId', updateRow);
router.delete('/:id/rows/:rowId', deleteRow);

// Cell operations
router.put('/:id/cells/:cellId', updateCell);

// Export operations
router.get('/:id/export', exportSheet);

export default router;
