// Description: Loading placeholder for a single hashtag row.
// Renders a card-shaped skeleton with a shimmer overlay that slides
// from left to right on a 1.2s loop (handled by Reanimated).
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const SHIMMER_DURATION_MS = 1200;
const SHIMMER_WIDTH_PERCENT = 60; // % of container width the bright band covers

export interface HashtagSkeletonProps {
  /** Optional override for the count of placeholder rows to render. */
  count?: number;
}

function SkeletonRow() {
  // Drive `translateX` on the bright band from 0 → 100%. A negative
  // start keeps the band fully off-screen on the left on the first frame.
  const progress = useSharedValue(-SHIMMER_WIDTH_PERCENT);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(100, {
        duration: SHIMMER_DURATION_MS,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [progress]);

  const overlayStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: `${progress.value}%` },
    ],
  }));

  return (
    <View className="surface-card mb-3 flex-row items-center px-4 py-3.5">
      {/* Icon chip placeholder */}
      <View className="bg-shimmer h-12 w-12 overflow-hidden rounded-full bg-[#0000ff]/10" />
      {/* Text columns placeholder */}
      <View className="ml-3.5 flex-1 pr-3">
        <View className="bg-shimmer h-4 w-2/5 overflow-hidden rounded-md" />
        <View className="bg-shimmer mt-2 h-3 w-3/5 overflow-hidden rounded-md" />
      </View>
      {/* Right pill placeholder */}
      <View className="bg-shimmer h-7 w-16 overflow-hidden rounded-full" />
      {/* Bright shimmer band — overlaid on the whole card. */}
      <Animated.View
        pointerEvents="none"
        className="absolute inset-0"
        style={[
          {
            // Pad so the band enters off-screen on the left and exits
            // off-screen on the right. Width is a percentage of the
            // CARD width (which equals the parent's width).
            width: `${SHIMMER_WIDTH_PERCENT}%`,
          },
          overlayStyle,
        ]}
      >
        <View
          className="h-full w-full"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.55)',
          }}
        />
      </Animated.View>
    </View>
  );
}

function HashtagSkeleton({ count = 4 }: HashtagSkeletonProps) {
  return (
    <View>
      {Array.from({ length: count }).map((_, idx) => (
        <SkeletonRow key={`skeleton-${idx}`} />
      ))}
    </View>
  );
}

export default React.memo(HashtagSkeleton);
