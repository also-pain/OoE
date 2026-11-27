import React, { useEffect, useState } from 'react';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Ionicons } from '@expo/vector-icons';
import { radius, spacing, typography } from '../theme/tokens';
import { useOoE } from '../context/OoEContext';
import { ThemeMode } from '../types/event';
import {
  getGoogleOAuthConfig,
  isGoogleOAuthConfigured,
} from '../services/googleSyncService';
import {
  checkForGitHubUpdate,
  CURRENT_APP_VERSION,
  UpdateCheckResult,
} from '../services/updateService';
import { formatReminderLeadTime } from '../utils/eventUtils';

WebBrowser.maybeCompleteAuthSession();

const REMINDER_PRESETS = [
  { label: '15m', hours: 0.25 },
  { label: '30m', hours: 0.5 },
  { label: '1h', hours: 1 },
  { label: '2h', hours: 2 },
  { label: '3h', hours: 3 },
  { label: '6h', hours: 6 },
  { label: '12h', hours: 12 },
  { label: '24h', hours: 24 },
];

const THEME_OPTIONS: Array<{
  label: string;
  value: ThemeMode;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { label: 'System', value: 'system', icon: 'phone-portrait-outline' },
  { label: 'Light', value: 'light', icon: 'sunny-outline' },
  { label: 'Dark', value: 'dark', icon: 'moon-outline' },
];

function splitHoursAndMinutes(totalHours: number): { h: string; m: string } {
  const totalMins = Math.round(Math.max(0, totalHours) * 60);
  return {
    h: String(Math.floor(totalMins / 60)),
    m: String(totalMins % 60),
  };
}

