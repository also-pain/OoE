import { GoogleAccount, OoEvent } from '../types/event';
import { mergeEventsForSync } from '../utils/eventUtils';
import { loadDemoCloudBackup, saveDemoCloudBackup } from './storageService';

const BACKUP_FILE_NAME = 'ooe_backup_v1.json';
const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';

export interface GoogleOAuthConfig {
  iosClientId?: string;
  androidClientId?: string;
  webClientId?: string;
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  return {
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  };
}

export function isGoogleOAuthConfigured(): boolean {
  const cfg = getGoogleOAuthConfig();
  return Boolean(cfg.iosClientId || cfg.androidClientId || cfg.webClientId);
}

export async function fetchGoogleUserProfile(accessToken: string): Promise<GoogleAccount> {
  const response = await fetch('https://www.googleapis.com/userinfo/v2/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Google profile (${response.status})`);
  }

  const profile = (await response.json()) as {
    id: string;
    email: string;
    name: string;
    picture?: string;
  };

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    avatarUrl: profile.picture,
    accessToken,
    isDemoMode: false,
  };
}

async function findDriveBackupFileId(accessToken: string): Promise<string | null> {
  const query = encodeURIComponent(`name='${BACKUP_FILE_NAME}' and trashed=false`);
  const url = `${DRIVE_FILES_API}?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Google Drive query failed (${res.status})`);
  }

  const data = (await res.json()) as { files?: Array<{ id: string }> };
  return data.files?.[0]?.id ?? null;
}

async function downloadDriveBackup(accessToken: string, fileId: string): Promise<OoEvent[]> {
  const res = await fetch(`${DRIVE_FILES_API}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Google Drive download failed (${res.status})`);
  }

  const payload = (await res.json()) as { events?: OoEvent[] };
  return Array.isArray(payload.events) ? payload.events : [];
}

async function uploadDriveBackup(
  accessToken: string,
  events: OoEvent[],
  existingFileId: string | null
): Promise<void> {
  const payload = JSON.stringify({
    version: 1,
    updatedAt: new Date().toISOString(),
    events,
  });

  if (existingFileId) {
    const res = await fetch(`${DRIVE_UPLOAD_API}/${existingFileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: payload,
    });
    if (!res.ok) {
      throw new Error(`Google Drive update failed (${res.status})`);
    }
    return;
  }

  const boundary = 'ooe_multipart_boundary';
  const metadata = JSON.stringify({
    name: BACKUP_FILE_NAME,
    parents: ['appDataFolder'],
  });

  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${payload}\r\n` +
    `--${boundary}--`;

  const res = await fetch(`${DRIVE_UPLOAD_API}?uploadType=multipart`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Google Drive upload failed (${res.status})`);
  }
}

/**
 * Syncs local events with Google Drive AppData (or local sandbox backup in Demo Mode)
 * using Last-Write-Wins merge so changes across devices are preserved.
 */
export async function syncWithGoogleAccount(
  account: GoogleAccount,
  localEvents: OoEvent[]
): Promise<{ mergedEvents: OoEvent[]; syncedAt: string }> {
  if (account.isDemoMode || !account.accessToken) {
    const remoteEvents = await loadDemoCloudBackup();
    const mergedEvents = mergeEventsForSync(localEvents, remoteEvents);
    await saveDemoCloudBackup(mergedEvents);
    return { mergedEvents, syncedAt: new Date().toISOString() };
  }

  const fileId = await findDriveBackupFileId(account.accessToken);
  const remoteEvents = fileId ? await downloadDriveBackup(account.accessToken, fileId) : [];
  const mergedEvents = mergeEventsForSync(localEvents, remoteEvents);
  await uploadDriveBackup(account.accessToken, mergedEvents, fileId);

  return { mergedEvents, syncedAt: new Date().toISOString() };
}
