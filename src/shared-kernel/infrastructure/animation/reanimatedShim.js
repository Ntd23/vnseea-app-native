// Description: Provides a JavaScript-only Reanimated compatibility layer when native Worklets are unavailable.
import React from 'react';
import { Animated as ReactNativeAnimated, Easing as ReactNativeEasing } from 'react-native';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toNumber = (value) => {
  if (typeof value === 'number') {
    return value;
  }

  if (value && typeof value.value === 'number') {
    return value.value;
  }

  return 0;
};

const finishAnimation = (callback) => {
  if (typeof callback !== 'function') {
    return;
  }

  setTimeout(() => callback(true), 0);
};

export const Extrapolation = {
  CLAMP: 'clamp',
  EXTEND: 'extend',
  IDENTITY: 'identity',
};

export const Extrapolate = Extrapolation;
export const Easing = ReactNativeEasing;

export const runOnJS = (fn) => fn;
export const runOnUI = (fn) => fn;
export const setGestureState = () => {};

export const withSpring = (toValue, _config, callback) => {
  finishAnimation(callback);
  return toValue;
};

export const withTiming = (toValue, _config, callback) => {
  finishAnimation(callback);
  return toValue;
};

export const withDelay = (_delayMs, animation) => animation;
export const withRepeat = (animation) => animation;
export const cancelAnimation = () => {};

export const interpolate = (
  rawValue,
  inputRange,
  outputRange,
  extrapolate = Extrapolation.EXTEND,
) => {
  const value = toNumber(rawValue);

  if (!Array.isArray(inputRange) || !Array.isArray(outputRange)) {
    return value;
  }

  if (inputRange.length < 2 || outputRange.length < 2) {
    return outputRange[0] ?? value;
  }

  let index = 0;
  for (let next = 1; next < inputRange.length; next += 1) {
    if (value <= inputRange[next]) {
      index = next - 1;
      break;
    }
    index = next - 1;
  }

  const inputMin = inputRange[index];
  const inputMax = inputRange[index + 1];
  const outputMin = outputRange[index];
  const outputMax = outputRange[index + 1];
  const span = inputMax - inputMin || 1;
  let progress = (value - inputMin) / span;

  if (extrapolate === Extrapolation.CLAMP) {
    progress = clamp(progress, 0, 1);
  }

  return outputMin + (outputMax - outputMin) * progress;
};

export const useSharedValue = (initialValue) => {
  const ref = React.useRef({ value: initialValue });
  return ref.current;
};

export const useAnimatedStyle = (updater) => {
  try {
    return typeof updater === 'function' ? updater() : {};
  } catch (_error) {
    return {};
  }
};

export const useDerivedValue = (updater) => {
  const value = typeof updater === 'function' ? updater() : updater;
  return useSharedValue(value);
};

export const useAnimatedProps = useAnimatedStyle;

export const useAnimatedReaction = (prepare, react) => {
  React.useEffect(() => {
    if (typeof prepare !== 'function' || typeof react !== 'function') {
      return undefined;
    }

    const prepared = prepare();
    react(prepared, undefined);
    return undefined;
  }, [prepare, react]);
};

export const useAnimatedScrollHandler = (handler) => {
  if (typeof handler === 'function') {
    return handler;
  }

  return (event) => {
    if (handler && typeof handler.onScroll === 'function') {
      handler.onScroll(event);
    }
  };
};

export const useEvent = (callback) => callback;
export const useAnimatedGestureHandler = (handler) => handler ?? {};

export const createAnimatedComponent = ReactNativeAnimated.createAnimatedComponent;

const Animated = {
  ...ReactNativeAnimated,
  createAnimatedComponent,
};

export default Animated;
