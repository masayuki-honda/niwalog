import { useState, useEffect } from 'react';
import { withAuthRetry } from '@/utils/auth-retry';
import { ImageIcon, Loader2 } from 'lucide-react';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

/**
 * Google Drive からファイルのバイナリを取得して Blob URL を返すフック。
 * アクセストークンによる認証付き fetch を行い、401 時は自動リフレッシュする。
 */
function useDriveImageUrl(fileId: string): { url: string | null; loading: boolean; error: boolean } {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    async function fetchImage() {
      try {
        const blob = await withAuthRetry(async (token) => {
          const res = await fetch(
            `${DRIVE_API_BASE}/files/${fileId}?alt=media`,
            { headers: { Authorization: `Bearer ${token}` } },
          );
          if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
          return res.blob();
        });
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (fileId) {
      fetchImage();
    } else {
      setLoading(false);
      setError(true);
    }

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId]);

  return { url, loading, error };
}

interface DriveImageProps {
  fileId: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Google Drive のファイルIDから画像を認証付きで取得・表示するコンポーネント。
 */
export function DriveImage({ fileId, alt = '', className = '', onClick }: DriveImageProps) {
  const { url, loading, error } = useDriveImageUrl(fileId);

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 ${className}`}>
        <Loader2 size={16} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !url) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-700 ${className}`}>
        <ImageIcon size={16} className="text-gray-400" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      className={className}
      onClick={onClick}
      loading="lazy"
    />
  );
}

interface DriveImageGalleryProps {
  fileIds: string[];
  className?: string;
}

/**
 * 複数の Drive ファイルIDからサムネイルギャラリーを表示するコンポーネント。
 */
export function DriveImageGallery({ fileIds, className = '' }: DriveImageGalleryProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (!fileIds || fileIds.length === 0) return null;

  return (
    <>
      <div className={`flex flex-wrap gap-1.5 mt-2 ${className}`}>
        {fileIds.map((fileId) => (
          <DriveImage
            key={fileId}
            fileId={fileId}
            className="w-16 h-16 rounded-md object-cover cursor-pointer hover:opacity-80 transition"
            onClick={() => setExpanded(fileId)}
          />
        ))}
      </div>

      {/* Lightbox */}
      {expanded && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setExpanded(null)}
        >
          <DriveImage
            fileId={expanded}
            className="max-w-full max-h-full rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}
