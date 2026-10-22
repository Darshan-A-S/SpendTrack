import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useSettingsStore, AppTheme, WeekStartDay } from '../../store/settingsStore';
import { useSalaryStore } from '../../store/salaryStore';
import { useDataStore } from '../../store/dataStore';
import { resetAllData } from '../../db/database';
import { useThemeColor } from '../../hooks/useThemeColor';
import {
  scheduleDailyReminder,
  cancelDailyReminder,
  requestNotificationPermission,
} from '../../services/notificationService';
import { isBiometricsAvailable, promptDeviceUnlock } from '../../services/lockService';
import { Spacing, Radii, Typography } from '../../constants/theme';
import { Strings } from '../../constants/strings';

const CURRENCY_OPTIONS = ['₹', '$', '€', '£', '¥', '₩', 'AED', 'SGD'];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useThemeColor();

  const {
    currency,
    setCurrency,
    theme,
    setTheme,
    weekStart,
    setWeekStart,
    monthStartDay,
    setMonthStartDay,
    reminderEnabled,
    setReminderEnabled,
    reminderTime,
    setReminderTime,
    lockEnabled,
    setLockEnabled,
  } = useSettingsStore();

  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [tempReminderTime, setTempReminderTime] = useState(reminderTime);

  const [monthStartModalVisible, setMonthStartModalVisible] = useState(false);
  const [tempMonthStartDay, setTempMonthStartDay] = useState(monthStartDay.toString());

  // Handle Biometric Lock Toggle
  const handleToggleLock = async (value: boolean) => {
    if (value) {
      const available = await isBiometricsAvailable();
      if (!available) {
        Alert.alert(
          'Biometrics Not Available',
          'Please ensure Face ID, Fingerprint, or a device passcode is set up on this device.'
        );
      }
      const success = await promptDeviceUnlock();
      if (success) {
        setLockEnabled(true);
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch {}
      }
    } else {
      const success = await promptDeviceUnlock();
      if (success) {
        setLockEnabled(false);
      }
    }
  };

  // Handle Daily Reminder Toggle
  const handleToggleReminder = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please enable notifications in system settings to receive daily reminders.'
        );
        return;
      }
      await scheduleDailyReminder(reminderTime);
      setReminderEnabled(true);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    } else {
      await cancelDailyReminder();
      setReminderEnabled(false);
    }
  };

  // Handle Reset All Data
  const handleResetAllData = () => {
    Alert.alert(
      'Reset All Data?',
      'This will permanently delete all expenses, reset pots, and clear your streak so you can start testing from scratch.\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await resetAllData();
              useSalaryStore.getState().resetToInitial();
              useDataStore.getState().bumpDataVersion();
              try {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch {}
              Alert.alert(
                'Data Reset Complete! 🎉',
                'All local data has been cleared and reset. You are ready to start testing from scratch!'
              );
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Could not reset data.');
            }
          },
        },
      ]
    );
  };

  const handleSaveReminderTime = async () => {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(tempReminderTime.trim());
    if (!match) {
      Alert.alert('Invalid Time', 'Please enter time in 24-hour format (HH:mm), e.g. 21:00');
      return;
    }
    setReminderTime(tempReminderTime.trim());
    if (reminderEnabled) {
      await scheduleDailyReminder(tempReminderTime.trim());
    }
    setReminderModalVisible(false);
  };

  const handleSaveMonthStart = () => {
    const parsed = parseInt(tempMonthStartDay, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 31) {
      Alert.alert('Invalid Day', 'Please enter a day between 1 and 31.');
      return;
    }
    setMonthStartDay(parsed);
    setMonthStartModalVisible(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Title */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{Strings.settings.title}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Section: General */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {Strings.settings.generalSection}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Currency Symbol */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="cash-outline" size={20} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                {Strings.settings.currency}
              </Text>
            </View>
            <View style={styles.chipsRow}>
              {CURRENCY_OPTIONS.slice(0, 4).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.miniChip,
                    {
                      backgroundColor: currency === c ? colors.primary : colors.cardAlt,
                      borderColor: currency === c ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={{ color: currency === c ? '#FFF' : colors.text, fontWeight: '700' }}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Theme */}
          <View style={[styles.row, styles.borderTop, { borderColor: colors.border }]}>
            <View style={styles.rowLeft}>
              <Ionicons name="color-palette-outline" size={20} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                {Strings.settings.theme}
              </Text>
            </View>
            <View style={styles.chipsRow}>
              {(['light', 'dark', 'system'] as AppTheme[]).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.miniChip,
                    {
                      backgroundColor: theme === t ? colors.primary : colors.cardAlt,
                      borderColor: theme === t ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setTheme(t)}
                >
                  <Text style={{ color: theme === t ? '#FFF' : colors.text, fontSize: 11, fontWeight: '600' }}>
                    {t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* First day of week */}
          <View style={[styles.row, styles.borderTop, { borderColor: colors.border }]}>
            <View style={styles.rowLeft}>
              <Ionicons name="calendar-number-outline" size={20} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                {Strings.settings.weekStart}
              </Text>
            </View>
            <View style={styles.chipsRow}>
              {(['monday', 'sunday'] as WeekStartDay[]).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.miniChip,
                    {
                      backgroundColor: weekStart === d ? colors.primary : colors.cardAlt,
                      borderColor: weekStart === d ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setWeekStart(d)}
                >
                  <Text style={{ color: weekStart === d ? '#FFF' : colors.text, fontSize: 11, fontWeight: '600' }}>
                    {d === 'monday' ? 'Mon' : 'Sun'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Month Start Day (Salary cycle) */}
          <TouchableOpacity
            style={[styles.row, styles.borderTop, { borderColor: colors.border }]}
            onPress={() => {
              setTempMonthStartDay(monthStartDay.toString());
              setMonthStartModalVisible(true);
            }}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="today-outline" size={20} color={colors.primary} />
              <View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  {Strings.settings.monthStartDay}
                </Text>
                <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                  Day {monthStartDay} of month
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Section: Management Screens */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
          {Strings.settings.dataSection}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => router.push('/categories')}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="grid-outline" size={20} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                {Strings.settings.manageCategories}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, styles.borderTop, { borderColor: colors.border }]}
            onPress={() => router.push('/recurring')}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="repeat-outline" size={20} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                {Strings.settings.manageRecurring}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.row, styles.borderTop, { borderColor: colors.border }]}
            onPress={() => router.push('/export-import')}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>
                {Strings.settings.exportImport}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Section: Security & Notifications */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: Spacing.lg }]}>
          {Strings.settings.securitySection} & {Strings.settings.notificationsSection}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Biometric Lock */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
              <View>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  {Strings.settings.biometricLock}
                </Text>
                <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                  Lock app when in background
                </Text>
              </View>
            </View>
            <Switch
              value={lockEnabled}
              onValueChange={handleToggleLock}
              trackColor={{ false: colors.cardAlt, true: colors.primary }}
            />
          </View>

          {/* Daily Reminder */}
          <View style={[styles.row, styles.borderTop, { borderColor: colors.border }]}>
            <View style={styles.rowLeft}>
              <Ionicons name="alarm-outline" size={20} color={colors.primary} />
              <TouchableOpacity
                onPress={() => {
                  setTempReminderTime(reminderTime);
                  setReminderModalVisible(true);
                }}
              >
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  {Strings.settings.dailyReminder}
                </Text>
                <Text style={[styles.rowSub, { color: colors.primary }]}>
                  Time: {reminderTime} (Tap to change)
                </Text>
              </TouchableOpacity>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={handleToggleReminder}
              trackColor={{ false: colors.cardAlt, true: colors.primary }}
            />
          </View>
        </View>

        {/* Section: Reset & Testing */}
        <Text style={[styles.sectionTitle, { color: '#EF4444', marginTop: Spacing.xl }]}>
          Reset & Testing
        </Text>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: '#EF4444' }]}>
          <TouchableOpacity
            style={styles.row}
            onPress={handleResetAllData}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="trash-bin-outline" size={20} color="#EF4444" />
              <View>
                <Text style={[styles.rowLabel, { color: '#EF4444', fontWeight: '700' }]}>
                  Reset All Data & Start Fresh
                </Text>
                <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                  Delete all expenses, reset pots & streak
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* Section: About & Privacy */}
        <View style={styles.aboutContainer}>
          <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
            SpendTrack v1.0.0
          </Text>
          <Text style={[styles.offlineNotice, { color: colors.textMuted }]}>
            {Strings.settings.offlineNotice}
          </Text>
        </View>
      </ScrollView>

      {/* Reminder Time Modal */}
      <Modal
        visible={reminderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReminderModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {Strings.settings.reminderTime}
            </Text>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Enter time in 24-hour format (HH:mm)
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={tempReminderTime}
              onChangeText={setTempReminderTime}
              placeholder="21:00"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: colors.border }]}
                onPress={() => setReminderModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { backgroundColor: colors.primary }]}
                onPress={handleSaveReminderTime}
              >
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Month Start Day Modal */}
      <Modal
        visible={monthStartModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMonthStartModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {Strings.settings.monthStartDay}
            </Text>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
              Enter starting day of cycle (1 to 31)
            </Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              value={tempMonthStartDay}
              onChangeText={setTempMonthStartDay}
              keyboardType="number-pad"
              maxLength={2}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancel, { borderColor: colors.border }]}
                onPress={() => setMonthStartModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSave, { backgroundColor: colors.primary }]}
                onPress={handleSaveMonthStart}
              >
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  title: {
    ...Typography.titleLarge,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: 40,
  },
  sectionTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    minHeight: 54,
  },
  borderTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  rowLabel: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  rowSub: {
    fontSize: 11,
    marginTop: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  miniChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
    borderWidth: 1,
  },
  aboutContainer: {
    marginTop: Spacing.xl,
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  aboutText: {
    ...Typography.bodySmall,
    fontWeight: '700',
    marginBottom: 4,
  },
  offlineNotice: {
    fontSize: 11,
    textAlign: 'center',
    maxWidth: 280,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalBox: {
    borderRadius: Radii.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    ...Typography.titleSmall,
    fontWeight: '700',
    marginBottom: Spacing.xs,
  },
  inputLabel: {
    ...Typography.caption,
    marginBottom: Spacing.sm,
  },
  modalInput: {
    minHeight: 48,
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    ...Typography.bodyMedium,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  modalCancel: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSave: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
