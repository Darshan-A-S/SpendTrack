import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useRecurring } from '../../hooks/useRecurring';
import { useThemeColor } from '../../hooks/useThemeColor';
import { useSettingsStore } from '../../store/settingsStore';

import { EmptyState } from '../../components/EmptyState';
import { formatCurrency } from '../../utils/money';
import { Spacing, Radii, Typography } from '../../constants/theme';
import { Strings } from '../../constants/strings';
import { RecurringRuleWithCategory } from '../../db/repositories/recurringRepo';

export default function RecurringListScreen() {
  const router = useRouter();
  const { colors } = useThemeColor();
  const currency = useSettingsStore((state) => state.currency);

  const { rules, toggleActive, deleteRule } = useRecurring();

  const handleToggle = async (rule: RecurringRuleWithCategory) => {
    await toggleActive(rule.id, rule.active === 0);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  const handleDelete = (rule: RecurringRuleWithCategory) => {
    Alert.alert(
      Strings.recurring.title,
      Strings.recurring.confirmDelete,
      [
        { text: Strings.common.cancel, style: 'cancel' },
        {
          text: Strings.common.delete,
          style: 'destructive',
          onPress: async () => {
            await deleteRule(rule.id);
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {}
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={Strings.common.back}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>{Strings.recurring.title}</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/recurring/edit')}
          accessibilityRole="button"
          accessibilityLabel={Strings.recurring.addRule}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>{Strings.common.add}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {rules.length === 0 ? (
          <EmptyState
            icon="repeat-outline"
            title={Strings.recurring.emptyTitle}
            description={Strings.recurring.emptyDesc}
            actionLabel={Strings.recurring.addRule}
            onAction={() => router.push('/recurring/edit')}
          />
        ) : (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {rules.map((rule, idx) => (
              <View
                key={rule.id}
                style={[
                  styles.itemRow,
                  idx > 0 && [styles.borderTop, { borderColor: colors.border }],
                ]}
              >
                <View style={styles.left}>
                  <View style={[styles.iconWrap, { backgroundColor: `${rule.category_color}20` }]}>
                    <Ionicons
                      name={(rule.category_icon as any) || 'repeat-outline'}
                      size={20}
                      color={rule.category_color}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.topInfo}>
                      <Text style={[styles.ruleTitle, { color: colors.text }]}>
                        {rule.category_name}
                      </Text>
                      <Text style={[styles.amount, { color: colors.text }]}>
                        {formatCurrency(rule.amount_paise, currency)}
                      </Text>
                    </View>
                    <Text style={[styles.frequencyText, { color: colors.textSecondary }]}>
                      {rule.frequency.toUpperCase()} • Starts {rule.start_date}
                      {rule.note ? ` • ${rule.note}` : ''}
                    </Text>
                  </View>
                </View>

                {/* Actions: Pause/Resume, Edit, Delete */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: rule.active ? `${colors.success}20` : colors.cardAlt,
                      },
                    ]}
                    onPress={() => handleToggle(rule)}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: rule.active ? colors.success : colors.textSecondary },
                      ]}
                    >
                      {rule.active ? Strings.recurring.activeStatus : Strings.recurring.pausedStatus}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => router.push(`/recurring/edit?id=${rule.id}`)}
                  >
                    <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionIconBtn}
                    onPress={() => handleDelete(rule)}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
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
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...Typography.titleSmall,
    fontWeight: '700',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radii.md,
    gap: 4,
  },
  addBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  card: {
    borderRadius: Radii.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    padding: Spacing.md,
  },
  borderTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: Radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  topInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ruleTitle: {
    ...Typography.bodyLarge,
    fontWeight: '700',
  },
  amount: {
    ...Typography.amountMedium,
    fontWeight: '700',
  },
  frequencyText: {
    ...Typography.bodySmall,
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
