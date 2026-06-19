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
  const frameStyle = {
    height: expandedHeight,
  };
  const contentStyle = {
    paddingTop: insets.top,
  };

  useEffect(() => {
    progress.value = withTiming(hidden ? 0 : 1, {
      duration: FEED_HEADER_COLLAPSE_DURATION_MS,
    });
  }, [hidden, progress]);

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -10 }],
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
