import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMonthGrid,
  formatCountdown,
  formatDateKey,
  formatReminderLeadTime,
  getEventsForDate,
  getReminderTriggerDate,
  getTodayQueue,
  mergeEventsForSync,
  sortEventsChronologically,
} from './eventUtils';
import type { OoEvent } from '../types/event';

function makeEvent(overrides: Partial<OoEvent> & { id: string; dateTimeIso: string }): OoEvent {
  return {
    occasion: 'Constituency Briefing',
    place: 'Town Hall',
    organiser: 'Chief Engineer',
    createdAt: '2026-11-25T06:00:00.000Z',
    updatedAt: '2026-11-25T06:00:00.000Z',
    ...overrides,
  };
}

describe('eventUtils', () => {
  it('sorts events chronologically and excludes deleted tombstones', () => {
    const events = [
      makeEvent({ id: '3', dateTimeIso: '2026-11-25T16:00:00' }),
      makeEvent({ id: '1', dateTimeIso: '2026-11-25T09:00:00' }),
      makeEvent({ id: '2', dateTimeIso: '2026-11-25T12:30:00', deleted: true }),
    ];

    const sorted = sortEventsChronologically(events);
    assert.deepEqual(
      sorted.map((e) => e.id),
      ['1', '3']
    );
  });

  it('builds TodayQueue with upNext, upcoming, and concluded in time-sorted order', () => {
    const now = new Date('2026-11-25T11:00:00');
    const events = [
      makeEvent({ id: 'past', dateTimeIso: '2026-11-25T08:30:00' }),
      makeEvent({ id: 'later', dateTimeIso: '2026-11-25T15:00:00' }),
      makeEvent({ id: 'next', dateTimeIso: '2026-11-25T11:45:00' }),
      makeEvent({ id: 'tomorrow', dateTimeIso: '2026-11-26T09:00:00' }),
    ];

    const queue = getTodayQueue(events, now);
    assert.equal(queue.upNext?.id, 'next');
    assert.deepEqual(
      queue.upcoming.map((e) => e.id),
      ['later']
    );
    assert.deepEqual(
      queue.concluded.map((e) => e.id),
      ['past']
    );
    assert.equal(queue.allToday.length, 3);
  });

  it('computes reminder trigger date using default 3 hours or custom hours', () => {
    const triggerDefault = getReminderTriggerDate('2026-11-25T14:00:00.000Z', 3);
    assert.equal(triggerDefault.toISOString(), '2026-11-25T11:00:00.000Z');

    const triggerHalfHour = getReminderTriggerDate('2026-11-25T14:00:00.000Z', 0.5);
    assert.equal(triggerHalfHour.toISOString(), '2026-11-25T13:30:00.000Z');

    assert.equal(formatReminderLeadTime(3), '3h before');
    assert.equal(formatReminderLeadTime(1.5), '1h 30m before');
    assert.equal(formatReminderLeadTime(0.25), '15m before');
    assert.equal(formatReminderLeadTime(0), 'At event time');
  });

  it('formats countdown accurately', () => {
    const now = new Date('2026-11-25T10:00:00');
    assert.equal(formatCountdown('2026-11-25T10:45:00', now), 'In 45m');
    assert.equal(formatCountdown('2026-11-25T12:15:00', now), 'In 2h 15m');
    assert.equal(formatCountdown('2026-11-25T09:55:00', now), 'In Session');
    assert.equal(formatCountdown('2026-11-25T08:00:00', now), 'Concluded');
  });

  it('builds a 42-cell month grid with accurate event counts', () => {
    const events = [
      makeEvent({ id: 'a', dateTimeIso: '2026-11-25T09:00:00' }),
      makeEvent({ id: 'b', dateTimeIso: '2026-11-25T14:00:00' }),
      makeEvent({ id: 'c', dateTimeIso: '2026-11-10T10:00:00' }),
    ];
    const today = new Date('2026-11-25T08:00:00');
    const grid = buildMonthGrid(2026, 10, events, today); // Month 10 = November

    assert.equal(grid.length, 42);
    const nov25 = grid.find((c) => c.dateKey === formatDateKey(today));
    if (!nov25) throw new Error('Expected nov25 cell');
    assert.equal(nov25.isToday, true);
    assert.equal(nov25.eventCount, 2);
  });

  it('filters events for a specific date', () => {
    const events = [
      makeEvent({ id: 'a', dateTimeIso: '2026-11-25T18:00:00' }),
      makeEvent({ id: 'b', dateTimeIso: '2026-11-25T09:00:00' }),
      makeEvent({ id: 'c', dateTimeIso: '2026-11-26T09:00:00' }),
    ];
    const forDay = getEventsForDate(events, new Date('2026-11-25T00:00:00'));
    assert.deepEqual(
      forDay.map((e) => e.id),
      ['b', 'a']
    );
  });

  it('merges local and remote events using Last-Write-Wins', () => {
    const local = [
      makeEvent({
        id: '1',
        dateTimeIso: '2026-11-25T09:00:00',
        occasion: 'Old Title',
        updatedAt: '2026-11-25T07:00:00.000Z',
      }),
      makeEvent({
        id: '2',
        dateTimeIso: '2026-11-25T11:00:00',
        occasion: 'Local Only',
        updatedAt: '2026-11-25T08:00:00.000Z',
      }),
    ];
    const remote = [
      makeEvent({
        id: '1',
        dateTimeIso: '2026-11-25T09:00:00',
        occasion: 'Updated On Other Device',
        updatedAt: '2026-11-25T09:30:00.000Z',
      }),
      makeEvent({
        id: '3',
        dateTimeIso: '2026-11-25T15:00:00',
        occasion: 'Remote Only',
        updatedAt: '2026-11-25T09:00:00.000Z',
      }),
    ];

    const merged = mergeEventsForSync(local, remote);
    assert.equal(merged.length, 3);
    assert.equal(merged.find((e) => e.id === '1')?.occasion, 'Updated On Other Device');
    assert.ok(merged.find((e) => e.id === '2'));
    assert.ok(merged.find((e) => e.id === '3'));
  });
});
