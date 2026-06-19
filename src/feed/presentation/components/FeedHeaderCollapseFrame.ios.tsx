import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FEED_HEADER_CONTENT_HEIGHT = 73;
const FEED_HEADER_COLLAPSE_DURATION_MS = 190;

type FeedHeaderCollapseFrameProps = {
  children: React.ReactNode;
  hidden?: boolean;
};

export function FeedHeaderCollapseFrame({
  children,
  hidden = false,
}: FeedHeaderCollapseFrameProps) {
  const insets = useSafeAreaInsets();
  const expandedHeight = insets.top + FEED_HEADER_CONTENT_HEIGHT;
  const progress = useSharedValue(hidden ? 0 : 1);

  useEffect(() => {
    progress.value = withTiming(hidden ? 0 : 1, {
      duration: FEED_HEADER_COLLAPSE_DURATION_MS,
    });
  }, [hidden, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: expandedHeight * progress.value,
    opacity: progress.value,
    paddingTop: insets.top * progress.value,
    transform: [{ translateY: (1 - progress.value) * -10 }],
  }));

  return (
    <Animated.View
      pointerEvents={hidden ? 'none' : 'auto'}
      style={[styles.frame, animatedStyle]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: 'rgba(248, 250, 252, 0.94)',
    overflow: 'hidden',
  },
});

export default FeedHeaderCollapseFrame;
