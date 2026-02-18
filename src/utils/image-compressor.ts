import imageCompression from 'browser-image-compression';
import { IMAGE_SETTINGS } from '@/constants';

/**
 * Compress an image file before uploading to Google Drive
 */
export async function compressImage(file: File): Promise<Blob> {
  const options = {
    maxSizeMB: IMAGE_SETTINGS.maxSizeMB,
    maxWidthOrHeight: IMAGE_SETTINGS.maxWidthOrHeight,
    fileType: IMAGE_SETTINGS.fileType,
    initialQuality: IMAGE_SETTINGS.quality,
    useWebWorker: true,
  };

  return imageCompression(file, options);
}
