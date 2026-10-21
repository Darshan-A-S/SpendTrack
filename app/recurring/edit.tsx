import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useRecurring } from '../../hooks/useRecurring';
import { useCategories } from '../../hooks/useCategories';
import { useThemeColor } from '../../hooks/useThemeColor';

import { AmountInput } from '../../components/AmountInput';
import { CategoryPicker } from '../../components/CategoryPicker';

import { parseToPaise, paiseToRupeeString } from '../../utils/money';
import { getTodayDateString } from '../../utils/dates';
import { RecurringFrequency } from '../../db/repositories/recurringRepo';
import { Spacing, Radii, Typography } from '../../constants/theme';
import { Strings } from '../../constants/strings';

const FREQUENCIES: { key: RecurringFrequency; label: string }[] = [
  { key: 'daily', label: Strings.recurring.frequencies.daily },
  { key: 'weekly', label: Strings.recurring.frequencies.weekly },
  { key: 'monthly', label: Strings.recurring.frequencies.monthly },
  { key: 'yearly', label: Strings.recurring.frequencies.yearly },
];

export default function RecurringEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;

  const { colors } = useThemeColor();
  const { rules, addRule, updateRule } = useRecurring();
  const { categories } = useCategories(false);

  // Form State
  const [amountStr, setAmountStr] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<RecurringFrequency>('monthly');
  const [startDate, setStartDate] = useState(() => getTodayDateString());
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);

  const [amountError, setAmountError] = useState<string | undefined>();
  const [categoryError, setCategoryError] = useState<string | undefined>();

  useEffect(() => {
    if (isEditing && params.id) {
      const existing = rules.find((r) => r.id === params.id);
      if (existing) {
        setAmountStr(paiseToRupeeString(existing.amount_paise));
        setSelectedCategoryId(existing.category_id);
        setFrequency(existing.frequency);
        setStartDate(existing.start_date);
        setEndDate(existing.end_date || '');
        setNote(existing.note || '');
        setPaymentMethod(existing.payment_method);
      }
    } else if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [isEditing, params.id, rules, categories, selectedCategoryId]);

  const handleSave = async () => {
    const paise = parseToPaise(amountStr);
    let hasError = false;

    if (!paise || paise <= 0) {
      setAmountError(Strings.expenseForm.errors.amountRequired);
      hasError = true;
    } else {
      setAmountError(undefined);
    }

    if (!selectedCategoryId) {
      setCategoryError(Strings.expenseForm.errors.categoryRequired);
      hasError = true;
    } else {
      setCategoryError(undefined);
    }

    if (hasError || !paise || !selectedCategoryId) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } catch {}
      return;
    }

    try {
      if (isEditing && params.id) {
        await updateRule(params.id, {
          amount_paise: paise,
          category_id: selectedCategoryId,
          frequency,
          start_date: startDate,
          end_date: endDate.trim() || null,
          note: note.trim() || null,
          payment_method: paymentMethod,
        });
      } else {
        await addRule({
          amount_paise: paise,
          category_id: selectedCategoryId,
          frequency,
          start_date: startDate,
          end_date: endDate.trim() || null,
          note: note.trim() || null,
          payment_method: paymentMethod,
        });
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      router.back();
    } catch (e: any) {
      Alert.alert(Strings.common.error, e.message || 'Could not save recurring rule');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditing ? Strings.recurring.editRule : Strings.recurring.addRule}
        </Text>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>{Strings.common.save}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Amount Input */}
        <AmountInput
          value={amountStr}
          onChangeText={(t) => {
            setAmountStr(t);
            if (amountError) setAmountError(undefined);
          }}
          autoFocus={!isEditing}
          error={amountError}
        />

        {/* Category Picker */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {Strings.expenseForm.categoryLabel}
        </Text>
        <CategoryPicker
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onSelectCategory={(id) => {
            setSelectedCategoryId(id);
            if (categoryError) setCategoryError(undefined);
          }}
          error={categoryError}
        />

        {/* Frequency Selector */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {Strings.recurring.frequency}
        </Text>
        <View style={styles.freqRow}>
          {FREQUENCIES.map((f) => {
            const isSelected = frequency === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.freqChip,
                  {
                    backgroundColor: isSelected ? colors.primary : colors.card,
                    borderColor: isSelected ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setFrequency(f.key)}
              >
                <Text
                  style={[
                    styles.freqText,
                    {
                      color: isSelected ? '#FFF' : colors.text,
                      fontWeight: isSelected ? '700' : '500',
                    },
                  ]}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Start Date */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {Strings.recurring.startDate} (YYYY-MM-DD)
        </Text>
        <View style={[styles.inputField, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Optional End Date */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {Strings.recurring.endDate}
        </Text>
        <View style={[styles.inputField, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="YYYY-MM-DD (Leave empty if ongoing)"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Note */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {Strings.expenseForm.noteLabel}
        </Text>
        <View style={[styles.inputField, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="create-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            style={[styles.textInput, { color: colors.text }]}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Netflix subscription"
            placeholderTextColor={colors.textMuted}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#CCC',
  },
  headerBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...Typography.titleSmall,
    fontWeight: '700',
  },
  saveBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.md,
    minHeight: 36,
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFF',
    ...Typography.bodyMedium,
    fontWeight: '700',
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  sectionTitle: {
    ...Typography.bodySmall,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  freqRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  freqChip: {
    flex: 1,
    minHeight: 40,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freqText: {
    ...Typography.bodySmall,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  textInput: {
    flex: 1,
    ...Typography.bodyMedium,
    paddingVertical: 8,
  },
});
