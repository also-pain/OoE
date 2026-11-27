import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { radius, spacing, typography } from '../theme/tokens';
import { useOoE } from '../context/OoEContext';
import { EventDraft, OoEvent } from '../types/event';
import { formatReminderLeadTime } from '../utils/eventUtils';
import { ImageViewerModal } from '../components/ImageViewerModal';

interface EventFormModalProps {
  visible: boolean;
  initialEvent?: OoEvent | null;
  initialDate?: Date;
  reminderHoursBefore: number;
  onClose: () => void;
  onSave: (draft: EventDraft) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function EventFormModal({
  visible,
  initialEvent,
  initialDate,
  reminderHoursBefore,
  onClose,
  onSave,
  onDelete,
}: EventFormModalProps) {
  const { themeColors, isDark } = useOoE();
  const [dateTime, setDateTime] = useState<Date>(new Date());
  const [occasion, setOccasion] = useState('');
  const [place, setPlace] = useState('');
  const [organiser, setOrganiser] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showPickerMode, setShowPickerMode] = useState<'date' | 'time' | null>(null);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setShowPickerMode(null);
    setViewerOpen(false);

    if (initialEvent) {
      setDateTime(new Date(initialEvent.dateTimeIso));
      setOccasion(initialEvent.occasion);
      setPlace(initialEvent.place);
      setOrganiser(initialEvent.organiser);
      setPhone(initialEvent.phone ?? '');
      setEmail(initialEvent.email ?? '');
      setNotes(initialEvent.notes ?? '');
      setImageUri(initialEvent.imageUri);
    } else {
      const base = initialDate ? new Date(initialDate) : new Date();
      if (!initialDate) {
        base.setHours(base.getHours() + 1, 0, 0, 0);
      } else {
        base.setHours(10, 0, 0, 0);
      }
      setDateTime(base);
      setOccasion('');
      setPlace('');
      setOrganiser('');
      setPhone('');
      setEmail('');
      setNotes('');
      setImageUri(undefined);
    }
  }, [visible, initialEvent, initialDate]);

  const handlePickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowPickerMode(null);
    }
    if (event.type === 'dismissed' || !selected) return;

    const updated = new Date(dateTime);
    if (showPickerMode === 'date') {
      updated.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    } else if (showPickerMode === 'time') {
      updated.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    }
    setDateTime(updated);
  };

  const adjustTimeMinutes = (deltaMinutes: number) => {
    setDateTime((prev) => new Date(prev.getTime() + deltaMinutes * 60000));
  };

  const adjustDays = (deltaDays: number) => {
    setDateTime((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + deltaDays);
      return next;
    });
  };

  const handlePickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError('Gallery permission is required to attach a photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleCaptureFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError('Camera permission is required to take a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!occasion.trim()) {
      setError('Occasion is required.');
      return;
    }
    if (!place.trim()) {
      setError('Place / Location is required.');
      return;
    }
    if (!organiser.trim()) {
      setError('Organiser name is required.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSave({
        dateTimeIso: dateTime.toISOString(),
        occasion: occasion.trim(),
        place: place.trim(),
        organiser: organiser.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        notes: notes.trim() || undefined,
        imageUri,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save event.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!initialEvent || !onDelete) return;
    if (Platform.OS === 'web') {
      void onDelete(initialEvent.id).then(onClose);
      return;
    }
    Alert.alert(
      'Remove Event',
      `Remove "${initialEvent.occasion}" from your Order of Events?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void onDelete(initialEvent.id).then(onClose);
          },
        },
      ]
    );
  };

  const dateLabel = dateTime.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeLabel = dateTime.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor: themeColors.canvas }]}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: themeColors.card,
              borderBottomColor: themeColors.border,
            },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.headerSideBtn}>
            <Text style={[styles.cancelText, { color: themeColors.textMuted }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
            {initialEvent ? 'Edit Event' : 'New Event'}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={[
              styles.saveBtn,
              { backgroundColor: themeColors.primary },
              saving && styles.disabledBtn,
            ]}
          >
            <Text style={[styles.saveBtnText, { color: themeColors.textInverse }]}>
              {saving ? 'Saving' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            {error && (
              <View
                style={[
                  styles.errorBanner,
                  {
                    backgroundColor: themeColors.dangerBg,
                    borderColor: themeColors.dangerBorder,
                  },
                ]}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={16}
                  color={themeColors.danger}
                />
                <Text style={[styles.errorText, { color: themeColors.danger }]}>
                  {error}
                </Text>
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: themeColors.textMuted }]}>
              REQUIRED DETAILS
            </Text>

            {/* Field 1: Date & Time */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: themeColors.textMuted }]}>
                DATE &amp; TIME *
              </Text>
              <View style={styles.dateTimeRow}>
                <TouchableOpacity
                  style={[
                    styles.pickerChip,
                    {
                      backgroundColor: themeColors.card,
                      borderColor: themeColors.border,
                    },
                  ]}
                  onPress={() =>
                    setShowPickerMode((prev) => (prev === 'date' ? null : 'date'))
                  }
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={themeColors.primary}
                  />
                  <Text
                    style={[
                      styles.pickerChipText,
                      { color: themeColors.textPrimary },
                    ]}
                  >
                    {dateLabel}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.pickerChip,
                    {
                      backgroundColor: themeColors.card,
                      borderColor: themeColors.border,
                    },
                  ]}
                  onPress={() =>
                    setShowPickerMode((prev) => (prev === 'time' ? null : 'time'))
                  }
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="time-outline"
                    size={16}
                    color={themeColors.primary}
                  />
                  <Text
                    style={[
                      styles.pickerChipText,
                      { color: themeColors.textPrimary },
                    ]}
                  >
                    {timeLabel}
                  </Text>
                </TouchableOpacity>
              </View>

              {showPickerMode && Platform.OS !== 'web' && (
                <View
                  style={[
                    styles.nativePickerWrap,
                    {
                      backgroundColor: themeColors.card,
                      borderColor: themeColors.border,
                    },
                  ]}
                >
                  <DateTimePicker
                    value={dateTime}
                    mode={showPickerMode}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    themeVariant={isDark ? 'dark' : 'light'}
                    onChange={handlePickerChange}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      onPress={() => setShowPickerMode(null)}
                      style={styles.donePickerBtn}
                    >
                      <Text
                        style={[styles.donePickerText, { color: themeColors.primary }]}
                      >
                        Done
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {Platform.OS === 'web' && showPickerMode && (
                <View
                  style={[
                    styles.webQuickAdjust,
                    {
                      backgroundColor: themeColors.card,
                      borderColor: themeColors.border,
                    },
                  ]}
                >
                  {showPickerMode === 'date' ? (
                    <View style={styles.adjustRow}>
                      <TouchableOpacity
                        style={[
                          styles.adjustBtn,
                          {
                            backgroundColor: themeColors.primaryTint,
                            borderColor: themeColors.primaryBorder,
                          },
                        ]}
                        onPress={() => adjustDays(-1)}
                      >
                        <Text
                          style={[
                            styles.adjustBtnText,
                            { color: themeColors.primary },
                          ]}
                        >
                          -1 Day
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.adjustBtn,
                          {
                            backgroundColor: themeColors.primaryTint,
                            borderColor: themeColors.primaryBorder,
                          },
                        ]}
                        onPress={() => adjustDays(1)}
                      >
                        <Text
                          style={[
                            styles.adjustBtnText,
                            { color: themeColors.primary },
                          ]}
                        >
                          +1 Day
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.adjustBtn,
                          {
                            backgroundColor: themeColors.primaryTint,
                            borderColor: themeColors.primaryBorder,
                          },
                        ]}
                        onPress={() => adjustDays(7)}
                      >
                        <Text
                          style={[
                            styles.adjustBtnText,
                            { color: themeColors.primary },
                          ]}
                        >
                          +1 Week
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.adjustRow}>
                      <TouchableOpacity
                        style={[
                          styles.adjustBtn,
                          {
                            backgroundColor: themeColors.primaryTint,
                            borderColor: themeColors.primaryBorder,
                          },
                        ]}
                        onPress={() => adjustTimeMinutes(-30)}
                      >
                        <Text
                          style={[
                            styles.adjustBtnText,
                            { color: themeColors.primary },
                          ]}
                        >
                          -30m
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.adjustBtn,
                          {
                            backgroundColor: themeColors.primaryTint,
                            borderColor: themeColors.primaryBorder,
                          },
                        ]}
                        onPress={() => adjustTimeMinutes(30)}
                      >
                        <Text
                          style={[
                            styles.adjustBtnText,
                            { color: themeColors.primary },
                          ]}
                        >
                          +30m
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.adjustBtn,
                          {
                            backgroundColor: themeColors.primaryTint,
                            borderColor: themeColors.primaryBorder,
                          },
                        ]}
                        onPress={() => adjustTimeMinutes(60)}
                      >
                        <Text
                          style={[
                            styles.adjustBtnText,
                            { color: themeColors.primary },
                          ]}
                        >
                          +1h
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Field 2: Occasion */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: themeColors.textMuted }]}>
                OCCASION (SHORT DESCRIPTION) *
              </Text>
              <TextInput
                value={occasion}
                onChangeText={setOccasion}
                placeholder="e.g., Constituency Infrastructure Briefing"
                placeholderTextColor={themeColors.textMuted}
                style={[
                  styles.input,
                  styles.multilineInput,
                  {
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.border,
                    color: themeColors.textPrimary,
                  },
                ]}
                multiline
                maxLength={140}
              />
            </View>

            {/* Field 3: Place / Location */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: themeColors.textMuted }]}>
                PLACE / LOCATION *
              </Text>
              <View
                style={[
                  styles.inputWithIcon,
                  {
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <Ionicons
                  name="location-outline"
                  size={17}
                  color={themeColors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={place}
                  onChangeText={setPlace}
                  placeholder="e.g., Town Hall, Room 204"
                  placeholderTextColor={themeColors.textMuted}
                  style={[styles.iconInputText, { color: themeColors.textPrimary }]}
                  maxLength={100}
                />
              </View>
            </View>

            {/* Field 4: Organiser */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: themeColors.textMuted }]}>
                ORGANISER *
              </Text>
              <View
                style={[
                  styles.inputWithIcon,
                  {
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <Ionicons
                  name="person-outline"
                  size={17}
                  color={themeColors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={organiser}
                  onChangeText={setOrganiser}
                  placeholder="e.g., Chief Engineer R. Sharma"
                  placeholderTextColor={themeColors.textMuted}
                  style={[styles.iconInputText, { color: themeColors.textPrimary }]}
                  maxLength={80}
                />
              </View>
            </View>

            <View
              style={[styles.divider, { backgroundColor: themeColors.border }]}
            />
            <Text style={[styles.sectionTitle, { color: themeColors.textMuted }]}>
              OPTIONAL DETAILS
            </Text>

            {/* Optional Field 5: Phone No. */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: themeColors.textMuted }]}>
                PHONE NO.
              </Text>
              <View
                style={[
                  styles.inputWithIcon,
                  {
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <Ionicons
                  name="call-outline"
                  size={17}
                  color={themeColors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g., +91 98765 43210"
                  placeholderTextColor={themeColors.textMuted}
                  keyboardType="phone-pad"
                  style={[styles.iconInputText, { color: themeColors.textPrimary }]}
                  maxLength={24}
                />
                {Boolean(phone.trim()) && (
                  <TouchableOpacity
                    onPress={() =>
                      void Linking.openURL(`tel:${phone.replace(/[^+\d]/g, '')}`)
                    }
                    style={[
                      styles.inlineActionBtn,
                      { backgroundColor: themeColors.primaryTint },
                    ]}
                  >
                    <Text
                      style={[
                        styles.inlineActionText,
                        { color: themeColors.primary },
                      ]}
                    >
                      Call
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Optional Field 6: Email */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: themeColors.textMuted }]}>
                EMAIL
              </Text>
              <View
                style={[
                  styles.inputWithIcon,
                  {
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.border,
                  },
                ]}
              >
                <Ionicons
                  name="mail-outline"
                  size={17}
                  color={themeColors.textMuted}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="e.g., office@example.com"
                  placeholderTextColor={themeColors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[styles.iconInputText, { color: themeColors.textPrimary }]}
                  maxLength={100}
                />
                {Boolean(email.trim()) && (
                  <TouchableOpacity
                    onPress={() => void Linking.openURL(`mailto:${email.trim()}`)}
                    style={[
                      styles.inlineActionBtn,
                      { backgroundColor: themeColors.primaryTint },
                    ]}
                  >
                    <Text
                      style={[
                        styles.inlineActionText,
                        { color: themeColors.primary },
                      ]}
                    >
                      Mail
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Optional Field 7: Additional Notes */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: themeColors.textMuted }]}>
                ADDITIONAL NOTES
              </Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Talking points, protocol, gate pass, or extra info..."
                placeholderTextColor={themeColors.textMuted}
                style={[
                  styles.input,
                  styles.multilineInput,
                  {
                    backgroundColor: themeColors.card,
                    borderColor: themeColors.border,
                    color: themeColors.textPrimary,
                  },
                ]}
                multiline
                maxLength={400}
              />
            </View>

            {/* Optional Field 8: Attachment */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: themeColors.textMuted }]}>
                PHOTO ATTACHMENT
              </Text>
              <View style={styles.dateTimeRow}>
                {Platform.OS !== 'web' && (
                  <TouchableOpacity
                    style={[
                      styles.pickerChip,
                      {
                        backgroundColor: themeColors.card,
                        borderColor: themeColors.border,
                      },
                    ]}
                    onPress={() => void handleCaptureFromCamera()}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name="camera-outline"
                      size={17}
                      color={themeColors.primary}
                    />
                    <Text
                      style={[
                        styles.pickerChipText,
                        { color: themeColors.textPrimary },
                      ]}
                    >
                      Camera
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[
                    styles.pickerChip,
                    {
                      backgroundColor: themeColors.card,
                      borderColor: themeColors.border,
                    },
                  ]}
                  onPress={() => void handlePickFromGallery()}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="images-outline"
                    size={17}
                    color={themeColors.primary}
                  />
                  <Text
                    style={[
                      styles.pickerChipText,
                      { color: themeColors.textPrimary },
                    ]}
                  >
                    Gallery
                  </Text>
                </TouchableOpacity>
              </View>

              {imageUri && (
                <View style={styles.previewWrap}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => setViewerOpen(true)}
                    style={styles.previewTouch}
                  >
                    <Image
                      source={{ uri: imageUri }}
                      style={[styles.previewImg, { borderColor: themeColors.border }]}
                      resizeMode="cover"
                    />
                    <View style={styles.expandOverlay}>
                      <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
                      <Text style={styles.expandText}>Tap to view</Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setImageUri(undefined)}
                    style={[
                      styles.removeImgBtn,
                      {
                        backgroundColor: themeColors.dangerBg,
                        borderColor: themeColors.dangerBorder,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={16}
                      color={themeColors.danger}
                    />
                    <Text style={[styles.removeImgText, { color: themeColors.danger }]}>
                      Remove Photo
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View
              style={[
                styles.reminderInfoCard,
                {
                  backgroundColor: themeColors.amberBg,
                  borderColor: themeColors.amberBorder,
                },
              ]}
            >
              <Ionicons
                name="notifications-outline"
                size={16}
                color={themeColors.amber}
              />
              <Text style={[styles.reminderInfoText, { color: themeColors.amber }]}>
                Reminder scheduled{' '}
                <Text style={styles.reminderInfoBold}>
                  {formatReminderLeadTime(reminderHoursBefore)}
                </Text>{' '}
                (configurable in Settings).
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[
                styles.primaryCta,
                { backgroundColor: themeColors.primary },
                saving && styles.disabledBtn,
              ]}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.primaryCtaText, { color: themeColors.textInverse }]}
              >
                {initialEvent ? 'Update Event' : 'Schedule Event'}
              </Text>
            </TouchableOpacity>

            {initialEvent && onDelete && (
              <TouchableOpacity
                onPress={handleDelete}
                style={[
                  styles.deleteBtn,
                  {
                    borderColor: themeColors.dangerBorder,
                    backgroundColor: themeColors.dangerBg,
                  },
                ]}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={themeColors.danger}
                />
                <Text style={[styles.deleteBtnText, { color: themeColors.danger }]}>
                  Remove Event
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <ImageViewerModal
        visible={viewerOpen}
        imageUri={imageUri ?? null}
        title={occasion || 'Event Photo'}
        onClose={() => setViewerOpen(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerSideBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '500',
  },
  headerTitle: {
    ...typography.headlineSm,
  },
  saveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 48,
  },
  sectionTitle: {
    ...typography.labelSm,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.bodySm,
    flex: 1,
  },
  fieldGroup: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    ...typography.labelSm,
    marginBottom: spacing.xs,
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pickerChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  pickerChipText: {
    ...typography.labelMd,
    flexShrink: 1,
  },
  nativePickerWrap: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  donePickerBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  donePickerText: {
    fontWeight: '600',
    fontSize: 14,
  },
  webQuickAdjust: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  adjustBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: radius.xs,
    paddingVertical: 8,
    alignItems: 'center',
  },
  adjustBtnText: {
    ...typography.labelMd,
  },
  input: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 15,
  },
  multilineInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    marginRight: 8,
  },
  iconInputText: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
  },
  inlineActionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.xs,
    marginLeft: 6,
  },
  inlineActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reminderInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  reminderInfoText: {
    ...typography.bodySm,
    flex: 1,
  },
  reminderInfoBold: {
    fontWeight: '700',
  },
  primaryCta: {
    borderRadius: radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryCtaText: {
    fontSize: 15,
    fontWeight: '600',
  },
  deleteBtn: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 12,
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  previewWrap: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  previewTouch: {
    position: 'relative',
  },
  previewImg: {
    width: '100%',
    height: 160,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  expandOverlay: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15, 30, 54, 0.78)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
  },
  expandText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  removeImgBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingVertical: 8,
  },
  removeImgText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
