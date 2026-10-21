import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export async function isBiometricsAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch {
    return false;
  }
}

export async function promptDeviceUnlock(): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock SpendTrack',
      fallbackLabel: 'Use Device Passcode',
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
    });

    return result.success;
  } catch {
    return false;
  }
}

/**
 * Checks if the timeout since the app was sent to background has elapsed.
 */
export function hasLockTimeoutElapsed(
  lastBackgroundTime: number | null,
  timeoutSetting: 'immediately' | 'one_minute' | 'five_minutes'
): boolean {
  if (!lastBackgroundTime) return false;

  const now = Date.now();
  const elapsedMs = now - lastBackgroundTime;

  switch (timeoutSetting) {
    case 'immediately':
      return elapsedMs > 1000; // 1 second grace
    case 'one_minute':
      return elapsedMs >= 60 * 1000;
    case 'five_minutes':
      return elapsedMs >= 5 * 60 * 1000;
  }
}
