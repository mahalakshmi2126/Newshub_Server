// routes/news.js
import express from 'express';
const router = express.Router();
import { submitReport, getReports } from '../controllers/reportController.js';

router.post('/submit', submitReport);
router.get('/get', getReports);

export default router;