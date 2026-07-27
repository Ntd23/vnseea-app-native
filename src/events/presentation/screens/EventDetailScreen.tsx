// Description: Shows an event detail page with owner edit and delete actions.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import {
  ArrowLeft,
  CalendarDays,
  Clock3,
  Edit3,
  Grid3X3,
  Heart,
  Info,
  MapPin,
  Trash2,
  Users,
} from 'lucide-react-native';
import { useSharedValue } from 'react-native-reanimated';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useEventsViewModel } from '../../application/view-models/useEventsViewModel';
import { showSnackbar as showToast } from '../../../shared-kernel/presentation/components/Snackbar';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getEventsCopy } from '../../application/i18n/eventsCopy';
import { ComposerCard } from '../../../feed/presentation/components/ComposerCard';
import {
  FeedFilterTabs,
  type FeedFilterTabKey,
} from '../../../feed/presentation/components/FeedFilterTabs';
import {
  FEED_COPY,
  HomeVideoPostCard,
  ReactionPickerOverlay,
  TextPostCard,
} from '../../../feed/presentation/components/PostCards';
import { PollPostCard } from '../../../feed/presentation/components/PollPostCard';
import { CreatePostModal } from '../../../feed/presentation/screens/CreatePostScreen';
import { FeedShareBottomSheet } from '../../../feed/presentation/components/FeedShareBottomSheet';
import { useFeedCommentsViewModel } from '../../../feed/application/view-models/useFeedCommentsViewModel';
import { usePostRealtimeScope } from '../../../feed/application/realtime/usePostRealtimeScope';
import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import type {
  FeedPollPost,
  FeedPost,
  FeedTextPost,
  FeedVideoPost,
} from '../../../feed/domain/types/feed.types';
import { isFeedPostShareable } from '../../../feed/domain/policies/feedPostPrivacy';
import type { SharePostInput } from '../../../feed/domain/repositories/FeedRepository';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { ReelCommentsSheet } from '../../../reels/presentation/components/ReelCommentsSheet';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';

type EventDetailNav = NativeStackNavigationProp<RootStackParamList>;
type EventDetailRoute = RouteProp<RootStackParamList, typeof ROUTES.EVENT_DETAIL>;

const BRAND = APP_BRAND_COLOR;
const EVENT_POST_LIMIT = 20;
const feedRepository = createFeedRepository();

