import { Router } from 'express';
import { protect } from '../middleware/auth';
import { adminOnly } from '../middleware/authorize';
import { uploadSingle, uploadVideoSingle, uploadFileSingle } from '../middleware/upload';
import {
  uploadImageHandler,
  uploadVideoHandler,
  uploadFileHandler,
  listImagesHandler,
  getImageDetailsHandler,
  deleteImagesHandler,
  deleteImageHandler,
} from '../controllers/uploadController';

const router = Router();

// Generic image upload (e.g. course thumbnails, rich text images, etc.)
router.post('/image', protect, uploadSingle, uploadImageHandler);

// Lesson video upload (Cloudinary)
router.post('/video', protect, uploadVideoSingle, uploadVideoHandler);

// Generic file upload (e.g. PDF attachments)
router.post('/file', protect, uploadFileSingle, uploadFileHandler);

// Admin image management routes
router.get('/images', protect, adminOnly, listImagesHandler);
router.get('/images/:publicId', protect, adminOnly, getImageDetailsHandler);
router.delete('/images', protect, adminOnly, deleteImagesHandler);
router.delete('/images/:publicId', protect, adminOnly, deleteImageHandler);

export default router;


