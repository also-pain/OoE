import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleAccount, OoEvent, SyncState, UserPreferences } from '../types/event';

const KEYS = {
  EVENTS: '@ooe/events_v1',
  PREFERENCES: '@ooe/preferences_v1',
  ACCOUNT: '@ooe/google_account_v1',
  SYNC_STATE: '@ooe/sync_state_v1',
  DEMO_CLOUD_BACKUP: '@ooe/demo_cloud_backup_v1',
} as const;

export const DEFAULT_PREFERENCES: UserPreferences = {
  reminderHoursBefore: 3,
  notificationsEnabled: true,
  ringOnEvent: true,
  autoSyncEnabled: true,
  themeMode: 'system',
};

export const DEFAULT_SYNC_STATE: SyncState = {
  status: 'idle',
  lastSyncedAt: null,
};

export async function loadEvents(): Promise<OoEvent[]> {
  const raw = await AsyncStorage.getItem(KEYS.EVENTS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OoEvent[];
  } catch {
    return [];
  }
}

export async function saveEvents(events: OoEvent[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.EVENTS, JSON.stringify(events));
}

export async function loadPreferences(): Promise<UserPreferences> {
  const raw = await AsyncStorage.getItem(KEYS.PREFERENCES);
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    return { ...DEFAULT_PREFERENCES, ...(JSON.parse(raw) as Partial<UserPreferences>) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(prefs: UserPreferences): Promise<void> {
  await AsyncStorage.setItem(KEYS.PREFERENCES, JSON.stringify(prefs));
}

export async function loadGoogleAccount(): Promise<GoogleAccount | null> {
  const raw = await AsyncStorage.getItem(KEYS.ACCOUNT);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GoogleAccount;
  } catch {
    return null;
  }
}

export async function saveGoogleAccount(account: GoogleAccount | null): Promise<void> {
  if (!account) {
    await AsyncStorage.removeItem(KEYS.ACCOUNT);
    return;
  }
  await AsyncStorage.setItem(KEYS.ACCOUNT, JSON.stringify(account));
}

export async function loadSyncState(): Promise<SyncState> {
  const raw = await AsyncStorage.getItem(KEYS.SYNC_STATE);
  if (!raw) return DEFAULT_SYNC_STATE;
  try {
    return { ...DEFAULT_SYNC_STATE, ...(JSON.parse(raw) as Partial<SyncState>) };
  } catch {
    return DEFAULT_SYNC_STATE;
  }
}

export async function saveSyncState(state: SyncState): Promise<void> {
  await AsyncStorage.setItem(KEYS.SYNC_STATE, JSON.stringify(state));
}

export async function loadDemoCloudBackup(): Promise<OoEvent[]> {
  const raw = await AsyncStorage.getItem(KEYS.DEMO_CLOUD_BACKUP);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OoEvent[];
  } catch {
    return [];
  }
}

export async function saveDemoCloudBackup(events: OoEvent[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.DEMO_CLOUD_BACKUP, JSON.stringify(events));
}
