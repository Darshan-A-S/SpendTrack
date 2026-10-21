import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { useSettingsStore } from '../store/settingsStore';
import { Spacing, Radii, Typography } from '../constants/theme';

interface AmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  autoFocus?: boolean;
  error?: string;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChangeText,
  autoFocus = true,
  error,
}) => {
  const { colors } = useThemeColor();
  const currency = useSettingsStore((state) => state.currency);

  const handleChange = (text: string) => {
    // Only allow digits and at most one decimal point with up to 2 decimal places
    let cleaned = text.replace(/[^0-9.]/g, '');

    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = `${parts[0]}.${parts.slice(1).join('')}`;
    }

    if (parts.length === 2 && parts[1].length > 2) {
      cleaned = `${parts[0]}.${parts[1].substring(0, 2)}`;
    }

    // Limit maximum length to prevent integer overflow
    if (parts[0].length > 9) {
      cleaned = `${parts[0].substring(0, 9)}${parts[1] ? `.${parts[1]}` : ''}`;
    }

    onChangeText(cleaned);
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputCard,
          {
            backgroundColor: colors.card,
            borderColor: error ? colors.danger : colors.border,
          },
        ]}
      >
        <Text style={[styles.currencyPrefix, { color: colors.textSecondary }]}>
          {currency}
        </Text>
        <TextInput
          style={[styles.input, { color: colors.text }]}
          value={value}
          onChangeText={handleChange}
          placeholder="0.00"
          placeholderTextColor={colors.textMuted}
          keyboardType="decimal-pad"
          autoFocus={autoFocus}
          accessibilityLabel="Expense Amount"
          accessibilityHint="Enter expense amount in rupees"
          maxLength={13}
        />
      </View>
      {error ? (
        <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radii.lg,
    borderWidth: 1.5,
    minHeight: 70,
  },
  currencyPrefix: {
    ...Typography.amountHero,
    fontWeight: '700',
    marginRight: Spacing.xs,
  },
  input: {
    ...Typography.amountHero,
    fontWeight: '800',
    textAlign: 'left',
    minWidth: 120,
    padding: 0,
  },
  errorText: {
    ...Typography.bodySmall,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
    fontWeight: '600',
  },
});
