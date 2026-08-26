// Description: Controls the animated header and toolbar shown over an active call.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

const CALL_CHROME_ANIMATION_MS = 220;

export function useCallChromeVisibility(isConnected: boolean) {
  const initiallyVisible = !isConnected;
  const [isChromeVisible, setChromeVisible] = useState(initiallyVisible);
  const isChromeVisibleRef = useRef(initiallyVisible);
  const chromeProgress = useRef(
    new Animated.Value(initiallyVisible ? 1 : 0),
  ).current;

  const animateChrome = useCallback(
    (nextVisible: boolean) => {
      if (isChromeVisibleRef.current === nextVisible) return;

      isChromeVisibleRef.current = nextVisible;
      setChromeVisible(nextVisible);
      chromeProgress.stopAnimation();
      Animated.timing(chromeProgress, {
        toValue: nextVisible ? 1 : 0,
        duration: CALL_CHROME_ANIMATION_MS,
        useNativeDriver: true,
      }).start();
    },
    [chromeProgress],
  );

  useEffect(() => {
    animateChrome(!isConnected);
  }, [animateChrome, isConnected]);

  const toggleChrome = useCallback(() => {
    if (!isConnected) return;
    animateChrome(!isChromeVisibleRef.current);
  }, [animateChrome, isConnected]);

  return {
    chromeProgress,
    isChromeVisible,
    toggleChrome,
  };
}
