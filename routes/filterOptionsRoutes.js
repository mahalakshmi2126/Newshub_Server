import express from 'express';
import { getFilterOptions } from '../controllers/filterOptionsController.js';

const router = express.Router();

router.get('/get', getFilterOptions);

export default router;