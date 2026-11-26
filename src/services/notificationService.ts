import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { OoEvent, UserPreferences } from '../types/event';
import { formatTime12h, getReminderTriggerDate } from '../utils/eventUtils';

const REMINDER_CHANNEL_ID = 'ooe-event-reminders';
const RING_CHANNEL_ID = 'ooe-event-ring';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export type NotificationPermissionState = 'granted' | 'denied' | 'undetermined';

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web') return 'denied';
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

export async function ensureNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
      name: 'MySlot Event Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0F1E36',
    });

    await Notifications.setNotificationChannelAsync(RING_CHANNEL_ID, {
      name: 'MySlot Event Start Alarm',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 600, 250, 600, 250, 600],
      lightColor: '#D97706',
      enableVibrate: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
      },
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/**
 * Cancels all existing scheduled OoE notifications and reschedules:
 * 1) Advance reminder at `reminderHoursBefore` (default 3h) before each event
 * 2) Event-time ring/alert when `ringOnEvent` is enabled (default true)
 */
export async function rescheduleAllEventReminders(
  events: OoEvent[],
  preferences: UserPreferences
): Promise<void> {
  if (Platform.OS === 'web') return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Ignore on platforms where local notifications are unavailable
  }

  if (!preferences.notificationsEnabled) return;

  const hasPermission = await ensureNotificationPermissions();
  if (!hasPermission) return;

  const now = Date.now();

  for (const event of events) {
    if (event.deleted) continue;

    const eventDate = new Date(event.dateTimeIso);
    const eventTimeMs = eventDate.getTime();
    if (eventTimeMs <= now) continue;

    // 1. Advance reminder (e.g., 3h before)
    if (preferences.reminderHoursBefore > 0) {
      const triggerDate = getReminderTriggerDate(
        event.dateTimeIso,
        preferences.reminderHoursBefore
      );

      if (triggerDate.getTime() > now) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `Upcoming: ${event.occasion}`,
              body: `${formatTime12h(event.dateTimeIso)} at ${event.place} • Organiser: ${event.organiser}`,
              data: { eventId: event.id, kind: 'reminder' },
              sound: true,
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: triggerDate,
              channelId: Platform.OS === 'android' ? REMINDER_CHANNEL_ID : undefined,
            },
          });
        } catch {
          // Continue scheduling remaining events
        }
      }
    }

    // 2. Ring phone at exact event time
    if (preferences.ringOnEvent) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `Event Starting Now: ${event.occasion}`,
            body: `${formatTime12h(event.dateTimeIso)} at ${event.place} • Organiser: ${event.organiser}`,
            data: { eventId: event.id, kind: 'ring' },
            sound: 'default',
            interruptionLevel: 'timeSensitive',
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: eventDate,
            channelId: Platform.OS === 'android' ? RING_CHANNEL_ID : undefined,
          },
        });
      } catch {
        // Continue scheduling remaining events
      }
    }
  }
}
