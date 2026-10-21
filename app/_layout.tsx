import React, { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AppState, AppStateStatus, View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { initDatabase, getDb } from '../db/database';
import { generateDueRecurringExpenses } from '../services/recurringService';
import { checkBudgetAlerts } from '../services/budgetAlertService';
import { hasLockTimeoutElapsed } from '../services/lockService';
import { useSettingsStore } from '../store/settingsStore';
import { useAuthStore } from '../store/authStore';
import { useThemeColor } from '../hooks/useThemeColor';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  const onboardingDone = useSettingsStore((state) => state.onboardingDone);
  const lockEnabled = useSettingsStore((state) => state.lockEnabled);
  const lockTimeout = useSettingsStore((state) => state.lockTimeout);
  const monthStartDay = useSettingsStore((state) => state.monthStartDay);
  const currency = useSettingsStore((state) => state.currency);

  const isLocked = useAuthStore((state) => state.isLocked);
  const setLocked = useAuthStore((state) => state.setLocked);
  const lastBackgroundTime = useAuthStore((state) => state.lastBackgroundTime);
  const setLastBackgroundTime = useAuthStore((state) => state.setLastBackgroundTime);

  const appState = useRef(AppState.currentState);

  const { isDark, colors } = useThemeColor();

  // 1. Initial Cold Start Setup
  useEffect(() => {
    async function prepare() {
      try {
        const db = await initDatabase();
        // Generate due recurring expenses idempotently
        await generateDueRecurringExpenses(db);
        // Check budget thresholds
        await checkBudgetAlerts(db, monthStartDay, currency);

        // Cold start lock
        if (lockEnabled) {
          setLocked(true);
        }
      } catch (e) {
        console.error('Failed to initialize app database:', e);
      } finally {
        setDbReady(true);
      }
    }

    prepare();
  }, [lockEnabled, monthStartDay, currency, setLocked]);

  // 2. Lifecycle & Lock Gate on Foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (appState.current?.match(/inactive|background/) && nextAppState === 'active') {
        // App has returned to foreground
        if (lockEnabled && hasLockTimeoutElapsed(lastBackgroundTime, lockTimeout)) {
          setLocked(true);
        }

        try {
          const db = await getDb();
          await generateDueRecurringExpenses(db);
          await checkBudgetAlerts(db, monthStartDay, currency);
        } catch (e) {
          console.error('Error on resume:', e);
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background
        setLastBackgroundTime(Date.now());
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [lockEnabled, lockTimeout, lastBackgroundTime, monthStartDay, currency, setLocked, setLastBackgroundTime]);

  // 3. Navigation Guards (Onboarding & Lock Gate)
  useEffect(() => {
    if (!dbReady) return;

    const inAuthGroup = segments[0] === 'lock';
    const inOnboarding = segments[0] === 'onboarding';

    if (!onboardingDone && !inOnboarding) {
      router.replace('/onboarding');
    } else if (onboardingDone && isLocked && !inAuthGroup) {
      router.replace('/lock');
    } else if (onboardingDone && !isLocked && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [dbReady, onboardingDone, isLocked, segments, router]);

  if (!dbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-expense"
          options={{
            presentation: 'modal',
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="lock" options={{ headerShown: false }} />
        <Stack.Screen name="export-import" options={{ headerShown: false }} />
        <Stack.Screen name="categories/index" options={{ headerShown: false }} />
        <Stack.Screen name="categories/edit" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="recurring/index" options={{ headerShown: false }} />
        <Stack.Screen name="recurring/edit" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </SafeAreaProvider>
  );
}
