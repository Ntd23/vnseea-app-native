// Description: Poll post card component for the home feed.
// Displays poll posts with voting options, results, and interaction actions.
import React, { useCallback, useRef, useMemo } from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BarChart3,
  Check,
  ChevronDown,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Share2,
  Smile,
  ThumbsUp,
} from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue } from 'react-native-reanimated';
import type { FeedPollPost, PollOption } from '../../domain/types/feed.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import {
  FeedCardSurface,
  FeedGlassActionBar,
  FeedGlassActionButton,
} from './FeedCardChrome';

interface PollPostCardProps {
  post: FeedPollPost;
  onVote?: (postId: string, optionId: string) => void;
  onPress?: (post: FeedPollPost) => void;
  onMorePress?: (post: FeedPollPost) => void;
  onProfilePress?: (userId: string) => void;
  onReact: (postId: string, reaction: ReactionType) => void;
  onOpenPicker?: (postId: string, x: number, y: number) => void;
  onCommentTap: (postId: string) => void;
  onShare?: (post: FeedPollPost) => void;
  language?: AppLanguage;
  currentUserAvatar?: string;
  gestureX?: any;
  gestureY?: any;
  gestureActive?: any;
  gestureStartX?: any;
  gestureStartY?: any;
  hasDragged?: any;
}

const BRAND_BLUE = '#0866FF';
const SLATE_GRAY = '#65676B';

const REACTION_EMOJI: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
};

const REACTION_COLOR: Record<ReactionType, string> = {
  like: '#0866ff',
  love: '#f33e58',
  haha: '#f7b125',
  wow: '#f7b125',
  sad: '#f7b125',
  angry: '#e9710f',
};

const REACTION_IMAGES: Record<ReactionType, any> = {
  like: require('../../../assets/reactions/reactions_like.png'),
  love: require('../../../assets/reactions/reactions_love.png'),
  haha: require('../../../assets/reactions/reactions_haha.png'),
  wow: require('../../../assets/reactions/reactions_wow.png'),
  sad: require('../../../assets/reactions/reactions_sad.png'),
  angry: require('../../../assets/reactions/reactions_angry.png'),
};

type PollCopy = {
  reactionLabel: Record<ReactionType, string>;
  like: string;
  comment: string;
  share: string;
  userFallback: string;
  publicLabel: string;
  totalVotesLabel: (count: string) => string;
  now: string;
  minutesAgo: (count: number) => string;
  hoursAgo: (count: number) => string;
  daysAgo: (count: number) => string;
  locale: string;
};

const POLL_COPY: Record<AppLanguage, PollCopy> = {
  vi: {
    reactionLabel: {
      like: 'Đã thích',
      love: 'Yêu thích',
      haha: 'Haha',
      wow: 'Wow',
      sad: 'Buồn',
      angry: 'Phẫn nộ',
    },
    like: 'Thích',
    comment: 'Bình luận',
    share: 'Chia sẻ',
    userFallback: 'Người dùng',
    publicLabel: 'Công khai',
    totalVotesLabel: count => `${count} Tổng số phiếu bầu`,
    now: 'Vừa xong',
    minutesAgo: count => `${count} phút trước`,
    hoursAgo: count => `${count} giờ trước`,
    daysAgo: count => `${count} ngày trước`,
    locale: 'vi-VN',
  },
  en: {
    reactionLabel: {
      like: 'Liked',
      love: 'Love',
      haha: 'Haha',
      wow: 'Wow',
      sad: 'Sad',
      angry: 'Angry',
    },
    like: 'Like',
    comment: 'Comment',
    share: 'Share',
    userFallback: 'User',
    publicLabel: 'Public',
    totalVotesLabel: count => `${count} total votes`,
    now: 'Just now',
    minutesAgo: count => `${count} min ago`,
    hoursAgo: count => `${count} h ago`,
    daysAgo: count => `${count} d ago`,
    locale: 'en-US',
  },
};

function formatTimeAgo(timestamp: number | undefined, copy: PollCopy): string {
  if (!timestamp) return '';
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - timestamp);
  if (diff < 60) return copy.now;
  if (diff < 3600) return copy.minutesAgo(Math.floor(diff / 60));
  if (diff < 86400) return copy.hoursAgo(Math.floor(diff / 3600));
  if (diff < 604800) return copy.daysAgo(Math.floor(diff / 86400));
  return new Date(timestamp * 1000).toLocaleDateString(copy.locale);
}

