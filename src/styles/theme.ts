// TASK-02 - Design Tokens & Theme (selaras dengan studentTokens.ts milik TASK-04)

import {
  CONTENT_MAX_WIDTH,
  colors as studentColors,
  radius as studentRadius,
  spacing as studentSpacing,
} from '../features/student/studentTokens';

export const colors = {
  ...studentColors,
  primaryLight: studentColors.primarySoft,
  secondary: '#0F172A',
  successLight: studentColors.successSoft,
  warningLight: studentColors.warningSoft,
  dangerLight: studentColors.dangerSoft,
  surfaceSubtle: '#F3F4F6',
  borderStrong: '#D1D5DB',
  textPrimary: studentColors.text,
  textSecondary: '#4B5563',
  textLight: '#FFFFFF',
  assistantTag: '#7C3AED',
  assistantTagDark: '#5B21B6',
  assistantTagBg: '#EDE9FE',
  studentTag: studentColors.primary,
  studentTagDark: studentColors.primaryDark,
  studentTagBg: studentColors.primarySoft,
} as const;

export const spacing = {
  ...studentSpacing,
  xxl: 32,
} as const;

export const radius = {
  ...studentRadius,
  xl: 20,
  full: 999,
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  borderRadius: radius,
  contentMaxWidth: CONTENT_MAX_WIDTH,
  shadows: {
    card: {
      shadowColor: '#111827',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    modal: {
      shadowColor: '#111827',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 20,
      elevation: 8,
    },
  },
} as const;

export { CONTENT_MAX_WIDTH };
export default theme;

