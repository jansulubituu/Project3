import { Router } from 'express';
import { protect } from '../middleware/auth';
import { uploadSingle, uploadVideoSingle, uploadFileSingle } from '../middleware/upload';
import { uploadImageHandler, uploadVideoHandler, uploadFileHandler } from '../controllers/uploadController';

const router = Router();

// Generic image upload (e.g. course thumbnails, rich text images, etc.)
router.post('/image', protect, uploadSingle, uploadImageHandler);

// Lesson video upload (Cloudinary)
router.post('/video', protect, uploadVideoSingle, uploadVideoHandler);

// Generic file upload (e.g. PDF attachments)
router.post('/file', protect, uploadFileSingle, uploadFileHandler);

export default router;


