import { Platform } from 'react-native';

/**
 * Design tokens derived from the Stitch "OoE (Order of Events)" design system.
 * Supports both Light (Executive Civic Ivory) and Dark (Executive Obsidian Navy) modes.
 */
export const lightColors = {
  primary: '#0F1E36',
  primaryDark: '#000412',
  primaryLight: '#1E293B',
  primaryTint: '#EFF4FF',
  primaryBorder: '#B8C7E6',

  secondary: '#545F73',
  secondaryContainer: '#D5E0F8',

  amber: '#B45309',
  amberBright: '#D97706',
  amberBg: '#FEF3C7',
  amberBorder: '#FDE68A',

  emerald: '#10B981',
  emeraldText: '#047857',
  emeraldBg: '#ECFDF5',
  emeraldBorder: '#A7F3D0',

  canvas: '#F8F9FB',
  card: '#FFFFFF',
  cardMuted: '#F1F5F9',
  cardConcluded: '#FAFBFD',

  border: '#E2E8F0',
  borderStrong: '#CBD5E1',

  textPrimary: '#0B1C30',
  textSecondary: '#1E293B',
  textMuted: '#64748B',
  textDisabled: '#CBD5E1',
  textInverse: '#FFFFFF',

  danger: '#991B1B',
  dangerBg: '#FEE2E2',
  dangerBorder: '#FECACA',

  headerBg: '#0F1E36',
  headerBorder: '#1E293B',
  headerPillBg: '#1E293B',
  headerPillBorder: '#334155',
} as const;

export const darkColors: ThemeColors = {
  primary: '#93C5FD',
  primaryDark: '#060B14',
  primaryLight: '#1E293B',
  primaryTint: '#17253B',
  primaryBorder: '#2A3F5F',

  secondary: '#94A3B8',
  secondaryContainer: '#1E293B',

  amber: '#FBBF24',
  amberBright: '#F59E0B',
  amberBg: '#2D2006',
  amberBorder: '#78350F',

  emerald: '#34D399',
  emeraldText: '#34D399',
  emeraldBg: '#062C22',
  emeraldBorder: '#065F46',

  canvas: '#0B111B',
  card: '#131C2B',
  cardMuted: '#1B2638',
  cardConcluded: '#101724',

  border: '#233044',
  borderStrong: '#334155',

  textPrimary: '#F1F5F9',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textDisabled: '#475569',
  textInverse: '#0B111B',

  danger: '#FCA5A5',
  dangerBg: '#3B1219',
  dangerBorder: '#7F1D1D',

  headerBg: '#09111E',
  headerBorder: '#1E293B',
  headerPillBg: '#162235',
  headerPillBorder: '#2B3B55',
};

export type ThemeColors = {
  [K in keyof typeof lightColors]: string;
};

/** Backwards-compatible default export for static references */
export const colors = lightColors;

export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? darkColors : lightColors;
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 32,
} as const;

export const radius = {
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  full: 9999,
} as const;

export const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

export const typography = {
  protocolTime: {
    fontFamily: monoFont,
    fontSize: 13,
    fontWeight: '700' as const,
    letterSpacing: -0.3,
    fontVariant: ['tabular-nums' as const],
  },
  labelSm: {
    fontFamily: monoFont,
    fontSize: 10,
    fontWeight: '600' as const,
    letterSpacing: 0.6,
  },
  labelMd: {
    fontFamily: monoFont,
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.3,
  },
  headlineLg: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: -0.3,
  },
  headlineMd: {
    fontSize: 18,
    fontWeight: '600' as const,
    lineHeight: 24,
    letterSpacing: -0.2,
  },
  headlineSm: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 22,
  },
  bodyMd: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  bodySm: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 18,
  },
} as const;
