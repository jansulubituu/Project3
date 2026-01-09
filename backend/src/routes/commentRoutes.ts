import express from 'express';
import {
  getLessonComments,
  createComment,
  replyToComment,
  editComment,
  deleteComment,
  toggleLike,
} from '../controllers/commentController';
import { protect } from '../middleware/auth';

const router = express.Router();

// All routes require authentication
router.use(protect);

// GET /api/comments/lesson/:lessonId - Get comments for a lesson
router.get('/lesson/:lessonId', getLessonComments);

// POST /api/comments/lesson/:lessonId - Create a comment
router.post('/lesson/:lessonId', createComment);

// POST /api/comments/:commentId/reply - Reply to a comment
router.post('/:commentId/reply', replyToComment);

// PUT /api/comments/:commentId - Edit a comment
router.put('/:commentId', editComment);

// DELETE /api/comments/:commentId - Delete a comment
router.delete('/:commentId', deleteComment);

// POST /api/comments/:commentId/like - Toggle like on a comment
router.post('/:commentId/like', toggleLike);

export default router;
