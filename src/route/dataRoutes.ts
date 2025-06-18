import { Router } from 'express';
import { getDataFile } from '../controller/dataController';

const router = Router();

// Route: /api/data/:name
router.get('/data/:name', getDataFile);

export default router; 