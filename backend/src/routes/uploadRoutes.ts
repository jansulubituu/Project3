import { Router } from 'express';
import { protect } from '../middleware/auth';
import { uploadSingle, uploadVideoSingle } from '../middleware/upload';
import { uploadImageHandler, uploadVideoHandler } from '../controllers/uploadController';

const router = Router();

// Generic image upload (e.g. course thumbnails, rich text images, etc.)
router.post('/image', protect, uploadSingle, uploadImageHandler);

// Lesson video upload (Cloudinary)
router.post('/video', protect, uploadVideoSingle, uploadVideoHandler);

export default router;


