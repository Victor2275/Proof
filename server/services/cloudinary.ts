import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

export const cloudinaryConfigured = (): boolean => !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

export const isCloudinaryUrl = (url: string | undefined): boolean =>
  /(?:\/\/|\.)cloudinary\.com\//i.test(url || '');

export const configureCloudinary = (): void => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

export const rehostImageUrl = async (url: string): Promise<string> => {
  if (!url || typeof url !== 'string') return url;
  if (!/^https?:\/\//i.test(url)) return url;   // data: URIs, relative paths
  if (isCloudinaryUrl(url)) return url;          // already ours
  if (!cloudinaryConfigured()) return url;       // nowhere to upload
  try {
    const result = await cloudinary.uploader.upload(url, { folder: 'cookbook' });
    return result.secure_url || result.url || url;
  } catch (err: any) {
    console.error('Image re-host failed, keeping original URL:', url, '—', err.message);
    return url;
  }
};

export const rehostImageUrls = async (urls: string[]): Promise<string[]> =>
  Array.isArray(urls) ? Promise.all(urls.map(rehostImageUrl)) : urls;

export const buildStorage = (): ReturnType<typeof multer> => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'cookbook',
      allowed_formats: ['jpg', 'png', 'webp', 'jpeg'],
    } as any,
  });
  return multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });
};

export { cloudinary };
