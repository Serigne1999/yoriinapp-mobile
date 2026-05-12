export const API_BASE_URL = 'https://yoriinapp.com/api/mobile';

export const C = {
  primary:     '#25D366',
  primaryD:    '#1FB855',
  secondary:   '#128C7E',
  success:     '#10B981',
  danger:      '#EF4444',
  warning:     '#F59E0B',
  info:        '#3B82F6',
  text:        '#111827',
  text2:       '#374151',
  muted:       '#6B7280',
  border:      '#E5E7EB',
  borderL:     '#F3F4F6',
  bg:          '#F9FAFB',
  surface:     '#FFFFFF',
  primarySoft: '#E7FAEE',
  dangerSoft:  '#FEE2E2',
  warningSoft: '#FEF3C7',
  infoSoft:    '#DBEAFE',
};

// Legacy alias
export const COLORS = {
  primary:    C.primary,
  secondary:  C.secondary,
  success:    C.success,
  danger:     C.danger,
  warning:    C.warning,
  info:       C.info,
  white:      '#FFFFFF',
  black:      '#000000',
  text:       C.text,
  textLight:  C.muted,
  gray50:     '#F9FAFB',
  gray100:    '#F3F4F6',
  gray200:    '#E5E7EB',
  gray400:    '#9CA3AF',
  gray600:    '#4B5563',
  gray900:    '#111827',
  background: C.bg,
};

export const FONTS = { regular: 'System', bold: 'System' };

export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export function fcfa(n: number): string {
  return Math.round(n).toLocaleString('fr-FR').replace(/\s/g, ' ') + ' F';
}
