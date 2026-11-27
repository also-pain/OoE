import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { OoEProvider, useOoE } from './src/context/OoEContext';
import { radius, spacing, ThemeColors, typography } from './src/theme/tokens';
import { AppTab, EventDraft, OoEvent } from './src/types/event';
import {
  checkForGitHubUpdate,
  UpdateCheckResult,
} from './src/services/updateService';
import { ExecutiveHeader } from './src/components/ExecutiveHeader';
import { TodayScreen } from './src/screens/TodayScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { EventFormModal } from './src/screens/EventFormModal';

function OoEShell() {
  const {
    preferences,
    googleAccount,
    syncState,
    isLoading,
    themeColors,
    addEvent,
    updateEvent,
    deleteEvent,
  } = useOoE();

  const [activeTab, setActiveTab] = useState<AppTab>('today');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<OoEvent | null>(null);
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>(undefined);
  const [availableUpdate, setAvailableUpdate] = useState<UpdateCheckResult | null>(
    null
  );

  useEffect(() => {
    const handleUrl = (url: string | null | undefined) => {
      if (!url) return;
      if (url.startsWith('myslot://add')) {
        setEditingEvent(null);
        setModalInitialDate(undefined);
        setActiveTab('today');
        setModalVisible(true);
      }
    };

    void Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', (ev) => handleUrl(ev.url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    let mounted = true;
    void checkForGitHubUpdate()
      .then((res) => {
        if (mounted && res.hasUpdate) {
          setAvailableUpdate(res);
        }
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  const openNewEventModal = (date?: Date) => {
    setEditingEvent(null);
    setModalInitialDate(date);
    setModalVisible(true);
  };

  const openEditEventModal = (event: OoEvent) => {
    setEditingEvent(event);
    setModalInitialDate(undefined);
    setModalVisible(true);
  };

  const handleSaveEvent = async (draft: EventDraft) => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, draft);
    } else {
      await addEvent(draft);
    }
    setModalVisible(false);
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: themeColors.headerBg }]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style="light" />

      <ExecutiveHeader
        googleAccount={googleAccount}
        syncState={syncState}
        onPressSyncBadge={() => setActiveTab('settings')}
      />

      {availableUpdate && (
        <View
          style={[
            styles.updateBanner,
            {
              backgroundColor: themeColors.amberBg,
              borderBottomColor: themeColors.amberBorder,
            },
          ]}
        >
          <Ionicons
            name="arrow-up-circle-outline"
            size={18}
            color={themeColors.amber}
          />
          <Text
            style={[styles.updateBannerText, { color: themeColors.amber }]}
            numberOfLines={1}
          >
            Update {availableUpdate.tagName} available
          </Text>
          <TouchableOpacity
            onPress={() => void Linking.openURL(availableUpdate.downloadUrl)}
            style={[
              styles.updateBannerBtn,
              { backgroundColor: themeColors.primary },
            ]}
          >
            <Text
              style={[
                styles.updateBannerBtnText,
                { color: themeColors.textInverse },
              ]}
            >
              Update
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAvailableUpdate(null)}
            style={{ padding: 4 }}
          >
            <Ionicons name="close" size={16} color={themeColors.amber} />
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.body, { backgroundColor: themeColors.canvas }]}>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={themeColors.primary} />
            <Text style={[styles.loadingText, { color: themeColors.textMuted }]}>
              Loading MySlot...
            </Text>
          </View>
        ) : (
          <>
            {activeTab === 'today' && (
              <TodayScreen
                onSelectEvent={openEditEventModal}
                onAddEvent={() => openNewEventModal()}
              />
            )}
            {activeTab === 'calendar' && (
              <CalendarScreen
                onSelectEvent={openEditEventModal}
                onAddEventForDate={(date) => openNewEventModal(date)}
              />
            )}
            {activeTab === 'settings' && <SettingsScreen />}
          </>
        )}

        {activeTab !== 'settings' && !isLoading && (
          <TouchableOpacity
            style={[
              styles.fab,
              {
                backgroundColor: themeColors.primary,
                borderColor: themeColors.amberBright,
                shadowColor: themeColors.primaryDark,
              },
            ]}
            onPress={() => openNewEventModal()}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Add new event"
          >
            <Ionicons name="add" size={28} color={themeColors.textInverse} />
          </TouchableOpacity>
        )}
      </View>

      <SafeAreaView
        edges={['bottom']}
        style={[
          styles.tabBarSafe,
          {
            backgroundColor: themeColors.card,
            borderTopColor: themeColors.border,
          },
        ]}
      >
        <View style={[styles.tabBar, { backgroundColor: themeColors.card }]}>
          <TabButton
            label="Today"
            icon="list-outline"
            activeIcon="list"
            active={activeTab === 'today'}
            themeColors={themeColors}
            onPress={() => setActiveTab('today')}
          />
          <TabButton
            label="Calendar"
            icon="calendar-outline"
            activeIcon="calendar"
            active={activeTab === 'calendar'}
            themeColors={themeColors}
            onPress={() => setActiveTab('calendar')}
          />
          <TabButton
            label="Settings"
            icon="settings-outline"
            activeIcon="settings"
            active={activeTab === 'settings'}
            themeColors={themeColors}
            onPress={() => setActiveTab('settings')}
          />
        </View>
      </SafeAreaView>

      <EventFormModal
        visible={modalVisible}
        initialEvent={editingEvent}
        initialDate={modalInitialDate}
        reminderHoursBefore={preferences.reminderHoursBefore}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveEvent}
        onDelete={deleteEvent}
      />
    </SafeAreaView>
  );
}

function TabButton({
  label,
  icon,
  activeIcon,
  active,
  themeColors,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  themeColors: ThemeColors;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.tabBtn}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Ionicons
        name={active ? activeIcon : icon}
        size={22}
        color={active ? themeColors.primary : themeColors.textMuted}
      />
      <Text
        style={[
          styles.tabLabel,
          { color: active ? themeColors.primary : themeColors.textMuted },
          active && styles.tabLabelActive,
        ]}
      >
        {label}
      </Text>
      {active && (
        <View
          style={[styles.tabIndicator, { backgroundColor: themeColors.primary }]}
        />
      )}
    </TouchableOpacity>
  );
}

export default function App() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;

    if (!document.querySelector('link[rel="manifest"]')) {
      const link = document.createElement('link');
      link.rel = 'manifest';
      link.href = './manifest.json';
      document.head.appendChild(link);
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(() => undefined);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <OoEProvider>
        <OoEShell />
      </OoEProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  body: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.bodyMd,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  tabBarSafe: {
    borderTopWidth: 1,
  },
  tabBar: {
    flexDirection: 'row',
    height: 58,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    top: 0,
    width: 36,
    height: 2.5,
  },
  updateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  updateBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  updateBannerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.xs,
  },
  updateBannerBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
