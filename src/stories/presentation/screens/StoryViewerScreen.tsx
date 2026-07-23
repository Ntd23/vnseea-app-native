// Description: Full-screen Instagram/Facebook-style story viewer.
//
// Layout:
//
//   ┌─────────────────────────────────────┐
//   │ ▓▓▓▓▓▓░░░░  ░░░░░░  ░░░░░░          │ ← progress bars (one per segment)
//   │ 👤 Quyền Quý · 2 giờ          🗑 X  │ ← header (delete only if owner)
//   │                                     │
//   │      [ image OR video full ]        │ ← media area
//   │                                     │
//   │                                     │
//   │   Tiêu đề / mô tả (nếu có)          │ ← bottom overlay
//   │   👍 ❤️ 😂 😮 😢 😡                  │ ← reaction picker
//   └─────────────────────────────────────┘
//
// Interactions:
//   • Tap left third  → previous segment (or previous user)
//   • Tap right third → next segment (or next user)
//   • Long-press anywhere → pause progress + video
//   • Release         → resume
//   • Tap emoji       → toggle reaction (swap to that one)
//   • Tap 🗑 (owner)  → confirm + delete story + close
//   • Tap X           → close
//
// Progress driving:
//   • Image segments → fixed 5s timer animates the bar.
//   • Video segments → wait for `onLoad` to learn duration, then animate
//     the bar across exactly that span. Video's own `paused` prop is
//     bound to `isPaused` so long-press freezes both bar AND playback.
//   • On animation finish → advance to next segment / user / close.
//
// Swipe-down-to-dismiss:
//   • Drag down from anywhere on the media area → the whole story sheet
//     follows the finger, fading out as it travels. Mirrors the cover /
//     photo viewer pattern.
//   • Release before the threshold (35% of screen height OR vy > 800)
//     → spring back to center, progress timer resumes.
//   • Release after the threshold → animate off-screen and call
//     `navigation.goBack()`.

import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import VideoPlayer from 'react-native-video';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import ReanimatedAnimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  ChevronDown,
  Flag,
  ExternalLink,
  MoreHorizontal,
  Send,
  Trash2,
  UserCircle,
  X,
} from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import { createStoriesRepository } from '../../infrastructure/repositories/ApiStoriesRepository';
import { storyDeletedEvents } from '../../application/events/storyDeletedEvents';
import { storyReactedEvents } from '../../application/events/storyReactedEvents';
import type { StoryItem } from '../../domain/types/stories.types';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { ROOT_SAFE_AREA_EDGES } from '../../../shared-kernel/presentation/utils/safeAreaEdges';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { showSnackbar } from '../../../shared-kernel/presentation/components/Snackbar';
import {
  FEED_REACTION_IMAGES,
  FEED_REACTION_TYPES,
} from '../../../feed/presentation/components/FeedReactionAssets';
import { parseSharedPostIdFromStoryDescription } from './storySharedPostLink';
import { SharedPostStorySegment } from '../components/SharedPostStorySegment';
import { calculateSharedPostStoryAvailableHeight } from '../../application/sharing/sharedPostStoryLayout';
import { createMessagesRepository } from '../../../messages/infrastructure/repositories/ApiMessagesRepository';
import type { StoryReplyMessageReference } from '../../../messages/domain/types/messages.types';
import { filterActiveStories } from '../../domain/policies/storyExpiration';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Props = NativeStackScreenProps<RootStackParamList, 'StoryViewer'>;

// Segment timings. Image is fixed; video uses its actual duration (set
// via VideoPlayer's `onLoad` callback) with a fallback if duration is
// missing from the metadata.
const IMAGE_SEGMENT_MS = 5000;
const VIDEO_FALLBACK_MS = 15000;
const REPLY_SWIPE_THRESHOLD = 72;
const REPLY_SWIPE_VELOCITY = -700;

const repository = createStoriesRepository();
const messagesRepository = createMessagesRepository();

type ReactionBurstItem = {
  id: string;
  reaction: ReactionType;
  left: number;
  size: number;
  driftX: number;
  translateY: Animated.Value;
  opacity: Animated.Value;
  scale: Animated.Value;
  rotate: Animated.Value;
};

/** Format a unix-seconds timestamp as a Vietnamese relative phrase. */
function formatRelativeTime(timestamp?: number) {
  if (!timestamp) return '';
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - timestamp);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  return `${Math.floor(diff / 86400)} ngày`;
}

