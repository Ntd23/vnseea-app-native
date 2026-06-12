// Description: Loading skeleton that mimics the notification card layout.
// Uses the .bg-shimmer token from tokens.css and animates the
// backgroundPosition via Reanimated.

import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const SKELETON_ITEMS = 6;

function SkeletonItem() {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.linear }),
      -1,
      false,
    );
    return () => {
      cancelAnimation(progress);
    };
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + progress.value * 0.5,
  }));

  return (
    <Animated.View
      className="surface-card mb-3 flex-row px-4 py-3.5"
      style={animatedStyle}
    >
      <View className="h-12 w-12 rounded-full bg-slate-200" />
      <View className="ml-3.5 flex-1">
        <View className="h-3.5 w-3/4 rounded bg-slate-200" />
        <View className="mt-2 h-3 w-1/2 rounded bg-slate-200" />
        <View className="mt-3 h-2.5 w-1/3 rounded bg-slate-200" />
      </View>
    </Animated.View>
  );
}

export default function NotificationsSkeleton() {
  return (
    <View className="px-4 pt-4">
      {Array.from({ length: SKELETON_ITEMS }).map((_, idx) => (
        <SkeletonItem key={idx} />
      ))}
    </View>
  );
}
