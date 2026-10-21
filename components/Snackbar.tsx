import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useThemeColor } from '../hooks/useThemeColor';
import { Spacing, Radii, Typography } from '../constants/theme';
import { Strings } from '../constants/strings';

interface SnackbarProps {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export const Snackbar: React.FC<SnackbarProps> = ({
  visible,
  message,
  actionLabel = Strings.common.undo,
  onAction,
  onDismiss,
  durationMs = 5000,
}) => {
  const { colors, isDark } = useThemeColor();

  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      onDismiss();
    }, durationMs);

    return () => clearTimeout(timer);
  }, [visible, durationMs, onDismiss]);

  if (!visible) return null;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1E293B' : '#0F172A',
          borderColor: colors.border,
        },
      ]}
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.message} numberOfLines={1}>
        {message}
      </Text>
      {onAction ? (
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onAction}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <Text style={[styles.actionText, { color: colors.primary }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm + 4,
    paddingHorizontal: Spacing.md,
    borderRadius: Radii.md,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 9999,
  },
  message: {
    ...Typography.bodyMedium,
    color: '#F8FAFC',
    flex: 1,
    marginRight: Spacing.sm,
  },
  actionButton: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  actionText: {
    ...Typography.bodyMedium,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
