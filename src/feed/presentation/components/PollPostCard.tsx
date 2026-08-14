// Description: Poll post card component for the home feed.
// Displays poll posts with voting options, results, and interaction actions.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useRef, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BarChart3,
  Check,
  EyeOff,
  Globe,
  Lock,
  ChevronDown,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  Share2,
  Smile,
  ThumbsUp,
  X,
  Users,
} from 'lucide-react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useSharedValue } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type {
  FeedPollPost,
  PollOption,
  PostPrivacy,
} from '../../domain/types/feed.types';
import { isFeedPostShareable } from '../../domain/policies/feedPostPrivacy';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type { PollVoter } from '../../../poll/domain/types/poll.types';
import { createPollRepository } from '../../../poll/infrastructure/repositories/ApiPollRepository';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import {
  FeedCardSurface,
  FeedGlassActionBar,
  FeedGlassActionButton,
} from './FeedCardChrome';
import {
  getFeedReactionPickerAnchorY,
  renderPostTextTokens,
} from './PostCards';
import {
  FEED_REACTION_COLORS as REACTION_COLOR,
  FEED_REACTION_IMAGES as REACTION_IMAGES,
} from './FeedReactionAssets';
import { navigateToPostComments } from '../../../navigation/postNavigation';
import { buildPostActivityContext } from '../../application/composer/postActivityContext';
import { navigateToFeedPublisherPage } from '../navigation/feedPublisherNavigation';
import { GroupPostIdentityHeader } from './GroupPostIdentityHeader';
import { PostTaggedUsersSheet } from './PostTaggedUsersSheet';

