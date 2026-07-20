import React, { useCallback, useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native';

const DOUBLE_TAP_INTERVAL_MS = 280;

type DoubleTapTouchableProps = Omit<
  TouchableOpacityProps,
  'onPress' | 'onLongPress'
> & {
  onSingleTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
};

export function DoubleTapTouchable({
  onSingleTap,
  onDoubleTap,
  onLongPress,
  delayLongPress = 350,
  ...touchableProps
}: DoubleTapTouchableProps) {
  const lastTapAtRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSingleTapTimer = useCallback(() => {
    if (!singleTapTimerRef.current) return;
    clearTimeout(singleTapTimerRef.current);
    singleTapTimerRef.current = null;
  }, []);

  useEffect(() => clearSingleTapTimer, [clearSingleTapTimer]);

  const handlePress = useCallback(() => {
    const now = Date.now();
    const isDoubleTap =
      lastTapAtRef.current > 0 &&
      now - lastTapAtRef.current <= DOUBLE_TAP_INTERVAL_MS;

    if (isDoubleTap) {
      clearSingleTapTimer();
      lastTapAtRef.current = 0;
      onDoubleTap?.();
      return;
    }

    lastTapAtRef.current = now;
    clearSingleTapTimer();
    singleTapTimerRef.current = setTimeout(() => {
      lastTapAtRef.current = 0;
      singleTapTimerRef.current = null;
      onSingleTap?.();
    }, DOUBLE_TAP_INTERVAL_MS);
  }, [clearSingleTapTimer, onDoubleTap, onSingleTap]);

  const handleLongPress = useCallback(() => {
    clearSingleTapTimer();
    lastTapAtRef.current = 0;
    onLongPress?.();
  }, [clearSingleTapTimer, onLongPress]);

  return (
    <TouchableOpacity
      {...touchableProps}
      delayLongPress={delayLongPress}
      onPress={handlePress}
      onLongPress={handleLongPress}
    />
  );
}
