import { Router } from 'express';
import {
  createChart,
  getCharts,
  getChart,
  updateChart,
  deleteChart,
} from '../controllers/chart.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

// All chart routes require authentication
router.use(authenticate);

// Chart CRUD operations
router.post('/sheets/:sheetId/charts', createChart);
router.get('/sheets/:sheetId/charts', getCharts);
router.get('/charts/:chartId', getChart);
router.put('/charts/:chartId', updateChart);
router.delete('/charts/:chartId', deleteChart);

export default router;
