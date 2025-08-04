// routes/analyticsRoutes.js
import express from 'express';
import { getAnalytics, sendReport } from '../controllers/analyticsController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/analytics', authenticate, getAnalytics);

router.post('/send-report', authenticate, sendReport);

export default router;