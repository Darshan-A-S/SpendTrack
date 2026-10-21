import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '../store/settingsStore';
import { useThemeColor } from '../hooks/useThemeColor';
import { getDb } from '../db/database';
import { setBudget } from '../db/repositories/budgetRepo';
import { scheduleDailyReminder, requestNotificationPermission } from '../services/notificationService';
import { parseToPaise } from '../utils/money';
import { Spacing, Radii, Typography } from '../constants/theme';
import { Strings } from '../constants/strings';
import * as Crypto from 'expo-crypto';

const CURRENCIES = ['₹', '$', '€', '£', 'AED', 'SGD'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { colors } = useThemeColor();

  const {
    currency,
    setCurrency,
    setOnboardingDone,
    setReminderEnabled,
    setReminderTime,
  } = useSettingsStore();

  const [selectedCurrency, setSelectedCurrency] = useState(currency || '₹');
  const [budgetStr, setBudgetStr] = useState('');
  const [enableReminder, setEnableReminder] = useState(false);
  const [reminderTimeVal, setReminderTimeVal] = useState('21:00');

  const handleFinish = async () => {
    // 1. Save Currency
    setCurrency(selectedCurrency);

    // 2. Save Budget if entered
    const paise = parseToPaise(budgetStr);
    if (paise && paise > 0) {
      try {
        const db = await getDb();
        await setBudget(db, {
          id: Crypto.randomUUID(),
          category_id: null,
          amount_paise: paise,
        });
      } catch (e) {
        console.error('Failed to set initial budget:', e);
      }
    }

    // 3. Reminder
    if (enableReminder) {
      const granted = await requestNotificationPermission();
      if (granted) {
        await scheduleDailyReminder(reminderTimeVal);
        setReminderEnabled(true);
        setReminderTime(reminderTimeVal);
      }
    }

    // 4. Mark Onboarding as Completed
    setOnboardingDone(true);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}

    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Top Skip Button */}
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={() => {
            setOnboardingDone(true);
            router.replace('/(tabs)');
          }}
          style={styles.skipBtn}
        >
          <Text style={[styles.skipText, { color: colors.textSecondary }]}>
            {Strings.onboarding.skip}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome Hero */}
        <View style={styles.heroContainer}>
          <View style={[styles.logoCircle, { backgroundColor: `${colors.primary}20` }]}>
            <Ionicons name="wallet-outline" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>
            {Strings.onboarding.welcomeTitle}
          </Text>
          <Text style={[styles.welcomeSub, { color: colors.textSecondary }]}>
            {Strings.onboarding.welcomeSubtitle}
          </Text>
        </View>

        {/* Step 1: Choose Currency */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            {Strings.onboarding.currencyTitle}
          </Text>
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
            {Strings.onboarding.currencyDesc}
          </Text>
          <View style={styles.currenciesRow}>
            {CURRENCIES.map((c) => {
              const isSelected = selectedCurrency === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.currencyChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.cardAlt,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setSelectedCurrency(c)}
                >
                  <Text
                    style={[
                      styles.currencyChipText,
                      { color: isSelected ? '#FFFFFF' : colors.text },
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 2: Monthly Budget (Optional) */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>
            {Strings.onboarding.budgetTitle}
          </Text>
          <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
            {Strings.onboarding.budgetDesc}
          </Text>
          <View style={[styles.inputBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Text style={[styles.inputCurrency, { color: colors.textSecondary }]}>
              {selectedCurrency}
            </Text>
            <TextInput
              style={[styles.budgetInput, { color: colors.text }]}
              value={budgetStr}
              onChangeText={setBudgetStr}
              placeholder={Strings.onboarding.budgetPlaceholder}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Step 3: Daily Reminder (Optional) */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.reminderHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.stepTitle, { color: colors.text }]}>
                {Strings.onboarding.reminderTitle}
              </Text>
              <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                {Strings.onboarding.reminderDesc}
              </Text>
            </View>
            <Switch
              value={enableReminder}
              onValueChange={setEnableReminder}
              trackColor={{ false: colors.cardAlt, true: colors.primary }}
            />
          </View>

          {enableReminder && (
            <View style={[styles.reminderTimeBox, { borderTopColor: colors.border }]}>
              <Text style={[styles.timeLabel, { color: colors.textSecondary }]}>
                {Strings.onboarding.reminderTimeLabel} (HH:mm)
              </Text>
              <TextInput
                style={[styles.timeInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                value={reminderTimeVal}
                onChangeText={setReminderTimeVal}
                placeholder="21:00"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          )}
        </View>

        {/* Bottom CTA */}
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleFinish}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>{Strings.onboarding.getStarted}</Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  skipBtn: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    ...Typography.bodyMedium,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 40,
  },
  heroContainer: {
    alignItems: 'center',
    marginVertical: Spacing.lg,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  welcomeTitle: {
    ...Typography.titleLarge,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  welcomeSub: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    maxWidth: 280,
  },
  card: {
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  stepTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
    marginBottom: 2,
  },
  stepDesc: {
    ...Typography.bodySmall,
    marginBottom: Spacing.md,
  },
  currenciesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  currencyChip: {
    width: 48,
    height: 48,
    borderRadius: Radii.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyChipText: {
    ...Typography.titleSmall,
    fontWeight: '700',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  inputCurrency: {
    ...Typography.titleSmall,
    fontWeight: '700',
    marginRight: Spacing.sm,
  },
  budgetInput: {
    flex: 1,
    ...Typography.bodyLarge,
    fontWeight: '600',
    paddingVertical: 8,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderTimeBox: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  timeLabel: {
    ...Typography.caption,
    marginBottom: 4,
  },
  timeInput: {
    minHeight: 40,
    borderRadius: Radii.sm,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    maxWidth: 120,
    ...Typography.bodyMedium,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: 14,
    borderRadius: Radii.lg,
    marginTop: Spacing.md,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    ...Typography.bodyLarge,
    fontWeight: '700',
  },
});
