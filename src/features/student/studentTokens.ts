// Token desain terpadu LabSync: Warm Editorial + Modern Minimalist + Soft Organic UI

export const colors = {
  // Brand Primary & Contrast
  primary: '#FC75B4', // Watermelon Pink
  primaryDark: '#D94C8F',
  primarySoft: '#FDE7F1',
  primaryMuted: '#F8CCD4',
  primaryText: '#2C2718', // Deep Mocha for high contrast on warm/pink buttons

  // Core Warm Tones
  mocha: '#474329', // Mocha Green / Deep Mocha
  mochaDark: '#2C2718', // Main Typography
  mochaLight: '#6B6547',
  mochaSoft: '#EDE9DE',

  sand: '#F0E5D6', // Soft Sand
  warmBeige: '#F3E2C6', // Warm Beige
  butterCream: '#FBDFA2', // Butter Cream
  butterCreamDark: '#8C6514',
  butterCreamSoft: '#FEF8EC',

  // Supporting Natural Tones
  sage: '#8EB694', // Sage Green
  sageDark: '#45734C',
  sageSoft: '#EBF3EC',
  accent: '#8EB694', // Accent alias

  softPink: '#F8CCD4',
  dustyPink: '#FA9DA6',

  // Semantic Status Colors (Warm Harmonies)
  success: '#4E7A55',
  successDark: '#2C4A32',
  successSoft: '#EBF3EC',

  warning: '#D98A1E',
  warningDark: '#8C5708',
  warningSoft: '#FEF5E7',

  neutral: '#7B7462',
  neutralDark: '#4A4535',
  neutralSoft: '#EDE8DF',

  danger: '#DC3545',
  dangerDark: '#A71D2A',
  dangerSoft: '#FCE8E8',

  // Surfaces & Backgrounds
  text: '#2C2718',
  textPrimary: '#2C2718',
  textSecondary: '#655E4A',
  textMuted: '#7E7764',
  textLight: '#FFFDF9',

  border: '#E3D8C6',
  borderLight: '#EFE7DA',
  borderStrong: '#C8BBA4',
  borderDark: '#C8BBA4', // Alias for borderStrong

  surface: '#FFFDF9',
  surfaceSubtle: '#FAF5ED',
  surfaceMuted: '#FAF5ED', // Alias for surfaceSubtle
  background: '#F5EFEB',
  overlay: 'rgba(44, 39, 24, 0.45)',

  // Tag & Role Badges
  assistantTag: '#6E8F74',
  assistantTagDark: '#3A5A40',
  assistantTagBg: '#EAF2EC',
  studentTag: '#D94C8F',
  studentTagDark: '#A32962',
  studentTagBg: '#FDE7F1',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 40,
} as const;

export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
  pill: 999,
} as const;

export const CONTENT_MAX_WIDTH = 720;
