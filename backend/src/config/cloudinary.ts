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
    const options: any = {
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

export default cloudinary;