function formatCount(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function PollOptionItem({
  option,
  isVoted,
  hasVoted,
  onVote,
  disabled,
}: {
  option: PollOption;
  isVoted: boolean;
  hasVoted: boolean;
  onVote: () => void;
  disabled: boolean;
}) {
  const percentageNum = option.percentageNum;
  const widthPercentage = `${Math.min(100, percentageNum)}%`;

  return (
    <TouchableOpacity
      className="mb-3 overflow-hidden rounded-full border-0 bg-[#F0F2F5]"
      activeOpacity={disabled ? 1 : 0.8}
      onPress={onVote}
      disabled={disabled}
    >
      {/* Progress bar background - only show when user has voted */}
      {hasVoted && (
        <View
          className={`absolute bottom-0 left-0 top-0 ${
            isVoted ? 'bg-[#D2E4FF]' : 'bg-[#E4E6EB]'
          }`}
          style={{ width: widthPercentage as any }}
        />
      )}
      <View className="relative flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center flex-1 pr-4">
          <View
            className={`mr-3 flex h-6 w-6 items-center justify-center rounded-full ${
              isVoted ? 'bg-[#0866FF]' : 'bg-[#A3A3A3]'
            }`}
          >
            <Check size={13} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text
            className={`text-[15px] text-[#050505] ${
              isVoted ? 'font-semibold' : 'font-medium'
            } flex-1`}
            numberOfLines={2}
          >
            {option.text}
          </Text>
        </View>

        {hasVoted && (
          <Text className="text-[14px] font-bold text-[#050505] ml-2">
            {option.percentage}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export const PollPostCard = React.memo(function PollPostCard({
  post,
  onVote,
  onPress,
  onMorePress,
  onProfilePress,
  onReact,
  onOpenPicker,
  onCommentTap,
  onShare,
  language = 'vi',
  currentUserAvatar,
  gestureX,
  gestureY,
  gestureActive,
  gestureStartX,
  gestureStartY,
  hasDragged,
}: PollPostCardProps) {
  const likeButtonRef = useRef<View>(null);
  const copy = POLL_COPY[language];

  const localX = useSharedValue(0);
  const localY = useSharedValue(0);
  const localActive = useSharedValue(false);
  const localStartX = useSharedValue(0);
  const localStartY = useSharedValue(0);
  const localDragged = useSharedValue(false);

  const gX = gestureX ?? localX;
  const gY = gestureY ?? localY;
  const gActive = gestureActive ?? localActive;
  const gStartX = gestureStartX ?? localStartX;
  const gStartY = gestureStartY ?? localStartY;
  const gDragged = hasDragged ?? localDragged;

  const handleProfilePress = useCallback(() => {
    if (post.publisher?.id) {
      onProfilePress?.(post.publisher.id);
    }
  }, [onProfilePress, post.publisher?.id]);

  const handleOptionVote = useCallback(
    (optionId: string) => {
      onVote?.(post.id, optionId);
    },
    [onVote, post.id],
  );

  const handleLikeTap = useCallback(() => {
    onReact(post.id, 'like');
  }, [onReact, post.id]);

  const handleLikeLongPress = useCallback(() => {
    if (!onOpenPicker) return;
    if (!likeButtonRef.current) {
      onOpenPicker(post.id, 100, 200);
      return;
    }
    likeButtonRef.current.measureInWindow((x, y, width) => {
      onOpenPicker(post.id, x + width / 2, y);
    });
  }, [onOpenPicker, post.id]);

  const composedGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activateAfterLongPress(250)
      .onStart((e) => {
        gActive.value = true;
        gStartX.value = e.absoluteX;
        gStartY.value = e.absoluteY;
        gDragged.value = false;
        gX.value = e.absoluteX;
        gY.value = e.absoluteY;
        runOnJS(handleLikeLongPress)();
      })
      .onUpdate((e) => {
        gX.value = e.absoluteX;
        gY.value = e.absoluteY;
        const dx = e.absoluteX - gStartX.value;
        const dy = e.absoluteY - gStartY.value;
        if (Math.sqrt(dx*dx + dy*dy) > 15) {
          gDragged.value = true;
        }
      })
      .onEnd(() => {
        gActive.value = false;
      });

    const tap = Gesture.Tap().maxDuration(250).onEnd(() => {
      runOnJS(handleLikeTap)();
    });

    return Gesture.Exclusive(pan, tap);
  }, [gActive, gX, gY, gStartX, gStartY, gDragged, handleLikeLongPress, handleLikeTap]);

  const hasVoted = post.votedId !== null;
  const totalVotes = post.totalVotes;

  const reactionLabel = post.myReaction ? copy.reactionLabel[post.myReaction] : copy.like;
  const reactionColor = post.myReaction ? REACTION_COLOR[post.myReaction] : '#65676B';

  return (
    <FeedCardSurface>
      {/* Publisher Header */}
      <View className="flex-row items-center justify-between px-3 py-3 pb-2">
        <TouchableOpacity
          className="flex-row items-center flex-1 mr-2"
          activeOpacity={0.8}
          onPress={handleProfilePress}
        >
          {post.publisher?.avatarUrl ? (
            <Image
              source={{ uri: post.publisher.avatarUrl }}
              className="h-10 w-10 rounded-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-600">
              <Smile size={20} color="#FFFFFF" />
            </View>
          )}
          <View className="ml-3 flex-1">
            <Text className="text-title-primary font-bold text-[#050505]" numberOfLines={1}>
              {post.publisher?.name || copy.userFallback}
            </Text>
            <View className="flex-row items-center mt-0.5">
              <Text className="text-caption-secondary text-[12px] text-[#65676B]">
                {formatTimeAgo(post.postedAt, copy)}
              </Text>
              <Text className="text-caption-secondary text-[12px] text-[#65676B]"> • </Text>
              <Text className="text-caption-secondary text-[12px] text-[#65676B]">{copy.publicLabel}</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View className="flex-row items-center gap-1">
          {onMorePress && (
            <TouchableOpacity
              onPress={() => onMorePress(post)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MoreHorizontal size={22} color="#94A3B8" />
            </TouchableOpacity>
          )}
          <ChevronDown size={18} color="#65676B" />
        </View>
      </View>

      {/* Poll Question / Caption */}
      {post.pollQuestion && (
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => onPress?.(post)}
          className="px-3 pb-3"
        >
          <Text className="text-body-primary font-medium text-[16px] text-[#050505]" numberOfLines={4}>
            {post.pollQuestion}
          </Text>
        </TouchableOpacity>
      )}

      {/* Poll Options Container */}
      <View className="px-3 pb-2">
        {post.options.map(option => (
          <PollOptionItem
            key={option.id}
            option={option}
            isVoted={post.votedId === option.id}
            hasVoted={hasVoted}
            onVote={() => handleOptionVote(option.id)}
            disabled={hasVoted} // Disable voting if already voted
          />
        ))}

        {/* Votes Pill Badge (aligned to right, blue background, white text) */}
        <View className="flex-row items-center self-end bg-[#0866FF] px-4 py-1.5 rounded-full mt-2 mb-2 shadow-sm">
          <BarChart3 size={15} color="#FFFFFF" />
          <Text className="ml-1.5 text-[12px] font-bold text-white">
            {copy.totalVotesLabel(formatCount(totalVotes))}
          </Text>
        </View>

        {/* Comment Count Bubble */}
        <View className="flex-row items-center justify-end mt-1 border-b border-[#F0F2F5] pb-3">
          <MessageSquare size={14} color="#8A8D91" />
          <Text className="ml-1.5 text-[12px] text-[#8A8D91] font-semibold">
            {post.commentCount}
          </Text>
        </View>
      </View>

      {/* Action buttons (Like / Comment / Share) */}
      <FeedGlassActionBar className="border-t-0 px-3 py-2.5 pt-0">
        <GestureDetector gesture={composedGesture}>
          <Animated.View
            ref={likeButtonRef as any}
            className="flex-1 flex-row items-center justify-center py-1"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            {post.myReaction ? (
              <Image
                source={REACTION_IMAGES[post.myReaction]}
                style={{ width: 20, height: 20 }}
                resizeMode="contain"
              />
            ) : (
              <ThumbsUp size={19} color={reactionColor} />
            )}
            <Text
              className="ml-2 text-[14px] font-semibold"
              style={{ color: reactionColor }}
            >
              {reactionLabel}
            </Text>
          </Animated.View>
        </GestureDetector>

        <FeedGlassActionButton
          className="flex-1 flex-row items-center justify-center py-1"
          activeOpacity={0.75}
          onPress={() => onCommentTap(post.id)}
        >
          <MessageCircle size={19} color="#65676B" />
          <Text className="ml-2 text-[14px] font-semibold text-[#65676B]">
            {copy.comment}
          </Text>
        </FeedGlassActionButton>

        <FeedGlassActionButton
          className="flex-1 flex-row items-center justify-center py-1"
          activeOpacity={0.75}
          onPress={() => onShare?.(post)}
        >
          <Share2 size={19} color="#65676B" />
          <Text className="ml-2 text-[14px] font-semibold text-[#65676B]">
            {copy.share}
          </Text>
        </FeedGlassActionButton>
      </FeedGlassActionBar>
    </FeedCardSurface>
  );
});

export default PollPostCard;
