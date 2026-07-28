// Description: Full-screen Facebook-style photo viewer shared across
// Feed, Profile and Page Detail. Tap a photo in a post → this modal
// opens with swipeable pages, reaction / comment / share actions, and
// a publisher header. Originally lived inside FeedScreen.tsx; moved
// here so the three screens stay in sync and Page Detail can open it
// the same way Feed/Profile do.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
  TouchableOpacity as GHTouchableOpacity,
} from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import {
  ChevronLeft,
  Globe,
  MessageCircle,
  Share2,
  ThumbsUp,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { FeedCopy } from '../../../feed/presentation/components/PostCards';
import { FEED_COPY } from '../../../feed/presentation/components/PostCards';
import type { FeedPost, FeedTextPost } from '../../../feed/domain/types/feed.types';
import type { SharePostInput } from '../../../feed/domain/repositories/FeedRepository';
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import type { FollowState } from '../../../user/domain/types/user.types';
import { ReactionPickerOverlay } from '../../../feed/presentation/components/PostCards';
import { FEED_REACTION_IMAGES as REACTION_IMAGES } from '../../../feed/presentation/components/FeedReactionAssets';

import { useAppLanguage } from '../../application/hooks/useAppLanguage';
import { createProfileRepository } from '../../../profile/infrastructure/repositories/ApiProfileRepository';
import { sessionStorage } from '../../infrastructure/storage/sessionStorage';
import FocusAwareStatusBar from './FocusAwareStatusBar';
import { ShareActionSheet } from './ShareActionSheet';

export type PhotoViewerState = {
  post: FeedTextPost;
  initialIndex: number;
} | null;

const PHOTO_VIEWER_IMAGE_HEIGHT_RATIO = 0.62;
const PHOTO_VIEWER_CHROME_MEASURE_TOLERANCE = 24;
const PHOTO_VIEWER_TOP_SAFE_PADDING_FALLBACK = 16;
const PHOTO_VIEWER_TOP_VERTICAL_PADDING = 6;
const PHOTO_VIEWER_PROGRESS_BLOCK_HEIGHT = 19;
const PHOTO_VIEWER_COUNTER_ROW_HEIGHT = 40;
const PHOTO_VIEWER_BOTTOM_BASE_HEIGHT = 131;
const PHOTO_VIEWER_BOTTOM_CAPTION_LINE_HEIGHT = 22;
const PHOTO_VIEWER_BOTTOM_CAPTION_MARGIN = 16;
const PHOTO_VIEWER_BOTTOM_PANEL_MAX_HEIGHT = 360;
const PHOTO_VIEWER_BOTTOM_PANEL_MAX_HEIGHT_RATIO = 0.42;
const PHOTO_VIEWER_PROFILE_CLOSE_DELAY_MS = 80;
const PHOTO_VIEWER_INTERACTION_LOCK_MS = 350;
const PHOTO_VIEWER_SWIPE_BACK_START_WIDTH = 56;
const PHOTO_VIEWER_SWIPE_BACK_THRESHOLD_RATIO = 0.32;
const PHOTO_VIEWER_SWIPE_BACK_ACTIVE_OFFSET = 15;
const PHOTO_VIEWER_SWIPE_BACK_VELOCITY = 700;
const PHOTO_VIEWER_SWIPE_BACK_RETURN_MIN_MS = 90;
const PHOTO_VIEWER_SWIPE_BACK_RETURN_MAX_MS = 180;
const PHOTO_VIEWER_VERTICAL_RETURN_DURATION_MS = 170;

// Relative-time formatter used in the bottom publisher row. Mirrors
// `formatPostTime` in FeedScreen so the viewer caption shows the
// same age string as the card the user tapped.
function formatPhotoViewerPostTime(timestamp: number | undefined, copy: FeedCopy) {
  if (!timestamp) return copy.now;
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - timestamp);
  if (diff < 60) return copy.now;
  if (diff < 3600) return copy.minutesAgo(Math.floor(diff / 60));
  if (diff < 86400) return copy.hoursAgo(Math.floor(diff / 3600));
  if (diff < 604800) return copy.daysAgo(Math.floor(diff / 86400));
  return new Date(timestamp * 1000).toLocaleDateString(
    copy === FEED_COPY.vi ? 'vi-VN' : 'en-US',
  );
}

function getStableChromeHeight(measuredHeight: number, estimatedHeight: number) {
  if (measuredHeight <= 0) return estimatedHeight;
  return Math.abs(measuredHeight - estimatedHeight) >
    PHOTO_VIEWER_CHROME_MEASURE_TOLERANCE
    ? measuredHeight
    : estimatedHeight;
}

