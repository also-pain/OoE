import { NativeModules, Platform } from 'react-native';
import { OoEvent } from '../types/event';
import { formatTime12h, getTodayQueue } from '../utils/eventUtils';

interface WidgetBridgeNative {
  updateWidget: (jsonPayload: string) => void;
}

/**
 * Updates all Android Home Screen Widgets (Today List, Up Next Spotlight, Quick Add)
 * with today's time-sorted events. Safe no-op on iOS and Web.
 */
export function syncAndroidWidget(events: OoEvent[]): void {
  if (Platform.OS !== 'android') return;

  const bridge = NativeModules.WidgetBridge as WidgetBridgeNative | undefined;
  if (!bridge?.updateWidget) return;

  const now = new Date();
  const queue = getTodayQueue(events, now);
  const items: Array<{ time: string; occasion: string; place: string }> = [];

  if (queue.upNext) {
    items.push({
      time: formatTime12h(queue.upNext.dateTimeIso),
      occasion: queue.upNext.occasion,
      place: queue.upNext.place,
    });
  }

  for (const ev of queue.upcoming.slice(0, 2)) {
    items.push({
      time: formatTime12h(ev.dateTimeIso),
      occasion: ev.occasion,
      place: ev.place,
    });
  }

  const payload = JSON.stringify({
    dateLabel: now.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    totalToday: queue.allToday.length,
    upNext: queue.upNext
      ? {
          time: formatTime12h(queue.upNext.dateTimeIso),
          occasion: queue.upNext.occasion,
          place: queue.upNext.place,
          organiser: queue.upNext.organiser,
        }
      : null,
    items,
  });

  try {
    bridge.updateWidget(payload);
  } catch {
    // Ignore widget update failures
  }
}
