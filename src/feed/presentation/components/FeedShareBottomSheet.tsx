// Description: VNSEEA post-share sheet with an inline composer and carousels.
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, X } from 'lucide-react-native';
import { captureRef } from 'react-native-view-shot';
import { useMyPagesViewModel, type PagesItem } from '../../../pages';
import { useMyGroupsViewModel, type GroupItem } from '../../../community';
import type { ChatItem } from '../../../messages/domain/types/messages.types';
import { createMessagesRepository } from '../../../messages/infrastructure/repositories/ApiMessagesRepository';
import { tabBarVisibility } from '../../../navigation/tabBarVisibility';
import { storyCreatedEvents } from '../../../stories/application/events/storyCreatedEvents';
import type { StoryItem } from '../../../stories/domain/types/stories.types';
import { createStoriesRepository } from '../../../stories/infrastructure/repositories/ApiStoriesRepository';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import {
  getShareableUrl,
  useShareViewModel,
} from '../../../shared-kernel/application/view-models/useShareViewModel';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';
import { showToast } from '../../../shared-kernel/presentation/components/ToastNotification';
import { getShareCopy } from '../../application/i18n/shareCopy';
import {
  buildPostStoryCardModel,
  createPostStoryShare,
} from '../../application/sharing/postStoryShare';
import {
  getMessageRecipientIdsToSend,
  getMessageShareChats,
  getMessageShareRecipient,
  MAX_MESSAGE_SHARE_RECIPIENTS,
  MESSAGE_SHARE_CONCURRENCY,
  sendPostShareToMessageRecipients,
  type MessageRecipientStatuses,
} from '../../application/sharing/shareMessageRecipients';
import type { FeedPost } from '../../domain/types/feed.types';
import type {
  FeedShareDestination,
  SharePostInput,
} from '../../domain/repositories/FeedRepository';
import { FeedShareComposerCard } from './share/FeedShareComposerCard';
import {
  FeedShareDestinationCarousel,
  type FeedShareCarouselDestination,
} from './share/FeedShareDestinationCarousel';
import { FeedShareRecipientCarousel } from './share/FeedShareRecipientCarousel';
import { PostStoryShareCard } from './share/PostStoryShareCard';

const FALLBACK_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';
const ANIMATION_MS = 280;
const STORY_MEDIA_READY_TIMEOUT_MS = 3000;
const SHARE_DEBUG_PREFIX = '[VNSEEA_SHARE_DEBUG]';

type InternalShareTarget = 'timeline' | 'page' | 'group' | 'story';
type LazyShareData = 'message' | 'page' | 'group';

function logShareDebug(event: string, data: Record<string, unknown> = {}) {
  try {
    console.log(
      SHARE_DEBUG_PREFIX,
      JSON.stringify({ event, at: new Date().toISOString(), ...data }),
    );
  } catch {
    console.log(SHARE_DEBUG_PREFIX, event);
  }
}

interface ShareEntityChoice {
  id: string;
  title: string;
  subtitle?: string;
  avatar?: string;
}

const messagesRepository = createMessagesRepository();
const storiesRepository = createStoriesRepository();

function mapPageChoice(page: PagesItem): ShareEntityChoice {
  return {
    id: String(page.pageId || page.id),
    title: page.pageTitle || page.pageName,
    subtitle: page.pageName ? `@${page.pageName}` : undefined,
    avatar: page.avatar,
  };
}

function mapGroupChoice(group: GroupItem): ShareEntityChoice {
  return {
    id: String(group.groupId || group.id),
    title: group.groupTitle || group.groupName,
    avatar: group.avatar,
  };
}