function StoryViewerScreen({ route }: Props) {
  const navigation = useNavigation<Nav>();
  const isStoryViewerFocused = useIsFocused();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const storySafeAreaInsets = useSafeAreaInsets();
  const storyHeaderSafeTop = Math.max(storySafeAreaInsets.top, 8);

  // Support BOTH: new API (stories array passed directly) AND old API
  // (stories list + initialUserIndex). This keeps backwards compat while
  // migrating to the cleaner "pass filtered stories" pattern.
  const rawPassedStories = Array.isArray(route.params?.stories)
    ? route.params.stories
    : undefined;
  const passedStories = useMemo(
    () =>
      rawPassedStories
        ? filterActiveStories(rawPassedStories)
        : undefined,
    [rawPassedStories],
  );

  const [stories, setStories] = useState<StoryItem[]>(passedStories ?? []);

  const userIndexRef = useRef<number>(0);

  // If we got an explicit index from the caller, use it (but clamp to bounds).
  if (route.params?.initialUserIndex !== undefined) {
    const clamped = Math.max(
      0,
      Math.min(
        route.params.initialUserIndex,
        stories.length - 1
      )
    );
    userIndexRef.current = clamped;
  } else if (passedStories && passedStories.length > 0) {
    userIndexRef.current = 0;
  }

  const [userIndex, setUserIndex] = useState(userIndexRef.current);

  // Debug log for testing
  useEffect(() => {
    if (passedStories && passedStories.length > 0) {
      console.log(
        '[StoryViewer] Raw passed:',
        passedStories.length,
        'stories:',
        stories.length
      );
      console.log(
        '[StoryViewer] Story segments:',
        stories.map(s => `${s.publisher.name} (${s.media.length} segments)`)
      );
    }
  }, [stories, passedStories]);
  const [segmentIndex, setSegmentIndex] = useState(() => {
    const initialStory = stories[userIndexRef.current];
    const requestedIndex = route.params?.initialSegmentIndex ?? 0;
    return Math.max(
      0,
      Math.min(requestedIndex, Math.max(0, (initialStory?.media.length ?? 1) - 1)),
    );
  });
  const [isPaused, setIsPaused] = useState(false);
  const [isOptionsSheetVisible, setIsOptionsSheetVisible] = useState(false);
  const [isReplyComposerOpen, setIsReplyComposerOpen] = useState(false);
  const [replyDraft, setReplyDraft] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const replyInputRef = useRef<TextInput>(null);
  const pauseForNavigationRef = useRef(false);
  const [reactionBurst, setReactionBurst] = useState<ReactionBurstItem[]>([]);
  const reactionBurstId = useRef(0);
  // Set by VideoPlayer's onLoad — null while waiting for metadata so we
  // know NOT to start the progress timer yet for video segments.
  const [videoDurationMs, setVideoDurationMs] = useState<number | null>(null);
  const [readySharedPostSegmentKey, setReadySharedPostSegmentKey] = useState<
    string | null
  >(null);

  const currentStory = stories[userIndex] ?? null;
  const segments = currentStory?.media ?? [];
  const currentSegment = segments[segmentIndex] ?? null;
  const segmentPlaybackKey = useMemo(
    () =>
      [
        userIndex,
        segmentIndex,
        currentStory?.id ?? 'story',
        currentSegment?.id ?? 'segment',
        currentSegment?.type ?? 'empty',
      ].join(':'),
    [
      currentSegment?.id,
      currentSegment?.type,
      currentStory?.id,
      segmentIndex,
      userIndex,
    ],
  );
  const sharedPostId = useMemo(() => {
    if (currentSegment?.type === 'shared_post') {
      return currentSegment.sourcePostId ?? null;
    }
    return parseSharedPostIdFromStoryDescription(
      currentSegment?.description ?? currentStory?.description,
    );
  }, [currentSegment, currentStory?.description]);
  const shouldPausePlayback =
    isPaused ||
    !isStoryViewerFocused ||
    isOptionsSheetVisible ||
    isReplyComposerOpen ||
    isSendingReply;

  // Effective duration for the current segment. For video we wait on
  // `onLoad` (videoDurationMs becomes a number), then animate over that.
  const segmentMs = useMemo(() => {
    if (!currentSegment) return IMAGE_SEGMENT_MS;
    if (currentSegment.type !== 'video') return IMAGE_SEGMENT_MS;
    return videoDurationMs ?? VIDEO_FALLBACK_MS;
  }, [currentSegment, videoDurationMs]);

  const isSegmentProgressReady = useMemo(() => {
    if (!currentSegment) return false;
    if (currentSegment.type === 'video') return videoDurationMs !== null;
    if (currentSegment.type === 'shared_post') {
      return readySharedPostSegmentKey === segmentPlaybackKey;
    }
    return true;
  }, [
    currentSegment,
    readySharedPostSegmentKey,
    segmentPlaybackKey,
    videoDurationMs,
  ]);

  // ── Progress animation ──────────────────────────────────────────────
  // One Animated.Value drives the FILL on the active segment bar. Inactive
  // bars are rendered as either fully empty (future) or fully filled (past).
  const progress = useRef(new Animated.Value(0)).current;
  const progressFractionRef = useRef(0);

  // Reset video duration when segment changes so we re-wait on onLoad
  // for the next video.
  useEffect(() => {
    setVideoDurationMs(null);
    progress.stopAnimation();
    progressFractionRef.current = 0;
    progress.setValue(0);
    setReplyDraft('');
    setIsReplyComposerOpen(false);
    Keyboard.dismiss();
  }, [progress, segmentPlaybackKey]);

  useFocusEffect(
    useCallback(() => {
      if (pauseForNavigationRef.current) {
        pauseForNavigationRef.current = false;
        setIsPaused(false);
      }
      return undefined;
    }, []),
  );

  // ── Advance / go-back ──────────────────────────────────────────────
  // Wrapped in refs so the progress effect doesn't recreate the
  // Animated.timing every render (which would re-trigger animation).
  const close = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const advance = useCallback(() => {
    if (segmentIndex < segments.length - 1) {
      setSegmentIndex(i => i + 1);
    } else if (userIndex < stories.length - 1) {
      setUserIndex(i => i + 1);
      setSegmentIndex(0);
    } else {
      // Last segment of last user — exit the viewer.
      close();
    }
  }, [segmentIndex, segments.length, userIndex, stories.length, close]);

  const goBack = useCallback(() => {
    if (segmentIndex > 0) {
      setSegmentIndex(i => i - 1);
    } else if (userIndex > 0) {
      const prevUserIndex = userIndex - 1;
      setUserIndex(prevUserIndex);
      // Jump to LAST segment of the previous user, matching IG/FB behaviour.
      const prevUserSegmentCount = stories[prevUserIndex]?.media.length ?? 1;
      setSegmentIndex(Math.max(0, prevUserSegmentCount - 1));
    }
    // else: at very first segment — stay put.
  }, [segmentIndex, userIndex, stories]);

  // ── Start / restart the timer on segment changes ───────────────────
  useEffect(() => {
    if (!currentSegment) return;
    if (!isSegmentProgressReady) return;
    if (shouldPausePlayback) return;

    const remainingDuration = Math.max(
      1,
      segmentMs * (1 - progressFractionRef.current),
    );
    progress.setValue(progressFractionRef.current);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: remainingDuration,
      // We animate a width value — must use the JS driver since width
      // isn't supported by the native driver in RN.
      useNativeDriver: false,
    });
    anim.start(({ finished }) => {
      // `finished` is false when we abort via .stop() (effect cleanup).
      if (finished) {
        progressFractionRef.current = 1;
        advance();
      }
    });
    return () => {
      progress.stopAnimation(value => {
        progressFractionRef.current = Math.max(0, Math.min(1, value));
      });
    };
  }, [
    currentSegment,
    isSegmentProgressReady,
    segmentMs,
    shouldPausePlayback,
    advance,
    progress,
  ]);

  // ── Reaction handling ───────────────────────────────────────────────
  //
  // The backend's react_story endpoint is a TOGGLE — calling it with
  // the same reaction twice removes it. So a SWAP (e.g. like → love)
  // is two API calls: clear-old then add-new. We mirror the same logic
  // useStoriesViewModel uses in the rail.

  // Bounce animation for the reaction buttons
  const reactionScale = useRef(new Animated.Value(1)).current;
  const bounceReaction = useCallback(() => {
    reactionScale.setValue(1.4);
    Animated.spring(reactionScale, {
      toValue: 1,
      friction: 3,
      tension: 200,
      useNativeDriver: true,
    }).start();
  }, [reactionScale]);

  const launchReactionBurst = useCallback(
    (reaction: ReactionType) => {
      const centerX = viewportWidth / 2;
      const maxLeft = Math.max(24, viewportWidth - 48);
      const offsets = [-104, -68, -32, 0, 36, 72, 108];
      const nextItems: ReactionBurstItem[] = offsets.map((offset, index) => {
        const direction = index % 2 === 0 ? -1 : 1;
        const left = Math.min(maxLeft, Math.max(24, centerX + offset - 18));

        return {
          id: `${Date.now()}-${reactionBurstId.current++}`,
          reaction,
          left,
          size: 28 + (index % 3) * 3,
          driftX: direction * (22 + index * 3),
          translateY: new Animated.Value(0),
          opacity: new Animated.Value(0),
          scale: new Animated.Value(0.72),
          rotate: new Animated.Value(0),
        };
      });

      setReactionBurst(items => [...items, ...nextItems]);

      nextItems.forEach((item, index) => {
        const delay = index * 55;
        Animated.parallel([
          Animated.timing(item.translateY, {
            toValue: -250 - (index % 3) * 34,
            duration: 1500 + index * 35,
            delay,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(item.opacity, {
              toValue: 1,
              duration: 120,
              useNativeDriver: true,
            }),
            Animated.delay(930 + index * 30),
            Animated.timing(item.opacity, {
              toValue: 0,
              duration: 360,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.delay(delay),
            Animated.spring(item.scale, {
              toValue: 1,
              friction: 4,
              tension: 120,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(item.rotate, {
            toValue: 1,
            duration: 1450 + index * 35,
            delay,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => {
          setReactionBurst(items =>
            items.filter(existing => existing.id !== item.id),
          );
        });
      });
    },
    [viewportWidth],
  );

  const showReactionSnackbar = useCallback(
    (message: string, type: 'success' | 'error') => {
      showSnackbar({ message, type });
    },
    [],
  );

  const onReact = useCallback(
    async (reaction: ReactionType) => {
      if (!currentStory || !currentSegment) {
        console.warn('[StoryViewer] onReact: no currentStory or currentSegment');
        return;
      }
      const activeStoryId = currentStory.id;
      const targetStoryId = currentSegment.storyId || currentStory.id;
      const prev = currentStory.myReaction;
      const willClear = prev === reaction;
      const targetReaction = willClear ? null : reaction;
      const snapshot = currentStory;

      console.log(
        '[StoryViewer] onReact:',
        { targetStoryId, reaction, prev, willClear, targetReaction },
      );

      // Bounce animation for visual feedback
      bounceReaction();
      if (!willClear) {
        launchReactionBurst(reaction);
      }

      // Optimistic update — mutate local stories array
      setStories(arr =>
        arr.map(s => {
          if (s.id !== activeStoryId) return s;
          const wasReacted = s.myReaction !== null;
          const willBeReacted = targetReaction !== null;
          const delta = Number(willBeReacted) - Number(wasReacted);
          return {
            ...s,
            myReaction: targetReaction,
            reactionCount: Math.max(0, s.reactionCount + delta),
          };
        }),
      );

      // Notify other parts of the app (like home rail FeedScreen)
      storyReactedEvents.emit(targetStoryId, targetReaction);

      try {
        if (prev && prev !== reaction) {
          // Swap: clear old, then add new.
          await repository.reactStory(targetStoryId, prev);
          await repository.reactStory(targetStoryId, reaction);
        } else {
          await repository.reactStory(targetStoryId, reaction);
        }
        // Show success feedback
        if (willClear) {
          showReactionSnackbar('Đã bỏ cảm xúc', 'success');
        } else {
          showReactionSnackbar('Đã thả cảm xúc', 'success');
        }
        console.log('[StoryViewer] reactStory API success');
      } catch (err) {
        console.error('[StoryViewer] reactStory API error:', err);
        // Rollback on failure.
        setStories(arr => arr.map(s => (s.id === activeStoryId ? snapshot : s)));
        storyReactedEvents.emit(targetStoryId, prev);
        // Notify user about the failure
        showReactionSnackbar(
          'Không thể thả cảm xúc. Vui lòng thử lại.',
          'error',
        );
      }
    },
    [
      currentStory,
      currentSegment,
      bounceReaction,
      launchReactionBurst,
      showReactionSnackbar,
    ],
  );

  // ── Delete (owner only) ────────────────────────────────────────────
  const onDelete = useCallback(() => {
    if (!currentStory || !currentStory.isOwner || !currentSegment) return;
    setIsPaused(true);
    Alert.alert(
      'Xoá tin?',
      'Tin sẽ bị xoá vĩnh viễn.',
      [
        { text: 'Huỷ', style: 'cancel' },
        {
          text: 'Xoá',
          style: 'destructive',
          onPress: async () => {
            const storyId = currentSegment.storyId || currentStory.id;
            try {
              await repository.deleteStory(storyId);
              // Tell the rail to drop its copy so it doesn't reappear
              // when the user goes back without a pull-to-refresh.
              storyDeletedEvents.emit(storyId);
              close();
            } catch (caught) {
              Alert.alert(
                'Không xoá được',
                caught instanceof Error
                  ? caught.message
                  : 'Vui lòng thử lại.',
              );
            }
          },
        },
      ],
      { cancelable: true, onDismiss: () => setIsPaused(false) },
    );
  }, [currentStory, currentSegment, close]);

  const handleMorePress = useCallback(() => {
    setIsPaused(true);
    setIsOptionsSheetVisible(true);
  }, []);

  const closeOptionsSheet = useCallback(() => {
    setIsOptionsSheetVisible(false);
    setIsPaused(false);
  }, []);

  const handleOpenPublisherProfile = useCallback(() => {
    if (!currentStory?.publisher.userId) return;
    pauseForNavigationRef.current = true;
    setIsOptionsSheetVisible(false);
    setIsPaused(true);
    navigateToUserProfile(navigation, currentStory.publisher.userId);
  }, [currentStory?.publisher.userId, navigation]);

  const handleOpenSharedPost = useCallback(() => {
    if (!sharedPostId) return;
    pauseForNavigationRef.current = true;
    setIsPaused(true);
    navigation.navigate(ROUTES.POST_DETAIL, { postId: sharedPostId });
  }, [navigation, sharedPostId]);

  const openReplyComposer = useCallback(() => {
    if (!currentStory || currentStory.isOwner) return;
    setIsReplyComposerOpen(true);
    setIsPaused(false);
    requestAnimationFrame(() => replyInputRef.current?.focus());
  }, [currentStory]);

  const closeReplyComposer = useCallback(() => {
    Keyboard.dismiss();
    setIsReplyComposerOpen(false);
    setIsPaused(false);
  }, []);

  const sendStoryReply = useCallback(async () => {
    const text = replyDraft.trim();
    if (
      !text ||
      isSendingReply ||
      !currentStory ||
      !currentSegment ||
      currentStory.isOwner
    ) {
      return;
    }

    const story_id = currentSegment.storyId || currentStory.id;
    const storyReply: StoryReplyMessageReference = {
      storyId: story_id,
      publisherId: currentStory.publisher.userId,
      publisherName: currentStory.publisher.name,
      publisherAvatar: currentStory.publisher.avatarUrl,
      mediaType: currentSegment.type,
      thumbnailUrl:
        currentSegment.type === 'image'
          ? currentSegment.url
          : currentStory.thumbnailUrl,
      caption:
        currentSegment.description ??
        currentSegment.title ??
        currentStory.description ??
        currentStory.title,
      available: true,
    };

    setIsSendingReply(true);
    try {
      await messagesRepository.sendMessage(
        currentStory.publisher.userId,
        text,
        undefined,
        { storyReply: storyReply },
      );
      setReplyDraft('');
      closeReplyComposer();
      showSnackbar({ message: 'Đã trả lời tin', type: 'success' });
    } catch (caught) {
      showSnackbar({
        message:
          caught instanceof Error
            ? caught.message
            : 'Không thể trả lời tin. Vui lòng thử lại.',
        type: 'error',
      });
    } finally {
      setIsSendingReply(false);
    }
  }, [
    closeReplyComposer,
    currentSegment,
    currentStory,
    isSendingReply,
    replyDraft,
  ]);

  const handleDeleteFromOptions = useCallback(() => {
    setIsOptionsSheetVisible(false);
    onDelete();
  }, [onDelete]);

  const handleReportStory = useCallback(() => {
    setIsOptionsSheetVisible(false);
    Alert.alert(
      'Đã báo cáo',
      'Cảm ơn bạn đã báo cáo tin này. Chúng tôi sẽ xem xét nội dung sớm nhất có thể.',
      [{ text: 'OK', onPress: () => setIsPaused(false) }],
      { cancelable: true, onDismiss: () => setIsPaused(false) },
    );
  }, []);

  // ── Long-press pause / release resume ───────────────────────────────
  // Wrapped in stable callbacks so the Pressable refs don't churn.
  const handleLongPressStart = useCallback(() => setIsPaused(true), []);
  const handlePressOut = useCallback(() => setIsPaused(false), []);

  // ── Vertical Story gesture ─────────────────────────────────────────
  // All gesture-related hooks (useSharedValue, useAnimatedStyle,
  // useMemo) MUST live ABOVE the early-return below to satisfy the
  // Rules of Hooks. The early-return is only allowed to live BELOW
  // the last hook call in the render body.
  //
  // Down dismisses the viewer; up opens the inline reply composer. Horizontal
  // movement is intentionally ignored so it does not fight Story navigation.
  const dismissThreshold = Math.max(140, viewportHeight * 0.35);
  const dismissVelocity = 800;

  const swipeTranslateY = useSharedValue(0);
  const swipeProgress = useSharedValue(0); // 0..1 of how far the drag is

  // Guard against double-dismiss. Both withTiming callbacks could
  // theoretically race (especially when the gesture is interrupted),
  // and React Navigation throws a development warning if `goBack()`
  // fires when there is no route under us. This ref is checked on the
  // JS thread inside `handleDismiss` so only the first call wins.
  const dismissedRef = useRef(false);

  // Reset the guard when we navigate to a fresh viewer (new story
  // array / new user index) so a second swipe-down in the same mount
  // still works. The check uses both the first story id and the
  // current user index so we don't reset mid-dismiss-animation.
  useEffect(() => {
    dismissedRef.current = false;
  }, [passedStories, userIndex]);

  const handleDismiss = useCallback(() => {
    if (dismissedRef.current) {
      return;
    }
    dismissedRef.current = true;
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fall back to the safe route when there is nothing to pop to
      // (e.g. StoryViewer was opened as the very first screen, or the
      // parent stack has been reset while we were animating).
      navigation.navigate(ROUTES.MAIN_TABS as never);
    }
  }, [navigation]);

  const swipeSheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: swipeTranslateY.value }],
    // Fade fully to 0 at the end of the gesture so the navigator's
    // pop transition never sees a translucent frame underneath it —
    // that was the source of the white-gap flash.
    opacity: 1 - swipeProgress.value,
  }));

  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-10, 10])
        .failOffsetX([-20, 20])
        .onBegin(() => {
          // Pause the auto-advancing progress while the user is dragging,
          // so the timer doesn't fire mid-swipe and pop them to the next
          // segment unexpectedly.
          runOnJS(setIsPaused)(true);
        })
        .onUpdate(event => {
          const translation = Math.max(
            -REPLY_SWIPE_THRESHOLD,
            event.translationY,
          );
          swipeTranslateY.value = translation;
          // Map distance to a 0..1 progress, clamped at 1 so the
          // background can fade fully out.
          swipeProgress.value = Math.min(
            1,
            Math.max(0, translation / dismissThreshold),
          );
        })
        .onEnd(event => {
          const passedReplyThreshold =
            event.translationY < -REPLY_SWIPE_THRESHOLD ||
            event.velocityY < REPLY_SWIPE_VELOCITY;
          if (passedReplyThreshold && !currentStory?.isOwner) {
            swipeTranslateY.value = withSpring(0);
            swipeProgress.value = withSpring(0);
            runOnJS(openReplyComposer)();
            return;
          }

          if (
            isReplyComposerOpen &&
            (event.translationY > 36 || event.velocityY > 500)
          ) {
            swipeTranslateY.value = withSpring(0);
            swipeProgress.value = withSpring(0);
            runOnJS(closeReplyComposer)();
            return;
          }

          const passedThreshold =
            swipeTranslateY.value > dismissThreshold ||
            event.velocityY > dismissVelocity;

          if (passedThreshold) {
            // Animate the rest of the way off-screen, then go back. The
            // timing here is intentionally matched to the native-stack
            // `fade` animation configured for this route in
            // AppNavigator.tsx (220ms) so the two transitions play in
            // lock-step — no white gap, no double fade, no leftover frame.
            //
            // We pop the route slightly BEFORE the sheet translation
            // finishes (when opacity has already reached 0) so the
            // native-stack fade is in motion by the time the sheet would
            // otherwise stall at its final frame.
            //
            // Only the SHORTER `swipeProgress` timer (160ms) is wired
            // to call `handleDismiss` — the longer translateY timer
            // would otherwise race and trigger a second `goBack()` call,
            // which React Navigation rejects with a dev warning.
            const dismissMs = 220;
            const popAtMs = 160; // opacity is already ~0.27 by here
            swipeTranslateY.value = withTiming(
              viewportHeight,
              {
                duration: dismissMs,
                easing: Easing.out(Easing.cubic),
              },
            );
            swipeProgress.value = withTiming(
              1,
              { duration: popAtMs, easing: Easing.out(Easing.cubic) },
              finished => {
                if (finished) {
                  runOnJS(handleDismiss)();
                }
              },
            );
          } else {
            // Spring back to centre and resume the progress timer.
            swipeTranslateY.value = withSpring(0, {
              damping: 18,
              stiffness: 220,
              mass: 0.6,
            });
            swipeProgress.value = withSpring(0, {
              damping: 18,
              stiffness: 220,
              mass: 0.6,
            });
            runOnJS(setIsPaused)(false);
          }
        })
        .onFinalize(() => {
          // Safety net: if the gesture is cancelled (e.g. ScrollView parent
          // wins the race) make sure we don't leave isPaused stuck on.
          runOnJS(setIsPaused)(false);
        }),
    [
      closeReplyComposer,
      currentStory?.isOwner,
      dismissThreshold,
      handleDismiss,
      isReplyComposerOpen,
      openReplyComposer,
      swipeProgress,
      swipeTranslateY,
      viewportHeight,
    ],
  );

  // ── Early-out when no stories ───────────────────────────────────────
  // Safe to early-return now — every hook above is unconditional.
  if (!currentStory || !currentSegment) {
    return (
      <SafeAreaView style={styles.container} edges={ROOT_SAFE_AREA_EDGES}>
        <FocusAwareStatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Không có tin để xem.</Text>
          <TouchableOpacity onPress={close} style={styles.closeBtnEmpty}>
            <Text style={styles.closeBtnEmptyText}>Đóng</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }


  return (
    <GestureDetector gesture={swipeGesture}>
      <ReanimatedAnimated.View style={[styles.container, swipeSheetStyle]}>
        <SafeAreaView style={styles.container} edges={['top']}>
          <FocusAwareStatusBar barStyle="light-content" backgroundColor="#000" />

          {/* ── Media (renders BEHIND the controls) ────────────────────── */}
          <View style={styles.mediaWrap}>
            {currentSegment.type === 'image' ? (
              <Image
                key={`img-${currentStory.id}-${segmentIndex}`}
                source={{ uri: currentSegment.url }}
                style={styles.media}
                resizeMode="contain"
              />
            ) : currentSegment.type === 'video' ? (
              <VideoPlayer
                // `key` ensures the player remounts when we move to a new
                // video segment — otherwise the old VideoPlayer instance
                // would keep playing the previous URL until React reconciles.
                key={`vid-${currentStory.id}-${segmentIndex}`}
                source={{ uri: currentSegment.url }}
                style={styles.media}
                paused={shouldPausePlayback}
                resizeMode="contain"
                onLoad={data => {
                  // Some Android codecs report 0 for `duration` on first
                  // load — clamp so the timer doesn't fire instantly.
                  const ms = Math.max(1000, (data.duration ?? 0) * 1000);
                  setVideoDurationMs(ms);
                }}
                onError={() => {
                  // If the video fails to load, fall back to the default
                  // duration and proceed. The user sees a black frame for
                  // ~15s — worse than ideal but better than getting stuck.
                  setVideoDurationMs(VIDEO_FALLBACK_MS);
                }}
              />
            ) : null}
          </View>

          {/* ── Tap zones (transparent overlays over the media) ────────── */}
          <View
            style={styles.tapZones}
            pointerEvents={isReplyComposerOpen ? 'none' : 'box-none'}
          >
            <Pressable
              style={styles.tapZoneLeft}
              onPress={goBack}
              onLongPress={handleLongPressStart}
              onPressOut={handlePressOut}
              delayLongPress={250}
            />
            <Pressable
              style={styles.tapZoneRight}
              onPress={advance}
              onLongPress={handleLongPressStart}
              onPressOut={handlePressOut}
              delayLongPress={250}
            />
          </View>

          {/* Keep the interactive post card above navigation tap zones. Its
              box-none container lets taps outside the card reach those zones. */}
          {currentSegment.type === 'shared_post' && sharedPostId ? (
            <SharedPostStorySegment
              key={segmentPlaybackKey}
              sourcePostId={sharedPostId}
              note={currentSegment.description}
              availableWidth={Math.max(240, viewportWidth - 24)}
              availableHeight={calculateSharedPostStoryAvailableHeight({
                viewportHeight,
                headerSafeTop: storyHeaderSafeTop,
                bottomInset: storySafeAreaInsets.bottom,
              })}
              onOpenPost={handleOpenSharedPost}
              onLongPress={handleLongPressStart}
              onPressOut={handlePressOut}
              onReady={() =>
                setReadySharedPostSegmentKey(segmentPlaybackKey)
              }
            />
          ) : null}

          {/* ── Floating Text Overlay (Facebook Style) ── */}
          {currentSegment.type !== 'shared_post' &&
          (currentSegment.title ?? currentStory.title) ? (
            <View style={styles.floatingCaptionWrap} pointerEvents="none">
              <Text style={styles.floatingCaptionText}>
                {currentSegment.title ?? currentStory.title}
              </Text>
            </View>
          ) : null}

          {/* ── Top overlay: progress bars + header + tags ──────────────────── */}
          <View
            style={[styles.topOverlay, { top: storyHeaderSafeTop }]}
            pointerEvents="box-none"
          >
            {/* Progress bars — one per segment (Facebook style: each segment has its own bar) */}
            <View style={styles.progressRow}>
              {segments.map((_, idx) => {
                const isPast = idx < segmentIndex;
                const isActive = idx === segmentIndex;
                return (
                  <View key={`${segmentIndex}-${idx}`} style={styles.progressTrack}>
                    {isPast ? (
                      // Past segments — fully filled
                      <View style={[styles.progressFill, { width: '100%' }]} />
                    ) : isActive ? (
                      // Active — animated width interpolated from 0..1
                      <Animated.View
                        style={[
                          styles.progressFill,
                          {
                            width: progress.interpolate({
                              inputRange: [0, 1],
                              outputRange: ['0%', '100%'],
                            }),
                          },
                        ]}
                      />
                    ) : null}
                  </View>
                );
              })}
            </View>

            {/* Header row: avatar with online dot + name & time on same line + close + options */}
            <View style={styles.header}>
              <TouchableOpacity
                activeOpacity={0.78}
                onPress={handleOpenPublisherProfile}
                disabled={!currentStory.publisher.userId}
                style={styles.publisherButton}
              >
                <View style={styles.avatarContainer}>
                  {currentStory.publisher.avatarUrl ? (
                    <Image
                      source={{ uri: currentStory.publisher.avatarUrl }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={styles.avatarFallback}>
                      <Text style={styles.avatarFallbackText}>
                        {currentStory.publisher.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  {currentStory.publisher.isOnline ? (
                    <View style={styles.onlineDot} />
                  ) : null}
                </View>
                <View style={styles.headerText}>
                  <Text style={styles.headerName} numberOfLines={1}>
                    {currentStory.publisher.name}{' '}
                    <Text style={styles.headerTime}>
                      {formatRelativeTime(currentSegment.postedAt ?? currentStory.postedAt)}
                    </Text>
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Close (ChevronDown) */}
              <TouchableOpacity
                onPress={close}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.headerIconBtn}
              >
                <ChevronDown size={24} color="#fff" />
              </TouchableOpacity>

              {/* More actions (Options) */}
              <TouchableOpacity
                onPress={handleMorePress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.headerIconBtn}
              >
                <MoreHorizontal size={22} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {sharedPostId && !isReplyComposerOpen ? (
            <View
              pointerEvents="box-none"
              style={[
                styles.sharedPostCtaWrap,
                { bottom: Math.max(storySafeAreaInsets.bottom, 12) + 82 },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.86}
                onPress={handleOpenSharedPost}
                style={styles.sharedPostCta}
              >
                <ExternalLink size={17} color="#0F172A" />
                <Text style={styles.sharedPostCtaText}>Xem bài viết</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* ── Bottom overlay: reactions picker ─────────────── */}
          <View style={styles.reactionBurstLayer} pointerEvents="none">
            {reactionBurst.map(item => (
              <Animated.View
                key={item.id}
                style={[
                  styles.floatingReactionIcon,
                  {
                    left: item.left,
                    width: item.size,
                    height: item.size,
                    opacity: item.opacity,
                    transform: [
                      { translateY: item.translateY },
                      {
                        translateX: item.translateY.interpolate({
                          inputRange: [-340, 0],
                          outputRange: [item.driftX, 0],
                        }),
                      },
                      { scale: item.scale },
                      {
                        rotate: item.rotate.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['-10deg', '12deg'],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Image
                  source={FEED_REACTION_IMAGES[item.reaction]}
                  style={styles.floatingReactionImage}
                  resizeMode="contain"
                />
              </Animated.View>
            ))}
          </View>

          <KeyboardAvoidingView
            style={styles.bottomOverlay}
            pointerEvents="box-none"
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            {isReplyComposerOpen ? (
              <View
                style={[
                  styles.replyComposer,
                  {
                    paddingBottom: Math.max(storySafeAreaInsets.bottom, 12),
                  },
                ]}
              >
                <TextInput
                  ref={replyInputRef}
                  value={replyDraft}
                  onChangeText={setReplyDraft}
                  placeholder={`Trả lời ${currentStory.publisher.name}...`}
                  placeholderTextColor="#94A3B8"
                  multiline
                  maxLength={1000}
                  editable={!isSendingReply}
                  style={styles.replyInput}
                  returnKeyType="default"
                />
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel="Gửi trả lời tin"
                  activeOpacity={0.82}
                  disabled={!replyDraft.trim() || isSendingReply}
                  onPress={sendStoryReply}
                  style={[
                    styles.replySendButton,
                    !replyDraft.trim() || isSendingReply
                      ? styles.replySendButtonDisabled
                      : null,
                  ]}
                >
                  {isSendingReply ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Send size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.bottomBarContainer}>
                {!currentStory.isOwner ? (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={openReplyComposer}
                    style={styles.replyHintButton}
                  >
                    <Text style={styles.replyHintText}>
                      Vuốt lên để trả lời
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <View style={styles.inputRow}>
                  <Animated.View
                    style={[
                      styles.quickReactions,
                      { transform: [{ scale: reactionScale }] },
                    ]}
                  >
                    {FEED_REACTION_TYPES.map(type => {
                      const isActive = currentStory.myReaction === type;
                      return (
                        <TouchableOpacity
                          key={type}
                          onPress={() => onReact(type)}
                          activeOpacity={0.5}
                          style={[
                            styles.quickReactionBtn,
                            isActive ? styles.reactionBtnActive : null,
                          ]}
                        >
                          <Image
                            source={FEED_REACTION_IMAGES[type]}
                            style={[
                              styles.quickReactionImage,
                              { opacity: isActive ? 1 : 0.65 },
                            ]}
                            resizeMode="contain"
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </Animated.View>
                </View>
              </View>
            )}
          </KeyboardAvoidingView>
          <Modal
            visible={isOptionsSheetVisible}
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={closeOptionsSheet}
          >
            <Pressable style={styles.optionsBackdrop} onPress={closeOptionsSheet} />
            <View
              style={[
                styles.optionsSheet,
                { paddingBottom: Math.max(storySafeAreaInsets.bottom, 18) },
              ]}
            >
              <View style={styles.optionsHandle} />
              <View style={styles.optionsHeader}>
                <View style={styles.optionsAvatarWrap}>
                  {currentStory.publisher.avatarUrl ? (
                    <Image
                      source={{ uri: currentStory.publisher.avatarUrl }}
                      style={styles.optionsAvatar}
                    />
                  ) : (
                    <View style={styles.optionsAvatarFallback}>
                      <Text style={styles.optionsAvatarFallbackText}>
                        {currentStory.publisher.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.optionsHeaderCopy}>
                  <Text style={styles.optionsTitle} numberOfLines={1}>
                    {currentStory.publisher.name}
                  </Text>
                  <Text style={styles.optionsSubtitle} numberOfLines={1}>
                    Tin · {formatRelativeTime(currentSegment.postedAt ?? currentStory.postedAt)}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.78}
                  onPress={closeOptionsSheet}
                  style={styles.optionsCloseButton}
                >
                  <X size={19} color="#334155" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                activeOpacity={0.82}
                onPress={handleOpenPublisherProfile}
                style={styles.optionsActionRow}
              >
                <View style={[styles.optionsActionIcon, styles.optionsActionIconPrimary]}>
                  <UserCircle size={21} color={APP_BRAND_COLOR} />
                </View>
                <View style={styles.optionsActionCopy}>
                  <Text style={styles.optionsActionTitle}>Xem trang cá nhân</Text>
                  <Text style={styles.optionsActionSubtitle}>
                    Mở hồ sơ của người đăng tin
                  </Text>
                </View>
              </TouchableOpacity>

              {currentStory.isOwner ? (
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={handleDeleteFromOptions}
                  style={styles.optionsActionRow}
                >
                  <View style={[styles.optionsActionIcon, styles.optionsActionIconDanger]}>
                    <Trash2 size={20} color="#DC2626" />
                  </View>
                  <View style={styles.optionsActionCopy}>
                    <Text style={[styles.optionsActionTitle, styles.optionsActionTitleDanger]}>
                      Xóa tin này
                    </Text>
                    <Text style={styles.optionsActionSubtitle}>
                      Gỡ tin khỏi hồ sơ và bảng tin
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={handleReportStory}
                  style={styles.optionsActionRow}
                >
                  <View style={[styles.optionsActionIcon, styles.optionsActionIconWarning]}>
                    <Flag size={20} color="#EA580C" />
                  </View>
                  <View style={styles.optionsActionCopy}>
                    <Text style={styles.optionsActionTitle}>Báo cáo tin</Text>
                    <Text style={styles.optionsActionSubtitle}>
                      Gửi phản hồi nếu nội dung không phù hợp
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </Modal>
        </SafeAreaView>
      </ReanimatedAnimated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Media ────────────────────────────────────────────────────────
  mediaWrap: {
    ...(StyleSheet.absoluteFill as object),
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  sharedPostCtaWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 30,
    alignItems: 'center',
  },
  sharedPostCta: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.94)',
  },
  sharedPostCtaText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 8,
  },

  // ── Tap zones (cover the media for navigation) ───────────────────
  tapZones: {
    ...(StyleSheet.absoluteFill as object),
    flexDirection: 'row',
    // Leave room for the bottom overlay so reaction taps reach it
    bottom: 180,
    top: 100,
  },
  tapZoneLeft: { flex: 1 },
  tapZoneRight: { flex: 2 },

  // ── Top overlay ─────────────────────────────────────────────────
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    elevation: 40,
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 8,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255,255,255,0.32)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  publisherButton: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
    backgroundColor: '#31A24C',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  avatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  headerTime: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: 'normal',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  optionsBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.58)',
  },
  optionsSheet: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    left: 12,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  optionsHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  optionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  optionsAvatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
  },
  optionsAvatar: {
    width: '100%',
    height: '100%',
  },
  optionsAvatarFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#475569',
  },
  optionsAvatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  optionsHeaderCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  optionsTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '900',
  },
  optionsSubtitle: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  optionsCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    marginLeft: 10,
  },
  optionsActionRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 10,
    marginTop: 10,
    backgroundColor: '#FFFFFF',
  },
  optionsActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsActionIconPrimary: {
    backgroundColor: APP_COLORS.brand.soft,
  },
  optionsActionIconDanger: {
    backgroundColor: '#FEE2E2',
  },
  optionsActionIconWarning: {
    backgroundColor: '#FFEDD5',
  },
  optionsActionCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
  },
  optionsActionTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
  optionsActionTitleDanger: {
    color: '#DC2626',
  },
  optionsActionSubtitle: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },

  // ── Overlay Tags ───────────────────────────────────────────────
  musicTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
    marginLeft: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  musicIcon: {
    marginRight: 4,
    fontSize: 12,
  },
  musicText: {
    color: '#333333',
    fontSize: 11,
    fontWeight: '600',
  },
  musicAction: {
    color: APP_BRAND_COLOR,
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 6,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
    paddingLeft: 6,
  },
  mentionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 6,
    marginLeft: 4,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  mentionIconCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  mentionIconText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: 'bold',
    lineHeight: 11,
  },
  mentionText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
  },

  // ── Floating Caption ───────────────────────────────────────────
  floatingCaptionWrap: {
    position: 'absolute',
    top: '32%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  floatingCaptionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // ── Bottom overlay ─────────────────────────────────────────────
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 40,
    elevation: 40,
  },
  reactionBurstLayer: {
    ...(StyleSheet.absoluteFill as object),
    zIndex: 30,
    elevation: 30,
  },
  floatingReactionIcon: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 104 : 88,
  },
  floatingReactionImage: {
    width: '100%',
    height: '100%',
  },
  quickReplyRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 14,
    paddingHorizontal: 12,
  },
  quickReplyPill: {
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 0.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  quickReplyText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  bottomBarContainer: {
    backgroundColor: '#000000',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  replyHintButton: {
    minHeight: 28,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  replyHintText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '700',
  },
  replyComposer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#000000',
  },
  replyInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 116,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 11 : 9,
    paddingBottom: Platform.OS === 'ios' ? 10 : 9,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'center',
  },
  replySendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    backgroundColor: APP_BRAND_COLOR,
  },
  replySendButtonDisabled: {
    opacity: 0.45,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  quickReactions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  quickReactionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickReactionImage: {
    width: 32,
    height: 32,
  },
  reactionBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    transform: [{ scale: 1.15 }],
  },

  // ── Empty state ─────────────────────────────────────────────────
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
  },
  closeBtnEmpty: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  closeBtnEmptyText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default StoryViewerScreen;