interface PollPostCardProps {
  post: FeedPollPost;
  showIdentityHeader?: boolean;
  showGroupContext?: boolean;
  onVote?: (postId: string, optionId: string) => void;
  onPress?: (post: FeedPollPost) => void;
  onMorePress?: (post: FeedPollPost) => void;
  onProfilePress?: (userId: string) => void;
  onReact: (postId: string, reaction: ReactionType) => void;
  onOpenPicker?: (postId: string, x: number, y: number) => void;
  onCommentTap: (postId: string) => void;
  commentNavigationMode?: 'detail' | 'callback';
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

const BRAND_BLUE = APP_BRAND_COLOR;

type PollCopy = {
  language: AppLanguage;
  reactionLabel: Record<ReactionType, string>;
  like: string;
  comment: string;
  share: string;
  userFallback: string;
  publicLabel: string;
  friendsPrivacyLabel: string;
  followersPrivacyLabel: string;
  onlyMePrivacyLabel: string;
  anonymousPrivacyLabel: string;
  totalVotesLabel: (count: string) => string;
  votersTitle: string;
  noVoters: string;
  loadVotersError: string;
  optionFallback: string;
  now: string;
  minutesAgo: (count: number) => string;
  hoursAgo: (count: number) => string;
  daysAgo: (count: number) => string;
  locale: string;
};

const POLL_COPY: Record<AppLanguage, PollCopy> = {
  vi: {
    language: 'vi',
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
    friendsPrivacyLabel: 'B\u1ea1n b\u00e8',
    followersPrivacyLabel: 'M\u1ecdi ng\u01b0\u1eddi theo d\u00f5i t\u00f4i',
    onlyMePrivacyLabel: 'Ch\u1ec9 m\u00ecnh t\u00f4i',
    anonymousPrivacyLabel: '\u1ea8n danh',
    totalVotesLabel: count => `${count} Tổng số phiếu bầu`,
    votersTitle: 'Những người đã bỏ phiếu',
    noVoters: 'Chưa có ai bỏ phiếu',
    loadVotersError: 'Không thể tải danh sách người bỏ phiếu',
    optionFallback: 'Không rõ phương án',
    now: 'Vừa xong',
    minutesAgo: count => `${count} phút trước`,
    hoursAgo: count => `${count} giờ trước`,
    daysAgo: count => `${count} ngày trước`,
    locale: 'vi-VN',
  },
  en: {
    language: 'en',
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
    friendsPrivacyLabel: 'Friends',
    followersPrivacyLabel: 'People following me',
    onlyMePrivacyLabel: 'Only me',
    anonymousPrivacyLabel: 'Anonymous',
    totalVotesLabel: count => `${count} total votes`,
    votersTitle: 'People who voted',
    noVoters: 'No votes yet',
    loadVotersError: 'Could not load the voter list',
    optionFallback: 'Unknown option',
    now: 'Just now',
    minutesAgo: count => `${count} min ago`,
    hoursAgo: count => `${count} h ago`,
    daysAgo: count => `${count} d ago`,
    locale: 'en-US',
  },
};

function getPollPrivacyMeta(privacy: PostPrivacy | undefined, copy: PollCopy) {
  switch (privacy) {
    case 'friends':
      return { label: copy.friendsPrivacyLabel, Icon: Users };
    case 'followers':
      return { label: copy.followersPrivacyLabel, Icon: Users };
    case 'only_me':
      return { label: copy.onlyMePrivacyLabel, Icon: Lock };
    case 'public':
    default:
      return { label: copy.publicLabel, Icon: Globe };
  }
}

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
              isVoted ? 'bg-brand' : 'bg-[#A3A3A3]'
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

const pollRepository = createPollRepository();

function PollVoterRow({
  voter,
  userFallback,
  optionFallback,
}: {
  voter: PollVoter;
  userFallback: string;
  optionFallback: string;
}) {
  return (
    <View className="mb-3 flex-row items-center rounded-2xl bg-[#F7F8FA] px-3 py-3">
      {voter.avatarUrl ? (
        <Image
          source={{ uri: voter.avatarUrl }}
          className="h-11 w-11 rounded-full"
          resizeMode="cover"
          resizeMethod="resize"
        />
      ) : (
        <View className="h-11 w-11 items-center justify-center rounded-full bg-[#D2E4FF]">
          <Smile size={20} color={BRAND_BLUE} />
        </View>
      )}
      <View className="ml-3 flex-1">
        <Text className="text-[15px] font-semibold text-[#050505]">
          {voter.name || voter.username || userFallback}
        </Text>
        {!!voter.username && voter.name && (
          <Text className="mt-0.5 text-[12px] text-[#65676B]">
            @{voter.username}
          </Text>
        )}
        <Text className="mt-1 text-[13px] text-brand">
          {voter.optionText || optionFallback}
        </Text>
      </View>
    </View>
  );
}

export const PollPostCard = React.memo(function PollPostCard({
  post,
  showIdentityHeader = true,
  showGroupContext = false,
  onVote,
  onPress,
  onMorePress,
  onProfilePress,
  onReact,
  onOpenPicker,
  onCommentTap,
  commentNavigationMode = 'detail',
  onShare,
  language = 'vi',
  currentUserAvatar: _currentUserAvatar,
  gestureX,
  gestureY,
  gestureActive,
  gestureStartX,
  gestureStartY,
  hasDragged,
}: PollPostCardProps) {
  const navigation = useNavigation<any>();
  const likeButtonRef = useRef<View>(null);
  const copy = POLL_COPY[language];
  const [votersVisible, setVotersVisible] = React.useState(false);
  const [voters, setVoters] = React.useState<PollVoter[]>([]);
  const [votersLoading, setVotersLoading] = React.useState(false);
  const [votersError, setVotersError] = React.useState<string | null>(null);
  const [taggedUsersVisible, setTaggedUsersVisible] = React.useState(false);

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
    if (!post.isAnonymous && post.publisher?.id) {
      if (!navigateToFeedPublisherPage(navigation, post.publisher)) {
        onProfilePress?.(post.publisher.id);
      }
    }
  }, [navigation, onProfilePress, post.isAnonymous, post.publisher]);

  const handleOptionVote = useCallback(
    (optionId: string) => {
      onVote?.(post.id, optionId);
    },
    [onVote, post.id],
  );

  const handleViewVoters = useCallback(async () => {
    if (post.totalVotes <= 0) return;
    setVotersVisible(true);
    setVotersLoading(true);
    setVotersError(null);
    try {
      const response = await pollRepository.getPollVoters(post.id);
      setVoters(response.voters);
    } catch (error) {
      console.warn('[PollPostCard] load voters failed', error);
      setVoters([]);
      setVotersError(copy.loadVotersError);
    } finally {
      setVotersLoading(false);
    }
  }, [copy.loadVotersError, post.id, post.totalVotes]);

  const handleLikeTap = useCallback(() => {
    onReact(post.id, 'like');
  }, [onReact, post.id]);

  const handleCommentTap = useCallback(() => {
    if (commentNavigationMode === 'callback') {
      onCommentTap(post.id);
      return;
    }
    navigateToPostComments(navigation, post.id, post);
  }, [commentNavigationMode, navigation, onCommentTap, post]);

