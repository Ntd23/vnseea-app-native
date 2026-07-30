import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

// Bottom tabs use this exact native-driver duration. Native-stack uses the
// same fade treatment; its duration hint is honored by iOS while Android
// keeps the platform-native fade timing.
export const MAIN_SURFACE_TRANSITION_DURATION_MS = 150;

export const MAIN_SURFACE_TAB_TRANSITION_OPTIONS: BottomTabNavigationOptions = {
  animation: 'fade',
  transitionSpec: {
    animation: 'timing',
    config: {
      duration: MAIN_SURFACE_TRANSITION_DURATION_MS,
    },
  },
};

export const MAIN_SURFACE_STACK_TRANSITION_OPTIONS: NativeStackNavigationOptions =
  {
    animation: 'fade',
    animationDuration: MAIN_SURFACE_TRANSITION_DURATION_MS,
    gestureEnabled: true,
  };
