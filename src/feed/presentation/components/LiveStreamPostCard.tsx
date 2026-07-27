// Description: Reusable Facebook-style live-stream card for Home and Profile feeds.
import React, { useCallback, useMemo } from 'react';
import { Image, Text, View } from 'react-native';
import { Radio, Users } from 'lucide-react-native';
import type { LiveStreamItem } from '../../../live/domain/types/live.types';
import { InlineLiveStreamPlayer } from '../../../live/presentation/components/InlineLiveStreamPlayer';
import {
  FeedCardContent,
  FeedMediaFrame,
  FeedTouchableCardSurface,
} from './FeedCardChrome';
import { formatPostTime, type FeedCopy } from './PostCards';

const FALLBACK_LIVE_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBzOiwu9eVVr13_YUuLqFaZS5DMZSQjPQqGVp3m79mrFIOksxUaafxT6NOD7hWY1ovOOtnGqlKKmPy3vZS5LhbiBbX6XQyXexcys3dCd700wiTgDGs4KRiq5vM64_gByXbAgZ356Xg_1i8PN9yGMKSGadOq-PYlT497w8_Ab1upM7ybuluWZspaikqyZ-BtES8q1oKfjZ9BHYtV1APztnG0dp7bW-4y0QkJh46DJatsljh0w0WsaL0Os2nes04dtts1t6X_kG8wXqw';

export type LiveStreamPostCardProps = {
  item: LiveStreamItem;
  copy: FeedCopy;
  isActive: boolean;
  onPress: (item: LiveStreamItem) => void;
};

export const LiveStreamPostCard = React.memo(
  function LiveStreamPostCard({
    item,
    copy,
    isActive,
    onPress,
  }: LiveStreamPostCardProps) {
    const handlePress = useCallback(() => {
      onPress(item);
    }, [item, onPress]);
    const avatarSource = useMemo(
      () => ({ uri: item.publisher.avatarUrl || FALLBACK_LIVE_AVATAR }),
      [item.publisher.avatarUrl],
    );
    const startedAtSeconds = Math.floor(
      new Date(item.startedAt).getTime() / 1000,
    );
    const timeText = Number.isFinite(startedAtSeconds)
      ? formatPostTime(startedAtSeconds, copy)
      : copy.now;
    const isStale = item.state === 'stale';

    return (
      <FeedTouchableCardSurface activeOpacity={0.88} onPress={handlePress}>
        <FeedCardContent>
          <View className="flex-row items-center">
            <Image
              source={avatarSource}
              className="h-[42px] w-[42px] rounded-full"
              resizeMode="cover"
              fadeDuration={0}
            />
            <View className="ml-3 flex-1">
              <Text
                className="text-title-primary text-[#111827]"
                numberOfLines={1}
              >
                {item.publisher.name}
              </Text>
              <View className="mt-0.5 flex-row items-center">
                <View
                  className={`h-2 w-2 rounded-full ${
                    isStale ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                />
                <Text className="ml-1 text-xs font-bold text-[#64748b]">
                  {isStale ? copy.livePending : copy.livePlaying}
                </Text>
                <Text className="mx-1 text-xs text-[#94a3b8]">{'•'}</Text>
                <Text className="text-xs font-semibold text-[#64748b]">
                  {timeText}
                </Text>
              </View>
            </View>
            <View className="h-9 w-9 items-center justify-center rounded-full bg-red-50">
              <Radio size={18} color="#ef4444" />
            </View>
          </View>
        </FeedCardContent>

        <FeedMediaFrame className="relative h-52 bg-[#0f172a]">
          <InlineLiveStreamPlayer active={isActive} item={item} />
          <View className="absolute right-3 top-3 flex-row items-center rounded-full bg-red-500 px-3 py-1">
            <View className="h-2 w-2 rounded-full bg-white" />
            <Text className="ml-1 text-xs font-extrabold text-white">LIVE</Text>
          </View>
          <View className="absolute bottom-3 left-3 flex-row items-center rounded-full bg-black/65 px-3 py-1.5">
            <Users size={14} color="#ffffff" />
            <Text className="ml-1 text-xs font-bold text-white">
              {item.viewerCount}
            </Text>
          </View>
        </FeedMediaFrame>

        <FeedCardContent>
          <Text
            className="text-[15px] font-extrabold text-[#111827]"
            numberOfLines={2}
          >
            {item.title || copy.liveTitle(item.publisher.name)}
          </Text>
          {!!item.description && (
            <Text className="mt-1 text-sm text-[#475569]" numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </FeedCardContent>
      </FeedTouchableCardSurface>
    );
  },
  (previous, next) =>
    previous.item.id === next.item.id &&
    previous.item.viewerCount === next.item.viewerCount &&
    previous.item.state === next.item.state &&
    previous.item.thumbnailUrl === next.item.thumbnailUrl &&
    previous.item.title === next.item.title &&
    previous.item.description === next.item.description &&
    previous.isActive === next.isActive &&
    previous.copy === next.copy,
);

export default LiveStreamPostCard;