  const handleLikeLongPress = useCallback(() => {
    if (!onOpenPicker) return;
    if (!likeButtonRef.current) {
      onOpenPicker(
        post.id,
        100,
        getFeedReactionPickerAnchorY(200, post.likeCount, post.commentCount),
      );
      return;
    }
    likeButtonRef.current.measureInWindow((x, y, width) => {
      onOpenPicker(
        post.id,
        x + width / 2,
        getFeedReactionPickerAnchorY(y, post.likeCount, post.commentCount),
      );
    });
  }, [onOpenPicker, post.id, post.likeCount, post.commentCount]);

  const composedGesture = useMemo(() => {
    const pan = Gesture.Pan()
      .activateAfterLongPress(250)
      .onStart(e => {
        gActive.value = true;
        gStartX.value = e.absoluteX;
        gStartY.value = e.absoluteY;
        gDragged.value = false;
        gX.value = e.absoluteX;
        gY.value = e.absoluteY;
        runOnJS(handleLikeLongPress)();
      })
      .onUpdate(e => {
        gX.value = e.absoluteX;
        gY.value = e.absoluteY;
        const dx = e.absoluteX - gStartX.value;
        const dy = e.absoluteY - gStartY.value;
        if (Math.sqrt(dx * dx + dy * dy) > 15) {
          gDragged.value = true;
        }
      })
      .onEnd(() => {
        gActive.value = false;
      });

    const tap = Gesture.Tap()
      .maxDuration(250)
      .onEnd(() => {
        runOnJS(handleLikeTap)();
      });

    return Gesture.Exclusive(pan, tap);
  }, [
    gActive,
    gX,
    gY,
    gStartX,
    gStartY,
    gDragged,
    handleLikeLongPress,
    handleLikeTap,
  ]);

  const hasVoted = post.votedId !== null;
  const totalVotes = post.totalVotes;

