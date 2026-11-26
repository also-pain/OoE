export interface OoEvent {
  id: string;
  /** ISO-8601 date & time string (Field 1) */
  dateTimeIso: string;
  /** Short description of the occasion (Field 2) */
  occasion: string;
  /** Location name (Field 3) */
  place: string;
  /** Name of the organiser (Field 4) */
  organiser: string;
  /** Optional attached image URI from camera or gallery */
  imageUri?: string;
  createdAt: string;
  updatedAt: string;
  /** Soft-delete tombstone for multi-device sync */
  deleted?: boolean;
  /** Local scheduled notification identifier */
  notificationId?: string;
}

export interface EventDraft {
  dateTimeIso: string;
  occasion: string;
  place: string;
  organiser: string;
  imageUri?: string;
}

export type ThemeMode = 'system' | 'light' | 'dark';

export interface UserPreferences {
  /** Hours before an event to trigger reminder (default: 3) */
  reminderHoursBefore: number;
  notificationsEnabled: boolean;
  /** Ring/alert at the exact event start time (default: true) */
  ringOnEvent: boolean;
  autoSyncEnabled: boolean;
  /** Theme preference: 'system' (default), 'light', or 'dark' */
  themeMode: ThemeMode;
}

export interface GoogleAccount {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  accessToken?: string;
  isDemoMode?: boolean;
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'offline';

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  errorMessage?: string;
}

export type AppTab = 'today' | 'calendar' | 'settings';
