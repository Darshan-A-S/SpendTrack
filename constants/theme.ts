export const Palette = {
  // Brand colors
  primary: '#2563EB', // Vibrant blue
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  accent: '#0D9488', // Teal accent
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  // Neutral - Light mode
  white: '#FFFFFF',
  lightBg: '#F8FAFC',
  lightCard: '#FFFFFF',
  lightCardAlt: '#F1F5F9',
  lightBorder: '#E2E8F0',
  lightTextPrimary: '#0F172A',
  lightTextSecondary: '#64748B',
  lightTextMuted: '#94A3B8',

  // Neutral - Dark mode
  darkBg: '#090D16',
  darkCard: '#131B2E',
  darkCardAlt: '#1E293B',
  darkBorder: '#1E293B',
  darkTextPrimary: '#F8FAFC',
  darkTextSecondary: '#94A3B8',
  darkTextMuted: '#64748B',
};

export const Colors = {
  light: {
    background: Palette.lightBg,
    card: Palette.lightCard,
    cardAlt: Palette.lightCardAlt,
    border: Palette.lightBorder,
    text: Palette.lightTextPrimary,
    textSecondary: Palette.lightTextSecondary,
    textMuted: Palette.lightTextMuted,
    primary: Palette.primary,
    accent: Palette.accent,
    success: Palette.success,
    warning: Palette.warning,
    danger: Palette.danger,
    info: Palette.info,
    tint: Palette.primary,
    tabBar: Palette.white,
    tabBarBorder: Palette.lightBorder,
    modalBg: Palette.white,
    inputBg: '#F8FAFC',
    inputBorder: '#CBD5E1',
  },
  dark: {
    background: Palette.darkBg,
    card: Palette.darkCard,
    cardAlt: Palette.darkCardAlt,
    border: Palette.darkBorder,
    text: Palette.darkTextPrimary,
    textSecondary: Palette.darkTextSecondary,
    textMuted: Palette.darkTextMuted,
    primary: Palette.primaryLight,
    accent: Palette.accent,
    success: Palette.success,
    warning: Palette.warning,
    danger: Palette.danger,
    info: Palette.info,
    tint: Palette.primaryLight,
    tabBar: '#101626',
    tabBarBorder: '#1E293B',
    modalBg: Palette.darkCard,
    inputBg: '#0F172A',
    inputBorder: '#334155',
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
};

export const Radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const Typography = {
  titleLarge: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
  },
  titleMedium: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
  },
  titleSmall: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  bodyLarge: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySmall: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 14,
  },
  amountHero: {
    fontSize: 36,
    fontWeight: '800' as const,
    lineHeight: 44,
  },
  amountLarge: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 30,
  },
  amountMedium: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
};

export type ThemeColors = typeof Colors.light;
