import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload image to Cloudinary
 * @param filePath - Path to the file, base64 string, or buffer
 * @param folder - Folder name in Cloudinary (optional)
 * @param publicId - Public ID for the image (optional)
 * @returns Upload result with secure_url
 */
export const uploadImage = async (
  filePath: string | Buffer,
  folder?: string,
  publicId?: string
): Promise<{ secure_url: string; public_id: string }> => {
  try {
    const options: {
      resource_type: 'image';
      folder?: string;
      public_id?: string;
    } = {
      resource_type: 'image',
      folder: folder || 'edulearn',
    };

    if (publicId) {
      options.public_id = publicId;
    }

    // Cloudinary can handle buffer directly
    const result = await cloudinary.uploader.upload(
      Buffer.isBuffer(filePath) ? `data:image/jpeg;base64,${filePath.toString('base64')}` : filePath,
      options
    );

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Upload image from buffer (for multer)
 * @param buffer - File buffer from multer
 * @param mimetype - MIME type of the file
 * @param folder - Folder name in Cloudinary (optional)
 * @param publicId - Public ID for the image (optional)
 * @returns Upload result with secure_url
 */
export const uploadImageFromBuffer = async (
  buffer: Buffer,
  _mimetype: string,
  folder?: string,
  publicId?: string
): Promise<{ secure_url: string; public_id: string }> => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          folder: folder || 'edulearn',
          public_id: publicId,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
            });
          } else {
            reject(new Error('Upload failed'));
          }
        }
      );

      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('Cloudinary upload from buffer error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Delete image from Cloudinary
 * @param publicId - Public ID of the image to delete
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

/**
 * Upload video to Cloudinary
 * @param filePath - Path to the file or base64 string
 * @param folder - Folder name in Cloudinary (optional)
 * @returns Upload result with secure_url
 */
export const uploadVideo = async (
  filePath: string,
  folder?: string
): Promise<{ secure_url: string; public_id: string }> => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: 'video',
      folder: folder || 'edulearn/videos',
    });

    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.error('Cloudinary video upload error:', error);
    throw new Error('Failed to upload video to Cloudinary');
  }
};

/**
 * Upload video from buffer (for multer)
 * @param buffer - File buffer from multer
 * @param folder - Folder name in Cloudinary (optional)
 * @returns Upload result with secure_url
 */
export const uploadVideoFromBuffer = async (
  buffer: Buffer,
  folder?: string
): Promise<{ secure_url: string; public_id: string }> => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder: folder || 'edulearn/videos',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
            });
          } else {
            reject(new Error('Upload failed'));
          }
        }
      );

      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('Cloudinary video upload from buffer error:', error);
    throw new Error('Failed to upload video to Cloudinary');
  }
};

/**
 * Upload raw file (e.g. PDF) from buffer (for multer)
 * @param buffer - File buffer from multer
 * @param folder - Folder name in Cloudinary (optional)
 * @returns Upload result with secure_url
 */
export const uploadRawFromBuffer = async (
  buffer: Buffer,
  folder?: string
): Promise<{ secure_url: string; public_id: string }> => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: folder || 'edulearn/files',
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
            });
          } else {
            reject(new Error('Upload failed'));
          }
        }
      );

      uploadStream.end(buffer);
    });
  } catch (error) {
    console.error('Cloudinary raw upload from buffer error:', error);
    throw new Error('Failed to upload file to Cloudinary');
  }
};

/**
 * List images from Cloudinary
 * @param options - Search options (folder, maxResults, nextCursor, etc.)
 * @returns List of images with pagination
 */
export const listImages = async (options?: {
  folder?: string;
  maxResults?: number;
  nextCursor?: string;
  tags?: string[];
  prefix?: string;
}): Promise<{
  resources: Array<{
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
    created_at: string;
    folder?: string;
    tags?: string[];
  }>;
  next_cursor?: string;
  total_count?: number;
}> => {
  try {
    const searchOptions: {
      resource_type: string;
      type: string;
      max_results: number;
      prefix?: string;
      next_cursor?: string;
      tags?: string;
    } = {
      resource_type: 'image',
      type: 'upload',
      max_results: options?.maxResults || 50,
    };

    if (options?.folder) {
      searchOptions.prefix = options.folder;
    } else if (options?.prefix) {
      searchOptions.prefix = options.prefix;
    }

    if (options?.nextCursor) {
      searchOptions.next_cursor = options.nextCursor;
    }

    // Use Admin API resources() instead of search() for better reliability
    // Build options for Admin API
    const apiOptions: {
      type: string;
      resource_type: string;
      max_results: number;
      prefix?: string;
      next_cursor?: string;
      tags?: boolean | string[];
    } = {
      type: 'upload',
      resource_type: 'image',
      max_results: searchOptions.max_results,
    };

    if (searchOptions.prefix) {
      apiOptions.prefix = searchOptions.prefix;
    }

    if (searchOptions.next_cursor) {
      apiOptions.next_cursor = searchOptions.next_cursor;
    }

    if (options?.tags && options.tags.length > 0) {
      // Cloudinary Admin API expects tags as array or boolean
      apiOptions.tags = options.tags;
    }

    // Use Admin API to list resources
    const result = await cloudinary.api.resources(apiOptions);

    return {
      resources: (result.resources || []).map((resource: {
        public_id: string;
        secure_url: string;
        width: number;
        height: number;
        format: string;
        bytes: number;
        created_at: string;
        folder?: string;
        tags?: string[];
      }) => ({
        public_id: resource.public_id,
        secure_url: resource.secure_url,
        width: resource.width,
        height: resource.height,
        format: resource.format,
        bytes: resource.bytes,
        created_at: resource.created_at,
        folder: resource.folder,
        tags: resource.tags || [],
      })),
      next_cursor: result.next_cursor,
      total_count: result.total_count,
    };
  } catch (error) {
    console.error('Cloudinary list images error:', error);
    throw new Error('Failed to list images from Cloudinary');
  }
};

/**
 * Get image details from Cloudinary
 * @param publicId - Public ID of the image
 * @returns Image details
 */
export const getImageDetails = async (publicId: string): Promise<{
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  created_at: string;
  folder?: string;
  tags?: string[];
}> => {
  try {
    const result = await cloudinary.api.resource(publicId, {
      resource_type: 'image',
    });

    return {
      public_id: result.public_id,
      secure_url: result.secure_url,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      created_at: result.created_at,
      folder: result.folder,
      tags: result.tags || [],
    };
  } catch (error) {
    console.error('Cloudinary get image details error:', error);
    throw new Error('Failed to get image details from Cloudinary');
  }
};

/**
 * Delete multiple images from Cloudinary
 * @param publicIds - Array of public IDs to delete
 * @returns Deletion result
 */
export const deleteImages = async (publicIds: string[]): Promise<{
  deleted: Record<string, string>;
  not_found: string[];
}> => {
  try {
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: 'image',
    });

    return {
      deleted: result.deleted || {},
      not_found: result.not_found || [],
    };
  } catch (error) {
    console.error('Cloudinary delete images error:', error);
    throw new Error('Failed to delete images from Cloudinary');
  }
};

export default cloudinary;

