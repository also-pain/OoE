import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography } from '../theme/tokens';
import { OoEvent } from '../types/event';
import { useOoE } from '../context/OoEContext';
import { formatFullDate, getTodayQueue } from '../utils/eventUtils';
import { EventCard } from '../components/EventCard';

interface TodayScreenProps {
  onSelectEvent: (event: OoEvent) => void;
  onAddEvent: () => void;
}

export function TodayScreen({ onSelectEvent, onAddEvent }: TodayScreenProps) {
  const { events, preferences, themeColors } = useOoE();
  const now = new Date();

  const queue = useMemo(() => getTodayQueue(events, now), [events, now.getMinutes()]);

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: themeColors.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.dateBanner}>
        <View>
          <Text style={[styles.eyebrow, { color: themeColors.textMuted }]}>
            TODAY&apos;S ORDER OF EVENTS
          </Text>
          <Text style={[styles.dateTitle, { color: themeColors.textPrimary }]}>
            {formatFullDate(now)}
          </Text>
        </View>
        <View
          style={[
            styles.countPill,
            {
              backgroundColor: themeColors.primaryTint,
              borderColor: themeColors.primaryBorder,
            },
          ]}
        >
          <Text style={[styles.countText, { color: themeColors.primary }]}>
            {queue.allToday.length} {queue.allToday.length === 1 ? 'EVENT' : 'EVENTS'}
          </Text>
        </View>
      </View>

      {queue.allToday.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Ionicons
            name="calendar-clear-outline"
            size={36}
            color={themeColors.textMuted}
          />
          <Text style={[styles.emptyTitle, { color: themeColors.textPrimary }]}>
            No events scheduled for today
          </Text>
          <Text style={[styles.emptyBody, { color: themeColors.textMuted }]}>
            Add an upcoming meeting, briefing, or engagement to your Order of Events.
          </Text>
          <TouchableOpacity
            style={[styles.emptyBtn, { backgroundColor: themeColors.primary }]}
            onPress={onAddEvent}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color={themeColors.textInverse} />
            <Text style={[styles.emptyBtnText, { color: themeColors.textInverse }]}>
              Schedule Event
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {queue.upNext && (
            <View style={styles.section}>
              <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>
                UP NEXT
              </Text>
              <EventCard
                event={queue.upNext}
                reminderHoursBefore={preferences.reminderHoursBefore}
                variant="hero"
                onPress={onSelectEvent}
              />
            </View>
          )}

          {queue.upcoming.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>
                  LATER TODAY
                </Text>
                <Text style={[styles.sectionMeta, { color: themeColors.textMuted }]}>
                  {queue.upcoming.length} upcoming
                </Text>
              </View>
              {queue.upcoming.map((event, idx) => (
                <EventCard
                  key={event.id}
                  event={event}
                  reminderHoursBefore={preferences.reminderHoursBefore}
                  variant="queue"
                  isLast={idx === queue.upcoming.length - 1 && queue.concluded.length === 0}
                  onPress={onSelectEvent}
                />
              ))}
            </View>
          )}

          {queue.concluded.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>
                  CONCLUDED
                </Text>
                <Text style={[styles.sectionMeta, { color: themeColors.textMuted }]}>
                  {queue.concluded.length} earlier
                </Text>
              </View>
              {queue.concluded.map((event, idx) => (
                <EventCard
                  key={event.id}
                  event={event}
                  reminderHoursBefore={preferences.reminderHoursBefore}
                  variant="queue"
                  isConcluded
                  isLast={idx === queue.concluded.length - 1}
                  onPress={onSelectEvent}
                />
              ))}
            </View>
          )}
        </>
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
  dateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
  },
  eyebrow: {
    ...typography.labelSm,
    marginBottom: 4,
  },
  dateTitle: {
    ...typography.headlineLg,
  },
  countPill: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  countText: {
    ...typography.labelSm,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionLabel: {
    ...typography.labelSm,
    marginBottom: spacing.sm,
  },
  sectionMeta: {
    ...typography.labelSm,
  },
  emptyCard: {
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.xxl,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  emptyTitle: {
    ...typography.headlineSm,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyBody: {
    ...typography.bodyMd,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
  },
  emptyBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
});
