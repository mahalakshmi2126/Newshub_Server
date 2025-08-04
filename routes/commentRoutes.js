// ✅ commentRoutes.js
import express from 'express';
import {
  getComments,
  postComment,
  postReply,
  likeComment,
  deleteComment,
  deleteReply
} from '../controllers/commentController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/:articleId', getComments);
router.post('/:articleId', authenticate, postComment);
router.post('/:articleId/reply/:commentId', authenticate, postReply);
router.patch('/:articleId/like/:commentId', authenticate, likeComment);
router.delete('/:commentId', authenticate, deleteComment);
router.delete('/:articleId/reply/:commentId/:replyId', authenticate, deleteReply);


export default router;
