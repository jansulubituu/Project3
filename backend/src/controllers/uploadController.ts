import { Request, Response } from 'express';
import {
  uploadImageFromBuffer,
  uploadVideoFromBuffer,
  uploadRawFromBuffer,
  listImages,
  getImageDetails,
  deleteImages,
  deleteImage,
} from '../config/cloudinary';

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
    }    const maxSizeMb = 20;
    if (req.file.size > maxSizeMb * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: `File size must be <= ${maxSizeMb}MB`,
      });
    }    const folder = (req.query.folder as string) || 'edulearn/lesson-files';

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

// @desc    List all images (Admin only)
// @route   GET /api/uploads/images
// @access  Private/Admin
export const listImagesHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const {
      folder,
      maxResults = 50,
      nextCursor,
      tags,
      prefix,
    } = req.query;

    const options: {
      folder?: string;
      maxResults?: number;
      nextCursor?: string;
      tags?: string[];
      prefix?: string;
    } = {};

    if (folder) {
      options.folder = folder as string;
    }    if (maxResults) {
      options.maxResults = Number(maxResults);
    }

    if (nextCursor) {
      options.nextCursor = nextCursor as string;
    }

    if (tags) {
      options.tags = Array.isArray(tags) ? (tags as string[]) : [tags as string];
    }

    if (prefix) {
      options.prefix = prefix as string;
    }

    const result = await listImages(options);

    res.json({
      success: true,
      images: result.resources,
      pagination: {
        nextCursor: result.next_cursor,
        totalCount: result.total_count,
        hasMore: !!result.next_cursor,
      },
    });
  } catch (error) {
    console.error('List images error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list images',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Get image details (Admin only)
// @route   GET /api/uploads/images/:publicId
// @access  Private/Admin
export const getImageDetailsHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { publicId } = req.params;

    // Decode publicId if it's URL encoded
    const decodedPublicId = decodeURIComponent(publicId);

    const image = await getImageDetails(decodedPublicId);

    res.json({
      success: true,
      image,
    });
  } catch (error) {
    console.error('Get image details error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get image details',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Delete image(s) (Admin only)
// @route   DELETE /api/uploads/images
// @access  Private/Admin
export const deleteImagesHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { publicIds } = req.body;

    if (!publicIds || !Array.isArray(publicIds) || publicIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'publicIds array is required',
      });
    }

    const result = await deleteImages(publicIds);

    res.json({
      success: true,
      message: 'Images deleted successfully',
      deleted: result.deleted,
      notFound: result.not_found,
    });
  } catch (error) {
    console.error('Delete images error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete images',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

// @desc    Delete single image (Admin only)
// @route   DELETE /api/uploads/images/:publicId
// @access  Private/Admin
export const deleteImageHandler = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const { publicId } = req.params;

    // Decode publicId if it's URL encoded
    const decodedPublicId = decodeURIComponent(publicId);

    await deleteImage(decodedPublicId);

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Delete image error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};