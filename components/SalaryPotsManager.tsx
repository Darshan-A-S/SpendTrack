import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useSalaryStore, getSalaryMetrics, SalaryPot } from '../store/salaryStore';
import { useSettingsStore } from '../store/settingsStore';
import { useThemeColor } from '../hooks/useThemeColor';
import { formatPaise } from '../utils/money';
import { Spacing, Radii, Typography } from '../constants/theme';

export function SalaryPotsManager() {
  const { colors } = useThemeColor();
  const currency = useSettingsStore((state) => state.currency);

  const salaryState = useSalaryStore();
  const {
    isSalaryMode,
    monthlySalaryPaise,
    pots,
    setSalaryMode,
    setMonthlySalary,
    addPot,
    deletePot,
    reallocatePotToSpendable,
  } = salaryState;

  // Transfer Modal (e.g. Travel to Daily Pool)
  const [transferModalPot, setTransferModalPot] = useState<SalaryPot | null>(null);
  const [transferAmountInput, setTransferAmountInput] = useState('');

  // Salary Edit Modal
  const [salaryModalVisible, setSalaryModalVisible] = useState(false);
  const [salaryInput, setSalaryInput] = useState(() => (monthlySalaryPaise / 100).toString());

  // Add Pot Modal
  const [addPotModalVisible, setAddPotModalVisible] = useState(false);
  const [newPotName, setNewPotName] = useState('');
  const [newPotAmount, setNewPotAmount] = useState('');
  const [newPotFlexible, setNewPotFlexible] = useState(false);

  const metrics = getSalaryMetrics(salaryState);

  const handleConfirmTransfer = () => {
    if (!transferModalPot) return;

    const amountRupees = transferAmountInput.trim() ? parseFloat(transferAmountInput) : undefined;
    const result = reallocatePotToSpendable(transferModalPot.id, amountRupees);

    if (result.success) {
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
      Alert.alert(
        'Funds Added to Daily Spending! 🎉',
        `${formatPaise(result.transferredPaise, currency)} has been moved from ${transferModalPot.name} to your Daily Spending Pool. Your daily limit has increased!`
      );
      setTransferModalPot(null);
      setTransferAmountInput('');
    } else {
      Alert.alert('Error', 'Unable to transfer. Check the remaining balance of the pot.');
    }
  };

  const handleSaveSalary = () => {
    const s = parseFloat(salaryInput);
    if (!isNaN(s) && s >= 0) {
      setMonthlySalary(s);
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
    setSalaryModalVisible(false);
  };

  const handleCreatePot = () => {
    if (!newPotName.trim()) {
      Alert.alert('Invalid Name', 'Please enter a name for the pot.');
      return;
    }
    const amt = parseFloat(newPotAmount);
    if (isNaN(amt) || amt < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    addPot({
      name: newPotName.trim(),
      icon: newPotFlexible ? 'airplane-outline' : 'wallet-outline',
      color: newPotFlexible ? '#F59E0B' : '#6366F1',
      allocatedRupees: amt,
      isFlexible: newPotFlexible,
    });

    setNewPotName('');
    setNewPotAmount('');
    setNewPotFlexible(false);
    setAddPotModalVisible(false);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  };

  return (
    <View style={styles.container}>
      {/* Monthly Salary & Mode Card */}
      <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              MONTHLY INCOME
            </Text>
            <Text style={[styles.salaryAmount, { color: colors.text }]}>
              {formatPaise(monthlySalaryPaise, currency)}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.editSalaryBtn, { backgroundColor: `${colors.primary}15` }]}
            onPress={() => {
              setSalaryInput((monthlySalaryPaise / 100).toString());
              setSalaryModalVisible(true);
            }}
          >
            <Ionicons name="pencil" size={14} color={colors.primary} />
            <Text style={[styles.editSalaryBtnText, { color: colors.primary }]}>Edit Salary</Text>
          </TouchableOpacity>
        </View>

        {/* Division Breakdown: Allocated vs Daily Pool */}
        <View style={[styles.breakdownBox, { backgroundColor: colors.cardAlt }]}>
          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
              Earmarked Pots
            </Text>
            <Text style={[styles.breakdownValue, { color: '#8B5CF6' }]}>
              {formatPaise(metrics.totalAllocatedPotsPaise, currency)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
              Daily Spending Pool
            </Text>
            <Text style={[styles.breakdownValue, { color: colors.primary }]}>
              {formatPaise(metrics.discretionaryMonthlyPoolPaise, currency)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownItem}>
            <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>
              Daily Allowance
            </Text>
            <Text style={[styles.breakdownValue, { color: '#10B981' }]}>
              {formatPaise(metrics.dailyAllowancePaise, currency)}/day
            </Text>
          </View>
        </View>
      </View>

      {/* Pots Section Header */}
      <View style={styles.potsHeaderRow}>
        <View>
          <Text style={[styles.potsTitle, { color: colors.text }]}>Earmarked Pots</Text>
          <Text style={[styles.potsSubtitle, { color: colors.textSecondary }]}>
            Money separated at month start for family, EMI, travel, etc.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.addPotHeaderBtn, { backgroundColor: colors.primary }]}
          onPress={() => setAddPotModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color="#FFF" />
          <Text style={styles.addPotHeaderBtnText}>Add Pot</Text>
        </TouchableOpacity>
      </View>

      {/* Pots List */}
      <View style={styles.potsList}>
        {pots.map((pot) => {
          const potRemaining = Math.max(0, pot.allocatedPaise - pot.spentPaise);
          const percentUsed = Math.min(
            100,
            Math.round((pot.spentPaise / Math.max(1, pot.allocatedPaise)) * 100)
          );

          return (
            <View
              key={pot.id}
              style={[
                styles.potCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.potCardTop}>
                <View style={styles.potCardLeft}>
                  <View style={[styles.potIconCircle, { backgroundColor: `${pot.color}20` }]}>
                    <Ionicons name={pot.icon as any} size={20} color={pot.color} />
                  </View>
                  <View>
                    <Text style={[styles.potCardName, { color: colors.text }]}>{pot.name}</Text>
                    <Text style={[styles.potCardSub, { color: colors.textSecondary }]}>
                      {pot.isFlexible ? 'Flexible Fund (Can transfer to daily)' : 'Fixed Allocation'}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Delete Pot', `Delete "${pot.name}"?`, [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => deletePot(pot.id),
                      },
                    ]);
                  }}
                >
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>

              {/* Pot Progress & Balances */}
              <View style={styles.potStatsRow}>
                <View>
                  <Text style={[styles.statSmallLabel, { color: colors.textSecondary }]}>Allocated</Text>
                  <Text style={[styles.statValue, { color: colors.text }]}>
                    {formatPaise(pot.allocatedPaise, currency)}
                  </Text>
                </View>

                <View>
                  <Text style={[styles.statSmallLabel, { color: colors.textSecondary }]}>Spent</Text>
                  <Text style={[styles.statValue, { color: colors.textSecondary }]}>
                    {formatPaise(pot.spentPaise, currency)}
                  </Text>
                </View>

                <View>
                  <Text style={[styles.statSmallLabel, { color: colors.textSecondary }]}>Remaining</Text>
                  <Text style={[styles.statValue, { color: pot.color, fontWeight: '800' }]}>
                    {formatPaise(potRemaining, currency)}
                  </Text>
                </View>
              </View>

              <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${percentUsed}%`, backgroundColor: pot.color },
                  ]}
                />
              </View>

              {/* Transfer Remaining to Daily Spending Button */}
              {pot.isFlexible && potRemaining > 0 && (
                <TouchableOpacity
                  style={[styles.reallocateFullBtn, { backgroundColor: 'rgba(16, 185, 129, 0.12)', borderColor: '#10B981' }]}
                  onPress={() => {
                    setTransferModalPot(pot);
                    setTransferAmountInput((potRemaining / 100).toString());
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-up-circle-outline" size={18} color="#10B981" />
                  <Text style={[styles.reallocateFullBtnText, { color: '#047857' }]}>
                    Transfer Unused to Daily Spending Pool
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })}
      </View>

      {/* Transfer Confirmation Modal */}
      <Modal
        visible={!!transferModalPot}
        animationType="fade"
        transparent
        onRequestClose={() => setTransferModalPot(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="airplane-outline" size={22} color="#F59E0B" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Transfer {transferModalPot?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTransferModalPot(null)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
              Did not travel or use this money? Move it directly into your daily spending pool to increase your allowance for the remaining days of the month!
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Amount to Transfer ({currency})
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardAlt },
              ]}
              keyboardType="numeric"
              value={transferAmountInput}
              onChangeText={setTransferAmountInput}
              placeholder="e.g. 5000"
              placeholderTextColor={colors.textMuted}
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setTransferModalPot(null)}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: '#10B981' }]}
                onPress={handleConfirmTransfer}
              >
                <Text style={styles.modalConfirmBtnText}>Add to Daily Pool</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Salary Modal */}
      <Modal
        visible={salaryModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setSalaryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Monthly Salary</Text>
              <TouchableOpacity onPress={() => setSalaryModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
              Total Income per Month ({currency})
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardAlt },
              ]}
              keyboardType="numeric"
              value={salaryInput}
              onChangeText={setSalaryInput}
              placeholder="50000"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setSalaryModalVisible(false)}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveSalary}
              >
                <Text style={styles.modalConfirmBtnText}>Save Salary</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add New Pot Modal */}
      <Modal
        visible={addPotModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setAddPotModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Earmarked Pot</Text>
              <TouchableOpacity onPress={() => setAddPotModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Pot Name</Text>
            <TextInput
              style={[
                styles.modalInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardAlt },
              ]}
              placeholder="e.g. Travel, Rent, Family Support"
              placeholderTextColor={colors.textMuted}
              value={newPotName}
              onChangeText={setNewPotName}
            />

            <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: Spacing.sm }]}>
              Allocated Amount ({currency})
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.cardAlt },
              ]}
              keyboardType="numeric"
              placeholder="e.g. 5000"
              placeholderTextColor={colors.textMuted}
              value={newPotAmount}
              onChangeText={setNewPotAmount}
            />

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setNewPotFlexible((prev) => !prev)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={newPotFlexible ? 'checkbox' : 'square-outline'}
                size={22}
                color={newPotFlexible ? colors.primary : colors.textSecondary}
              />
              <Text style={[styles.checkboxText, { color: colors.text }]}>
                Flexible Fund (Allow transferring unused money back to daily spending)
              </Text>
            </TouchableOpacity>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setAddPotModalVisible(false)}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleCreatePot}
              >
                <Text style={styles.modalConfirmBtnText}>Create Pot</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  mainCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  sectionSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  salaryAmount: {
    fontSize: 26,
    fontWeight: '800',
  },
  editSalaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  editSalaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  breakdownBox: {
    flexDirection: 'row',
    borderRadius: Radii.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  breakdownItem: {
    alignItems: 'center',
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 2,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  potsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  potsTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  potsSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  addPotHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  addPotHeaderBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  potsList: {
    marginHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  potCard: {
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    elevation: 1,
  },
  potCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  potCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  potIconCircle: {
    width: 38,
    height: 38,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  potCardName: {
    fontSize: 15,
    fontWeight: '700',
  },
  potCardSub: {
    fontSize: 11,
    marginTop: 1,
  },
  potStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: Spacing.xs,
  },
  statSmallLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 1,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    borderRadius: Radii.full,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: Spacing.xs,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: Radii.full,
  },
  reallocateFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radii.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  reallocateFullBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    borderRadius: Radii.xl,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  modalInput: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: Radii.md,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: Spacing.md,
  },
  checkboxText: {
    fontSize: 12,
    flex: 1,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalCancelBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  modalConfirmBtn: {
    flex: 2,
    minHeight: 44,
    borderRadius: Radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
