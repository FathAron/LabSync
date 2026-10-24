// TASK-04 - Token desain LOKAL modul praktikan.

export const colors = {
  primary: '#2563EB',
  primaryDark: '#1E40AF',
  primarySoft: '#DBEAFE',

  success: '#16A34A',
  successDark: '#166534',
  successSoft: '#DCFCE7',

  warning: '#D97706',
  warningDark: '#92400E',
  warningSoft: '#FEF3C7',

  neutral: '#6B7280',
  neutralDark: '#374151',
  neutralSoft: '#F3F4F6',

  danger: '#DC2626',
  dangerDark: '#991B1B',
  dangerSoft: '#FEE2E2',

  text: '#111827',
  textMuted: '#6B7280',
  border: '#E5E7EB',
  surface: '#FFFFFF',
  background: '#F5F7FB',
  overlay: 'rgba(17, 24, 39, 0.5)',
} as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const CONTENT_MAX_WIDTH = 720;
