import { Router } from 'express';
import { protect } from '../middleware/auth';
import { uploadSingle } from '../middleware/upload';
import { uploadImageHandler } from '../controllers/uploadController';

const router = Router();

// Generic image upload (e.g. course thumbnails, rich text images, etc.)
router.post('/image', protect, uploadSingle, uploadImageHandler);

export default router;


