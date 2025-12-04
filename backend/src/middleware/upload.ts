import multer from 'multer';
import path from 'path';

// Configure storage
const storage = multer.memoryStorage();

// Image file filter
const imageFileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, jpg, png, gif, webp) are allowed'));
  }
};

// Video file filter
const videoFileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = /mp4|mov|avi|mkv|webm/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = /^video\//.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only video files (mp4, mov, avi, mkv, webm) are allowed'));
  }
};

// Configure multer for images
export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: imageFileFilter,
});

// Configure multer for videos
export const uploadVideoMulter = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: videoFileFilter,
});

// Raw/PDF file filter
const rawFileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = /pdf|octet-stream/;
  const extname = /\.pdf$/i.test(file.originalname);
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
};

export const uploadRawMulter = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: rawFileFilter,
});

// Single file upload middleware
export const uploadSingle = upload.single('image');

// Multiple files upload middleware
export const uploadMultiple = upload.array('images', 10);

// Single video upload middleware
export const uploadVideoSingle = uploadVideoMulter.single('video');

// Single raw/PDF upload middleware
export const uploadFileSingle = uploadRawMulter.single('file');

