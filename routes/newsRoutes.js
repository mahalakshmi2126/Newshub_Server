import express from 'express';
import {
  createNews,
  getMyNews,
  getAllNews,
  getApprovedNewsOnly,
  getNewsById,
  incrementViewCount,
  incrementShareCount,
  updateNews,
  updateNewsStatus,
  deleteNews,
  rejectReporterRequest,
  deleteReporter,
  getAllReporters,
  getPendingRequests,
  approveReporterRequest,
  getFilteredNews,
  getBreakingNews,
  searchNews,
  renderArticlePreview,
  getArticlePreviewJSON
  // translateNews
} from '../controllers/newsController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/create', authenticate, createNews);
router.get('/my-news', authenticate, getMyNews);
router.get('/all', authenticate, getAllNews);
router.get('/public', getApprovedNewsOnly);
router.get('/news/:id', getNewsById);
router.patch('/news/:id/view', incrementViewCount);
router.patch('/news/:id/share', incrementShareCount);
router.put('/news/:id', authenticate, updateNews);
router.patch('/news/:id/status', authenticate, updateNewsStatus);
router.delete('/news/:id', authenticate, deleteNews);
router.get('/filter', getFilteredNews);
router.get('/get', getBreakingNews);
router.patch('/approve/:userId', authenticate, approveReporterRequest);
router.patch('/reject/:userId', authenticate, rejectReporterRequest);
router.get('/reporters', authenticate, getAllReporters);
router.get('/pending-requests', authenticate, getPendingRequests);
router.delete('/reporter/:id', authenticate, deleteReporter);
// router.post('/:id/translate', authenticate, translateNews);
router.get('/search', searchNews);
router.get('/article-preview/:id', renderArticlePreview);
// JSON API version
router.get('/article-preview/:id/json', getArticlePreviewJSON);
export default router;