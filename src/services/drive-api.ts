/**
 * Google Drive API wrapper
 * Handles photo upload and retrieval
 */

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

/**
 * Create a folder in Google Drive
 */
export async function createFolder(
  name: string,
  parentId: string | null,
  accessToken: string,
): Promise<string> {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const res = await fetch(`${DRIVE_API_BASE}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!res.ok) throw new Error(`Failed to create folder: ${res.status}`);
  const data = await res.json();
  return data.id;
}

/**
 * Upload a file to Google Drive
 */
export async function uploadFile(
  file: Blob,
  fileName: string,
  folderId: string,
  accessToken: string,
): Promise<{ id: string; webContentLink: string; thumbnailLink: string }> {
  const metadata = {
    name: fileName,
    parents: [folderId],
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' }),
  );
  form.append('file', file);

  const res = await fetch(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,webContentLink,thumbnailLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    },
  );

  if (!res.ok) throw new Error(`Failed to upload file: ${res.status}`);
  return res.json();
}

/**
 * List files in a folder
 */
export async function listFiles(
  folderId: string,
  accessToken: string,
): Promise<
  { id: string; name: string; thumbnailLink: string; webContentLink: string; createdTime: string }[]
> {
  const query = `'${folderId}' in parents and trashed = false`;
  const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name,thumbnailLink,webContentLink,createdTime)&orderBy=createdTime desc`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Failed to list files: ${res.status}`);
  const data = await res.json();
  return data.files ?? [];
}

/**
 * Get a file's thumbnail/download link
 */
export async function getFileLink(
  fileId: string,
  accessToken: string,
): Promise<string> {
  const url = `${DRIVE_API_BASE}/files/${fileId}?fields=webContentLink,thumbnailLink`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Failed to get file link: ${res.status}`);
  const data = await res.json();
  return data.thumbnailLink || data.webContentLink || '';
}

/**
 * Delete a file from Google Drive
 */
export async function deleteFile(
  fileId: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Failed to delete file: ${res.status}`);
}

/**
 * Ensure the root app folder exists, return its ID
 */
export async function ensureAppFolder(
  accessToken: string,
): Promise<string> {
  // Check if niwalog folder exists
  const query = "name = 'niwalog' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
  const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Failed to search for app folder: ${res.status}`);
  const data = await res.json();

  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  // Create it
  return createFolder('niwalog', null, accessToken);
}

/**
 * Ensure a planter subfolder exists
 */
export async function ensurePlanterFolder(
  planterId: string,
  parentFolderId: string,
  accessToken: string,
): Promise<string> {
  const query = `name = '${planterId}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Failed to search for planter folder: ${res.status}`);
  const data = await res.json();

  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  return createFolder(planterId, parentFolderId, accessToken);
}

// ===== Sharing / Permissions =====

export interface DrivePermission {
  id: string;
  type: string;         // "user" | "group" | "domain" | "anyone"
  role: string;         // "owner" | "writer" | "reader"
  emailAddress?: string;
  displayName?: string;
}

/**
 * List permissions on a file / folder
 */
export async function listPermissions(
  fileId: string,
  accessToken: string,
): Promise<DrivePermission[]> {
  const url = `${DRIVE_API_BASE}/files/${fileId}/permissions?fields=permissions(id,type,role,emailAddress,displayName)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Failed to list permissions: ${res.status}`);
  const data = await res.json();
  return data.permissions ?? [];
}

/**
 * Share a file with a specific email address.
 * Sends a notification email by default.
 */
export async function shareFile(
  fileId: string,
  email: string,
  role: 'writer' | 'reader',
  accessToken: string,
  sendNotification = true,
): Promise<DrivePermission> {
  const url = `${DRIVE_API_BASE}/files/${fileId}/permissions?sendNotificationEmail=${sendNotification}&fields=id,type,role,emailAddress,displayName`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'user',
      role,
      emailAddress: email,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`共有の追加に失敗しました: ${res.status} ${JSON.stringify(err)}`);
  }
  return res.json();
}

/**
 * Remove a permission (unshare) from a file
 */
export async function unshareFile(
  fileId: string,
  permissionId: string,
  accessToken: string,
): Promise<void> {
  const res = await fetch(`${DRIVE_API_BASE}/files/${fileId}/permissions/${permissionId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`共有の解除に失敗しました: ${res.status} ${JSON.stringify(err)}`);
  }
}
