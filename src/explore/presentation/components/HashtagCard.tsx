// Description: Animated list row for a single trending hashtag.
// Mounts with a fade+slide entrance; the parent provides a per-index
// delay so cards stagger in instead of popping in all at once.
import React, { useEffect, useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { ArrowUpRight, Hash } from 'lucide-react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { TrendingHashtag } from '../../domain/types/explore.types';

const BRAND = '#0000ff';

/**
 * Format a large number into a short, locale-neutral string.
 *   1234 → "1.2K"
 *   1500000 → "1.5M"
 *   7 → "7"
 * Keeps the card from blowing up its right column for big counts.
 */
export function formatCompactCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n < 1000) return String(Math.round(n));

  const units: Array<{ threshold: number; suffix: string }> = [
    { threshold: 1_000_000_000, suffix: 'B' },
    { threshold: 1_000_000, suffix: 'M' },
    { threshold: 1_000, suffix: 'K' },
  ];
  for (const { threshold, suffix } of units) {
    if (n >= threshold) {
      const value = n / threshold;
      // 1 decimal place for non-integer, 0 decimals for round numbers
      const rounded = Math.round(value * 10) / 10;
      const display = Number.isInteger(rounded)
        ? String(rounded)
        : rounded.toFixed(1).replace(/\.0$/, '');
      return `${display}${suffix}`;
    }
  }
  return String(Math.round(n));
}

/**
 * Format `last_trend_time` (free-form ISO-ish string from PHP) into a
 * Vietnamese "X giờ trước" label. Returns null when the timestamp is
 * missing/unparseable so callers can hide the line entirely.
 */
function formatRelativeTime(iso: string | null): string | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return null;
  const diffMs = Date.now() - then;
  if (diffMs < 0) return null; // future — backend sent garbage

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.round(diffMs / minute));
    return `${minutes} phút trước`;
  }
  if (diffMs < day) {
    const hours = Math.round(diffMs / hour);
    return `${hours} giờ trước`;
  }
  const days = Math.round(diffMs / day);
  if (days < 7) return `${days} ngày trước`;
  const weeks = Math.round(days / 7);
  return `${weeks} tuần trước`;
}

export interface HashtagCardProps {
  hashtag: TrendingHashtag;
  /** 0-based index — used to stagger the entrance animation. */
  index: number;
  /** Cap stagger so the first batch finishes quickly even on long lists. */
  maxStaggerIndex?: number;
  onPress: (hashtag: TrendingHashtag) => void;
}

const STAGGER_MS = 40;
const ENTER_DURATION_MS = 320;

function HashtagCard({
  hashtag,
  index,
  maxStaggerIndex = 8,
  onPress,
}: HashtagCardProps) {
  const opacity = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    const effectiveIndex = Math.min(index, maxStaggerIndex);
    const delay = effectiveIndex * STAGGER_MS;
    opacity.value = withDelay(
      delay,
      withTiming(1, {
        duration: ENTER_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
    translateY.value = withDelay(
      delay,
      withTiming(0, {
        duration: ENTER_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [index, maxStaggerIndex, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const relativeTime = useMemo(
    () => formatRelativeTime(hashtag.lastTrendTime),
    [hashtag.lastTrendTime],
  );

  const compactCount = useMemo(
    () => formatCompactCount(hashtag.useCount),
    [hashtag.useCount],
  );

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        className="surface-card mb-3 flex-row items-center px-4 py-3.5"
        activeOpacity={0.8}
        onPress={() => onPress(hashtag)}
        accessibilityRole="button"
        accessibilityLabel={`Hashtag ${hashtag.tag}, ${hashtag.useCount} bài viết`}
      >
        <View className="h-12 w-12 items-center justify-center rounded-full bg-[#0000ff]/10">
          <Hash size={22} color={BRAND} strokeWidth={2.2} />
        </View>
        <View className="ml-3.5 flex-1 pr-3">
          <Text
            className="text-title-primary text-brand"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            #{hashtag.tag}
          </Text>
          <Text className="mt-0.5 text-caption-secondary" numberOfLines={1}>
            {hashtag.useCount > 0
              ? `${hashtag.useCount.toLocaleString('vi-VN')} bài viết`
              : 'Chưa có bài viết'}
            {relativeTime ? ` · cập nhật ${relativeTime}` : ''}
          </Text>
        </View>
        <View className="flex-row items-center rounded-full bg-[#0000ff]/10 px-2.5 py-1">
          <ArrowUpRight size={14} color={BRAND} strokeWidth={2.4} />
          <Text className="ml-1 text-caption-primary text-brand">
            {compactCount}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default React.memo(HashtagCard);
