import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography } from '../theme/tokens';
import { useOoE } from '../context/OoEContext';
import { GoogleAccount, SyncState } from '../types/event';

interface ExecutiveHeaderProps {
  title?: string;
  subtitle?: string;
  googleAccount: GoogleAccount | null;
  syncState: SyncState;
  onPressSyncBadge?: () => void;
}

export function ExecutiveHeader({
  title = 'MySlot',
  subtitle = 'Order of Events',
  googleAccount,
  syncState,
  onPressSyncBadge,
}: ExecutiveHeaderProps) {
  const { themeColors } = useOoE();
  const isSynced = Boolean(googleAccount && syncState.status === 'synced');
  const isSyncing = Boolean(googleAccount && syncState.status === 'syncing');
  const isError = Boolean(googleAccount && syncState.status === 'error');

  const dotColor = isSyncing
    ? themeColors.amberBright
    : isError
      ? themeColors.danger
      : isSynced
        ? themeColors.emerald
        : themeColors.textMuted;

  const pillLabel = !googleAccount
    ? 'LOCAL'
    : isSyncing
      ? 'SYNCING'
      : isError
        ? 'SYNC ERR'
        : 'SYNCED';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: themeColors.headerBg,
          borderBottomColor: themeColors.headerBorder,
        },
      ]}
    >
      <View style={styles.brandRow}>
        <View
          style={[
            styles.monogram,
            {
              backgroundColor: themeColors.headerPillBg,
              borderColor: themeColors.headerPillBorder,
            },
          ]}
        >
          <Text style={styles.monogramText}>MS</Text>
        </View>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={onPressSyncBadge}
        activeOpacity={0.75}
        style={[
          styles.syncPill,
          {
            backgroundColor: themeColors.headerPillBg,
            borderColor: themeColors.headerPillBorder,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Cloud sync status"
      >
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={styles.syncText}>{pillLabel}</Text>
        <Ionicons
          name={googleAccount ? 'cloud-done-outline' : 'cloud-offline-outline'}
          size={13}
          color="#FFFFFF"
          style={{ marginLeft: 4, opacity: 0.85 }}
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  monogram: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: {
    ...typography.protocolTime,
    color: '#FFFFFF',
    fontSize: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    ...typography.labelSm,
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginTop: 1,
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    marginRight: 6,
  },
  syncText: {
    ...typography.labelSm,
    color: '#FFFFFF',
  },
});
