// StoryGridCell — one tile of the StoriesListScreen grid.
//
// Visual recipe (mirrors the rail's Story bubble, but square):
//
//   ┌──────────────────────────────────┐
//   │ [image OR video thumb, cover]    │
//   │                            [▶]?  │ ← play badge if segment is video
//   │  ●publisher-name  ·  3 phút      │ ← avatar w/ brand ring + name + time
//   └──────────────────────────────────┘
//
// Animation: the parent FlatList wraps each cell in `Animated.View` with a
// staggered `FadeIn` + `ZoomIn` entry so the grid cascades in. This file
// only owns the cell's intrinsic layout — no entrance animation logic.

import React, { memo, useMemo } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Play } from 'lucide-react-native';
import type { StoriesListRow } from '../../application/view-models/useStoriesListViewModel';
import { formatStoriesRelativeTime, type StoriesCopy } from '../../application/i18n/storiesCopy';

interface StoryGridCellProps {
  row: StoriesListRow;
  /** Pre-resolved copy for the current language (avoids prop drilling hooks). */
  copy: StoriesCopy;
  /** Called with the row's tap target. The parent navigates to the viewer. */
  onPress: (row: StoriesListRow) => void;
}

function StoryGridCellImpl({ row, copy, onPress }: StoryGridCellProps) {
  const timeLabel = useMemo(
    () => formatStoriesRelativeTime(row.postedAt, copy),
    [row.postedAt, copy],
  );

  const showVideoBadge = row.isVideo;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(row)}
      className="overflow-hidden rounded-[18px] border border-[#e2e8f0] bg-white"
      accessibilityRole="button"
      accessibilityLabel={`${row.publisher.name} ${timeLabel}`}
    >
      {/* Cover media — image OR video thumbnail. The video segment URL is a
          CDN-normalised poster so <Image> can render it directly. */}
      <View className="relative aspect-square w-full bg-slate-100">
        {row.coverUrl ? (
          <Image
            source={{ uri: row.coverUrl }}
            className="h-full w-full"
            resizeMode="cover"
            fadeDuration={0}
          />
        ) : (
          <View className="h-full w-full items-center justify-center bg-slate-200">
            <Text className="text-[12px] font-semibold text-slate-400">
              {copy.timeJustNow}
            </Text>
          </View>
        )}

        {/* Soft gradient overlay so the bottom text remains readable on any
            cover. Implemented with two stacked translucent views (no
            react-native-linear-gradient dep needed). */}
        <View className="absolute inset-0 bg-black/10" />
        <View className="absolute bottom-0 left-0 right-0 h-20 bg-black/35" />

        {/* Video badge — sits in the top-right so it doesn't collide with
            the avatar in the bottom-left. */}
        {showVideoBadge ? (
          <View className="absolute right-2 top-2 h-7 w-7 items-center justify-center rounded-full bg-black/55">
            <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
          </View>
        ) : null}

        {/* Unseen badge — small accent dot if the publisher still has unseen
            segments. Hidden once the user has seen everything. */}
        {row.hasUnseen && !row.isViewed ? (
          <View className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#0000ff]" />
        ) : null}

        {/* Avatar with brand-coloured ring. Bottom-left corner. */}
        <View className="absolute bottom-2 left-2 flex-row items-center">
          <View
            className="h-7 w-7 items-center justify-center overflow-hidden rounded-full border-2 border-[#0000ff] bg-white p-0.5"
            style={{ borderColor: '#0000ff' }}
          >
            {row.publisher.avatarUrl ? (
              <Image
                source={{ uri: row.publisher.avatarUrl }}
                className="h-full w-full rounded-full"
                resizeMode="cover"
                fadeDuration={0}
              />
            ) : (
              <View className="h-full w-full items-center justify-center rounded-full bg-slate-300">
                <Text className="text-[10px] font-bold text-white">
                  {row.publisher.name?.charAt(0)?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
          </View>

          {/* Publisher name + time stacked next to the avatar. numberOfLines
              keeps the cell height fixed even for long Vietnamese names. */}
          <View className="ml-2 flex-1">
            <Text
              className="text-[12px] font-extrabold text-white"
              numberOfLines={1}
            >
              {row.publisher.name || row.publisher.username}
            </Text>
            <Text
              className="text-[10px] font-semibold text-white/85"
              numberOfLines={1}
            >
              {timeLabel}
            </Text>
          </View>

          {/* Segment count badge — only when there are multiple segments
              in the same publisher's bubble. */}
          {row.segmentCount > 1 ? (
            <View className="ml-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-white/30 px-1.5">
              <Text className="text-[10px] font-extrabold text-white">
                {row.segmentCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const StoryGridCell = memo(StoryGridCellImpl);
export default StoryGridCell;