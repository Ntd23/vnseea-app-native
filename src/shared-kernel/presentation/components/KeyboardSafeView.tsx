// Keeps focused controls above the software keyboard across iOS and Android.
import React from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  type KeyboardAvoidingViewProps,
} from 'react-native';

export const KEYBOARD_SAFE_BEHAVIOR: NonNullable<
  KeyboardAvoidingViewProps['behavior']
> = Platform.OS === 'ios' ? 'padding' : 'height';

interface KeyboardSafeViewProps extends KeyboardAvoidingViewProps {
  resetOnAndroidKeyboardHide?: boolean;
}

/**
 * Android normally relies on adjustResize, but transparent modals and some
 * vendor ROMs do not resize the React Native window consistently. The height
 * behavior provides a second, overlap-based fallback without double-shrinking
 * windows that already resized correctly.
 */
export function KeyboardSafeView({
  behavior = KEYBOARD_SAFE_BEHAVIOR,
  enabled = true,
  resetOnAndroidKeyboardHide = false,
  ...props
}: KeyboardSafeViewProps) {
  const [isAndroidKeyboardVisible, setIsAndroidKeyboardVisible] =
    React.useState(() => Keyboard.isVisible());

  React.useEffect(() => {
    if (Platform.OS !== 'android' || !resetOnAndroidKeyboardHide) return;

    setIsAndroidKeyboardVisible(Keyboard.isVisible());
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setIsAndroidKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsAndroidKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [resetOnAndroidKeyboardHide]);

  const effectiveEnabled =
    enabled &&
    !(
      Platform.OS === 'android' &&
      resetOnAndroidKeyboardHide &&
      !isAndroidKeyboardVisible
    );

  return (
    <KeyboardAvoidingView
      {...props}
      behavior={behavior}
      enabled={effectiveEnabled}
    />
  );
}
