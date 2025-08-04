import express from 'express';
import { submitReporterForm } from '../controllers/userController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/reporter-request', authenticate, submitReporterForm);

export default router;