const PhotoViewerImage = React.memo(function PhotoViewerImage({
  url,
  width,
  height,
  isActive,
  onToggleChrome,
  onZoomChange,
}: {
  url: string;
  width: number;
  height: number;
  isActive: boolean;
  onToggleChrome: () => void;
  onZoomChange: (isZoomed: boolean) => void;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setShowSpinner(false);
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    if (isActive) {
      onZoomChange(false);
    }

    // Only show spinner if the image takes longer than 150ms to load
    const timer = setTimeout(() => {
      setShowSpinner(true);
    }, 150);

    return () => clearTimeout(timer);
  }, [
    isActive,
    onZoomChange,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    translateX,
    translateY,
    url,
  ]);

  const pinchGesture = Gesture.Pinch()
    .onUpdate(event => {
      'worklet';
      const nextScale = savedScale.value * event.scale;
      scale.value = Math.max(1, Math.min(nextScale, 4));
    })
    .onEnd(() => {
      'worklet';
      if (scale.value <= 1.01) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        if (isActive) {
          runOnJS(onZoomChange)(false);
        }
        return;
      }

      savedScale.value = Math.min(scale.value, 4);
      if (isActive) {
        runOnJS(onZoomChange)(true);
      }
    });

  const panGesture = Gesture.Pan()
    .manualActivation(true)
    .onTouchesMove((_event, manager) => {
      'worklet';
      if (scale.value > 1.01) {
        manager.activate();
      } else {
        manager.fail();
      }
    })
    .onUpdate(event => {
      'worklet';
      if (scale.value <= 1.01) return;
      translateX.value = savedTranslateX.value + event.translationX;
      translateY.value = savedTranslateY.value + event.translationY;
    })
    .onEnd(() => {
      'worklet';
      if (scale.value <= 1.01) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        return;
      }

      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDistance(18)
    .onEnd(() => {
      'worklet';
      if (scale.value > 1.01) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        if (isActive) {
          runOnJS(onZoomChange)(false);
        }
      } else {
        scale.value = withSpring(2);
        savedScale.value = 2;
        if (isActive) {
          runOnJS(onZoomChange)(true);
        }
      }
    });

  const singleTapGesture = Gesture.Tap()
    .numberOfTaps(1)
    .maxDuration(220)
    .maxDistance(12)
    .onEnd(() => {
      'worklet';
      runOnJS(onToggleChrome)();
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    Gesture.Exclusive(doubleTapGesture, singleTapGesture),
  );

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <View
      style={{
        width,
        height,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      {!isLoaded && !hasError && showSpinner ? (
        <ActivityIndicator
          color="#FFFFFF"
          size="small"
          style={{ position: 'absolute' }}
        />
      ) : null}
      {hasError ? (
        <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
          Không tải được ảnh
        </Text>
      ) : (
        <Animated.Image
          source={{ uri: url }}
          style={[{ width: '100%', height: '100%' }, animatedImageStyle]}
          resizeMode="contain"
          fadeDuration={0}
          resizeMethod="resize"
          progressiveRenderingEnabled
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setHasError(true);
            setIsLoaded(true);
          }}
        />
      )}
      </View>
    </GestureDetector>
  );
});

