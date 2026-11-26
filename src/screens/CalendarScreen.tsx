import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography } from '../theme/tokens';
import { OoEvent } from '../types/event';
import { useOoE } from '../context/OoEContext';
import {
  buildMonthGrid,
  formatDateKey,
  formatFullDate,
  getEventsForDate,
} from '../utils/eventUtils';
import { EventCard } from '../components/EventCard';

const WEEKDAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

interface CalendarScreenProps {
  onSelectEvent: (event: OoEvent) => void;
  onAddEventForDate: (date: Date) => void;
}

export function CalendarScreen({
  onSelectEvent,
  onAddEventForDate,
}: CalendarScreenProps) {
  const { events, preferences, themeColors } = useOoE();
  const today = new Date();

  const [viewMonth, setViewMonth] = useState({
    year: today.getFullYear(),
    monthIndex: today.getMonth(),
  });
  const [selectedDate, setSelectedDate] = useState<Date>(today);

  const cells = useMemo(
    () => buildMonthGrid(viewMonth.year, viewMonth.monthIndex, events, today),
    [viewMonth.year, viewMonth.monthIndex, events]
  );

  const selectedKey = formatDateKey(selectedDate);
  const selectedDayEvents = useMemo(
    () => getEventsForDate(events, selectedDate),
    [events, selectedKey]
  );

  const monthTitle = new Date(viewMonth.year, viewMonth.monthIndex, 1).toLocaleDateString(
    [],
    { month: 'long', year: 'numeric' }
  );

  const goPrevMonth = () => {
    setViewMonth((prev) =>
      prev.monthIndex === 0
        ? { year: prev.year - 1, monthIndex: 11 }
        : { year: prev.year, monthIndex: prev.monthIndex - 1 }
    );
  };

  const goNextMonth = () => {
    setViewMonth((prev) =>
      prev.monthIndex === 11
        ? { year: prev.year + 1, monthIndex: 0 }
        : { year: prev.year, monthIndex: prev.monthIndex + 1 }
    );
  };

  const jumpToToday = () => {
    const now = new Date();
    setViewMonth({ year: now.getFullYear(), monthIndex: now.getMonth() });
    setSelectedDate(now);
  };

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: themeColors.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View
        style={[
          styles.calendarCard,
          {
            backgroundColor: themeColors.card,
            borderColor: themeColors.border,
          },
        ]}
      >
        <View style={styles.monthHeader}>
          <Text style={[styles.monthTitle, { color: themeColors.textPrimary }]}>
            {monthTitle}
          </Text>
          <View style={styles.monthControls}>
            <TouchableOpacity
              onPress={jumpToToday}
              style={[styles.todayBtn, { borderColor: themeColors.borderStrong }]}
            >
              <Text style={[styles.todayBtnText, { color: themeColors.primary }]}>
                TODAY
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goPrevMonth}
              style={[styles.navIconBtn, { borderColor: themeColors.border }]}
            >
              <Ionicons name="chevron-back" size={18} color={themeColors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goNextMonth}
              style={[styles.navIconBtn, { borderColor: themeColors.border }]}
            >
              <Ionicons name="chevron-forward" size={18} color={themeColors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day) => (
            <Text
              key={day}
              style={[styles.weekdayLabel, { color: themeColors.textMuted }]}
            >
              {day}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((cell) => {
            const isSelected = cell.dateKey === selectedKey;
            return (
              <TouchableOpacity
                key={cell.dateKey}
                onPress={() => setSelectedDate(cell.date)}
                style={[
                  styles.dayCell,
                  isSelected && { backgroundColor: themeColors.primary },
                  !isSelected &&
                    cell.isToday && {
                      borderWidth: 1,
                      borderColor: themeColors.primaryBorder,
                      backgroundColor: themeColors.primaryTint,
                    },
                ]}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    { color: themeColors.textPrimary },
                    !cell.inCurrentMonth && { color: themeColors.textDisabled },
                    isSelected && {
                      color: themeColors.textInverse,
                      fontWeight: '700',
                    },
                  ]}
                >
                  {cell.dayNumber}
                </Text>
                <View style={styles.dotRow}>
                  {cell.eventCount > 0 && (
                    <View
                      style={[
                        styles.eventDot,
                        {
                          backgroundColor: isSelected
                            ? themeColors.amberBorder
                            : themeColors.primary,
                        },
                      ]}
                    />
                  )}
                  {cell.eventCount > 1 && (
                    <View
                      style={[
                        styles.eventDot,
                        {
                          backgroundColor: isSelected
                            ? themeColors.amberBorder
                            : themeColors.amberBright,
                        },
                      ]}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.agendaHeader}>
        <View>
          <Text style={[styles.eyebrow, { color: themeColors.textMuted }]}>
            SELECTED DATE AGENDA
          </Text>
          <Text style={[styles.agendaDate, { color: themeColors.textPrimary }]}>
            {formatFullDate(selectedDate)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => onAddEventForDate(selectedDate)}
          style={[
            styles.addForDateBtn,
            {
              borderColor: themeColors.borderStrong,
              backgroundColor: themeColors.card,
            },
          ]}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color={themeColors.primary} />
          <Text style={[styles.addForDateText, { color: themeColors.primary }]}>
            Add
          </Text>
        </TouchableOpacity>
      </View>

      {selectedDayEvents.length === 0 ? (
        <View
          style={[
            styles.emptyDayCard,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text style={[styles.emptyDayText, { color: themeColors.textMuted }]}>
            No events scheduled on this date.
          </Text>
        </View>
      ) : (
        selectedDayEvents.map((event, idx) => (
          <EventCard
            key={event.id}
            event={event}
            reminderHoursBefore={preferences.reminderHoursBefore}
            variant="queue"
            isLast={idx === selectedDayEvents.length - 1}
            onPress={onSelectEvent}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  calendarCard: {
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  monthTitle: {
    ...typography.headlineMd,
  },
  monthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  todayBtn: {
    borderWidth: 1,
    borderRadius: radius.xs,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
  },
  todayBtnText: {
    ...typography.labelSm,
  },
  navIconBtn: {
    width: 30,
    height: 30,
    borderRadius: radius.xs,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  weekdayLabel: {
    ...typography.labelSm,
    flex: 1,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  dayNumber: {
    ...typography.labelMd,
  },
  dotRow: {
    flexDirection: 'row',
    gap: 3,
    height: 6,
    marginTop: 2,
    alignItems: 'center',
  },
  eventDot: {
    width: 5,
    height: 5,
    borderRadius: radius.full,
  },
  agendaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  eyebrow: {
    ...typography.labelSm,
    marginBottom: 2,
  },
  agendaDate: {
    ...typography.headlineMd,
  },
  addForDateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  addForDateText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyDayCard: {
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyDayText: {
    ...typography.bodyMd,
  },
});
