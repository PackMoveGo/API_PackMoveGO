import express from 'express';
import { verifySections } from '../controllers/sectionController';

const router = express.Router();

router.post('/verify-sections', verifySections);

export default router; 