export function SettingsScreen() {
  const {
    preferences,
    googleAccount,
    syncState,
    themeColors,
    notificationPermission,
    requestNotificationPermission,
    updatePreferences,
    signInWithGoogleToken,
    signInDemoAccount,
    signOutGoogle,
    syncNow,
  } = useOoE();

  const initialSplit = splitHoursAndMinutes(preferences.reminderHoursBefore);
  const [customHours, setCustomHours] = useState(initialSplit.h);
  const [customMinutes, setCustomMinutes] = useState(initialSplit.m);
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const isWeb = Platform.OS === 'web';
  const oauthConfigured = isGoogleOAuthConfigured();
  const oauthConfig = getGoogleOAuthConfig();

  const webRedirectUri =
    isWeb && typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname.replace(/\/+$/, '')}/`
      : undefined;

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: oauthConfig.iosClientId || 'placeholder-ios-client-id',
    androidClientId: oauthConfig.androidClientId || 'placeholder-android-client-id',
    webClientId: oauthConfig.webClientId || 'placeholder-web-client-id',
    redirectUri: webRedirectUri,
    scopes: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/drive.appdata',
    ],
  });

  useEffect(() => {
    const split = splitHoursAndMinutes(preferences.reminderHoursBefore);
    setCustomHours(split.h);
    setCustomMinutes(split.m);
  }, [preferences.reminderHoursBefore]);

  useEffect(() => {
    if (response?.type === 'success' && response.authentication?.accessToken) {
      setAuthError(null);
      void signInWithGoogleToken(response.authentication.accessToken).catch((err) => {
        setAuthError(err instanceof Error ? err.message : 'Google Sign-In failed');
      });
    } else if (response?.type === 'error') {
      setAuthError(
        response.error?.message || 'Google Sign-In was rejected or cancelled.'
      );
    }
  }, [response, signInWithGoogleToken]);

  const handleApplyCustomTime = () => {
    const h = Number.parseInt(customHours || '0', 10);
    const m = Number.parseInt(customMinutes || '0', 10);
    if (!Number.isFinite(h) || !Number.isFinite(m) || h < 0 || m < 0) return;
    const totalHours = h + m / 60;
    if (totalHours > 168) return;
    void updatePreferences({ reminderHoursBefore: totalHours });
  };

  const handleGoogleSignIn = () => {
    setAuthError(null);
    if (oauthConfigured && request) {
      void promptAsync();
    } else {
      void signInDemoAccount();
    }
  };

  const handleGrantNotiPermission = async () => {
    const granted = await requestNotificationPermission();
    if (!granted && Platform.OS !== 'web') {
      void Linking.openSettings();
    }
  };

  const handleCheckUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateError(null);
    try {
      const result = await checkForGitHubUpdate();
      setUpdateResult(result);
    } catch (err) {
      setUpdateError(
        err instanceof Error ? err.message : 'Unable to check for updates.'
      );
    } finally {
      setCheckingUpdate(false);
    }
  };

  const lastSyncedLabel = syncState.lastSyncedAt
    ? new Date(syncState.lastSyncedAt).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: themeColors.canvas }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Section 1: Google Account & Cloud Backup */}
      <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>
        GOOGLE ACCOUNT &amp; CLOUD BACKUP
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: themeColors.card,
            borderColor: themeColors.border,
          },
        ]}
      >
        {googleAccount ? (
          <>
            <View style={styles.accountRow}>
              <View
                style={[styles.avatar, { backgroundColor: themeColors.primary }]}
              >
                <Text style={[styles.avatarText, { color: themeColors.textInverse }]}>
                  {googleAccount.name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.accountName, { color: themeColors.textPrimary }]}
                >
                  {googleAccount.name}
                </Text>
                <Text
                  style={[styles.accountEmail, { color: themeColors.textMuted }]}
                >
                  {googleAccount.email}
                </Text>
              </View>
              <View
                style={[
                  styles.syncBadge,
                  syncState.status === 'error'
                    ? {
                        backgroundColor: themeColors.dangerBg,
                        borderColor: themeColors.dangerBorder,
                      }
                    : {
                        backgroundColor: themeColors.emeraldBg,
                        borderColor: themeColors.emeraldBorder,
                      },
                ]}
              >
                <Text
                  style={[
                    styles.syncBadgeText,
                    {
                      color:
                        syncState.status === 'error'
                          ? themeColors.danger
                          : themeColors.emeraldText,
                    },
                  ]}
                >
                  {syncState.status === 'syncing'
                    ? 'SYNCING'
                    : syncState.status === 'error'
                      ? 'ERROR'
                      : 'SYNCED'}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: themeColors.textMuted }]}>
                Last backup:
              </Text>
              <Text style={[styles.metaValue, { color: themeColors.textPrimary }]}>
                {lastSyncedLabel}
              </Text>
            </View>

            {googleAccount.isDemoMode && (
              <Text
                style={[
                  styles.demoNote,
                  {
                    color: themeColors.amber,
                    backgroundColor: themeColors.amberBg,
                    borderColor: themeColors.amberBorder,
                  },
                ]}
              >
                Sandbox sync active. Set EXPO_PUBLIC_GOOGLE_*_CLIENT_ID env vars to
                connect live Google Drive AppData sync across devices.
              </Text>
            )}

            <View
              style={[styles.toggleRow, { borderTopColor: themeColors.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.toggleTitle, { color: themeColors.textPrimary }]}
                >
                  Timely Auto-Backup
                </Text>
                <Text
                  style={[styles.toggleSubtitle, { color: themeColors.textMuted }]}
                >
                  Automatically sync changes to your Google account
                </Text>
              </View>
              <Switch
                value={preferences.autoSyncEnabled}
                onValueChange={(val) => void updatePreferences({ autoSyncEnabled: val })}
                trackColor={{
                  false: themeColors.borderStrong,
                  true: themeColors.primary,
                }}
              />
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  { borderColor: themeColors.borderStrong },
                ]}
                onPress={() => void syncNow()}
                disabled={syncState.status === 'syncing'}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="sync-outline"
                  size={16}
                  color={themeColors.primary}
                />
                <Text
                  style={[styles.secondaryBtnText, { color: themeColors.primary }]}
                >
                  {syncState.status === 'syncing' ? 'Syncing...' : 'Sync Now'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.signOutBtn,
                  {
                    borderColor: themeColors.dangerBorder,
                    backgroundColor: themeColors.dangerBg,
                  },
                ]}
                onPress={() => void signOutGoogle()}
                activeOpacity={0.8}
              >
                <Text style={[styles.signOutText, { color: themeColors.danger }]}>
                  Sign Out
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View>
            <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>
              Back up &amp; sync across devices
            </Text>
            <Text style={[styles.cardBody, { color: themeColors.textMuted }]}>
              Sign in with your Google account to securely back up your Order of Events
              and keep your schedule synchronized across Android and iOS devices.
            </Text>
            {authError && (
              <Text
                style={[
                  styles.demoNote,
                  {
                    color: themeColors.danger,
                    backgroundColor: themeColors.dangerBg,
                    borderColor: themeColors.dangerBorder,
                  },
                ]}
              >
                {authError}
              </Text>
            )}
            <TouchableOpacity
              style={[
                styles.googleSignInBtn,
                { backgroundColor: themeColors.primary },
              ]}
              onPress={handleGoogleSignIn}
              activeOpacity={0.85}
            >
              <Ionicons
                name="logo-google"
                size={18}
                color={themeColors.textInverse}
              />
              <Text
                style={[styles.googleSignInText, { color: themeColors.textInverse }]}
              >
                Sign in with Google
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Section 2: Appearance */}
      <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>
        APPEARANCE
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: themeColors.card,
            borderColor: themeColors.border,
          },
        ]}
      >
        <Text style={[styles.toggleTitle, { color: themeColors.textPrimary }]}>
          Theme Mode
        </Text>
        <Text
          style={[
            styles.toggleSubtitle,
            { color: themeColors.textMuted, marginBottom: spacing.md },
          ]}
        >
          Defaults to your device&apos;s system appearance
        </Text>
        <View style={styles.themeRow}>
          {THEME_OPTIONS.map((opt) => {
            const active = preferences.themeMode === opt.value;
            return (
              <TouchableOpacity
                key={opt.value}
                onPress={() => void updatePreferences({ themeMode: opt.value })}
                style={[
                  styles.themeChip,
                  {
                    borderColor: active
                      ? themeColors.primary
                      : themeColors.borderStrong,
                    backgroundColor: active
                      ? themeColors.primary
                      : themeColors.canvas,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={opt.icon}
                  size={15}
                  color={active ? themeColors.textInverse : themeColors.textPrimary}
                />
                <Text
                  style={[
                    styles.themeChipText,
                    {
                      color: active
                        ? themeColors.textInverse
                        : themeColors.textPrimary,
                    },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Section 3: Advance Reminder (Toggle + Lead Time grouped together) */}
      <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>
        ADVANCE REMINDER
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: themeColors.card,
            borderColor: themeColors.border,
          },
        ]}
      >
        {isWeb && (
          <View
            style={[
              styles.permBanner,
              {
                backgroundColor: themeColors.amberBg,
                borderColor: themeColors.amberBorder,
              },
            ]}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={18}
              color={themeColors.amber}
            />
            <Text style={[styles.permBannerText, { color: themeColors.amber }]}>
              Mobile App Required: Browser PWAs cannot push scheduled reminders or ring
              your phone like an alarm when closed. Install the MySlot Android or iOS
              app to use these features.
            </Text>
          </View>
        )}

        <View style={[styles.toggleRowNoBorder, isWeb && styles.disabledSection]}>
          <View style={styles.toggleIconRow}>
            <View
              style={[
                styles.settingIconBox,
                { backgroundColor: themeColors.primaryTint },
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={18}
                color={themeColors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { color: themeColors.textPrimary }]}>
                Advance Reminder
              </Text>
              <Text style={[styles.toggleSubtitle, { color: themeColors.textMuted }]}>
                Notify {formatReminderLeadTime(preferences.reminderHoursBefore)}
              </Text>
            </View>
          </View>
          <Switch
            value={isWeb ? false : preferences.notificationsEnabled}
            disabled={isWeb}
            onValueChange={(val) =>
              void updatePreferences({ notificationsEnabled: val })
            }
            trackColor={{
              false: themeColors.borderStrong,
              true: themeColors.primary,
            }}
          />
        </View>

        {!isWeb && notificationPermission !== 'granted' && (
          <TouchableOpacity
            onPress={() => void handleGrantNotiPermission()}
            style={[
              styles.permBanner,
              {
                backgroundColor: themeColors.amberBg,
                borderColor: themeColors.amberBorder,
              },
            ]}
            activeOpacity={0.85}
          >
            <Ionicons
              name="notifications-off-outline"
              size={16}
              color={themeColors.amber}
            />
            <Text style={[styles.permBannerText, { color: themeColors.amber }]}>
              Notifications are {notificationPermission}. Tap to grant permission.
            </Text>
          </TouchableOpacity>
        )}

        <View
          style={[
            styles.leadTimeSection,
            { borderTopColor: themeColors.border },
            (isWeb || !preferences.notificationsEnabled) && styles.disabledSection,
          ]}
          pointerEvents={isWeb || !preferences.notificationsEnabled ? 'none' : 'auto'}
        >
          <View style={styles.leadHeaderRow}>
            <Text style={[styles.subLabel, { color: themeColors.textMuted }]}>
              REMINDER LEAD TIME
            </Text>
            <Text style={[styles.defaultHint, { color: themeColors.textMuted }]}>
              Default: 3h
            </Text>
          </View>

          <View style={styles.presetGrid}>
            {REMINDER_PRESETS.map((preset) => {
              const active =
                Math.abs(preferences.reminderHoursBefore - preset.hours) < 0.001;
              return (
                <TouchableOpacity
                  key={preset.label}
                  disabled={isWeb}
                  onPress={() =>
                    void updatePreferences({ reminderHoursBefore: preset.hours })
                  }
                  style={[
                    styles.presetChip,
                    {
                      borderColor: active
                        ? themeColors.primary
                        : themeColors.borderStrong,
                      backgroundColor: active
                        ? themeColors.primary
                        : themeColors.canvas,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      {
                        color: active
                          ? themeColors.textInverse
                          : themeColors.textPrimary,
                      },
                    ]}
                  >
                    {preset.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={[styles.subLabel, { color: themeColors.textMuted }]}>
            CUSTOM TIME BEFORE EVENT
          </Text>
          <View style={styles.customRow}>
            <View style={styles.unitCol}>
              <Text style={[styles.unitCaption, { color: themeColors.textMuted }]}>
                Hours
              </Text>
              <TextInput
                value={customHours}
                editable={!isWeb}
                onChangeText={(t) => setCustomHours(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                style={[
                  styles.customInput,
                  {
                    backgroundColor: themeColors.canvas,
                    borderColor: themeColors.border,
                    color: themeColors.textPrimary,
                  },
                ]}
                placeholder="3"
                placeholderTextColor={themeColors.textMuted}
                maxLength={3}
              />
            </View>

            <View style={styles.unitCol}>
              <Text style={[styles.unitCaption, { color: themeColors.textMuted }]}>
                Minutes
              </Text>
              <TextInput
                value={customMinutes}
                editable={!isWeb}
                onChangeText={(t) => setCustomMinutes(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                style={[
                  styles.customInput,
                  {
                    backgroundColor: themeColors.canvas,
                    borderColor: themeColors.border,
                    color: themeColors.textPrimary,
                  },
                ]}
                placeholder="0"
                placeholderTextColor={themeColors.textMuted}
                maxLength={2}
              />
            </View>

            <TouchableOpacity
              onPress={handleApplyCustomTime}
              disabled={isWeb}
              style={[styles.applyBtn, { backgroundColor: themeColors.primary }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.applyBtnText, { color: themeColors.textInverse }]}>
                Set
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Section 4: Event Alarm (Separate from Advance Reminder) */}
      <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>
        EVENT ALARM
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: themeColors.card,
            borderColor: themeColors.border,
          },
          isWeb && styles.disabledSection,
        ]}
      >
        <View style={styles.toggleRowNoMargin}>
          <View style={styles.toggleIconRow}>
            <View
              style={[
                styles.settingIconBox,
                { backgroundColor: themeColors.amberBg },
              ]}
            >
              <Ionicons
                name="alarm-outline"
                size={18}
                color={themeColors.amber}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { color: themeColors.textPrimary }]}>
                Alarm Ring at Event Time
              </Text>
              <Text style={[styles.toggleSubtitle, { color: themeColors.textMuted }]}>
                Ring phone like an alarm when event starts
              </Text>
            </View>
          </View>
          <Switch
            value={isWeb ? false : preferences.ringOnEvent}
            disabled={isWeb}
            onValueChange={(val) => void updatePreferences({ ringOnEvent: val })}
            trackColor={{
              false: themeColors.borderStrong,
              true: themeColors.primary,
            }}
          />
        </View>
      </View>

      {/* Section 5: App Updates (GitHub Releases) */}
      <Text style={[styles.sectionLabel, { color: themeColors.textMuted }]}>
        APP UPDATES
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: themeColors.card,
            borderColor: themeColors.border,
          },
        ]}
      >
        <View style={styles.updateHeaderRow}>
          <View>
            <Text style={[styles.toggleTitle, { color: themeColors.textPrimary }]}>
              MySlot v{CURRENT_APP_VERSION}
            </Text>
            <Text style={[styles.toggleSubtitle, { color: themeColors.textMuted }]}>
              Source: github.com/also-pain/OoE
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => void handleCheckUpdates()}
            disabled={checkingUpdate}
            style={[
              styles.secondaryBtn,
              { borderColor: themeColors.borderStrong, flex: 0, paddingHorizontal: 14 },
            ]}
            activeOpacity={0.8}
          >
            <Ionicons
              name="refresh-outline"
              size={15}
              color={themeColors.primary}
            />
            <Text style={[styles.secondaryBtnText, { color: themeColors.primary }]}>
              {checkingUpdate ? 'Checking...' : 'Check for Updates'}
            </Text>
          </TouchableOpacity>
        </View>

        {updateError && (
          <Text
            style={[
              styles.demoNote,
              {
                color: themeColors.danger,
                backgroundColor: themeColors.dangerBg,
                borderColor: themeColors.dangerBorder,
                marginTop: spacing.md,
                marginBottom: 0,
              },
            ]}
          >
            {updateError}
          </Text>
        )}

        {updateResult && (
          <View
            style={[
              styles.updateResultBox,
              updateResult.hasUpdate
                ? {
                    backgroundColor: themeColors.amberBg,
                    borderColor: themeColors.amberBorder,
                  }
                : {
                    backgroundColor: themeColors.emeraldBg,
                    borderColor: themeColors.emeraldBorder,
                  },
            ]}
          >
            <Text
              style={[
                styles.updateResultTitle,
                {
                  color: updateResult.hasUpdate
                    ? themeColors.amber
                    : themeColors.emeraldText,
                },
              ]}
            >
              {updateResult.hasUpdate
                ? `New version ${updateResult.tagName} is available!`
                : `You are on the latest version (v${updateResult.currentVersion}).`}
            </Text>
            {updateResult.hasUpdate && (
              <TouchableOpacity
                onPress={() => void Linking.openURL(updateResult.downloadUrl)}
                style={[
                  styles.downloadUpdateBtn,
                  { backgroundColor: themeColors.primary },
                ]}
                activeOpacity={0.85}
              >
                <Ionicons
                  name="download-outline"
                  size={16}
                  color={themeColors.textInverse}
                />
                <Text
                  style={[
                    styles.downloadUpdateText,
                    { color: themeColors.textInverse },
                  ]}
                >
                  Download {updateResult.assetName ?? `MySlot_${updateResult.tagName}.apk`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
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
  sectionLabel: {
    ...typography.labelSm,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  card: {
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  cardTitle: {
    ...typography.headlineSm,
    marginBottom: 6,
  },
  cardBody: {
    ...typography.bodyMd,
    marginBottom: spacing.lg,
  },
  googleSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: radius.sm,
    paddingVertical: 13,
  },
  googleSignInText: {
    fontSize: 15,
    fontWeight: '600',
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    ...typography.labelMd,
    fontWeight: '700',
  },
  accountName: {
    ...typography.headlineSm,
  },
  accountEmail: {
    ...typography.bodySm,
  },
  syncBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.xs,
    borderWidth: 1,
  },
  syncBadgeText: {
    ...typography.labelSm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  metaLabel: {
    ...typography.bodySm,
  },
  metaValue: {
    ...typography.labelMd,
  },
  demoNote: {
    ...typography.bodySm,
    borderWidth: 1,
    borderRadius: radius.xs,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  toggleRowNoBorder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  toggleIconRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  settingIconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  leadTimeSection: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    marginTop: spacing.xs,
  },
  leadHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  defaultHint: {
    ...typography.labelSm,
  },
  toggleTitle: {
    ...typography.headlineSm,
    fontSize: 15,
  },
  toggleSubtitle: {
    ...typography.bodySm,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  signOutBtn: {
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
  },
  signOutText: {
    fontWeight: '600',
    fontSize: 14,
  },
  themeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  themeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 10,
  },
  themeChipText: {
    ...typography.labelMd,
  },
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  permBannerText: {
    ...typography.bodySm,
    flex: 1,
    fontWeight: '500',
  },
  subLabel: {
    ...typography.labelSm,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  presetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  presetChip: {
    width: '23%',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 9,
    alignItems: 'center',
  },
  presetChipText: {
    ...typography.labelMd,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  unitCol: {
    flex: 1,
  },
  unitCaption: {
    ...typography.labelSm,
    marginBottom: 4,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    textAlign: 'center',
    ...typography.labelMd,
  },
  applyBtn: {
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: 11,
    justifyContent: 'center',
  },
  applyBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  disabledSection: {
    opacity: 0.45,
  },
  toggleRowNoMargin: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  updateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  updateResultBox: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    gap: spacing.sm,
  },
  updateResultTitle: {
    ...typography.bodySm,
    fontWeight: '600',
  },
  downloadUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radius.sm,
    paddingVertical: 10,
  },
  downloadUpdateText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