function parseEventDate(dateValue?: string, timeValue?: string): Date | null {
  if (!dateValue) return null;

  const normalizedDate = String(dateValue).trim();
  const numericTimestamp = Number(normalizedDate);
  if (/^\d{10,13}$/.test(normalizedDate) && Number.isFinite(numericTimestamp)) {
    const date = new Date(normalizedDate.length === 10 ? numericTimestamp * 1000 : numericTimestamp);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const timeMatch = String(timeValue ?? '00:00')
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  let hours = Number(timeMatch?.[1] ?? 0);
  const minutes = Number(timeMatch?.[2] ?? 0);
  const seconds = Number(timeMatch?.[3] ?? 0);
  const meridiem = timeMatch?.[4]?.toUpperCase();
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  const parts = normalizedDate.match(/^(\d{1,4})[/-](\d{1,2})[/-](\d{1,4})$/);
  let date: Date;
  if (parts) {
    const first = Number(parts[1]);
    const middle = Number(parts[2]);
    const last = Number(parts[3]);
    const isYearFirst = parts[1].length === 4;
    const yearValue = isYearFirst ? first : last;
    const year = yearValue < 100 ? 2000 + yearValue : yearValue;
    const month = middle;
    const day = isYearFirst ? last : first;
    date = new Date(year, month - 1, day, hours, minutes, seconds);
  } else {
    date = new Date(`${normalizedDate} ${timeValue ?? ''}`.trim());
  }

  return Number.isNaN(date.getTime()) ? null : date;
}

function EventDetailScreen() {
  const navigation = useNavigation<EventDetailNav>();
  const isFocused = useIsFocused();
  const route = useRoute<EventDetailRoute>();
  const { event } = route.params;
  const { isDeleting, deleteEvent, toggleGoing, toggleInterested } = useEventsViewModel();
  const [language] = useState<AppLanguage>(languageStorage.getLanguage());
  const copy = getEventsCopy(language);
  const postCopy = FEED_COPY[language] ?? FEED_COPY.vi;
  const labels = language === 'vi'
    ? {
        edit: 'Chỉnh sửa sự kiện', delete: 'Xóa bỏ', empty: `${event.name ?? event.event_name ?? 'Sự kiện'} vẫn chưa đăng bất cứ điều gì`,
        starts: 'Ngày Bắt Đầu', ends: 'Ngày Cuối', invite: 'Mời bạn bè / người theo dõi của bạn',
        info: 'Thông tin', about: 'Về', going: 'Đi mọi người', interested: 'Những người quan tâm',
        posts: 'bài viết', join: 'Tham gia', interest: 'Quan tâm đến', noDescription: 'Chưa có mô tả sự kiện.',
      }
    : {
        edit: 'Edit event', delete: 'Delete', empty: `${event.name ?? event.event_name ?? 'This event'} has not posted anything yet`,
        starts: 'Start Date', ends: 'End Date', invite: 'Invite your friends / followers',
        info: 'Information', about: 'About', going: 'people going', interested: 'people interested',
        posts: 'posts', join: 'Going', interest: 'Interested', noDescription: 'No event description yet.',
      };

  const profile = useMemo(() => sessionStorage.getUserProfile(), []);
  const eventId = String(event.id);
  const title = event.name ?? event.event_name ?? copy.eventsTitle;
  const description = event.description ?? event.event_description;
  const location = event.location ?? event.event_location;
  const startDate = event.start_date ?? event.event_start_date;
  const startTime = event.start_time ?? event.event_start_time;
  const endDate = event.end_date ?? event.event_end_date;
  const endTime = event.end_time ?? event.event_end_time;
  const cover = event.cover ?? event.event_cover;
  const isOwner = event.is_owner === true;

  const [posts, setPosts] = useState<Array<FeedTextPost | FeedVideoPost | FeedPollPost>>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [postsError, setPostsError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FeedFilterTabKey>('all');
  const [composerVisible, setComposerVisible] = useState(false);
  const [composerAction, setComposerAction] = useState<'photo' | 'video' | 'product' | 'poll' | undefined>();
  const [pickerAnchor, setPickerAnchor] = useState<{ postId: string; x: number; y: number } | null>(null);
  const [sharingPost, setSharingPost] = useState<FeedPost | undefined>();
  const [shareVisible, setShareVisible] = useState(false);
  const [isRsvpLoading, setIsRsvpLoading] = useState(false);
  const [isGoing, setIsGoing] = useState(Boolean(event.is_going));
  const [isInterested, setIsInterested] = useState(Boolean(event.is_interested));
  const [remaining, setRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const gestureX = useSharedValue(0);
  const gestureY = useSharedValue(0);
  const gestureActive = useSharedValue(false);
  const hasDragged = useSharedValue(false);

  const updatePostById = useCallback((postId: string, updater: (post: FeedTextPost | FeedVideoPost | FeedPollPost) => FeedTextPost | FeedVideoPost | FeedPollPost) => {
    setPosts(current => current.map(post => post.id === postId ? updater(post) : post));
  }, []);
  const commentVm = useFeedCommentsViewModel({
    onCommentCountChange: (postId, delta) => updatePostById(postId, post => ({
      ...post,
      commentCount: Math.max(0, post.commentCount + delta),
    })),
  });
  usePostRealtimeScope({
    postIds: posts.slice(0, 20).map(post => post.id),
    posts: posts.slice(0, 20),
    enabled: isFocused,
    onSnapshot: nextPost => {
      setPosts(current =>
        current.map(post =>
          String(post.id) === String(nextPost.id)
            ? (nextPost as FeedTextPost | FeedVideoPost | FeedPollPost)
            : post,
        ),
      );
    },
    onDeleted: postId => {
      setPosts(current => current.filter(post => String(post.id) !== postId));
    },
    onCommentMutation: change => {
      if (String(commentVm.selectedCommentPostId) === change.postId) {
        void commentVm.refreshComments();
      }
    },
  });

  const loadPosts = useCallback(async (refreshing = false) => {
    refreshing ? setIsRefreshing(true) : setIsLoadingPosts(true);
    setPostsError(null);
    try {
      const page = await feedRepository.getEventPosts(eventId, EVENT_POST_LIMIT);
      setPosts(page.posts);
    } catch (error) {
      setPostsError(error instanceof Error ? error.message : 'Không thể tải bài viết sự kiện.');
    } finally {
      setIsLoadingPosts(false);
      setIsRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    void loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const startTarget = parseEventDate(startDate, startTime)?.getTime() ?? 0;
      const endTarget = parseEventDate(endDate, endTime)?.getTime() ?? 0;
      const target = startTarget > now ? startTarget : endTarget > now ? endTarget : 0;
      const distance = Math.max(0, target - now);
      setRemaining({
        days: Math.floor(distance / 86400000),
        hours: Math.floor((distance % 86400000) / 3600000),
        minutes: Math.floor((distance % 3600000) / 60000),
        seconds: Math.floor((distance % 60000) / 1000),
      });
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [endDate, endTime, startDate, startTime]);

  const confirmDelete = useCallback(() => {
    Alert.alert(copy.deleteEvent, copy.deleteConfirm, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.delete,
        style: 'destructive',
        onPress: async () => {
          const result = await deleteEvent(event.id);
          if (result.success) {
            showToast({ message: copy.deleteSuccess, type: 'success' });
            setTimeout(() => navigation.navigate(ROUTES.EVENTS), 600);
          } else {
            showToast({ message: result.error ?? copy.deleteError, type: 'error' });
          }
        },
      },
    ]);
  }, [copy, deleteEvent, event.id, navigation]);

  const handleRsvp = useCallback(async (type: 'going' | 'interested') => {
    setIsRsvpLoading(true);
    try {
      if (type === 'going') {
        const result = await toggleGoing(event.id);
        if (!result.success) {
          showToast({ message: result.error ?? copy.error, type: 'error' });
          return;
        }
        setIsGoing(result.isGoing ?? !isGoing);
      } else {
        const result = await toggleInterested(event.id);
        if (!result.success) {
          showToast({ message: result.error ?? copy.error, type: 'error' });
          return;
        }
        setIsInterested(result.isInterested ?? !isInterested);
      }
    } finally {
      setIsRsvpLoading(false);
    }
  }, [copy.error, event.id, isGoing, isInterested, toggleGoing, toggleInterested]);

  const handleCreatePost = useCallback((action?: 'photo' | 'video' | 'product' | 'poll') => {
    setComposerAction(action);
    setComposerVisible(true);
  }, []);

  const handleToggleReaction = useCallback(async (postId: string, nextReaction: ReactionType) => {
    let snapshot: FeedTextPost | FeedVideoPost | FeedPollPost | undefined;
    let targetReaction: ReactionType | null = nextReaction;
    updatePostById(postId, post => {
      snapshot = post;
      targetReaction = post.myReaction === nextReaction ? null : nextReaction;
      const likeCount = Math.max(0, post.likeCount + Number(targetReaction !== null) - Number(post.myReaction !== null));
      const topReactions = targetReaction
        ? [targetReaction, ...post.topReactions.filter(item => item !== targetReaction)].slice(0, 3)
        : post.topReactions.filter(item => item !== post.myReaction);
      return { ...post, myReaction: targetReaction, isLiked: targetReaction !== null, likeCount, topReactions };
    });
    try {
      await feedRepository.setReaction(postId, targetReaction);
    } catch {
      if (snapshot) updatePostById(postId, () => snapshot!);
    }
  }, [updatePostById]);

  const displayedPosts = useMemo(() => posts.filter(post =>
    activeFilter === 'all' || (post.kind === 'text' && post.photos.length > 0),
  ), [activeFilter, posts]);
  const selectedCommentPost = useMemo(() => posts.find(post => post.id === commentVm.selectedCommentPostId), [commentVm.selectedCommentPostId, posts]);

  const renderPost = useCallback((post: FeedTextPost | FeedVideoPost | FeedPollPost) => {
    const sharedProps = {
      onReact: handleToggleReaction,
      onOpenPicker: (postId: string, x: number, y: number) => setPickerAnchor({ postId, x, y }),
      onCommentTap: (postId: string) => commentVm.openComments(postId),
      onShare: (item: FeedPost) => {
        if (!isFeedPostShareable(item)) return;
        setSharingPost(item);
        setShareVisible(true);
      },
    };
    if (post.kind === 'video') {
      return <HomeVideoPostCard key={post.id} post={post} copy={postCopy} {...sharedProps} navigateToProfile={userId => navigateToUserProfile(navigation, userId)} isScreenFocused />;
    }
    if (post.kind === 'poll') {
      return <PollPostCard key={post.id} post={post} language={language} {...sharedProps} onProfilePress={userId => navigateToUserProfile(navigation, userId)} currentUserAvatar={profile?.avatarUrl} />;
    }
    return <TextPostCard key={post.id} post={post} copy={postCopy} {...sharedProps} onPhotoPress={item => navigation.navigate(ROUTES.POST_DETAIL, { postId: item.id })} navigateToProfile={userId => navigateToUserProfile(navigation, userId)} onPostPress={item => navigation.navigate(ROUTES.POST_DETAIL, { postId: item.id })} />;
  }, [commentVm, handleToggleReaction, language, navigation, postCopy, profile?.avatarUrl]);

  const countdownItems = [
    [remaining.days, 'Days'], [remaining.hours, 'Hours'], [remaining.minutes, 'Minutes'], [remaining.seconds, 'Seconds'],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#eef3ff' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaFeedHeader />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-20"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => void loadPosts(true)} colors={[BRAND]} tintColor={BRAND} />}
      >
        <View className="bg-white pb-5">
          <View style={{ position: 'relative' }}>
            {cover ? <Image source={{ uri: cover }} className="h-48 w-full" resizeMode="cover" /> : (
              <View className="h-48 items-center justify-center bg-[#dfe4ff]"><CalendarDays size={52} color={BRAND} /></View>
            )}
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={{
                position: 'absolute',
                left: 12,
                top: 12,
                zIndex: 10,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: 'rgba(0,0,0,0.4)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeft size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text className="mt-4 text-center text-[22px] font-semibold text-slate-900">{title}</Text>
          <View className="mt-4 flex-row justify-center gap-3">
            {countdownItems.map(([value, label]) => (
              <View key={label} className="items-center">
                <View className="h-10 min-w-[40px] items-center justify-center rounded-full bg-slate-100 px-2">
                  <Text className="text-[16px] font-bold text-slate-800">{value}</Text>
                </View>
                <Text className="mt-1 text-[10px] text-slate-500">{label}</Text>
              </View>
            ))}
          </View>

          {isOwner ? (
            <View className="mx-auto mt-5 flex-row gap-3">
              <TouchableOpacity className="min-h-[42px] flex-row items-center rounded-md bg-red-50 px-4" onPress={() => navigation.navigate(ROUTES.EDIT_EVENT, { event })}>
                <Edit3 size={16} color="#B45353" /><Text className="ml-2 text-[12px] font-semibold text-[#B45353]">{labels.edit}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={isDeleting} className="min-h-[42px] flex-row items-center rounded-md bg-red-50 px-4" onPress={confirmDelete}>
                {isDeleting ? <ActivityIndicator color="#B45353" /> : <><Trash2 size={16} color="#B45353" /><Text className="ml-2 text-[12px] font-semibold text-[#B45353]">{labels.delete}</Text></>}
              </TouchableOpacity>
            </View>
          ) : (
            <View className="mx-4 mt-5 flex-row gap-3">
              <TouchableOpacity disabled={isRsvpLoading} className="min-h-[44px] flex-1 items-center justify-center rounded-md bg-slate-100" onPress={() => void handleRsvp('going')}>
                <Text className="font-semibold text-slate-700">{isGoing ? copy.joined : labels.join}</Text>
              </TouchableOpacity>
              <TouchableOpacity disabled={isRsvpLoading} className="min-h-[44px] flex-1 items-center justify-center rounded-md bg-slate-100" onPress={() => void handleRsvp('interested')}>
                <Text className="font-semibold text-slate-700">{isInterested ? copy.interested : labels.interest}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View className="mt-3 border-y border-slate-100 bg-white py-4">
          <ComposerCard
            onPress={() => handleCreatePost()}
            onPressAction={handleCreatePost}
            avatarUrl={profile?.avatarUrl}
            displayName={profile?.name || (language === 'vi' ? 'Quản trị' : 'Admin')}
            copy={{ createPostBtn: language === 'vi' ? 'Hôm nay bạn thế nào ?' : "What's on your mind?", photo: 'Photos', video: 'Video', product: 'Product', poll: 'Poll' }}
          />
        </View>
        <FeedFilterTabs activeSource={activeFilter} onChangeSource={setActiveFilter} />

        {isLoadingPosts ? (
          <View className="bg-white py-14"><ActivityIndicator color={BRAND} /></View>
        ) : postsError ? (
          <View className="bg-white px-4 py-8"><Text className="text-center text-red-600">{postsError}</Text></View>
        ) : displayedPosts.length ? (
          <View className="bg-white">{displayedPosts.map(renderPost)}</View>
        ) : (
          <View className="items-center bg-white py-16">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-100"><Grid3X3 size={28} color="#90A4AE" /></View>
            <Text className="mt-4 px-6 text-center text-slate-500">{labels.empty}</Text>
          </View>
        )}

        <View className="mt-3 bg-white">
          <View className="flex-row items-center border-b border-slate-100 px-4 py-4">
            <CalendarDays size={19} color="#22C55E" /><View className="ml-3"><Text className="font-bold text-slate-700">{labels.starts}</Text><Text className="mt-1 text-slate-500">{startDate || '--'} - {startTime || '--'}</Text></View>
          </View>
          <View className="flex-row items-center border-b border-slate-100 px-4 py-4">
            <Clock3 size={19} color="#EC407A" /><View className="ml-3"><Text className="font-bold text-slate-700">{labels.ends}</Text><Text className="mt-1 text-slate-500">{endDate || '--'} - {endTime || '--'}</Text></View>
          </View>
          <View className="px-3 py-4">
            <Text className="mb-2 font-semibold text-slate-700">{labels.invite}</Text>
            <TextInput className="min-h-[44px] rounded-md border border-slate-200 px-3 text-slate-800" />
          </View>
        </View>

        <View className="mt-3 bg-white">
          <View className="flex-row items-center border-b border-slate-100 px-4 py-3"><View className="h-6 w-6 items-center justify-center rounded-full bg-brand"><Info size={14} color="#FFFFFF" /></View><Text className="ml-2 font-bold text-slate-800">{labels.info}</Text></View>
          <View className="flex-row items-center border-b border-slate-100 px-4 py-3"><Users size={17} color="#64748B" /><Text className="ml-3 text-slate-600">{Number(event.going_count || 0)} {labels.going}</Text></View>
          <View className="flex-row items-center border-b border-slate-100 px-4 py-3"><Heart size={17} color="#64748B" /><Text className="ml-3 text-slate-600">{Number(event.interested_count || 0)} {labels.interested}</Text></View>
          <View className="flex-row items-center border-b border-slate-100 px-4 py-3"><MapPin size={17} color="#64748B" /><Text className="ml-3 flex-1 text-slate-600">{location || '--'}</Text></View>
          <View className="flex-row items-center px-4 py-3"><Grid3X3 size={17} color="#64748B" /><Text className="ml-3 text-slate-600">{posts.length} {labels.posts}</Text></View>
        </View>

        <View className="mt-3 bg-white">
          <View className="flex-row items-center border-b border-slate-100 px-4 py-3"><View className="h-6 w-6 items-center justify-center rounded-full bg-brand"><Info size={14} color="#FFFFFF" /></View><Text className="ml-2 font-bold text-slate-800">{labels.about}</Text></View>
          <Text className="px-4 py-5 text-slate-600">{description || labels.noDescription}</Text>
        </View>
      </ScrollView>

      <CreatePostModal visible={composerVisible} onClose={() => { setComposerVisible(false); setComposerAction(undefined); }} onCreated={() => void loadPosts(true)} eventId={eventId} initialAction={composerAction} />
      <ReactionPickerOverlay anchor={pickerAnchor} onPick={reaction => { if (pickerAnchor) void handleToggleReaction(pickerAnchor.postId, reaction); setPickerAnchor(null); }} onDismiss={() => setPickerAnchor(null)} gestureX={gestureX} gestureY={gestureY} gestureActive={gestureActive} hasDragged={hasDragged} />
      <ReelCommentsSheet
        visible={commentVm.isCommentsOpen} comments={commentVm.comments} commentCount={selectedCommentPost?.commentCount ?? commentVm.comments.length}
        isLoading={commentVm.isCommentsLoading} isLoadingMore={commentVm.isCommentsLoadingMore} isSubmitting={commentVm.isSubmittingComment} error={commentVm.commentError}
        repliesById={commentVm.repliesById} loadingRepliesIds={commentVm.loadingRepliesIds} replyingTo={commentVm.replyingTo}
        onClose={commentVm.closeComments} onEndReached={commentVm.loadMoreComments} onRetry={() => commentVm.selectedCommentPostId && commentVm.openComments(commentVm.selectedCommentPostId)}
        onSubmit={commentVm.submitComment} onSubmitReply={commentVm.submitReply} onSearchMentions={commentVm.searchCommentMentions} onSetReaction={commentVm.setCommentReaction} onDelete={commentVm.deleteComment} onEdit={commentVm.editComment}
        onLoadReplies={commentVm.loadReplies} onCollapseReplies={commentVm.collapseReplies} onStartReply={commentVm.startReplyTo} onCancelReply={commentVm.cancelReply}
        onRetryFailedComment={commentVm.retryFailedComment} onDeleteFailedComment={commentVm.deleteFailedComment} sheetHeight="90%"
      />
      <FeedShareBottomSheet visible={shareVisible} post={sharingPost} onClose={() => { setShareVisible(false); setTimeout(() => setSharingPost(undefined), 250); }} onInternalShare={(input: SharePostInput) => feedRepository.sharePost(input)} />
    </View>
  );
}

export default EventDetailScreen;
