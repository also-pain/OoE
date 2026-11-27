import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import {
  EventDraft,
  GoogleAccount,
  OoEvent,
  SyncState,
  UserPreferences,
} from '../types/event';
import { getThemeColors, ThemeColors } from '../theme/tokens';
import { generateEventId } from '../utils/eventUtils';
import {
  DEFAULT_PREFERENCES,
  DEFAULT_SYNC_STATE,
  loadEvents,
  loadGoogleAccount,
  loadPreferences,
  loadSyncState,
  saveEvents,
  saveGoogleAccount,
  savePreferences,
  saveSyncState,
} from '../services/storageService';
import {
  ensureNotificationPermissions,
  getNotificationPermissionStatus,
  NotificationPermissionState,
  rescheduleAllEventReminders,
} from '../services/notificationService';
import { fetchGoogleUserProfile, syncWithGoogleAccount } from '../services/googleSyncService';
import { syncAndroidWidget } from '../services/widgetService';

interface OoEContextValue {
  events: OoEvent[];
  preferences: UserPreferences;
  googleAccount: GoogleAccount | null;
  syncState: SyncState;
  isLoading: boolean;
  isDark: boolean;
  themeColors: ThemeColors;
  notificationPermission: NotificationPermissionState;
  requestNotificationPermission: () => Promise<boolean>;
  addEvent: (draft: EventDraft) => Promise<OoEvent>;
  updateEvent: (id: string, draft: EventDraft) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  updatePreferences: (partial: Partial<UserPreferences>) => Promise<void>;
  signInWithGoogleToken: (accessToken: string) => Promise<void>;
  signInDemoAccount: () => Promise<void>;
  signOutGoogle: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const OoEContext = createContext<OoEContextValue | undefined>(undefined);

export function OoEProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [events, setEvents] = useState<OoEvent[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(null);
  const [syncState, setSyncState] = useState<SyncState>(DEFAULT_SYNC_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>('undetermined');

  const isDark = useMemo(() => {
    if (preferences.themeMode === 'dark') return true;
    if (preferences.themeMode === 'light') return false;
    return systemScheme === 'dark';
  }, [preferences.themeMode, systemScheme]);

  const themeColors = useMemo(() => getThemeColors(isDark), [isDark]);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    const granted = await ensureNotificationPermissions();
    const status = await getNotificationPermissionStatus();
    setNotificationPermission(status);
    return granted;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [loadedEvents, loadedPrefs, loadedAccount, loadedSync] = await Promise.all([
          loadEvents(),
          loadPreferences(),
          loadGoogleAccount(),
          loadSyncState(),
        ]);
        if (!mounted) return;
        setEvents(loadedEvents);
        setPreferences(loadedPrefs);
        setGoogleAccount(loadedAccount);
        setSyncState(loadedSync);

        // Proactively ask for notification permissions on launch if not yet granted
        if (loadedPrefs.notificationsEnabled) {
          await ensureNotificationPermissions();
        }
        const permStatus = await getNotificationPermissionStatus();
        if (mounted) setNotificationPermission(permStatus);

        await rescheduleAllEventReminders(loadedEvents, loadedPrefs);
        syncAndroidWidget(loadedEvents);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const performSync = useCallback(
    async (account: GoogleAccount, currentEvents: OoEvent[], currentPrefs: UserPreferences) => {
      setSyncState((prev) => ({ ...prev, status: 'syncing', errorMessage: undefined }));
      try {
        const { mergedEvents, syncedAt } = await syncWithGoogleAccount(account, currentEvents);
        setEvents(mergedEvents);
        await saveEvents(mergedEvents);
        await rescheduleAllEventReminders(mergedEvents, currentPrefs);
        syncAndroidWidget(mergedEvents);

        const nextSync: SyncState = { status: 'synced', lastSyncedAt: syncedAt };
        setSyncState(nextSync);
        await saveSyncState(nextSync);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Sync failed';
        const nextSync: SyncState = {
          status: 'error',
          lastSyncedAt: syncState.lastSyncedAt,
          errorMessage: message,
        };
        setSyncState(nextSync);
        await saveSyncState(nextSync);
      }
    },
    [syncState.lastSyncedAt]
  );

  const persistAndSchedule = useCallback(
    async (nextEvents: OoEvent[]) => {
      setEvents(nextEvents);
      await saveEvents(nextEvents);
      await rescheduleAllEventReminders(nextEvents, preferences);
      syncAndroidWidget(nextEvents);
      if (googleAccount && preferences.autoSyncEnabled) {
        void performSync(googleAccount, nextEvents, preferences);
      }
    },
    [googleAccount, performSync, preferences]
  );

  const addEvent = useCallback(
    async (draft: EventDraft): Promise<OoEvent> => {
      const nowIso = new Date().toISOString();
      const newEvent: OoEvent = {
        id: generateEventId(),
        dateTimeIso: draft.dateTimeIso,
        occasion: draft.occasion.trim(),
        place: draft.place.trim(),
        organiser: draft.organiser.trim(),
        phone: draft.phone?.trim() || undefined,
        email: draft.email?.trim() || undefined,
        notes: draft.notes?.trim() || undefined,
        imageUri: draft.imageUri,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      await persistAndSchedule([...events, newEvent]);
      return newEvent;
    },
    [events, persistAndSchedule]
  );

  const updateEvent = useCallback(
    async (id: string, draft: EventDraft): Promise<void> => {
      const nowIso = new Date().toISOString();
      const nextEvents = events.map((ev) =>
        ev.id === id
          ? {
              ...ev,
              dateTimeIso: draft.dateTimeIso,
              occasion: draft.occasion.trim(),
              place: draft.place.trim(),
              organiser: draft.organiser.trim(),
              phone: draft.phone?.trim() || undefined,
              email: draft.email?.trim() || undefined,
              notes: draft.notes?.trim() || undefined,
              imageUri: draft.imageUri,
              updatedAt: nowIso,
            }
          : ev
      );
      await persistAndSchedule(nextEvents);
    },
    [events, persistAndSchedule]
  );

  const deleteEvent = useCallback(
    async (id: string): Promise<void> => {
      const nowIso = new Date().toISOString();
      const nextEvents = events.map((ev) =>
        ev.id === id ? { ...ev, deleted: true, updatedAt: nowIso } : ev
      );
      await persistAndSchedule(nextEvents);
    },
    [events, persistAndSchedule]
  );

  const updatePreferences = useCallback(
    async (partial: Partial<UserPreferences>): Promise<void> => {
      const nextPrefs = { ...preferences, ...partial };
      setPreferences(nextPrefs);
      await savePreferences(nextPrefs);
      if (partial.notificationsEnabled) {
        await requestNotificationPermission();
      }
      await rescheduleAllEventReminders(events, nextPrefs);
    },
    [events, preferences, requestNotificationPermission]
  );

  const signInWithGoogleToken = useCallback(
    async (accessToken: string): Promise<void> => {
      const account = await fetchGoogleUserProfile(accessToken);
      setGoogleAccount(account);
      await saveGoogleAccount(account);
      await performSync(account, events, preferences);
    },
    [events, performSync, preferences]
  );

  const signInDemoAccount = useCallback(async (): Promise<void> => {
    const demoAccount: GoogleAccount = {
      id: 'demo_official_01',
      email: 'office@constituency.gov.example',
      name: 'Hon. Representative Office',
      isDemoMode: true,
    };
    setGoogleAccount(demoAccount);
    await saveGoogleAccount(demoAccount);
    await performSync(demoAccount, events, preferences);
  }, [events, performSync, preferences]);

  const signOutGoogle = useCallback(async (): Promise<void> => {
    setGoogleAccount(null);
    await saveGoogleAccount(null);
    setSyncState(DEFAULT_SYNC_STATE);
    await saveSyncState(DEFAULT_SYNC_STATE);
  }, []);

  const syncNow = useCallback(async (): Promise<void> => {
    if (!googleAccount) return;
    await performSync(googleAccount, events, preferences);
  }, [events, googleAccount, performSync, preferences]);

  return (
    <OoEContext.Provider
      value={{
        events,
        preferences,
        googleAccount,
        syncState,
        isLoading,
        isDark,
        themeColors,
        notificationPermission,
        requestNotificationPermission,
        addEvent,
        updateEvent,
        deleteEvent,
        updatePreferences,
        signInWithGoogleToken,
        signInDemoAccount,
        signOutGoogle,
        syncNow,
      }}
    >
      {children}
    </OoEContext.Provider>
  );
}

export function useOoE(): OoEContextValue {
  const ctx = useContext(OoEContext);
  if (!ctx) {
    throw new Error('useOoE must be used within an OoEProvider');
  }
  return ctx;
}
