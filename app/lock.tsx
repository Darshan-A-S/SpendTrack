import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { promptDeviceUnlock } from '../services/lockService';
import { useAuthStore } from '../store/authStore';
import { useThemeColor } from '../hooks/useThemeColor';
import { Spacing, Radii, Typography } from '../constants/theme';
import { Strings } from '../constants/strings';

export default function LockScreen() {
  const router = useRouter();
  const { colors } = useThemeColor();
  const setLocked = useAuthStore((state) => state.setLocked);

  const [authFailed, setAuthFailed] = useState(false);

  const triggerAuth = async () => {
    setAuthFailed(false);
    const success = await promptDeviceUnlock();
    if (success) {
      setLocked(false);
      router.replace('/(tabs)');
    } else {
      setAuthFailed(true);
    }
  };

  useEffect(() => {
    triggerAuth();
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}20` }]}>
          <Ionicons name="lock-closed" size={48} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{Strings.lock.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {Strings.lock.subtitle}
        </Text>

        {authFailed && (
          <Text style={[styles.failedText, { color: colors.danger }]}>
            {Strings.lock.failedPrompt}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.unlockButton, { backgroundColor: colors.primary }]}
          onPress={triggerAuth}
          activeOpacity={0.8}
        >
          <Ionicons name="finger-print-outline" size={24} color="#FFFFFF" />
          <Text style={styles.unlockButtonText}>{Strings.lock.unlockButton}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    maxWidth: 320,
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: Radii.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.titleMedium,
    fontWeight: '800',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyMedium,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  failedText: {
    ...Typography.bodySmall,
    fontWeight: '600',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    width: '100%',
    paddingVertical: 14,
    borderRadius: Radii.lg,
    elevation: 3,
  },
  unlockButtonText: {
    color: '#FFFFFF',
    ...Typography.bodyLarge,
    fontWeight: '700',
  },
});
