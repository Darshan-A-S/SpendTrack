import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';

import { getDb } from '../db/database';
import {
  getExpenseById,
  insertExpense,
  updateExpense,
  getRecentNotes,
} from '../db/repositories/expenseRepo';
import { useCategories } from '../hooks/useCategories';
import { useThemeColor } from '../hooks/useThemeColor';
import { useSettingsStore } from '../store/settingsStore';
import { useDataStore } from '../store/dataStore';

import { AmountInput } from '../components/AmountInput';
import { CategoryPicker } from '../components/CategoryPicker';

import { parseToPaise, paiseToRupeeString, formatPaise } from '../utils/money';
import { getTodayDateString } from '../utils/dates';
import { useSalaryStore } from '../store/salaryStore';
import { Spacing, Radii, Typography } from '../constants/theme';
import { Strings } from '../constants/strings';

const PAYMENT_METHODS = [
  Strings.paymentMethods.cash,
  Strings.paymentMethods.upi,
  Strings.paymentMethods.creditCard,
  Strings.paymentMethods.debitCard,
  Strings.paymentMethods.netBanking,
  Strings.paymentMethods.other,
];

export default function AddExpenseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;

  const { colors } = useThemeColor();
  const bumpDataVersion = useDataStore((state) => state.bumpDataVersion);

  const lastUsedCategoryId = useSettingsStore((state) => state.lastUsedCategoryId);
  const lastUsedPaymentMethod = useSettingsStore((state) => state.lastUsedPaymentMethod);
  const setLastUsedCategory = useSettingsStore((state) => state.setLastUsedCategory);
  const setLastUsedPaymentMethod = useSettingsStore((state) => state.setLastUsedPaymentMethod);
  const currency = useSettingsStore((state) => state.currency);

  const isSalaryMode = useSalaryStore((state) => state.isSalaryMode);
  const pots = useSalaryStore((state) => state.pots);
  const spendFromPot = useSalaryStore((state) => state.spendFromPot);
  const refundToPot = useSalaryStore((state) => state.refundToPot);

  const { categories } = useCategories(false);

  // Form State
  const [amountStr, setAmountStr] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(() => getTodayDateString());
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [selectedPotId, setSelectedPotId] = useState<string | null>(null);

  // Track initial pot & amount when editing to properly balance pots on changes
  const [initialPotId, setInitialPotId] = useState<string | null>(null);
  const [initialAmountPaise, setInitialAmountPaise] = useState<number>(0);

  // Errors
  const [amountError, setAmountError] = useState<string | undefined>();
  const [categoryError, setCategoryError] = useState<string | undefined>();

  // Recent notes suggestions
  const [recentNotes, setRecentNotes] = useState<{ note: string; category_id: string }[]>([]);

  // 1. Initial Load for Quick Add or Edit Mode
  useEffect(() => {
    async function load() {
      const db = await getDb();
      // Fetch recent notes for autocomplete
      const pastNotes = await getRecentNotes(db, 15);
      setRecentNotes(pastNotes);

      if (isEditing && params.id) {
        const item = await getExpenseById(db, params.id);
        if (item) {
          setAmountStr(paiseToRupeeString(item.amount_paise));
          setSelectedCategoryId(item.category_id);
          setDate(item.date);
          setPaymentMethod(item.payment_method);

          // Detect Pot:
          // 1. By pot_id if stored
          // 2. Or by parsing [PotName] in note
          let detectedPotId: string | null = item.pot_id || null;
          let cleanNote = item.note || '';

          if (cleanNote.startsWith('[')) {
            const match = /^\[([^\]]+)\]\s*(.*)$/.exec(cleanNote);
            if (match) {
              const potName = match[1];
              const matchingPot = pots.find(
                (p) => p.name.toLowerCase() === potName.toLowerCase() || p.id === detectedPotId
              );
              if (matchingPot) {
                detectedPotId = matchingPot.id;
                cleanNote = match[2];
              }
            }
          }

          setSelectedPotId(detectedPotId);
          setInitialPotId(detectedPotId);
          setInitialAmountPaise(item.amount_paise);
          setNote(cleanNote);
        }
      } else {
        // Quick add: Pre-select last used category and payment method
        if (lastUsedCategoryId) {
          setSelectedCategoryId(lastUsedCategoryId);
        } else if (categories.length > 0) {
          setSelectedCategoryId(categories[0].id);
        }
        if (lastUsedPaymentMethod) {
          setPaymentMethod(lastUsedPaymentMethod);
        }
      }
    }

    load();
  }, [isEditing, params.id, lastUsedCategoryId, lastUsedPaymentMethod, categories.length]);

  // Autocomplete suggestions filtered by current typing
  const filteredSuggestions = useMemo(() => {
    if (!note.trim() || note.length > 50) return [];
    return recentNotes.filter(
      (n) =>
        n.note.toLowerCase().includes(note.toLowerCase()) &&
        n.note.toLowerCase() !== note.toLowerCase()
    );
  }, [note, recentNotes]);

  const handleSelectSuggestion = (suggestion: { note: string; category_id: string }) => {
    setNote(suggestion.note);
    // Auto-fill category if note maps to an existing category
    const catExists = categories.some((c) => c.id === suggestion.category_id);
    if (catExists) {
      setSelectedCategoryId(suggestion.category_id);
    }
  };

  const handleSave = async () => {
    // Validation
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
      const db = await getDb();

      // Handle pot balance updates
      let finalNote = note.trim();

      if (isEditing) {
        // If previously charged to a pot, refund the old amount
        if (initialPotId) {
          refundToPot(initialPotId, initialAmountPaise);
        }
        // If now charged to a pot, spend the new amount
        if (selectedPotId) {
          const pot = pots.find((p) => p.id === selectedPotId);
          if (pot) {
            spendFromPot(selectedPotId, paise);
            const tag = `[${pot.name}]`;
            if (!finalNote.includes(tag)) {
              finalNote = finalNote ? `${tag} ${finalNote}` : tag;
            }
          }
        }
      } else {
        // New expense
        if (selectedPotId) {
          const pot = pots.find((p) => p.id === selectedPotId);
          if (pot) {
            spendFromPot(selectedPotId, paise);
            const tag = `[${pot.name}]`;
            if (!finalNote.includes(tag)) {
              finalNote = finalNote ? `${tag} ${finalNote}` : tag;
            }
          }
        }
      }

      if (isEditing && params.id) {
        await updateExpense(db, {
          id: params.id,
          amount_paise: paise,
          category_id: selectedCategoryId,
          date,
          note: finalNote || null,
          payment_method: paymentMethod,
          pot_id: selectedPotId || null,
        });
      } else {
        const newId = Crypto.randomUUID();
        await insertExpense(db, {
          id: newId,
          amount_paise: paise,
          category_id: selectedCategoryId,
          date,
          note: finalNote || null,
          payment_method: paymentMethod,
          recurring_id: null,
          pot_id: selectedPotId || null,
        });

        // Remember last used category and payment method
        setLastUsedCategory(selectedCategoryId);
        if (paymentMethod) {
          setLastUsedPaymentMethod(paymentMethod);
        }
      }

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}

      bumpDataVersion();
      router.back();
    } catch (e: any) {
      Alert.alert(Strings.common.error, e.message || 'Could not save expense.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={Strings.common.cancel}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {isEditing ? Strings.expenseForm.titleEdit : Strings.expenseForm.titleAdd}
        </Text>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel={Strings.common.save}
        >
          <Text style={styles.saveBtnText}>{Strings.common.save}</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Amount Input */}
          <AmountInput
            value={amountStr}
            onChangeText={(text) => {
              setAmountStr(text);
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

          {/* Date Field */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {Strings.expenseForm.dateLabel} (YYYY-MM-DD)
          </Text>
          <View style={[styles.inputField, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textMuted}
            />
            {date !== getTodayDateString() && (
              <TouchableOpacity onPress={() => setDate(getTodayDateString())}>
                <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>Today</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Note Field with Suggestions */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {Strings.expenseForm.noteLabel}
          </Text>
          <View style={[styles.inputField, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="create-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              value={note}
              onChangeText={setNote}
              placeholder={Strings.expenseForm.notePlaceholder}
              placeholderTextColor={colors.textMuted}
              maxLength={200}
            />
          </View>

          {/* Autocomplete Note Chips */}
          {filteredSuggestions.length > 0 && (
            <View style={styles.suggestionsContainer}>
              <Text style={[styles.suggestionsLabel, { color: colors.textMuted }]}>
                {Strings.expenseForm.recentNotes}:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {filteredSuggestions.map((s, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.suggestionChip, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}
                    onPress={() => handleSelectSuggestion(s)}
                  >
                    <Text style={[styles.suggestionText, { color: colors.text }]}>{s.note}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Payment Method Selector */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            {Strings.expenseForm.paymentMethodLabel}
          </Text>
          <View style={styles.paymentMethodsGrid}>
            {PAYMENT_METHODS.map((pm) => {
              const isSelected = paymentMethod === pm;
              return (
                <TouchableOpacity
                  key={pm}
                  style={[
                    styles.pmChip,
                    {
                      backgroundColor: isSelected ? `${colors.primary}20` : colors.card,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                  onPress={() => setPaymentMethod(isSelected ? null : pm)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.pmText,
                      {
                        color: isSelected ? colors.primary : colors.text,
                        fontWeight: isSelected ? '700' : '500',
                      },
                    ]}
                  >
                    {pm}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Salary Mode: Deduct From Earmarked Pot vs Daily Pool */}
          {isSalaryMode && (
            <View style={{ marginTop: Spacing.md }}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
                Deduct From:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
                <TouchableOpacity
                  style={[
                    styles.pmChip,
                    {
                      backgroundColor: !selectedPotId ? `${colors.primary}20` : colors.card,
                      borderColor: !selectedPotId ? colors.primary : colors.border,
                      marginRight: 8,
                    },
                  ]}
                  onPress={() => setSelectedPotId(null)}
                >
                  <Text
                    style={[
                      styles.pmText,
                      { color: !selectedPotId ? colors.primary : colors.text, fontWeight: '700' },
                    ]}
                  >
                    💳 Daily Spending Pool
                  </Text>
                </TouchableOpacity>

                {pots.map((pot) => {
                  const isSelected = selectedPotId === pot.id;
                  const remaining = Math.max(0, pot.allocatedPaise - pot.spentPaise);
                  return (
                    <TouchableOpacity
                      key={pot.id}
                      style={[
                        styles.pmChip,
                        {
                          backgroundColor: isSelected ? `${pot.color}25` : colors.card,
                          borderColor: isSelected ? pot.color : colors.border,
                          marginRight: 8,
                        },
                      ]}
                      onPress={() => setSelectedPotId(isSelected ? null : pot.id)}
                    >
                      <Text
                        style={[
                          styles.pmText,
                          {
                            color: isSelected ? pot.color : colors.text,
                            fontWeight: isSelected ? '700' : '500',
                          },
                        ]}
                      >
                        {pot.name} ({formatPaise(remaining, currency)})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
  suggestionsContainer: {
    marginTop: Spacing.xs,
    paddingVertical: 4,
  },
  suggestionsLabel: {
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '500',
  },
  suggestionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.full,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  suggestionText: {
    ...Typography.bodySmall,
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  pmChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.full,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
  },
  pmText: {
    ...Typography.bodySmall,
  },
});
