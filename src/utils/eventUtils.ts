import { OoEvent } from '../types/event';

/**
 * Formats a Date into a local YYYY-MM-DD key so calendar comparisons
 * never suffer from UTC day-shift bugs.
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getEventDateKey(event: OoEvent): string {
  return formatDateKey(new Date(event.dateTimeIso));
}

export function sortEventsChronologically(events: OoEvent[]): OoEvent[] {
  return events
    .filter((e) => !e.deleted)
    .slice()
    .sort((a, b) => new Date(a.dateTimeIso).getTime() - new Date(b.dateTimeIso).getTime());
}

export function getEventsForDate(events: OoEvent[], targetDate: Date): OoEvent[] {
  const targetKey = formatDateKey(targetDate);
  return sortEventsChronologically(events).filter(
    (event) => getEventDateKey(event) === targetKey
  );
}

export interface TodayQueue {
  upNext: OoEvent | null;
  upcoming: OoEvent[];
  concluded: OoEvent[];
  allToday: OoEvent[];
}

/**
 * Splits today's time-sorted events into the immediate 'Up Next' event,
 * remaining upcoming events, and concluded events.
 */
export function getTodayQueue(events: OoEvent[], now: Date = new Date()): TodayQueue {
  const allToday = getEventsForDate(events, now);
  const nowMs = now.getTime();

  const futureOrActive: OoEvent[] = [];
  const concluded: OoEvent[] = [];

  for (const event of allToday) {
    const eventMs = new Date(event.dateTimeIso).getTime();
    if (eventMs >= nowMs - 15 * 60 * 1000) {
      futureOrActive.push(event);
    } else {
      concluded.push(event);
    }
  }

  const [upNext = null, ...upcoming] = futureOrActive;
  return {
    upNext,
    upcoming,
    concluded,
    allToday,
  };
}

/**
 * Returns the exact Date when a reminder should fire,
 * given the event's ISO timestamp and lead time in hours (default 3).
 */
export function getReminderTriggerDate(
  eventDateIso: string,
  reminderHoursBefore: number
): Date {
  const eventMs = new Date(eventDateIso).getTime();
  const leadMs = Math.max(0, reminderHoursBefore) * 60 * 60 * 1000;
  return new Date(eventMs - leadMs);
}

export function formatReminderLeadTime(hours: number): string {
  const totalMinutes = Math.round(Math.max(0, hours) * 60);
  if (totalMinutes === 0) return 'At event time';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m before`;
  if (m === 0) return `${h}h before`;
  return `${h}h ${m}m before`;
}

export function formatTime12h(dateIso: string): string {
  const date = new Date(dateIso);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatCountdown(targetIso: string, now: Date = new Date()): string {
  const diffMs = new Date(targetIso).getTime() - now.getTime();
  if (diffMs < -15 * 60 * 1000) {
    return 'Concluded';
  }
  if (diffMs <= 0) {
    return 'In Session';
  }
  const totalMinutes = Math.round(diffMs / 60000);
  if (totalMinutes < 60) {
    return `In ${totalMinutes}m`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours < 24) {
    return mins > 0 ? `In ${hours}h ${mins}m` : `In ${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `In ${days}d`;
}

export function formatFullDate(date: Date): string {
  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export interface CalendarDayCell {
  date: Date;
  dateKey: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  isToday: boolean;
  eventCount: number;
}

/**
 * Builds a 42-cell (6 weeks x 7 days, Sunday-first) calendar grid for a given month.
 */
export function buildMonthGrid(
  year: number,
  monthIndex: number,
  events: OoEvent[],
  today: Date = new Date()
): CalendarDayCell[] {
  const countsByDay = new Map<string, number>();
  for (const event of events) {
    if (event.deleted) continue;
    const key = getEventDateKey(event);
    countsByDay.set(key, (countsByDay.get(key) ?? 0) + 1);
  }

  const firstOfMonth = new Date(year, monthIndex, 1);
  const startOffset = firstOfMonth.getDay(); // 0 = Sunday
  const gridStart = new Date(year, monthIndex, 1 - startOffset);
  const todayKey = formatDateKey(today);

  const cells: CalendarDayCell[] = [];
  for (let i = 0; i < 42; i++) {
    const cellDate = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i
    );
    const dateKey = formatDateKey(cellDate);
    cells.push({
      date: cellDate,
      dateKey,
      dayNumber: cellDate.getDate(),
      inCurrentMonth: cellDate.getMonth() === monthIndex,
      isToday: dateKey === todayKey,
      eventCount: countsByDay.get(dateKey) ?? 0,
    });
  }
  return cells;
}

/**
 * Last-Write-Wins merge by `updatedAt` timestamp so multi-device Google Drive
 * backups preserve the latest edits and deletions without duplicates.
 */
export function mergeEventsForSync(local: OoEvent[], remote: OoEvent[]): OoEvent[] {
  const byId = new Map<string, OoEvent>();

  for (const item of [...local, ...remote]) {
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }
    const existingUpdated = new Date(existing.updatedAt).getTime();
    const incomingUpdated = new Date(item.updatedAt).getTime();
    if (incomingUpdated >= existingUpdated) {
      byId.set(item.id, item);
    }
  }

  return Array.from(byId.values()).sort(
    (a, b) => new Date(a.dateTimeIso).getTime() - new Date(b.dateTimeIso).getTime()
  );
}

export function generateEventId(): string {
  return `ooe_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
