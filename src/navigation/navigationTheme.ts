import { DefaultTheme, type Theme } from '@react-navigation/native';
import { APP_COLORS } from '../shared-kernel/presentation/theme/appColors';

export const VNSEEA_NAVIGATION_THEME: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: APP_COLORS.brand.primary,
    background: APP_COLORS.neutral.base,
    card: APP_COLORS.neutral.surface,
    text: APP_COLORS.neutral.text,
    border: APP_COLORS.neutral.border,
    notification: APP_COLORS.status.error,
  },
};
