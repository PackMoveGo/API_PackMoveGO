import { Router } from 'express';
import { getDataFile } from '../controller/dataController';

const router = Router();

// Route: /data/:name (generic route)
router.get('/:name', getDataFile);

// Versioned API endpoints with /v0/ prefix - REMOVED (handled by v0-routes.ts)
// All /v0/* routes are now handled by the dedicated v0-routes.ts file

export default router; 