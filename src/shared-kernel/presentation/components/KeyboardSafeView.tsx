// Keeps focused controls above the software keyboard across iOS and Android.
import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  type KeyboardAvoidingViewProps,
} from 'react-native';

export const KEYBOARD_SAFE_BEHAVIOR: NonNullable<
  KeyboardAvoidingViewProps['behavior']
> = Platform.OS === 'ios' ? 'padding' : 'height';

/**
 * Android normally relies on adjustResize, but transparent modals and some
 * vendor ROMs do not resize the React Native window consistently. The height
 * behavior provides a second, overlap-based fallback without double-shrinking
 * windows that already resized correctly.
 */
export function KeyboardSafeView({
  behavior = KEYBOARD_SAFE_BEHAVIOR,
  enabled = true,
  ...props
}: KeyboardAvoidingViewProps) {
  return (
    <KeyboardAvoidingView {...props} behavior={behavior} enabled={enabled} />
  );
}
