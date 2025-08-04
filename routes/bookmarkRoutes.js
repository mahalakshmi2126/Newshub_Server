import express from 'express';
import { getBookmarkedNews, toggleBookmark, moveToFolder } from '../controllers/bookmarkController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticate, getBookmarkedNews);
router.post('/:id', authenticate, toggleBookmark);
router.patch('/:id/folder', authenticate, moveToFolder);

export default router;
