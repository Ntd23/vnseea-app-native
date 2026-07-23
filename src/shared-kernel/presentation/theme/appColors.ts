// Description: Canonical VNSEEA colors for React Native inline styles and native bridges.
export const APP_COLORS = {
  brand: {
    primary: '#B91C1C',
    pressed: '#991B1B',
    onPrimary: '#FFFFFF',
    onPrimaryMuted: '#FEE2E2',
    borderOnPrimary: 'rgba(255, 255, 255, 0.25)',
    soft: 'rgba(185, 28, 28, 0.08)',
    softPressed: 'rgba(185, 28, 28, 0.14)',
    border: 'rgba(185, 28, 28, 0.18)',
    shadow: 'rgba(153, 27, 27, 0.24)',
  },
  status: {
    success: '#16A34A',
    warning: '#F59E0B',
    error: '#EF4444',
    destructive: '#DC2626',
    info: '#3B82F6',
  },
  neutral: {
    base: '#F8FAFC',
    surface: '#FFFFFF',
    muted: '#F1F5F9',
    border: '#E2E8F0',
    text: '#0F172A',
    textMuted: '#64748B',
    iconMuted: '#94A3B8',
  },
} as const;

export const BRAND_COLOR = APP_COLORS.brand.primary;
export const BRAND_PRESSED_COLOR = APP_COLORS.brand.pressed;
export const APP_BRAND_COLOR = APP_COLORS.brand.primary;
export const APP_BRAND_PRESSED_COLOR = APP_COLORS.brand.pressed;

export type AppColors = typeof APP_COLORS;
