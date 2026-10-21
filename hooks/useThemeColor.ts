import { useColorScheme } from 'react-native';
import { Colors, ThemeColors } from '../constants/theme';
import { useSettingsStore } from '../store/settingsStore';

export function useThemeColor(): {
  colors: ThemeColors;
  isDark: boolean;
} {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((state) => state.theme);

  const isDark =
    themePreference === 'dark' ||
    (themePreference === 'system' && systemScheme === 'dark');

  const colors = isDark ? Colors.dark : Colors.light;

  return { colors, isDark };
}
