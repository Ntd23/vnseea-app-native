import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

// Retained Android tab scenes can each contain a large virtualized list and a
// native video surface. Cross-fading them composites both full trees at once,
// so tab switches are intentionally immediate. Root-stack surfaces keep the
// short fade where only one heavy main surface is involved.
export const MAIN_SURFACE_TRANSITION_DURATION_MS = 150;

export const MAIN_SURFACE_TAB_TRANSITION_OPTIONS: BottomTabNavigationOptions = {
  animation: 'none',
};

export const MAIN_SURFACE_STACK_TRANSITION_OPTIONS: NativeStackNavigationOptions =
  {
    animation: 'fade',
    animationDuration: MAIN_SURFACE_TRANSITION_DURATION_MS,
    gestureEnabled: true,
  };
