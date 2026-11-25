// LabSync Central Design System & Theme
// Warm Editorial + Modern Minimalist + Soft Organic UI

import {
  CONTENT_MAX_WIDTH,
  colors as baseColors,
  radius as baseRadius,
  spacing as baseSpacing,
} from '../features/student/studentTokens';

export const colors = {
  ...baseColors,
  primaryLight: baseColors.primarySoft,
  primaryText: baseColors.primaryText,
  secondary: baseColors.mocha,
  successLight: baseColors.successSoft,
  warningLight: baseColors.warningSoft,
  dangerLight: baseColors.dangerSoft,
  surfaceMuted: baseColors.surfaceMuted,
  borderDark: baseColors.borderDark,
  accent: baseColors.accent,
} as const;

export const spacing = {
  ...baseSpacing,
} as const;

export const radius = {
  ...baseRadius,
} as const;

export const typography = {
  pageTitle: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: colors.mochaDark,
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: colors.mochaDark,
    letterSpacing: -0.2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: colors.mochaDark,
  },
  body: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  caption: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  borderRadius: radius,
  typography,
  contentMaxWidth: CONTENT_MAX_WIDTH,
  shadows: {
    card: {
      shadowColor: '#474329',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 2,
    },
    cardHover: {
      shadowColor: '#474329',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.1,
      shadowRadius: 16,
      elevation: 4,
    },
    modal: {
      shadowColor: '#2C2718',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.18,
      shadowRadius: 24,
      elevation: 8,
    },
    button: {
      shadowColor: '#FC75B4',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.22,
      shadowRadius: 8,
      elevation: 3,
    },
  },
} as const;

export { CONTENT_MAX_WIDTH };
export default theme;