  const reactionLabel = post.myReaction
    ? copy.reactionLabel[post.myReaction]
    : copy.like;
  const reactionColor = post.myReaction
    ? REACTION_COLOR[post.myReaction]
    : '#65676B';
  const privacyMeta = post.isAnonymous
    ? { label: copy.anonymousPrivacyLabel, Icon: EyeOff }
    : getPollPrivacyMeta(post.privacy, copy);
  const PrivacyIcon = privacyMeta.Icon;
  const postActivity = buildPostActivityContext({
    language: copy.language,
    feeling: post.feeling,
    taggedUsers: post.taggedUsers,
    location: post.location,
  });
  return (
    <FeedCardSurface>
      {/* Publisher Header */}
      {showIdentityHeader && showGroupContext && post.groupContext ? (
        <GroupPostIdentityHeader
          group={post.groupContext}
          publisher={post.publisher}
          publisherName={
            post.isAnonymous
              ? copy.anonymousPrivacyLabel
              : post.publisher?.name || copy.userFallback
          }
          time={formatTimeAgo(post.postedAt, copy)}
          privacyLabel={privacyMeta.label}
          PrivacyIcon={PrivacyIcon}
          onPublisherPress={handleProfilePress}
          onMorePress={onMorePress ? () => onMorePress(post) : undefined}
          containerClassName="flex-row items-center justify-between px-3 py-3 pb-2"
        />
      ) : null}
      {showIdentityHeader && (!showGroupContext || !post.groupContext) ? (
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
                resizeMethod="resize"
              />
            ) : (
              <View className="h-10 w-10 items-center justify-center rounded-full bg-brand">
                <Smile size={20} color="#FFFFFF" />
              </View>
            )}
            <View className="ml-3 flex-1">
              <Text
                className="text-title-primary text-[#050505]"
                numberOfLines={postActivity.fullText ? 2 : 1}
              >
                <Text className="font-bold">
                  {post.isAnonymous
                    ? copy.anonymousPrivacyLabel
                    : post.publisher?.name || copy.userFallback}
                </Text>
                {postActivity.fullText ? (
                  <>
                    {' '}
                    {postActivity.segments.map((segment, index) => {
                      const isEmphasized =
                        segment.kind === 'feeling' ||
                        segment.kind === 'location' ||
                        segment.kind === 'tagged_users';
                      return (
                        <Text
                          key={`${segment.kind}:${index}`}
                          className={
                            isEmphasized
                              ? 'font-semibold text-[#050505]'
                              : 'font-normal text-[#65676B]'
                          }
                          onPress={
                            segment.kind === 'tagged_users'
                              ? () => setTaggedUsersVisible(true)
                              : undefined
                          }
                        >
                          {segment.text}
                        </Text>
                      );
                    })}
                  </>
                ) : null}
              </Text>
              <View className="flex-row items-center mt-0.5">
                <Text className="text-caption-secondary text-[12px] text-[#65676B]">
                  {formatTimeAgo(post.postedAt, copy)}
                </Text>
                <Text className="text-caption-secondary text-[12px] text-[#65676B]">
                  {' '}
                  {'\u2022'}{' '}
                </Text>
                <PrivacyIcon size={11} color="#65676B" />
                <Text className="ml-1 text-caption-secondary text-[12px] text-[#65676B]">
                  {privacyMeta.label}
                </Text>
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
      ) : null}

      {/* Poll Question / Caption */}
      {post.pollQuestion && (
        <TouchableOpacity
          activeOpacity={0.95}
          onPress={() => onPress?.(post)}
          className={`px-3 pb-3 ${showIdentityHeader ? '' : 'pt-3'}`}
        >
          <Text
            className="text-body-primary font-medium text-[16px] text-[#050505]"
            numberOfLines={4}
          >
            {renderPostTextTokens(post.pollQuestion, post.mentionNames)}
          </Text>
        </TouchableOpacity>
      )}

      {/* Poll Options Container */}
      <View
        className={`px-3 pb-2 ${
          showIdentityHeader || post.pollQuestion ? '' : 'pt-3'
        }`}
      >
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
        <TouchableOpacity
          className="flex-row items-center self-end bg-brand px-4 py-1.5 rounded-full mt-2 mb-2 shadow-sm"
          activeOpacity={0.8}
          onPress={handleViewVoters}
          disabled={totalVotes <= 0}
          accessibilityRole="button"
          accessibilityLabel={copy.totalVotesLabel(formatCount(totalVotes))}
        >
          <BarChart3 size={15} color="#FFFFFF" />
          <Text className="ml-1.5 text-[12px] font-bold text-white">
            {copy.totalVotesLabel(formatCount(totalVotes))}
          </Text>
        </TouchableOpacity>

        {/* Comment Count Bubble */}
        <TouchableOpacity
          className="flex-row items-center justify-end mt-1 border-b border-[#F0F2F5] pb-3"
          activeOpacity={0.7}
          onPress={handleCommentTap}
          accessibilityRole="button"
          accessibilityLabel={`${post.commentCount} ${copy.comment}`}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MessageSquare size={14} color="#8A8D91" />
          <Text className="ml-1.5 text-[12px] text-[#8A8D91] font-semibold">
            {post.commentCount}
          </Text>
        </TouchableOpacity>
      </View>

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
          onPress={handleCommentTap}
        >
          <MessageCircle size={19} color="#65676B" />
          <Text className="ml-2 text-[14px] font-semibold text-[#65676B]">
            {copy.comment}
          </Text>
        </FeedGlassActionButton>

        {isFeedPostShareable(post) ? (
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
        ) : null}
      </FeedGlassActionBar>

      <PostTaggedUsersSheet
        visible={taggedUsersVisible}
        users={post.taggedUsers ?? []}
        onClose={() => setTaggedUsersVisible(false)}
      />

      <Modal
        visible={votersVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVotersVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[78%] rounded-t-3xl bg-white px-4 pb-8 pt-3">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-[18px] font-bold text-[#050505]">
                {copy.votersTitle}
              </Text>
              <TouchableOpacity
                className="h-9 w-9 items-center justify-center rounded-full bg-[#F0F2F5]"
                onPress={() => setVotersVisible(false)}
                accessibilityRole="button"
                accessibilityLabel={language === 'vi' ? 'Đóng' : 'Close'}
              >
                <X size={19} color="#65676B" />
              </TouchableOpacity>
            </View>

            {votersLoading ? (
              <View className="items-center justify-center py-10">
                <ActivityIndicator color={BRAND_BLUE} />
              </View>
            ) : votersError ? (
              <Text className="px-3 py-10 text-center text-[14px] text-[#65676B]">
                {votersError}
              </Text>
            ) : voters.length === 0 ? (
              <Text className="px-3 py-10 text-center text-[14px] text-[#65676B]">
                {copy.noVoters}
              </Text>
            ) : (
              <FlatList
                data={voters}
                keyExtractor={(item, index) =>
                  `${item.userId}-${item.optionId}-${index}`
                }
                renderItem={({ item }) => (
                  <PollVoterRow
                    voter={item}
                    userFallback={copy.userFallback}
                    optionFallback={copy.optionFallback}
                  />
                )}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        </View>
      </Modal>
    </FeedCardSurface>
  );
});

export default PollPostCard;
