import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography } from '../theme/tokens';
import { useOoE } from '../context/OoEContext';
import { OoEvent } from '../types/event';
import {
  formatCountdown,
  formatReminderLeadTime,
  formatTime12h,
} from '../utils/eventUtils';

interface EventCardProps {
  event: OoEvent;
  reminderHoursBefore: number;
  variant?: 'hero' | 'queue';
  isLast?: boolean;
  isConcluded?: boolean;
  onPress: (event: OoEvent) => void;
}

export function EventCard({
  event,
  reminderHoursBefore,
  variant = 'queue',
  isLast = false,
  isConcluded = false,
  onPress,
}: EventCardProps) {
  const { themeColors } = useOoE();
  const timeLabel = formatTime12h(event.dateTimeIso);
  const countdown = formatCountdown(event.dateTimeIso);
  const reminderLabel = formatReminderLeadTime(reminderHoursBefore);
  const isLive = countdown === 'In Session';

  if (variant === 'hero') {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(event)}
        style={[
          styles.heroCard,
          {
            backgroundColor: themeColors.card,
            borderColor: themeColors.primary,
            borderLeftColor: themeColors.amberBright,
            shadowColor: themeColors.primaryDark,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Up next: ${event.occasion} at ${timeLabel}`}
      >
        <View style={styles.heroTopRow}>
          <View style={styles.heroTimeGroup}>
            <Text style={[styles.heroTime, { color: themeColors.primary }]}>
              {timeLabel}
            </Text>
            <View
              style={[
                styles.badge,
                isLive
                  ? {
                      backgroundColor: themeColors.emeraldBg,
                      borderColor: themeColors.emeraldBorder,
                    }
                  : {
                      backgroundColor: themeColors.amberBg,
                      borderColor: themeColors.amberBorder,
                    },
              ]}
            >
              <View
                style={[
                  styles.badgeDot,
                  {
                    backgroundColor: isLive
                      ? themeColors.emerald
                      : themeColors.amberBright,
                  },
                ]}
              />
              <Text
                style={[
                  styles.badgeText,
                  { color: isLive ? themeColors.emeraldText : themeColors.amber },
                ]}
              >
                {countdown.toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={styles.reminderTag}>
            <Ionicons
              name="notifications-outline"
              size={12}
              color={themeColors.textMuted}
            />
            <Text style={[styles.reminderTagText, { color: themeColors.textMuted }]}>
              {reminderLabel}
            </Text>
          </View>
        </View>

        <Text style={[styles.heroOccasion, { color: themeColors.textPrimary }]}>
          {event.occasion}
        </Text>

        <View style={styles.metaList}>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={15} color={themeColors.primary} />
            <Text
              style={[styles.metaText, { color: themeColors.textSecondary }]}
              numberOfLines={1}
            >
              {event.place}
            </Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={15} color={themeColors.primary} />
            <Text
              style={[styles.metaText, { color: themeColors.textSecondary }]}
              numberOfLines={1}
            >
              {event.organiser}
            </Text>
          </View>
        </View>
        {event.imageUri && (
          <Image
            source={{ uri: event.imageUri }}
            style={[styles.heroAttachment, { borderColor: themeColors.border }]}
            resizeMode="cover"
          />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.timelineRow}>
      <View style={styles.railCol}>
        <View
          style={[
            styles.railNode,
            { backgroundColor: themeColors.card },
            isConcluded
              ? {
                  borderColor: themeColors.borderStrong,
                  backgroundColor: themeColors.cardMuted,
                }
              : isLive
                ? {
                    borderColor: themeColors.emerald,
                    backgroundColor: themeColors.emerald,
                  }
                : { borderColor: themeColors.primary },
          ]}
        />
        {!isLast && (
          <View style={[styles.railLine, { backgroundColor: themeColors.border }]} />
        )}
      </View>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onPress(event)}
        style={[
          styles.queueCard,
          {
            backgroundColor: isConcluded
              ? themeColors.cardConcluded
              : themeColors.card,
            borderColor: themeColors.border,
          },
          isConcluded && styles.queueCardConcluded,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${event.occasion} at ${timeLabel}`}
      >
        <View style={styles.queueTopRow}>
          <Text
            style={[
              styles.queueTime,
              { color: isConcluded ? themeColors.textMuted : themeColors.primary },
            ]}
          >
            {timeLabel}
          </Text>
          <View
            style={[
              styles.smallBadge,
              isConcluded
                ? {
                    backgroundColor: themeColors.cardMuted,
                    borderColor: themeColors.borderStrong,
                  }
                : {
                    backgroundColor: themeColors.amberBg,
                    borderColor: themeColors.amberBorder,
                  },
            ]}
          >
            <Text
              style={[
                styles.smallBadgeText,
                { color: isConcluded ? themeColors.textMuted : themeColors.amber },
              ]}
            >
              {isConcluded ? 'CONCLUDED' : countdown.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text
          style={[
            styles.queueOccasion,
            { color: isConcluded ? themeColors.textMuted : themeColors.textPrimary },
          ]}
          numberOfLines={2}
        >
          {event.occasion}
        </Text>

        <View style={styles.queueMetaRow}>
          <View style={styles.queueMetaItem}>
            <Ionicons name="location-outline" size={13} color={themeColors.textMuted} />
            <Text
              style={[styles.queueMetaText, { color: themeColors.textMuted }]}
              numberOfLines={1}
            >
              {event.place}
            </Text>
          </View>
          <View style={styles.queueMetaItem}>
            <Ionicons name="person-outline" size={13} color={themeColors.textMuted} />
            <Text
              style={[styles.queueMetaText, { color: themeColors.textMuted }]}
              numberOfLines={1}
            >
              {event.organiser}
            </Text>
          </View>
          {event.imageUri && (
            <View style={styles.queueMetaItem}>
              <Ionicons name="image-outline" size={13} color={themeColors.primary} />
              <Text style={[styles.queueMetaText, { color: themeColors.primary }]}>
                Photo
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderLeftWidth: 4,
    padding: spacing.lg,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  heroTimeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  heroTime: {
    ...typography.protocolTime,
    fontSize: 15,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    marginRight: 5,
  },
  badgeText: {
    ...typography.labelSm,
  },
  reminderTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reminderTagText: {
    ...typography.labelSm,
  },
  heroOccasion: {
    ...typography.headlineMd,
    marginBottom: spacing.md,
  },
  metaList: {
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    ...typography.bodyMd,
    flex: 1,
  },
  metaStrong: {
    fontWeight: '600',
  },
  heroAttachment: {
    marginTop: spacing.md,
    width: '100%',
    height: 120,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  railCol: {
    width: 24,
    alignItems: 'center',
  },
  railNode: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
    marginTop: 18,
    borderWidth: 2,
  },
  railLine: {
    width: 2,
    flex: 1,
    marginTop: 4,
  },
  queueCard: {
    flex: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  queueCardConcluded: {
    opacity: 0.78,
  },
  queueTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  queueTime: {
    ...typography.protocolTime,
  },
  smallBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  smallBadgeText: {
    ...typography.labelSm,
  },
  queueOccasion: {
    ...typography.headlineSm,
    marginBottom: spacing.sm,
  },
  queueMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  queueMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
  },
  queueMetaText: {
    ...typography.bodySm,
    flexShrink: 1,
  },
});