export function PhotoViewerModal({
  state,
  copy = FEED_COPY.vi,
  onClose,
  onReact,
  onCommentTap,
  onProfilePress,
  onInternalShare,
  onShared,
  onFollowChange,
  posts,
}: {
  state: PhotoViewerState;
  copy?: FeedCopy;
  onClose: () => void;
  onReact: (postId: string, reaction: ReactionType) => void;
  onCommentTap: (postId: string) => void;
  onProfilePress?: (userId: string) => void;
  onInternalShare?: (input: SharePostInput) => Promise<FeedPost>;
  onShared?: (post: FeedPost) => void;
  onFollowChange?: (publisherId: string, isFollowing: boolean) => void;
  posts: FeedPost[];
}) {
  const language = useAppLanguage();
  const insets = useSafeAreaInsets();
  // Keep viewer geometry in the same coordinate space as the Android Modal.
  // This updates with the actual app-window bounds instead of retaining a
  // stale full-display size across status-bar/window changes.
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [topBarHeight, setTopBarHeight] = useState(0);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(0);
  const [isViewerChromeReady, setIsViewerChromeReady] = useState(false);
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState(false);
  const [isShareSheetVisible, setIsShareSheetVisible] = useState(false);
  const [localReactionPostId, setLocalReactionPostId] = useState<string | null>(
    null,
  );
  const [localReaction, setLocalReaction] = useState<ReactionType | null>(null);
  const [localLikeCount, setLocalLikeCount] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const profileOpenTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const interactionUnlockTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const pendingCommentPostIdRef = useRef<string | null>(null);
  const pendingCommentFrameRef = useRef<
    ReturnType<typeof requestAnimationFrame> | null
  >(null);
  const transitionLockRef = useRef(false);

  const [pickerAnchor, setPickerAnchor] = useState<{
    postId: string;
    x: number;
    y: number;
  } | null>(null);
  const [localFollowState, setLocalFollowState] = useState<
    FollowState | undefined
  >(undefined);
  const [isFollowSubmitting, setIsFollowSubmitting] = useState(false);

  const localGestureX = useSharedValue(0);
  const localGestureY = useSharedValue(0);
  const localGestureActive = useSharedValue(false);
  const localHasDragged = useSharedValue(false);

  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const verticalDragStartY = useSharedValue(0);
  const openProgress = useSharedValue(0);
  const openScale = useSharedValue(0.92);
  const contentOpacity = useSharedValue(0);
  const chromeOpacity = useSharedValue(1);
  const dismissInFlight = useSharedValue(false);

  // Sync page on mount + animate open with snappy fade + scale
  useEffect(() => {
    setTopBarHeight(0);
    setBottomPanelHeight(0);
    setIsViewerChromeReady(false);
    setIsChromeVisible(true);
    setIsPhotoZoomed(false);
    setIsShareSheetVisible(false);
    setLocalReactionPostId(null);
    transitionLockRef.current = false;
    contentOpacity.value = 0;
    chromeOpacity.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    verticalDragStartY.value = 0;
    dismissInFlight.value = false;

    if (!state) {
      return;
    }

    setCurrentIndex(state.initialIndex);
    translateX.value = 0;
    translateY.value = 0;
    verticalDragStartY.value = 0;
    dismissInFlight.value = false;
    openProgress.value = 0;
    openScale.value = 0.96;
    // Open animation: background + scale start immediately. Content fades
    // after header/footer have measured so the first visible frame is stable.
    openProgress.value = withTiming(1, {
      duration: 160,
      easing: Easing.out(Easing.cubic),
    });
    openScale.value = withTiming(1, {
      duration: 160,
      easing: Easing.out(Easing.quad),
    });
    contentOpacity.value = withTiming(1, {
      duration: 120,
      easing: Easing.out(Easing.cubic),
    });
  }, [
    state,
    translateY,
    translateX,
    openProgress,
    openScale,
    contentOpacity,
    chromeOpacity,
    dismissInFlight,
    verticalDragStartY,
  ]);

  useEffect(() => {
    if (!state || isViewerChromeReady) return;
    if (topBarHeight <= 0 || bottomPanelHeight <= 0) return;

    setIsViewerChromeReady(true);
    contentOpacity.value = withTiming(1, {
      duration: 120,
      easing: Easing.out(Easing.cubic),
    });
  }, [
    bottomPanelHeight,
    contentOpacity,
    isViewerChromeReady,
    state,
    topBarHeight,
  ]);

  useEffect(() => {
    return () => {
      if (profileOpenTimeoutRef.current) {
        clearTimeout(profileOpenTimeoutRef.current);
        profileOpenTimeoutRef.current = null;
      }
      if (interactionUnlockTimeoutRef.current) {
        clearTimeout(interactionUnlockTimeoutRef.current);
        interactionUnlockTimeoutRef.current = null;
      }
      if (pendingCommentFrameRef.current !== null) {
        cancelAnimationFrame(pendingCommentFrameRef.current);
        pendingCommentFrameRef.current = null;
      }
      pendingCommentPostIdRef.current = null;
    };
  }, []);

  const openPendingPostComments = useCallback(() => {
    const postId = pendingCommentPostIdRef.current;
    if (!postId) return;

    pendingCommentPostIdRef.current = null;
    onCommentTap(postId);
  }, [onCommentTap]);

  const handleModalDismiss = useCallback(() => {
    openPendingPostComments();
  }, [openPendingPostComments]);

  useEffect(() => {
    if (Platform.OS === 'ios' || state || !pendingCommentPostIdRef.current) {
      return;
    }

    pendingCommentFrameRef.current = requestAnimationFrame(() => {
      pendingCommentFrameRef.current = null;
      openPendingPostComments();
    });

    return () => {
      if (pendingCommentFrameRef.current !== null) {
        cancelAnimationFrame(pendingCommentFrameRef.current);
        pendingCommentFrameRef.current = null;
      }
    };
  }, [openPendingPostComments, state]);

  const animateClose = useCallback(() => {
    // Snappy close: opacity fade fast + scale-down
    contentOpacity.value = withTiming(0, {
      duration: 90,
      easing: Easing.in(Easing.cubic),
    });
    openScale.value = withTiming(0.94, {
      duration: 160,
      easing: Easing.inOut(Easing.cubic),
    });
    openProgress.value = withTiming(
      0,
      { duration: 150, easing: Easing.in(Easing.cubic) },
      finished => {
        if (finished) {
          runOnJS(onClose)();
        }
      },
    );
  }, [openProgress, openScale, contentOpacity, onClose]);

  const livePost = useMemo(() => {
    if (!state) return null;
    const { post } = state;
    return (posts.find(p => p.id === post.id) as FeedTextPost) || post;
  }, [state, posts]);

  // Sync follow state locally
  useEffect(() => {
    if (livePost) {
      setLocalFollowState(
        livePost.publisher.isFollowing ? 'following' : 'none',
      );
      setLocalReactionPostId(livePost.id);
      setLocalReaction(livePost.myReaction);
      setLocalLikeCount(livePost.likeCount);
    }
  }, [livePost]);

  useEffect(() => {
    if (!state || !livePost) return;
    const photos =
      livePost.photos && livePost.photos.length > 0
        ? livePost.photos
        : state.post.photos;

    [currentIndex - 1, currentIndex + 1].forEach(index => {
      const url = photos[index];
      if (!url) return;
      Image.prefetch(url).catch(() => undefined);
    });
  }, [currentIndex, livePost, state]);

  const applyReaction = useCallback(
    (reaction: ReactionType) => {
      if (!livePost) return;

      const hasLocalState = localReactionPostId === livePost.id;
      const previousReaction = hasLocalState
        ? localReaction
        : livePost.myReaction;
      const previousLikeCount = hasLocalState
        ? localLikeCount
        : livePost.likeCount;
      const nextReaction = previousReaction === reaction ? null : reaction;
      const nextLikeCount =
        !previousReaction && nextReaction
          ? previousLikeCount + 1
          : previousReaction && !nextReaction
            ? Math.max(0, previousLikeCount - 1)
            : previousLikeCount;

      setPickerAnchor(null);
      setLocalReactionPostId(livePost.id);
      setLocalReaction(nextReaction);
      setLocalLikeCount(nextLikeCount);
      onReact(livePost.id, reaction);
    },
    [
      livePost,
      localLikeCount,
      localReaction,
      localReactionPostId,
      onReact,
    ],
  );

  const handleLocalPickReaction = useCallback(
    (reaction: ReactionType) => {
      applyReaction(reaction);
    },
    [applyReaction],
  );

  const handleLikeLongPress = useCallback(
    (isQuickLike: boolean) => {
      if (!livePost) return;
      const x = isQuickLike ? SCREEN_W - 40 : 60;
      const y = SCREEN_H - 110;
      setPickerAnchor({ postId: livePost.id, x, y });
    },
    [livePost, SCREEN_W, SCREEN_H],
  );

  const currentUserId = sessionStorage.getSession()?.userId;
  const isOwnPublisher = Boolean(
    livePost?.publisher.id &&
      currentUserId &&
      String(livePost.publisher.id) === String(currentUserId),
  );
  const resolvedFollowState =
    localFollowState ?? (livePost?.publisher.isFollowing ? 'following' : 'none');
  const isFollowActive =
    resolvedFollowState === 'following' || resolvedFollowState === 'requested';

  const handleFollowPress = useCallback(async () => {
    if (!livePost || isOwnPublisher || isFollowSubmitting) return;

    const previousState = resolvedFollowState;
    const optimisticState: FollowState = isFollowActive ? 'none' : 'following';
    setIsFollowSubmitting(true);
    setLocalFollowState(optimisticState);
    onFollowChange?.(livePost.publisher.id, optimisticState !== 'none');

    try {
      const profileRepo = createProfileRepository();
      const nextState = await profileRepo.toggleFollow(livePost.publisher.id);
      setLocalFollowState(nextState);
      onFollowChange?.(livePost.publisher.id, nextState !== 'none');
    } catch {
      setLocalFollowState(previousState);
      onFollowChange?.(livePost.publisher.id, previousState !== 'none');
    } finally {
      setIsFollowSubmitting(false);
    }
  }, [
    isFollowActive,
    isFollowSubmitting,
    isOwnPublisher,
    livePost,
    onFollowChange,
    resolvedFollowState,
  ]);

  const handleClose = useCallback(() => {
    // Animate close first, then call onClose when animation finishes
    animateClose();
  }, [animateClose]);

  const lockInteractionBriefly = useCallback(() => {
    transitionLockRef.current = true;
    if (interactionUnlockTimeoutRef.current) {
      clearTimeout(interactionUnlockTimeoutRef.current);
    }
    interactionUnlockTimeoutRef.current = setTimeout(() => {
      interactionUnlockTimeoutRef.current = null;
      transitionLockRef.current = false;
    }, PHOTO_VIEWER_INTERACTION_LOCK_MS);
  }, []);

  const handleCommentPress = useCallback(() => {
    if (!livePost) return;
    if (transitionLockRef.current) return;
    lockInteractionBriefly();
    setPickerAnchor(null);
    pendingCommentPostIdRef.current = livePost.id;
    animateClose();
  }, [animateClose, livePost, lockInteractionBriefly]);

  const handleSharePress = useCallback(() => {
    if (!livePost) return;
    if (transitionLockRef.current) return;
    lockInteractionBriefly();
    setPickerAnchor(null);
    setIsShareSheetVisible(true);
  }, [livePost, lockInteractionBriefly]);

  const handlePublisherPress = useCallback(() => {
    const publisherId = livePost?.publisher.id;
    if (!publisherId || !onProfilePress) return;
    if (transitionLockRef.current) return;
    lockInteractionBriefly();

    setPickerAnchor(null);
    if (profileOpenTimeoutRef.current) {
      clearTimeout(profileOpenTimeoutRef.current);
    }
    onProfilePress(publisherId);
    profileOpenTimeoutRef.current = setTimeout(() => {
      profileOpenTimeoutRef.current = null;
      onClose();
    }, PHOTO_VIEWER_PROFILE_CLOSE_DELAY_MS);
  }, [livePost?.publisher.id, lockInteractionBriefly, onClose, onProfilePress]);

  const handleCloseShareSheet = useCallback(() => {
    setIsShareSheetVisible(false);
    transitionLockRef.current = false;
  }, []);

  const handleToggleChrome = useCallback(() => {
    setPickerAnchor(null);
    setIsChromeVisible(previous => {
      const next = !previous;
      chromeOpacity.value = withTiming(next ? 1 : 0, {
        duration: 150,
        easing: Easing.out(Easing.cubic),
      });
      return next;
    });
  }, [chromeOpacity]);

  const handlePhotoZoomChange = useCallback((nextIsZoomed: boolean) => {
    setIsPhotoZoomed(nextIsZoomed);
  }, []);

  const handleTopBarLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    setTopBarHeight(previousHeight =>
      Math.abs(previousHeight - nextHeight) < 0.5 ? previousHeight : nextHeight,
    );
  }, []);

  const handleBottomPanelLayout = useCallback((event: LayoutChangeEvent) => {
    const bottomPanelMaxHeight = Math.min(
      PHOTO_VIEWER_BOTTOM_PANEL_MAX_HEIGHT,
      SCREEN_H * PHOTO_VIEWER_BOTTOM_PANEL_MAX_HEIGHT_RATIO,
    );
    const nextHeight = Math.min(
      event.nativeEvent.layout.height,
      bottomPanelMaxHeight,
    );
    setBottomPanelHeight(previousHeight =>
      Math.abs(previousHeight - nextHeight) < 0.5 ? previousHeight : nextHeight,
    );
  }, [SCREEN_H]);

  const panGesture = Gesture.Pan()
    .enabled(!isPhotoZoomed)
    .activeOffsetY([-10, 10])
    .failOffsetX([-15, 15])
    .onStart(() => {
      'worklet';
      if (dismissInFlight.value) return;
      cancelAnimation(translateY);
      verticalDragStartY.value = translateY.value;
    })
    .onUpdate(event => {
      'worklet';
      if (dismissInFlight.value) return;
      translateY.value = verticalDragStartY.value + event.translationY;
    })
    .onEnd(event => {
      'worklet';
      if (dismissInFlight.value) return;
      // Dismiss on big vertical drag or high velocity; otherwise snap back.
      const releasedTranslateY = translateY.value;
      const absTranslationY = Math.abs(releasedTranslateY);
      const absVelocityY = Math.abs(event.velocityY);
      const shouldDismiss =
        absTranslationY > 120 ||
        absVelocityY > 500 ||
        (absTranslationY > 60 && absVelocityY > 300);

      if (shouldDismiss) {
        dismissInFlight.value = true;
        verticalDragStartY.value = 0;
        const targetY = releasedTranslateY > 0 ? SCREEN_H : -SCREEN_H;
        translateY.value = withTiming(targetY, { duration: 150 });
        translateX.value = withTiming(0, { duration: 150 });
        openScale.value = withTiming(0.92, { duration: 150 });
        contentOpacity.value = withTiming(0, { duration: 90 });
        openProgress.value = withTiming(
          0,
          { duration: 150, easing: Easing.in(Easing.cubic) },
          finished => {
            if (finished) {
              runOnJS(onClose)();
            }
          },
        );
      } else {
        verticalDragStartY.value = 0;
        translateY.value = withTiming(0, {
          duration: PHOTO_VIEWER_VERTICAL_RETURN_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        });
      }
    })
    .onFinalize((_event, success) => {
      'worklet';
      if (success || dismissInFlight.value) return;
      verticalDragStartY.value = 0;
      translateY.value = withTiming(0, {
        duration: PHOTO_VIEWER_VERTICAL_RETURN_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
    });

  // Match the Reels exit affordance: a deliberate rightward swipe from the
  // left edge moves the viewer with the finger, rounds the left corners, and
  // reveals an animated chevron bubble. It is only enabled on the first
  // photo, so normal horizontal paging remains intact on later photos.
  const swipeBackGesture = Gesture.Pan()
    .hitSlop({ left: 0, width: PHOTO_VIEWER_SWIPE_BACK_START_WIDTH })
    .activeOffsetX(PHOTO_VIEWER_SWIPE_BACK_ACTIVE_OFFSET)
    .failOffsetY([-PHOTO_VIEWER_SWIPE_BACK_ACTIVE_OFFSET, PHOTO_VIEWER_SWIPE_BACK_ACTIVE_OFFSET])
    .enabled(
      !isPhotoZoomed &&
        currentIndex === 0 &&
        !isShareSheetVisible &&
        pickerAnchor === null,
    )
    .onUpdate(event => {
      'worklet';
      if (dismissInFlight.value) return;
      translateX.value = Math.max(0, event.translationX);
    })
    .onEnd(event => {
      'worklet';
      if (dismissInFlight.value) return;

      const threshold = SCREEN_W * PHOTO_VIEWER_SWIPE_BACK_THRESHOLD_RATIO;
      const shouldDismiss =
        event.translationX > threshold ||
        event.velocityX > PHOTO_VIEWER_SWIPE_BACK_VELOCITY;

      if (shouldDismiss) {
        dismissInFlight.value = true;
        translateX.value = withTiming(
          SCREEN_W,
          { duration: 180, easing: Easing.in(Easing.cubic) },
        );
        translateY.value = withTiming(0, { duration: 180 });
        openScale.value = withTiming(0.94, { duration: 180 });
        contentOpacity.value = withTiming(0, { duration: 90 });
        openProgress.value = withTiming(
          0,
          { duration: 180, easing: Easing.in(Easing.cubic) },
          finished => {
            if (finished) {
              runOnJS(onClose)();
            }
          },
        );
        return;
      }

      const returnDuration = Math.max(
        PHOTO_VIEWER_SWIPE_BACK_RETURN_MIN_MS,
        Math.min(
          PHOTO_VIEWER_SWIPE_BACK_RETURN_MAX_MS,
          (Math.max(0, event.translationX) / Math.max(threshold, 1)) *
            PHOTO_VIEWER_SWIPE_BACK_RETURN_MAX_MS,
        ),
      );
      const returnConfig = {
        duration: returnDuration,
        easing: Easing.out(Easing.cubic),
      };
      translateX.value = withTiming(0, returnConfig);
    })
    .onFinalize((_event, success) => {
      'worklet';
      if (success || dismissInFlight.value) return;
      translateX.value = withTiming(0, {
        duration: PHOTO_VIEWER_SWIPE_BACK_RETURN_MIN_MS,
        easing: Easing.out(Easing.cubic),
      });
    });

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    const verticalDragProgress = interpolate(
      Math.abs(translateY.value),
      [0, SCREEN_H * 0.5],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const horizontalDragProgress = interpolate(
      Math.max(0, translateX.value),
      [0, SCREEN_W],
      [1, 0.08],
      Extrapolation.CLAMP,
    );
    const dragOpacity = Math.max(
      0,
      Math.min(1, verticalDragProgress, horizontalDragProgress),
    );
    const finalOpacity = Math.min(openProgress.value, dragOpacity);
    return {
      opacity: finalOpacity,
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    const verticalDragScale = interpolate(
      Math.abs(translateY.value),
      [0, SCREEN_H * 0.5],
      [1, 0.8],
      Extrapolation.CLAMP,
    );
    const horizontalProgress = interpolate(
      Math.max(0, translateX.value),
      [0, SCREEN_W],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const horizontalDragScale = interpolate(
      horizontalProgress,
      [0, 1],
      [1, 0.97],
      Extrapolation.CLAMP,
    );
    const finalScale =
      openScale.value * verticalDragScale * horizontalDragScale;
    return {
      flex: 1,
      borderTopLeftRadius: interpolate(
        horizontalProgress,
        [0, 1],
        [0, 22],
        Extrapolation.CLAMP,
      ),
      borderBottomLeftRadius: interpolate(
        horizontalProgress,
        [0, 1],
        [0, 22],
        Extrapolation.CLAMP,
      ),
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: finalScale },
      ],
      opacity: contentOpacity.value,
    };
  });

  const swipeBackIndicatorStyle = useAnimatedStyle(() => {
    const threshold = SCREEN_W * PHOTO_VIEWER_SWIPE_BACK_THRESHOLD_RATIO;
    const opacity = interpolate(
      translateX.value,
      [0, 40, threshold],
      [0, 0.85, 1],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      translateX.value,
      [0, threshold],
      [0.6, 1.2],
      Extrapolation.CLAMP,
    );
    const indicatorTranslateX = interpolate(
      translateX.value,
      [0, threshold],
      [-60, 20],
      Extrapolation.CLAMP,
    );
    const isReady = translateX.value >= threshold;

    return {
      opacity,
      backgroundColor: isReady
        ? 'rgba(8, 102, 255, 0.85)'
        : 'rgba(0, 0, 0, 0.65)',
      transform: [
        { translateX: indicatorTranslateX },
        { scale },
      ],
    };
  });

  const chromeAnimatedStyle = useAnimatedStyle(() => ({
    opacity: chromeOpacity.value,
  }));

  if (!state || !livePost) {
    return (
      <Modal
        visible={Boolean(state && livePost)}
        transparent
        animationType="none"
        onRequestClose={handleClose}
        onDismiss={handleModalDismiss}
        presentationStyle="overFullScreen"
        hardwareAccelerated
      />
    );
  }
  const { post } = state;
  const viewerPhotos =
    livePost.photos && livePost.photos.length > 0
      ? livePost.photos
      : post.photos;
  const total = viewerPhotos.length;
  const safeTotal = Math.max(total, 1);
  const displayIndex = Math.min(currentIndex, safeTotal - 1) + 1;
  const counterLabel = `${displayIndex} / ${safeTotal}`;
  const hasLocalReactionState = localReactionPostId === livePost.id;
  const displayReaction = hasLocalReactionState
    ? localReaction
    : livePost.myReaction;
  const displayLikeCount = hasLocalReactionState
    ? localLikeCount
    : livePost.likeCount;
  const bottomPanelMaxHeight = Math.min(
    PHOTO_VIEWER_BOTTOM_PANEL_MAX_HEIGHT,
    SCREEN_H * PHOTO_VIEWER_BOTTOM_PANEL_MAX_HEIGHT_RATIO,
  );
  const estimatedTopBarHeight =
    Math.max(insets.top, PHOTO_VIEWER_TOP_SAFE_PADDING_FALLBACK) +
    PHOTO_VIEWER_TOP_VERTICAL_PADDING +
    (total > 1 ? PHOTO_VIEWER_PROGRESS_BLOCK_HEIGHT : 0) +
    PHOTO_VIEWER_COUNTER_ROW_HEIGHT;
  const caption = livePost.caption?.trim() ?? '';
  const estimatedCaptionCharsPerLine = Math.max(
    24,
    Math.floor((SCREEN_W - 32) / 12),
  );
  const estimatedCaptionLines =
    caption.length > 0
      ? Math.min(
          4,
          Math.max(1, Math.ceil(caption.length / estimatedCaptionCharsPerLine)),
        )
      : 0;
  const estimatedBottomPanelHeight = Math.min(
    bottomPanelMaxHeight,
    PHOTO_VIEWER_BOTTOM_BASE_HEIGHT +
      Math.max(insets.bottom, 16) +
      12 +
      (estimatedCaptionLines > 0
        ? estimatedCaptionLines * PHOTO_VIEWER_BOTTOM_CAPTION_LINE_HEIGHT +
          PHOTO_VIEWER_BOTTOM_CAPTION_MARGIN
        : 0),
  );
  const stableTopBarHeight = getStableChromeHeight(
    topBarHeight,
    estimatedTopBarHeight,
  );
  const stableBottomPanelHeight = Math.min(
    bottomPanelMaxHeight,
    getStableChromeHeight(bottomPanelHeight, estimatedBottomPanelHeight),
  );
  const photoViewportTop = isChromeVisible ? stableTopBarHeight : 0;
  const availablePhotoViewportHeight =
    isChromeVisible
      ? SCREEN_H - stableTopBarHeight - stableBottomPanelHeight
      : SCREEN_H;
  const fallbackPhotoViewportHeight =
    SCREEN_H * PHOTO_VIEWER_IMAGE_HEIGHT_RATIO;
  const photoViewportHeight = Math.max(
    1,
    availablePhotoViewportHeight > 0
      ? availablePhotoViewportHeight
      : fallbackPhotoViewportHeight,
  );

  return (
    <Modal
      visible={Boolean(state && livePost)}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      onDismiss={handleModalDismiss}
      presentationStyle="overFullScreen"
      hardwareAccelerated
    >
      <FocusAwareStatusBar
        barStyle="light-content"
        backgroundColor="#000"
        translucent={false}
      />
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <GestureDetector gesture={Gesture.Simultaneous(panGesture, swipeBackGesture)}>
          <Animated.View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                  backgroundColor: '#000000',
                },
                backdropAnimatedStyle,
              ]}
            />
            <Animated.View style={[contentStyle, { flex: 1 }]}>
              {/* Top bar: progress segments + back button + page counter + close */}
              <Animated.View
                pointerEvents={isChromeVisible ? 'auto' : 'none'}
                onLayout={handleTopBarLayout}
                style={[
                  {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 30,
                    paddingTop: Math.max(insets.top, 16) + 6,
                    paddingHorizontal: 16,
                  },
                  chromeAnimatedStyle,
                ]}
              >
                {total > 1 && (
                  <View
                    style={{
                      flexDirection: 'row',
                      marginBottom: 16,
                    }}
                  >
                    {Array.from({ length: total }).map((_, i) => (
                      <View
                        key={`progress-segment-${i}`}
                        style={{
                          flex: 1,
                          height: 3,
                          borderRadius: 2.5,
                          backgroundColor:
                            i === currentIndex
                              ? '#ffffff'
                              : 'rgba(255, 255, 255, 0.25)',
                          marginHorizontal: 2,
                        }}
                      />
                    ))}
                  </View>
                )}

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      minWidth: 112,
                    }}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        language === 'vi' ? 'Quay lại' : 'Go back'
                      }
                      onPress={handleClose}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: 'rgba(0, 0, 0, 0.45)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 10,
                      }}
                    >
                      <ChevronLeft size={22} color="#ffffff" />
                    </Pressable>
                    <Text
                      numberOfLines={1}
                      allowFontScaling={false}
                      style={{
                        color: '#ffffff',
                        fontSize: 16,
                        fontWeight: '700',
                        lineHeight: 22,
                      }}
                    >
                      {counterLabel}
                    </Text>
                  </View>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="close"
                    onPress={handleClose}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: 'rgba(0, 0, 0, 0.45)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={20} color="#ffffff" />
                  </Pressable>
                </View>
              </Animated.View>

              {/* Horizontally paginated photo list */}
              <View
                style={{
                  position: 'absolute',
                  top: photoViewportTop,
                  left: 0,
                  right: 0,
                  height: photoViewportHeight,
                }}
              >
                <FlatList
                  ref={flatListRef}
                  data={viewerPhotos}
                  horizontal
                  pagingEnabled
                  scrollEnabled={!isPhotoZoomed}
                  showsHorizontalScrollIndicator={false}
                  extraData={`${photoViewportHeight}-${isPhotoZoomed}-${currentIndex}`}
                  initialScrollIndex={state.initialIndex}
                  getItemLayout={(_, index) => ({
                    length: SCREEN_W,
                    offset: SCREEN_W * index,
                    index,
                  })}
                  windowSize={3}
                  initialNumToRender={1}
                  maxToRenderPerBatch={1}
                  removeClippedSubviews={Platform.OS === 'android'}
                  onScrollToIndexFailed={info => {
                    setTimeout(() => {
                      flatListRef.current?.scrollToIndex({
                        index: info.index,
                        animated: false,
                      });
                    }, 100);
                  }}
                  onMomentumScrollEnd={e => {
                    const idx = Math.round(
                      e.nativeEvent.contentOffset.x / SCREEN_W,
                    );
                    setCurrentIndex(idx);
                    setIsPhotoZoomed(false);
                  }}
                  keyExtractor={(url, i) => `viewer-${i}-${url}`}
                  renderItem={({ item: url, index }) => (
                    <PhotoViewerImage
                      url={url}
                      width={SCREEN_W}
                      height={photoViewportHeight}
                      isActive={index === currentIndex}
                      onToggleChrome={handleToggleChrome}
                      onZoomChange={handlePhotoZoomChange}
                    />
                  )}
                />
              </View>

              {/* Bottom overlay: caption, publisher, action capsules */}
              <Animated.View
                pointerEvents={isChromeVisible ? 'auto' : 'none'}
                onLayout={handleBottomPanelLayout}
                style={[
                  {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: '#1E1B1B',
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    maxHeight: bottomPanelMaxHeight,
                    overflow: 'hidden',
                    paddingHorizontal: 16,
                    paddingTop: 10,
                    paddingBottom: Math.max(insets.bottom, 16) + 12,
                  },
                  chromeAnimatedStyle,
                ]}
              >
                <View
                  style={{
                    width: 44,
                    height: 5,
                    borderRadius: 2.5,
                    backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    alignSelf: 'center',
                    marginBottom: 16,
                  }}
                />

                {livePost.caption ? (
                  <Text
                    style={{
                      color: '#ffffff',
                      fontSize: 15,
                      lineHeight: 22,
                      marginBottom: 16,
                    }}
                    numberOfLines={4}
                  >
                    {livePost.caption}
                  </Text>
                ) : null}

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 16,
                  }}
                >
                  <GHTouchableOpacity
                    activeOpacity={0.78}
                    onPress={handlePublisherPress}
                    disabled={!onProfilePress || !livePost.publisher.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      flexGrow: 1,
                      flexShrink: 1,
                      minWidth: 0,
                    }}
                  >
                    {livePost.publisher.avatarUrl ? (
                      <Image
                        source={{ uri: livePost.publisher.avatarUrl }}
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          marginRight: 10,
                        }}
                      />
                    ) : (
                      <View
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: 21,
                          backgroundColor: '#555',
                          marginRight: 10,
                        }}
                      />
                    )}
                    <View style={{ flexShrink: 1, minWidth: 0 }}>
                      <Text
                        style={{
                          color: '#ffffff',
                          fontWeight: '700',
                          fontSize: 15,
                        }}
                        numberOfLines={1}
                      >
                        {livePost.publisher.name}
                      </Text>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginTop: 2,
                        }}
                      >
                        <Text
                          style={{
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: 12,
                            fontWeight: '600',
                          }}
                        >
                          {formatPhotoViewerPostTime(
                            livePost.postedAt,
                            copy,
                          ).toUpperCase()}
                        </Text>
                        <Text
                          style={{
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: 12,
                            marginHorizontal: 4,
                          }}
                        >
                          {'•'}
                        </Text>
                        <Globe size={11} color="rgba(255, 255, 255, 0.5)" />
                      </View>
                    </View>
                  </GHTouchableOpacity>

                  {/* Follow button: API-backed state, hidden on own post. */}
                  {!isOwnPublisher ? (
                      <GHTouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleFollowPress}
                        disabled={isFollowSubmitting}
                        style={{
                          borderWidth: 1,
                          borderColor: isFollowActive
                            ? 'rgba(255, 255, 255, 0.2)'
                            : 'rgba(255, 255, 255, 0.38)',
                          borderRadius: 20,
                          paddingHorizontal: 16,
                          paddingVertical: 6,
                          backgroundColor: isFollowActive
                            ? 'rgba(255, 255, 255, 0.1)'
                            : 'transparent',
                          opacity: isFollowSubmitting ? 0.65 : 1,
                        }}
                      >
                        <Text
                          style={{
                            color: '#ffffff',
                            fontSize: 13,
                            fontWeight: '700',
                          }}
                        >
                          {resolvedFollowState === 'requested'
                            ? language === 'vi'
                              ? 'Đã gửi'
                              : 'Requested'
                            : isFollowActive
                              ? language === 'vi'
                                ? 'Đang theo dõi'
                                : 'Following'
                              : language === 'vi'
                                ? 'Theo dõi'
                                : 'Follow'}
                        </Text>
                      </GHTouchableOpacity>
                  ) : null}
                </View>

                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {/* Like capsule */}
                    <GHTouchableOpacity
                      onPress={() => applyReaction('like')}
                      onLongPress={() => handleLikeLongPress(false)}
                      delayLongPress={400}
                      activeOpacity={0.75}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                      }}
                    >
                      {displayReaction ? (
                        <Image
                          source={REACTION_IMAGES[displayReaction]}
                          style={{ width: 18, height: 18 }}
                          resizeMode="contain"
                        />
                      ) : (
                        <ThumbsUp size={18} color="#ffffff" />
                      )}
                      <Text
                        style={{
                          color: '#ffffff',
                          marginLeft: 6,
                          fontSize: 13,
                          fontWeight: '600',
                        }}
                      >
                        {displayLikeCount}
                      </Text>
                    </GHTouchableOpacity>

                    {/* Comment capsule */}
                    <GHTouchableOpacity
                      onPress={handleCommentPress}
                      activeOpacity={0.75}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                      }}
                    >
                      <MessageCircle size={18} color="#ffffff" />
                      <Text
                        style={{
                          color: '#ffffff',
                          marginLeft: 6,
                          fontSize: 13,
                          fontWeight: '600',
                        }}
                      >
                        {livePost.commentCount}
                      </Text>
                    </GHTouchableOpacity>

                    {/* Share capsule */}
                    <GHTouchableOpacity
                      onPress={handleSharePress}
                      activeOpacity={0.75}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: 20,
                        paddingHorizontal: 14,
                        paddingVertical: 9,
                      }}
                    >
                      <Share2 size={18} color="#ffffff" />
                      <Text
                        style={{
                          color: '#ffffff',
                          marginLeft: 6,
                          fontSize: 13,
                          fontWeight: '600',
                        }}
                      >
                        {language === 'vi' ? 'Chia sẻ' : 'Share'}
                      </Text>
                    </GHTouchableOpacity>
                  </View>

                  {/* Quick like blue circle button */}
                  <GHTouchableOpacity
                    onPress={() => applyReaction('like')}
                    onLongPress={() => handleLikeLongPress(true)}
                    delayLongPress={400}
                    activeOpacity={0.75}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: displayReaction
                        ? 'rgba(255, 255, 255, 0.12)'
                        : '#0866FF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {displayReaction ? (
                      <Image
                        source={REACTION_IMAGES[displayReaction]}
                        style={{ width: 24, height: 24 }}
                        resizeMode="contain"
                      />
                    ) : (
                      <ThumbsUp size={18} color="#ffffff" fill="#ffffff" />
                    )}
                  </GHTouchableOpacity>
                </View>
              </Animated.View>

              {/* Reaction picker overlay for long-press on like */}
              <ReactionPickerOverlay
                anchor={pickerAnchor}
                onPick={handleLocalPickReaction}
                onDismiss={() => setPickerAnchor(null)}
                gestureX={localGestureX}
                gestureY={localGestureY}
                gestureActive={localGestureActive}
                hasDragged={localHasDragged}
              />
            </Animated.View>
            {/* Reel-style visual cue: no static "swipe to exit" label. */}
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  left: 0,
                  top: SCREEN_H / 2 - 25,
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                },
                swipeBackIndicatorStyle,
              ]}
            >
              <ChevronLeft size={24} color="#ffffff" />
            </Animated.View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
      <ShareActionSheet
        visible={isShareSheetVisible}
        onClose={handleCloseShareSheet}
        post={livePost}
        onInternalShare={onInternalShare}
        onShared={onShared}
      />
    </Modal>
  );
}
