// Description: Animates feed chrome sections in and out while preserving overlay layout.
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets, initialWindowMetrics } from 'react-native-safe-area-context';
import { resolveFeedChromeTopInset } from './feedHeaderInsets';

const FEED_FILTER_HEIGHT = 66;
const FEED_HEADER_BAR_HEIGHT = 68;
const FEED_HEADER_COLLAPSE_DURATION_MS = 190;

type FeedHeaderCollapseFrameProps = {
  children: React.ReactNode;
  hidden?: boolean;
  height?: number;
  top?: number;
  translateDistance?: number;
};

export function FeedHeaderCollapseFrame({
  children,
  hidden = false,
  height,
  top,
  translateDistance,
}: FeedHeaderCollapseFrameProps) {
  const insets = useSafeAreaInsets();
  const topInset = resolveFeedChromeTopInset(
    insets.top,
    initialWindowMetrics?.insets?.top,
  );
  const expandedHeight = height ?? FEED_FILTER_HEIGHT;
  const collapseDistance = translateDistance ?? expandedHeight;
  const progress = useSharedValue(hidden ? 0 : 1);
  const frameStyle = {
    height: expandedHeight,
    top: top ?? topInset + FEED_HEADER_BAR_HEIGHT,
  };
  const contentStyle = {
    paddingTop: 0,
  };

  useEffect(() => {
    progress.value = withTiming(hidden ? 0 : 1, {
      duration: FEED_HEADER_COLLAPSE_DURATION_MS,
    });
  }, [hidden, progress]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -collapseDistance }],
  }));

  return (
    <Animated.View
      pointerEvents={hidden ? 'none' : 'box-none'}
      style={[styles.frame, frameStyle]}
    >
      <Animated.View style={[styles.content, contentStyle, contentAnimatedStyle]}>
        {children}
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: {
    left: 0,
    overflow: 'hidden',
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  content: {
    backgroundColor: 'rgba(248, 250, 252, 0.94)',
    height: '100%',
    overflow: 'hidden',
  },
});

export default FeedHeaderCollapseFrame;