function ShareEntityCarousel({
  title,
  emptyLabel,
  entities,
  selectedId,
  isLoading,
  disabled,
  onSelect,
}: {
  title: string;
  emptyLabel: string;
  entities: ShareEntityChoice[];
  selectedId: string | null;
  isLoading: boolean;
  disabled: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <View className="mt-4">
      <Text className="mb-3 px-1 text-[15px] font-extrabold text-slate-900">
        {title}
      </Text>
      {isLoading ? (
        <View className="min-h-[94px] items-center justify-center">
          <ActivityIndicator color="#0000ff" />
        </View>
      ) : entities.length === 0 ? (
        <View className="rounded-lg bg-slate-50 p-3">
          <Text className="text-[13px] font-semibold text-slate-500">
            {emptyLabel}
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalContent}
        >
          {entities.map(entity => {
            const selected = selectedId === entity.id;
            return (
              <TouchableOpacity
                key={entity.id}
                activeOpacity={0.85}
                disabled={disabled}
                onPress={() => onSelect(entity.id)}
                className={`mr-3 w-[158px] flex-row items-center rounded-lg border p-2.5 ${
                  selected
                    ? 'border-[#0000ff] bg-indigo-50'
                    : 'border-slate-200 surface-card'
                }`}
              >
                <Image
                  source={{ uri: entity.avatar || FALLBACK_AVATAR }}
                  className="h-10 w-10 rounded-full bg-slate-200"
                />
                <View className="ml-2 min-w-0 flex-1">
                  <Text
                    className="text-[12px] font-extrabold text-slate-900"
                    numberOfLines={1}
                  >
                    {entity.title}
                  </Text>
                  {entity.subtitle ? (
                    <Text
                      className="mt-0.5 text-[10px] font-semibold text-slate-500"
                      numberOfLines={1}
                    >
                      {entity.subtitle}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function buildOptimisticStory({
  id,
  captureUri,
  title,
  description,
  user,
}: {
  id: string;
  captureUri: string;
  title?: string;
  description?: string;
  user: NonNullable<ReturnType<typeof useCurrentUserViewModel>['user']>;
}): StoryItem {
  const now = Math.floor(Date.now() / 1000);
  return {
    id,
    publisher: {
      userId: user.userId,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatar,
      isVerified: false,
    },
    title,
    description,
    postedAt: now,
    expiresAt: now + 24 * 60 * 60,
    thumbnailUrl: captureUri,
    media: [
      {
        id: `local-${id}`,
        type: 'image',
        url: captureUri,
      },
    ],
    isOwner: true,
    isViewed: false,
    hasUnseen: true,
    myReaction: null,
    reactionCount: 0,
  };
}

export interface FeedShareBottomSheetProps {
  visible: boolean;
  post?: FeedPost;
  onClose: () => void;
  onInternalShare: (input: SharePostInput) => Promise<FeedPost>;
  onShared?: (post: FeedPost) => void;
}

export function FeedShareBottomSheet({
  visible,
  post,
  onClose,
  onInternalShare,
  onShared,
}: FeedShareBottomSheetProps) {
  const language = useAppLanguage();
  const copy = getShareCopy(language);
  const insets = useSafeAreaInsets();
  const currentUserVm = useCurrentUserViewModel();
  const pagesVm = useMyPagesViewModel();
  const groupsVm = useMyGroupsViewModel();
  const { copyToClipboard, sharePost } = useShareViewModel();

  const [note, setNote] = useState('');
  const [target, setTarget] = useState<InternalShareTarget>('timeline');
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [messageChats, setMessageChats] = useState<ChatItem[]>([]);
  const [isLoadingMessageChats, setIsLoadingMessageChats] = useState(false);
  const [messageChatsError, setMessageChatsError] = useState<string | null>(null);
  const [selectedMessageRecipientIds, setSelectedMessageRecipientIds] =
    useState<string[]>([]);
  const [messageRecipientStatuses, setMessageRecipientStatuses] =
    useState<MessageRecipientStatuses>({});
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storyCardReady, setStoryCardReady] = useState(false);
  const [forceStoryMediaFallback, setForceStoryMediaFallback] = useState(false);
  const loadedDataRef = useRef<Set<LazyShareData>>(new Set());
  const messageLoadGenerationRef = useRef(0);
  const wasVisibleRef = useRef(false);
  const storyCardRef = useRef<View | null>(null);

  const translateY = useSharedValue(1000);
  const backdropOpacity = useSharedValue(0);
  const [mounted, setMounted] = useState(visible);

  const pageChoices = useMemo(
    () => pagesVm.pages.map(mapPageChoice),
    [pagesVm.pages],
  );
  const groupChoices = useMemo(
    () => groupsVm.groups.map(mapGroupChoice),
    [groupsVm.groups],
  );
  const availableMessageChats = useMemo(
    () => getMessageShareChats(messageChats, currentUserVm.user?.userId),
    [currentUserVm.user?.userId, messageChats],
  );
  const messageChatsByRecipientKey = useMemo(() => {
    const chatsByKey = new Map<string, ChatItem>();
    for (const chat of availableMessageChats) {
      const recipient = getMessageShareRecipient(chat);
      if (recipient) chatsByKey.set(recipient.key, chat);
    }
    return chatsByKey;
  }, [availableMessageChats]);
  const storyCardModel = useMemo(
    () => (post ? buildPostStoryCardModel(post, note) : null),
    [note, post],
  );
  const storyCardPostId = storyCardModel?.postId;
  const storyMediaUrl = storyCardModel?.mediaUrl;
  const messageRecipientIdsToSend = useMemo(
    () =>
      getMessageRecipientIdsToSend(
        selectedMessageRecipientIds,
        messageRecipientStatuses,
      ),
    [messageRecipientStatuses, selectedMessageRecipientIds],
  );
  const hasFailedMessageRecipients = selectedMessageRecipientIds.some(
    recipientId => messageRecipientStatuses[recipientId] === 'failed',
  );

  useEffect(() => {
    const wasVisible = wasVisibleRef.current;
    wasVisibleRef.current = visible;

    if (visible && !wasVisible) {
      messageLoadGenerationRef.current += 1;
      setMounted(true);
      setNote('');
      setTarget('timeline');
      setError(null);
      setIsSharing(false);
      setSelectedPageId(null);
      setSelectedGroupId(null);
      setMessageChats([]);
      setIsLoadingMessageChats(false);
      setMessageChatsError(null);
      setSelectedMessageRecipientIds([]);
      setMessageRecipientStatuses({});
      setStoryCardReady(false);
      setForceStoryMediaFallback(false);
      loadedDataRef.current.clear();
      tabBarVisibility.setVisible(false);
      translateY.value = withTiming(0, {
        duration: ANIMATION_MS,
        easing: Easing.out(Easing.cubic),
      });
      backdropOpacity.value = withTiming(1, {
        duration: ANIMATION_MS,
        easing: Easing.out(Easing.cubic),
      });
    } else if (!visible && wasVisible) {
      messageLoadGenerationRef.current += 1;
      setTarget('timeline');
      translateY.value = withTiming(1000, {
        duration: ANIMATION_MS,
        easing: Easing.in(Easing.cubic),
      });
      backdropOpacity.value = withTiming(0, {
        duration: ANIMATION_MS,
        easing: Easing.in(Easing.cubic),
      });
      tabBarVisibility.setVisible(true);
      const timeout = setTimeout(() => setMounted(false), ANIMATION_MS);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [backdropOpacity, translateY, visible]);

  useEffect(() => {
    return () => {
      messageLoadGenerationRef.current += 1;
      tabBarVisibility.setVisible(true);
    };
  }, []);

  const loadMessageChats = useCallback(
    async (force = false) => {
      if (!visible || (!force && loadedDataRef.current.has('message'))) return;

      loadedDataRef.current.add('message');
      const generation = messageLoadGenerationRef.current;
      setIsLoadingMessageChats(true);
      setMessageChatsError(null);
      logShareDebug('feed_share_chats_load_start', { generation, force });
      try {
        const [userResult, groupResult] = await Promise.allSettled([
          Promise.resolve().then(() =>
            messagesRepository.getChats({ includeDiscovery: false }),
          ),
          Promise.resolve().then(() => messagesRepository.getGroupChats()),
        ]);

        if (generation !== messageLoadGenerationRef.current) {
          logShareDebug('feed_share_chats_load_stale', {
            generation,
            currentGeneration: messageLoadGenerationRef.current,
          });
          return;
        }

        const userChats =
          userResult.status === 'fulfilled' ? userResult.value : [];
        const groupChats =
          groupResult.status === 'fulfilled' ? groupResult.value : [];
        const combinedChats = [...userChats, ...groupChats];
        const filteredChats = getMessageShareChats(
          combinedChats,
          currentUserVm.user?.userId,
        );
        const bothFailed =
          userResult.status === 'rejected' &&
          groupResult.status === 'rejected';
        const partiallyFailed =
          userResult.status === 'rejected' ||
          groupResult.status === 'rejected';

        setMessageChats(combinedChats);
        if (bothFailed) {
          loadedDataRef.current.delete('message');
          setMessageChatsError(copy.chatLoadFailed);
        } else if (partiallyFailed) {
          setMessageChatsError(copy.chatLoadPartial);
        }

        logShareDebug('feed_share_chats_load_result', {
          generation,
          userStatus: userResult.status,
          groupStatus: groupResult.status,
          rawUserCount: userChats.length,
          rawGroupCount: groupChats.length,
          filteredUserCount: filteredChats.filter(
            chat => chat.chatType !== 'group',
          ).length,
          filteredGroupCount: filteredChats.filter(
            chat => chat.chatType === 'group',
          ).length,
        });
      } catch {
        if (generation !== messageLoadGenerationRef.current) return;
        loadedDataRef.current.delete('message');
        setMessageChatsError(copy.chatLoadFailed);
        logShareDebug('feed_share_chats_load_error', { generation });
      } finally {
        if (generation === messageLoadGenerationRef.current) {
          setIsLoadingMessageChats(false);
        }
      }
    },
    [
      copy.chatLoadFailed,
      copy.chatLoadPartial,
      currentUserVm.user?.userId,
      visible,
    ],
  );

  useEffect(() => {
    loadMessageChats().catch(() => undefined);
  }, [loadMessageChats]);

  const handleRetryMessageChats = useCallback(() => {
    loadMessageChats(true).catch(() => undefined);
  }, [loadMessageChats]);

  useEffect(() => {
    if (!visible || (target !== 'page' && target !== 'group')) return;
    if (loadedDataRef.current.has(target)) return;

    loadedDataRef.current.add(target);
    if (target === 'page') {
      pagesVm.loadFirstPage(false).catch(() => undefined);
    } else {
      groupsVm.loadFirstPage(false).catch(() => undefined);
    }
  }, [groupsVm, pagesVm, target, visible]);

  useEffect(() => {
    if (!selectedPageId && pageChoices.length > 0) {
      setSelectedPageId(pageChoices[0].id);
    }
  }, [pageChoices, selectedPageId]);

  useEffect(() => {
    if (!selectedGroupId && groupChoices.length > 0) {
      setSelectedGroupId(groupChoices[0].id);
    }
  }, [groupChoices, selectedGroupId]);

  useEffect(() => {
    if (!visible || target !== 'story' || !storyCardPostId) return undefined;

    setForceStoryMediaFallback(false);
    setStoryCardReady(!storyMediaUrl);
    if (!storyMediaUrl) return undefined;

    const timeout = setTimeout(() => {
      setForceStoryMediaFallback(true);
      setStoryCardReady(true);
    }, STORY_MEDIA_READY_TIMEOUT_MS);
    return () => clearTimeout(timeout);
  }, [storyCardPostId, storyMediaUrl, target, visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const selectedPage = pageChoices.find(page => page.id === selectedPageId);
  const selectedGroup = groupChoices.find(
    group => group.id === selectedGroupId,
  );
  const targetLabel =
    target === 'story'
      ? copy.destStory
      : target === 'page'
      ? selectedPage?.title || copy.destPage
      : target === 'group'
      ? selectedGroup?.title || copy.destGroup
      : copy.destTimeline;
  const primaryButtonLabel =
    target === 'story'
      ? copy.shareStory
      : target === 'page'
      ? copy.sharePage
      : target === 'group'
      ? copy.shareGroup
      : copy.shareNow;
  const isPrimaryShareDisabled =
    isSharing ||
    !currentUserVm.user?.userId ||
    (target === 'page' && !selectedPageId) ||
    (target === 'group' && !selectedGroupId) ||
    (target === 'story' && !storyCardReady);

  const destinationLabels = useMemo(
    () => ({
      story: copy.destStory,
      timeline: copy.destTimeline,
      page: copy.destPage,
      group: copy.destGroup,
      copy: copy.copyLink,
      more: copy.more,
    }),
    [copy],
  );

  const handleClose = useCallback(() => {
    if (!isSharing) onClose();
  }, [isSharing, onClose]);

  const handleStoryCardReady = useCallback(() => {
    setStoryCardReady(true);
  }, []);

  const handleToggleMessageRecipient = useCallback(
    (recipientId: string) => {
      if (isSharing || messageRecipientStatuses[recipientId] === 'sent') return;

      if (selectedMessageRecipientIds.includes(recipientId)) {
        setSelectedMessageRecipientIds(current =>
          current.filter(id => id !== recipientId),
        );
        setMessageRecipientStatuses(current => {
          const next = { ...current };
          delete next[recipientId];
          return next;
        });
        setError(null);
        return;
      }

      if (selectedMessageRecipientIds.length >= MAX_MESSAGE_SHARE_RECIPIENTS) {
        setError(copy.recipientLimitReached(MAX_MESSAGE_SHARE_RECIPIENTS));
        return;
      }

      setSelectedMessageRecipientIds(current => [...current, recipientId]);
      setMessageRecipientStatuses(current => ({
        ...current,
        [recipientId]: 'idle',
      }));
      setError(null);
    },
    [copy, isSharing, messageRecipientStatuses, selectedMessageRecipientIds],
  );

  const handleCopyLink = useCallback(async () => {
    if (!post || isSharing) return;
    setIsSharing(true);
    setError(null);
    try {
      const copied = await copyToClipboard(post.id, 'post');
      if (!copied) throw new Error(copy.copyFailed);
      showToast({ message: copy.copied, type: 'success' });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.copyFailed);
    } finally {
      setIsSharing(false);
    }
  }, [copy, copyToClipboard, isSharing, onClose, post]);

  const handleExternalShare = useCallback(async () => {
    if (!post || isSharing) return;
    setIsSharing(true);
    setError(null);
    try {
      const result = await sharePost(post, {
        title: copy.sharePostTitle,
        subject: copy.sharePostSubject,
      });
      if (!result) throw new Error(copy.shareFailed);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.shareFailed);
    } finally {
      setIsSharing(false);
    }
  }, [copy, isSharing, onClose, post, sharePost]);

  const handleStoryShare = useCallback(async () => {
    if (
      !post ||
      !storyCardReady ||
      !storyCardRef.current ||
      !currentUserVm.user
    ) {
      throw new Error(copy.storyPreparing);
    }

    const { captureUri, draft, result } = await createPostStoryShare({
      post,
      note,
      capture: options => captureRef(storyCardRef, options),
      getShareUrl: postId => getShareableUrl(postId, 'post'),
      upload: storyDraft => storiesRepository.createStory(storyDraft),
    });
    const optimisticId = result.storyId || `local-share-${Date.now()}`;
    storyCreatedEvents.emit(
      buildOptimisticStory({
        id: optimisticId,
        captureUri,
        title: draft.title,
        description: draft.description,
        user: currentUserVm.user,
      }),
    );
    showToast({ message: copy.storyShareSuccess, type: 'success' });
  }, [
    copy.storyPreparing,
    copy.storyShareSuccess,
    currentUserVm.user,
    note,
    post,
    storyCardReady,
  ]);

  const handlePrimaryShare = useCallback(async () => {
    if (!post || isPrimaryShareDisabled) return;
    setIsSharing(true);
    setError(null);
    try {
      if (target === 'story') {
        await handleStoryShare();
        onClose();
        return;
      }

      const destination: FeedShareDestination = target;
      const input: SharePostInput = {
        postId: post.id,
        destination,
        text: note,
      };
      if (destination === 'timeline') {
        input.userId = currentUserVm.user?.userId;
      } else if (destination === 'page') {
        input.pageId = selectedPageId || undefined;
      } else if (destination === 'group') {
        input.groupId = selectedGroupId || undefined;
      }

      const shared = await onInternalShare(input);
      onShared?.(shared);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : target === 'story'
          ? copy.storyShareFailed
          : copy.shareError,
      );
    } finally {
      setIsSharing(false);
    }
  }, [
    copy.shareError,
    copy.storyShareFailed,
    currentUserVm.user?.userId,
    handleStoryShare,
    isPrimaryShareDisabled,
    note,
    onClose,
    onInternalShare,
    onShared,
    post,
    selectedGroupId,
    selectedPageId,
    target,
  ]);

  const handleSendMessages = useCallback(async () => {
    if (!post || isSharing || messageRecipientIdsToSend.length === 0) return;
    setIsSharing(true);
    setError(null);
    try {
      const results = await sendPostShareToMessageRecipients({
        recipientIds: messageRecipientIdsToSend,
        concurrency: MESSAGE_SHARE_CONCURRENCY,
        send: recipientKey => {
          const chat = messageChatsByRecipientKey.get(recipientKey);
          const recipient = chat ? getMessageShareRecipient(chat) : null;
          if (!recipient) {
            throw new Error(copy.selectMessageRecipient);
          }
          return onInternalShare({
            postId: post.id,
            destination: 'message',
            ...(recipient.kind === 'group'
              ? { recipientGroupId: recipient.targetId }
              : { recipientUserId: recipient.targetId }),
            text: note,
          });
        },
        onStatusChange: (recipientId, status) => {
          setMessageRecipientStatuses(current => ({
            ...current,
            [recipientId]: status,
          }));
        },
      });
      const failedCount = results.filter(
        result => result.status === 'failed',
      ).length;
      if (failedCount > 0) {
        setError(
          copy.messagePartialFailure(
            selectedMessageRecipientIds.length - failedCount,
            failedCount,
          ),
        );
        return;
      }

      showToast({
        message: copy.messageShareSuccess(selectedMessageRecipientIds.length),
        type: 'success',
      });
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.shareError);
    } finally {
      setIsSharing(false);
    }
  }, [
    copy,
    isSharing,
    messageRecipientIdsToSend,
    messageChatsByRecipientKey,
    note,
    onClose,
    onInternalShare,
    post,
    selectedMessageRecipientIds.length,
  ]);

  const handleDestinationSelect = useCallback(
    (destination: FeedShareCarouselDestination) => {
      if (isSharing) return;
      setError(null);
      if (destination === 'copy') {
        handleCopyLink().catch(() => undefined);
        return;
      }
      if (destination === 'more') {
        handleExternalShare().catch(() => undefined);
        return;
      }
      setTarget(destination);
    },
    [handleCopyLink, handleExternalShare, isSharing],
  );

  if (!mounted || !post) return null;

  return (
    <View className="absolute inset-0 z-[1100] justify-end">
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[backdropStyle, styles.backdrop]}
        className="absolute inset-0"
      >
        <Pressable
          accessibilityLabel={copy.closeAria}
          onPress={handleClose}
          disabled={isSharing}
          className="flex-1"
        />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
        className="absolute inset-0 justify-end"
      >
        <Animated.View
          style={[sheetStyle, styles.sheet]}
          className="surface-base overflow-hidden rounded-t-[20px]"
        >
          <View className="surface-card rounded-none border-x-0 border-t-0">
            <View className="items-center pb-1 pt-2">
              <View className="h-[5px] w-9 rounded-full bg-slate-300" />
            </View>
            <View className="min-h-[52px] flex-row items-center justify-between px-4">
              <View className="w-9" />
              <Text className="flex-1 text-center text-[17px] font-extrabold text-slate-900">
                {copy.title}
              </Text>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleClose}
                disabled={isSharing}
                accessibilityLabel={copy.closeAria}
                className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              >
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scrollRegion}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <FeedShareComposerCard
              avatarUri={currentUserVm.user?.avatar}
              displayName={currentUserVm.user?.name || copy.myProfile}
              targetLabel={targetLabel}
              note={note}
              notePlaceholder={copy.addNotePlaceholder}
              ctaLabel={primaryButtonLabel}
              isSubmitting={isSharing}
              disabled={isPrimaryShareDisabled}
              error={selectedMessageRecipientIds.length > 0 ? null : error}
              onNoteChange={setNote}
              onSubmit={handlePrimaryShare}
              preview={
                target === 'story' && storyCardModel ? (
                  <PostStoryShareCard
                    ref={storyCardRef}
                    model={storyCardModel}
                    forceMediaFallback={forceStoryMediaFallback}
                    onReady={handleStoryCardReady}
                  />
                ) : undefined
              }
            />

            {target === 'page' ? (
              <ShareEntityCarousel
                title={copy.myPages}
                emptyLabel={pagesVm.error || copy.noPages}
                entities={pageChoices}
                selectedId={selectedPageId}
                isLoading={pagesVm.isLoading}
                disabled={isSharing}
                onSelect={setSelectedPageId}
              />
            ) : null}

            {target === 'group' ? (
              <ShareEntityCarousel
                title={copy.myGroups}
                emptyLabel={groupsVm.error || copy.noGroups}
                entities={groupChoices}
                selectedId={selectedGroupId}
                isLoading={groupsVm.isLoading}
                disabled={isSharing}
                onSelect={setSelectedGroupId}
              />
            ) : null}

            <FeedShareRecipientCarousel
              title={copy.sendViaMessages}
              emptyLabel={copy.noChats}
              loadingLabel={copy.loadingChats}
              errorLabel={messageChatsError}
              retryLabel={copy.retryChats}
              selectedLabel={copy.selectedRecipients(
                selectedMessageRecipientIds.length,
                MAX_MESSAGE_SHARE_RECIPIENTS,
              )}
              chats={availableMessageChats}
              selectedIds={selectedMessageRecipientIds}
              statuses={messageRecipientStatuses}
              isLoading={isLoadingMessageChats}
              disabled={isSharing}
              onToggle={handleToggleMessageRecipient}
              onRetry={handleRetryMessageChats}
            />

            <FeedShareDestinationCarousel
              title={copy.shareTo}
              selected={target}
              labels={destinationLabels}
              disabled={isSharing}
              onSelect={handleDestinationSelect}
            />
          </ScrollView>

          {selectedMessageRecipientIds.length > 0 ? (
            <View
              testID="feed-share-footer"
              style={{ paddingBottom: Math.max(insets.bottom, 10) }}
              className="surface-card rounded-none border-x-0 border-b-0 px-4 pt-3"
            >
              {error ? (
                <View className="mb-2 rounded-lg bg-red-50 p-2.5">
                  <Text className="text-[12px] font-bold text-red-700">
                    {error}
                  </Text>
                </View>
              ) : null}
              <TouchableOpacity
                activeOpacity={0.88}
                disabled={isSharing || messageRecipientIdsToSend.length === 0}
                onPress={handleSendMessages}
                className={`min-h-12 flex-row items-center justify-center rounded-lg bg-[#0000ff] px-4 ${
                  isSharing || messageRecipientIdsToSend.length === 0
                    ? 'opacity-40'
                    : ''
                }`}
              >
                {isSharing ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Send size={16} color="#ffffff" />
                    <Text className="ml-2 text-[14px] font-extrabold text-white">
                      {hasFailedMessageRecipients
                        ? copy.retryMessageRecipients(
                            messageRecipientIdsToSend.length,
                          )
                        : copy.sendMessageRecipients(
                            selectedMessageRecipientIds.length,
                          )}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default FeedShareBottomSheet;

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  sheet: {
    height: '84%',
  },
  scrollRegion: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 24,
  },
  horizontalContent: {
    paddingRight: 8,
  },
});
