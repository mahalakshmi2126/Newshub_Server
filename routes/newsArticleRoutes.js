import express from 'express';
import { createNewsArticle, getAllNewsArticle } from '../controllers/newsArticleController.js';

const router = express.Router();

router.post('/create', createNewsArticle);
router.get('/get', getAllNewsArticle);

export default router;
