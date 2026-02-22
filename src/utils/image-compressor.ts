import imageCompression from 'browser-image-compression';
import exifr from 'exifr';
import { IMAGE_SETTINGS } from '@/constants';

/**
 * Extract the shooting date from an image file's EXIF metadata.
 * Returns a date string in YYYY-MM-DD format, or null if not available.
 */
export async function extractExifDate(file: File): Promise<string | null> {
  try {
    const result = await exifr.parse(file, ['DateTimeOriginal', 'CreateDate', 'DateTime']);
    const date: Date | undefined =
      result?.DateTimeOriginal ?? result?.CreateDate ?? result?.DateTime;
    if (!date) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  } catch {
    return null;
  }
}

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
