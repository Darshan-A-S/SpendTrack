import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ExpenseWithCategory } from '../db/repositories/expenseRepo';
import { useThemeColor } from '../hooks/useThemeColor';
import { useSettingsStore } from '../store/settingsStore';
import { Spacing, Radii, Typography } from '../constants/theme';
import { formatCurrency } from '../utils/money';
import { isFutureDate } from '../utils/dates';
import { Strings } from '../constants/strings';

interface ExpenseItemProps {
  item: ExpenseWithCategory;
  onPress: (item: ExpenseWithCategory) => void;
  onDelete: (item: ExpenseWithCategory) => void;
  onDuplicate: (item: ExpenseWithCategory) => void;
}

export const ExpenseItem: React.FC<ExpenseItemProps> = ({
  item,
  onPress,
  onDelete,
  onDuplicate,
}) => {
  const { colors } = useThemeColor();
  const currency = useSettingsStore((state) => state.currency);
  const isFuture = isFutureDate(item.date);

  const handleLongPress = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    Alert.alert(
      item.category_name,
      `${formatCurrency(item.amount_paise, currency)} • ${item.note || 'No note'}`,
      [
        {
          text: Strings.common.duplicate,
          onPress: () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {}
            onDuplicate(item);
          },
        },
        {
          text: Strings.common.delete,
          style: 'destructive',
          onPress: () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {}
            onDelete(item);
          },
        },
        { text: Strings.common.cancel, style: 'cancel' },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      onPress={() => onPress(item)}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.category_name}, ${formatCurrency(item.amount_paise, currency)}, ${item.note || ''}`}
      accessibilityHint="Double tap to edit, long press for duplicate or delete"
    >
      {/* Category Icon Badge */}
      <View
        style={[
          styles.iconContainer,
          { backgroundColor: `${item.category_color}20` },
        ]}
      >
        <Ionicons
          name={(item.category_icon as any) || 'pricetag-outline'}
          size={22}
          color={item.category_color}
        />
      </View>

      {/* Expense Details */}
      <View style={styles.contentContainer}>
        <View style={styles.topRow}>
          <Text style={[styles.categoryName, { color: colors.text }]} numberOfLines={1}>
            {item.category_name}
          </Text>
          <Text style={[styles.amount, { color: colors.text }]}>
            {formatCurrency(item.amount_paise, currency)}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <Text
            style={[styles.noteText, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            {item.note || '—'}
          </Text>

          <View style={styles.tagsContainer}>
            {isFuture && (
              <View style={[styles.tag, { backgroundColor: `${colors.info}25` }]}>
                <Text style={[styles.tagText, { color: colors.info }]}>
                  {Strings.home.futureExpenseBadge}
                </Text>
              </View>
            )}

            {item.recurring_id && (
              <View style={[styles.tag, { backgroundColor: `${colors.primary}20` }]}>
                <Ionicons name="repeat-outline" size={12} color={colors.primary} />
                <Text style={[styles.tagText, { color: colors.primary, marginLeft: 2 }]}>
                  {Strings.recurring.generatedBadge}
                </Text>
              </View>
            )}

            {item.payment_method ? (
              <View style={[styles.tag, { backgroundColor: colors.cardAlt }]}>
                <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                  {item.payment_method}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    borderWidth: 1,
    minHeight: 64,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  categoryName: {
    ...Typography.bodyLarge,
    fontWeight: '600',
    flex: 1,
    marginRight: Spacing.sm,
  },
  amount: {
    ...Typography.amountMedium,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteText: {
    ...Typography.bodySmall,
    flex: 1,
    marginRight: Spacing.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.xs,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
});
