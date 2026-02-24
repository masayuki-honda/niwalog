import { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, X, Loader2 } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { addActivity as addActivityToSheet } from '@/services/sheets-api';
import { ensureAppFolder, ensurePlanterFolder, uploadFile } from '@/services/drive-api';
import { compressImage, extractExifDate } from '@/utils/image-compressor';
import { withAuthRetry } from '@/utils/auth-retry';
import { ACTIVITY_TYPE_CONFIG, IMAGE_SETTINGS } from '@/constants';
import { generateId, nowISO, cn, joinPhotoIds } from '@/utils';
import type { ActivityLog, ActivityType } from '@/types';

export function ActivityForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetPlanterId = searchParams.get('planterId') || '';
  const presetType = (searchParams.get('type') || '') as ActivityType;

  const { user, spreadsheetId, driveFolderId, planters, addActivity: addActivityToStore, setDriveFolderId, setError } =
    useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);

  // Form state
  const [planterId, setPlanterId] = useState(presetPlanterId);
  const [activityType, setActivityType] = useState<ActivityType>(
    presetType || 'observation',
  );
  const [activityDate, setActivityDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [note, setNote] = useState('');
  const [harvestAmount, setHarvestAmount] = useState('');
  const [harvestUnit, setHarvestUnit] = useState('個');
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [dateSetFromExif, setDateSetFromExif] = useState(false);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = IMAGE_SETTINGS.maxPhotosPerActivity - photos.length;
    const selected = files.slice(0, remaining);

    // Try to read EXIF date from the first selected photo
    // Use EXIF date if it's the first photo being added (photos is empty)
    if (photos.length === 0) {
      const exifDate = await extractExifDate(selected[0]);
      if (exifDate) {
        setActivityDate(exifDate);
        setDateSetFromExif(true);
      }
    }

    // Create previews
    const previews = selected.map((f) => URL.createObjectURL(f));
    setPhotoPreviews((prev) => [...prev, ...previews]);
    setPhotos((prev) => [...prev, ...selected]);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !spreadsheetId) return;

    setSaving(true);
    try {
      let photoIds: string[] = [];

      // Upload photos if any
      if (photos.length > 0) {
        setUploadingPhotos(true);

        // Ensure Drive folder (with auth retry)
        let folderId = driveFolderId;
        if (!folderId) {
          folderId = await withAuthRetry((token) => ensureAppFolder(token));
          setDriveFolderId(folderId);
        }

        // Ensure planter subfolder (with auth retry)
        const planterFolderId = planterId
          ? await withAuthRetry((token) =>
              ensurePlanterFolder(planterId, folderId, token),
            )
          : folderId;

        // Compress and upload (with auth retry)
        for (const photo of photos) {
          const compressed = await compressImage(photo);
          const timestamp = Date.now();
          const fileName = `${activityDate}_${activityType}_${timestamp}.jpg`;
          const result = await withAuthRetry((token) =>
            uploadFile(compressed, fileName, planterFolderId, token),
          );
          const fileId = result.id;
          photoIds.push(fileId);
        }
        setUploadingPhotos(false);
      }

      const id = generateId();
      const now = nowISO();
      const activity: ActivityLog = {
        id,
        planterId,
        userName: user.name || user.email,
        activityType,
        activityDate,
        memo: note.trim(),
        photoFileIds: photoIds,
        quantity: activityType === 'harvest' ? parseFloat(harvestAmount) || 0 : null,
        unit: activityType === 'harvest' ? harvestUnit : '',
        createdAt: now,
      };

      const row = [
        activity.id,
        activity.planterId,
        activity.userName,
        activity.activityType,
        activity.activityDate,
        activity.memo,
        String(activity.quantity ?? ''),
        activity.unit,
        joinPhotoIds(activity.photoFileIds),
        activity.createdAt,
      ];

      await withAuthRetry((token) =>
        addActivityToSheet(spreadsheetId, row, token),
      );
      addActivityToStore(activity);

      // Cleanup preview URLs
      photoPreviews.forEach((url) => URL.revokeObjectURL(url));

      // Navigate back
      if (planterId) {
        navigate(`/planters/${planterId}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
      setUploadingPhotos(false);
    }
  };

  const activePlanters = planters.filter((p) => p.status === 'active');

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">📝 アクティビティを記録</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Planter selection */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              プランター
            </label>
            <select
              value={planterId}
              onChange={(e) => setPlanterId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-garden-500"
            >
              <option value="">選択なし（全体記録）</option>
              {activePlanters.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.cropName}
                  {p.cropVariety ? ` (${p.cropVariety})` : ''} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Activity type */}
          <div>
            <label className="block text-xs text-gray-500 mb-2">
              アクティビティ種別 *
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Object.entries(ACTIVITY_TYPE_CONFIG).map(([type, config]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setActivityType(type as ActivityType)}
                  className={cn(
                    'flex flex-col items-center py-2 px-1 rounded-lg border text-xs transition',
                    activityType === type
                      ? 'border-garden-500 bg-garden-50 dark:bg-garden-900/20 text-garden-700 dark:text-garden-400'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700',
                  )}
                >
                  <span className="text-lg">{config.emoji}</span>
                  <span className="mt-0.5">{config.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">日付 *</label>
            <input
              type="date"
              value={activityDate}
              onChange={(e) => { setActivityDate(e.target.value); setDateSetFromExif(false); }}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-garden-500"
            />
            {dateSetFromExif && (
              <p className="text-xs text-garden-600 dark:text-garden-400 mt-1">📷 写真のEXIF情報から日付を自動設定しました</p>
            )}
          </div>

          {/* Harvest fields */}
          {activityType === 'harvest' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  収穫量
                </label>
                <input
                  type="number"
                  value={harvestAmount}
                  onChange={(e) => setHarvestAmount(e.target.value)}
                  min="0"
                  step="0.1"
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-garden-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">
                  単位
                </label>
                <select
                  value={harvestUnit}
                  onChange={(e) => setHarvestUnit(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-garden-500"
                >
                  <option value="個">個</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="本">本</option>
                  <option value="束">束</option>
                  <option value="袋">袋</option>
                </select>
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">メモ</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="観察内容、気づいたことなど..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm outline-none focus:ring-2 focus:ring-garden-500 resize-none"
            />
          </div>
        </div>

        {/* Photos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-xs text-gray-500 mb-2">
            写真（最大{IMAGE_SETTINGS.maxPhotosPerActivity}枚）
          </label>

          <div className="flex flex-wrap gap-2">
            {photoPreviews.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden">
                <img
                  src={url}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 text-white rounded-full"
                >
                  <X size={12} />
                </button>
              </div>
            ))}

            {photos.length < IMAGE_SETTINGS.maxPhotosPerActivity && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-garden-500 hover:text-garden-500 transition"
              >
                <Camera size={20} />
                <span className="text-[10px] mt-1">追加</span>
              </button>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handlePhotoSelect}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 bg-garden-600 text-white rounded-lg font-medium hover:bg-garden-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              {uploadingPhotos ? '写真をアップロード中...' : '保存中...'}
            </>
          ) : (
            '記録する'
          )}
        </button>
      </form>
    </div>
  );
}
