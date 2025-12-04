import { Request, Response } from 'express';
import { uploadImageFromBuffer, uploadVideoFromBuffer, uploadRawFromBuffer } from '../config/cloudinary';

// @desc    Upload generic image (e.g. course thumbnail)
// @route   POST /api/uploads/image
// @access  Private (authenticated)
export const uploadImageHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const folder = (req.query.folder as string) || 'edulearn/uploads';

    const result = await uploadImageFromBuffer(req.file.buffer, req.file.mimetype, folder);

    return res.json({
      success: true,
      message: 'Image uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Generic image upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Upload lesson video
// @route   POST /api/uploads/video
// @access  Private (authenticated)
export const uploadVideoHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const maxSizeMb = 100;
    if (req.file.size > maxSizeMb * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: `Video size must be <= ${maxSizeMb}MB`,
      });
    }

    const folder = (req.query.folder as string) || 'edulearn/lesson-videos';

    const result = await uploadVideoFromBuffer(req.file.buffer, folder);

    return res.json({
      success: true,
      message: 'Video uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('Video upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload video',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Upload generic file (e.g. PDF attachment)
// @route   POST /api/uploads/file
// @access  Private (authenticated)
export const uploadFileHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded',
      });
    }

    const maxSizeMb = 20;
    if (req.file.size > maxSizeMb * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: `File size must be <= ${maxSizeMb}MB`,
      });
    }

    const folder = (req.query.folder as string) || 'edulearn/lesson-files';

    const result = await uploadRawFromBuffer(req.file.buffer, folder);

    return res.json({
      success: true,
      message: 'File uploaded successfully',
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error('File upload error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

