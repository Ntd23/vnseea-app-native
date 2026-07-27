// Description: TikTok-style vertical reels feed.
//
// Why this file is structured the way it is:
//
//   FlatList vs ScrollView
//     We use FlatList with `pagingEnabled` because RN already gives us
//     virtualization out of the box. The crucial pieces:
//       • `getItemLayout` removes scroll-position guessing — vital for a
//         snapping pager so item N always lands at offset N*screenHeight.
//       • `windowSize={3}` keeps roughly the active item ±1 alive in the
//         view hierarchy. We *additionally* gate VideoPlayer mounting inside
//         each item so even if the row is mounted, the heavy decoder isn't.
//       • Android clipping stays disabled because Reel video uses TextureView
//         inside animated, rounded containers. The ±1 mount gate still keeps
//         memory bounded without detaching the native video surface.
//
//   viewabilityConfig
//     The active row is selected once it is clearly dominant on screen.
//     after the user has nearly fully snapped to it — prevents the wrong
//     video from briefly playing while the user is mid-swipe.
//
//   Mount window of ±1
//     The active reel plays. Its immediate neighbors are mounted+paused so
//     the decoder warms up the GPU and the next swipe is instant. Items
//     further away unmount their VideoPlayer entirely and keep a black stage.
//
//   Pause-on-blur
//     When the user switches tabs we derive playback from React
//     Navigation focus. Native iOS tabs may mount Video in the background,
//     so a reel must never auto-play unless the Video tab is actually focused.

import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  Dimensions,
  FlatList,
  LayoutChangeEvent,
  Platform,
  RefreshControl,
  StyleSheet,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useFocusEffect,
  useNavigation,
  useNavigationState,
  useRoute,
  useIsFocused,
} from '@react-navigation/native';
import { useEffect } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing as ReanimatedEasing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {
  ArrowUp,
  ChevronLeft,
  RotateCcw,
  ChevronsDown,
  VolumeX,
  Volume2,
} from 'lucide-react-native';
import { createMMKV } from 'react-native-mmkv';
import { useReelsViewModel } from '../../application/view-models/useReelsViewModel';
import type { ReelsItem } from '../../domain/types/reels.types';
import { ROUTES } from '../../../navigation/constants/routes';
import { ReelItem } from '../components/ReelItem';
import { ReelCommentsSheet } from '../components/ReelCommentsSheet';
import { ReelPublisherOverlay } from '../components/ReelPublisherOverlay';
import { REELS_COPY } from '../../application/i18n/reelsCopy';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import {
  isNavigationRouteSelected,
  isReelItemActive,
  resolveReelsViewportHeight,
  shouldMountReelVideoPlayer,
  shouldPrefetchMoreReels,
} from './reelsPlayback';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { tabBarVisibility } from '../../../navigation/tabBarVisibility';
import { postCreatedEvents } from '../../../feed/application/events/postCreatedEvents';
import { FeedShareBottomSheet } from '../../../feed/presentation/components/FeedShareBottomSheet';
import type {
  FeedPost,
  FeedVideoPost,
} from '../../../feed/domain/types/feed.types';
import { isFeedPostShareable } from '../../../feed/domain/policies/feedPostPrivacy';
import { isReelShareable } from '../../domain/policies/reelPrivacy';
import type { SharePostInput } from '../../../feed/domain/repositories/FeedRepository';

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 70,
  minimumViewTime: 40,
};

const PRELOAD_RADIUS = 1; // mount video for current ± this many neighbors
const REELS_NEW_VIDEO_PROBE_INTERVAL_MS = 30000;
const REELS_NEW_VIDEO_PROBE_LIMIT = 6;
const REELS_HEADER_TOP_GAP = 10;
const REELS_NEW_BUTTON_HEADER_GAP = 50;
const REELS_HEADER_LAYER_Z = 10030;
const REELS_COMMENTS_PREVIEW_RATIO = 0.36;
const REELS_NEIGHBOR_PLAYER_MOUNT_DELAY_MS =
  Platform.OS === 'android' ? 220 : 160;

// Screen width — used by the swipe-back gesture to compute the dismiss
// threshold and target translation.
const SCREEN_WIDTH = Dimensions.get('window').width;
const BACK_GESTURE_START_X = 0;
const BACK_GESTURE_WIDTH = Platform.OS === 'android' ? 44 : 12;
const BACK_GESTURE_ACTIVE_OFFSET_X = Platform.OS === 'android' ? 10 : 15;
const BACK_GESTURE_FAIL_OFFSET_Y = Platform.OS === 'android' ? 10 : 12;
const BACK_GESTURE_RETURN_MIN_DURATION_MS = 90;
const BACK_GESTURE_RETURN_MAX_DURATION_MS = 180;
const BACK_GESTURE_RETURN_EASING = ReanimatedEasing.bezier(0.22, 1, 0.36, 1);
const HEADER_EDGE_HIT_SLOP = { top: 12, bottom: 12, left: 10, right: 8 };
const HEADER_ACTION_HIT_SLOP = { top: 12, bottom: 12, left: 3, right: 3 };

function getReelTimestamp(item?: ReelsItem | null) {
  const value = Number(item?.postedAt);
  return Number.isFinite(value) ? value : 0;
}

function getReelNumericId(item?: ReelsItem | null) {
  const value = Number(item?.id);
  return Number.isFinite(value) ? value : 0;
}

function compareReelsNewestFirst(a: ReelsItem, b: ReelsItem) {
  const timeDelta = getReelTimestamp(b) - getReelTimestamp(a);
  if (timeDelta !== 0) return timeDelta;
  return getReelNumericId(b) - getReelNumericId(a);
}

function isReelNewerThanTop(item: ReelsItem, currentItems: ReelsItem[]) {
  const topItem = currentItems[0];
  if (!topItem) return false;

  const itemTime = getReelTimestamp(item);
  const topTime = getReelTimestamp(topItem);
  if (itemTime > 0 && topTime > 0 && itemTime !== topTime) {
    return itemTime > topTime;
  }

  const itemId = getReelNumericId(item);
  const topId = getReelNumericId(topItem);
  if (itemId > 0 && topId > 0 && itemId !== topId) {
    return itemId > topId;
  }

  return false;
}

function mapFeedVideoPostToReel(post: FeedVideoPost): ReelsItem {
  return {
    id: post.id,
    videoUrl: post.videoUrl,
    thumbnailUrl: post.thumbnailUrl,
    caption: post.caption,
    privacy: post.privacy,
    privacyContract: post.privacyContract ?? 'legacy_feed',
    isAnonymous: post.isAnonymous === true,
    canShare: isFeedPostShareable(post),
    postedAt: post.postedAt,
    publisher: {
      userId: post.publisher.id,
      username: post.publisher.username,
      name: post.publisher.name,
      avatarUrl: post.publisher.avatarUrl,
      isVerified: false,
      isFollowing: post.publisher.isFollowing,
    },
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    viewCount: post.viewCount ?? 0,
    isLiked: post.isLiked,
    isSaved: post.isSaved ?? false,
    myReaction: post.myReaction,
    raw: post,
  };
}

function mapReelToFeedVideoPost(item: ReelsItem): FeedVideoPost {
  return {
    kind: 'video',
    id: item.id,
    caption: item.caption,
    videoUrl: item.videoUrl ?? '',
    thumbnailUrl: item.thumbnailUrl,
    postedAt: item.postedAt,
    likeCount: item.likeCount,
    commentCount: item.commentCount,
    isLiked: item.isLiked,
    myReaction: item.myReaction,
    topReactions: item.myReaction ? [item.myReaction] : [],
    privacy: item.privacy,
    privacyContract: item.privacyContract,
    isAnonymous: item.isAnonymous,
    permissions: { canDelete: false, canShare: item.canShare },
    publisher: {
      id: item.publisher.userId,
      name: item.publisher.name,
      username: item.publisher.username,
      avatarUrl: item.publisher.avatarUrl,
      isFollowing: item.publisher.isFollowing,
    },
    viewCount: item.viewCount,
    isSaved: item.isSaved,
  };
}

const reelsStorage = createMMKV({ id: 'vnseea-reels-settings' });

export default function ReelsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocusedScreen = useIsFocused();
  const [isAppActive, setIsAppActive] = useState(
    () => AppState.currentState === 'active',
  );
  const [isPlaybackMountReady, setIsPlaybackMountReady] = useState(
    isFocusedScreen,
  );
  const [isNeighborPreloadReady, setIsNeighborPreloadReady] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const isSelectedRoute = useNavigationState(state =>
    isNavigationRouteSelected(state, route.key, route.name),
  );
  const isPlaybackRouteFocused =
    isFocusedScreen && isSelectedRoute && isAppActive;
  const insets = useSafeAreaInsets();
  const reelsTopInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
    12,
  );
  const reelsHeaderTop = reelsTopInset + REELS_HEADER_TOP_GAP;
  const newReelsButtonTop = reelsHeaderTop + REELS_NEW_BUTTON_HEADER_GAP;
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(() => {
    return reelsStorage.getBoolean('reels.autoScroll') ?? true;
  });
  const autoScrollEnabledRef = useRef(autoScrollEnabled);

  const toggleAutoScroll = useCallback(() => {
    setAutoScrollEnabled(prev => {
      const next = !prev;
      autoScrollEnabledRef.current = next;
      reelsStorage.set('reels.autoScroll', next);
      return next;
    });
  }, []);
  const [selectedPublisherId, setSelectedPublisherId] = useState<string | null>(
    null,
  );
  const language = useAppLanguage();
  const copy = REELS_COPY[language];
  const isTabRoute = navigation.getState?.().type === 'tab';

  const initialVideoId = route.params?.initialVideoId;
  const initialPost = route.params?.post;
  const flatListRef = useRef<FlatList>(null);
  // Index for the FlatList's `initialScrollIndex` prop. We set this
  // exactly ONCE — after the ViewModel finishes merging the deeplinked
  // video into the first reels page — and never touch it again. Using
  // a prop (instead of `scrollToIndex`) means FlatList renders the
  // correct item on its very first paint, so `onViewableItemsChanged`
  // cannot fire a stray `setActiveIndex(0)` and snap the user back to
  // the newest reel. A value of `null` means "no deeplink, scroll to
  // top like normal".
  const [initialScrollIndexValue, setInitialScrollIndexValue] = useState<
    number | null
  >(null);

  // Seed the ViewModel with the deeplinked/clicked video on FIRST
  // mount. Passing it through the constructor (not the effect below)
  // is important: `useReelsViewModel` fires its own `loadInitial()`
  // in a useEffect, and the constructor argument is read SYNCHRONOUSLY
  // by the ref. This means `loadInitial()` already has the initial
  // video before the network call returns, so the merged `items` list
  // keeps the deeplinked reel and `activeIndex` lands on it. Without
  // this seed, the screen-level `setInitialVideo()` call below races
  // with `loadInitial()` and the user ends up on the newest reel
  // instead of the one they tapped.
  const seededInitial = useMemo(
    () =>
      initialVideoId && initialPost
        ? { id: String(initialVideoId), post: initialPost }
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // intentional: only seed once on first mount
  );
  const vm = useReelsViewModel(seededInitial);
  const openReelComments = vm.openComments;
  const closeReelComments = vm.closeComments;
  const activeIndexRef = useRef(vm.activeIndex);
  const itemsLengthRef = useRef(vm.items.length);
  const hasMoreRef = useRef(vm.hasMore);
  const isLoadingMoreRef = useRef(vm.isLoadingMore);
  const isCommentsOpenRef = useRef(vm.isCommentsOpen);
  const autoAdvanceFrameRef = useRef<number | null>(null);
  const dismissNavigationFrameRef = useRef<number | null>(null);
  const isUserDraggingRef = useRef(false);
  const scrollReleaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const navigationActionInFlightRef = useRef(false);
  const isShareSheetOpenRef = useRef(false);
  const isPublisherOverlayOpenRef = useRef(false);
  const loadMoreRef = useRef(vm.loadMore);
  const setReelsActiveIndexRef = useRef(vm.setActiveIndex);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [isCommentsPreviewVisible, setIsCommentsPreviewVisible] = useState(
    vm.isCommentsOpen,
  );
  const [sharingPost, setSharingPost] = useState<FeedPost | undefined>(
    undefined,
  );
  const [hasNewReels, setHasNewReels] = useState(false);
  const pendingNewReelsRef = useRef<ReelsItem[]>([]);
  const reelsItemsRef = useRef<ReelsItem[]>(vm.items);
  const isReelsFocusedRef = useRef(isFocusedScreen);
  const isReelsLoadingRef = useRef(vm.isInitialLoading || vm.isRefreshing);
  const hasReelsLoadedOnceRef = useRef(vm.items.length > 0);
  const isCheckingLatestReelsRef = useRef(false);

  useEffect(() => {
    autoScrollEnabledRef.current = autoScrollEnabled;
    activeIndexRef.current = vm.activeIndex;
    itemsLengthRef.current = vm.items.length;
    hasMoreRef.current = vm.hasMore;
    isLoadingMoreRef.current = vm.isLoadingMore;
    loadMoreRef.current = vm.loadMore;
    setReelsActiveIndexRef.current = vm.setActiveIndex;
    isReelsFocusedRef.current = isFocusedScreen;
    isReelsLoadingRef.current = vm.isInitialLoading || vm.isRefreshing;
    if (vm.items.length > 0 && !vm.isInitialLoading) {
      hasReelsLoadedOnceRef.current = true;
    }
  }, [
    autoScrollEnabled,
    isFocusedScreen,
    vm.activeIndex,
    vm.hasMore,
    vm.isInitialLoading,
    vm.isLoadingMore,
    vm.isRefreshing,
    vm.items.length,
    vm.loadMore,
    vm.setActiveIndex,
  ]);

  useEffect(() => {
    isCommentsOpenRef.current = vm.isCommentsOpen;
    if (!vm.isCommentsOpen) {
      setIsCommentsPreviewVisible(false);
    }
  }, [vm.isCommentsOpen]);

  useEffect(() => {
    return () => {
      if (autoAdvanceFrameRef.current !== null) {
        cancelAnimationFrame(autoAdvanceFrameRef.current);
      }
      if (dismissNavigationFrameRef.current !== null) {
        cancelAnimationFrame(dismissNavigationFrameRef.current);
      }
      if (scrollReleaseTimerRef.current !== null) {
        clearTimeout(scrollReleaseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    isShareSheetOpenRef.current = shareModalVisible;
  }, [shareModalVisible]);

  const enqueueNewReelCandidates = useCallback(
    (items: ReelsItem[], options: { requireNewerThanTop?: boolean } = {}) => {
      if (items.length === 0) return;

      const currentItems = reelsItemsRef.current;
      const visibleIds = new Set(currentItems.map(item => item.id));
      const pendingIds = new Set(
        pendingNewReelsRef.current.map(item => item.id),
      );
      const nextItems = items
        .filter(item => {
          if (!item?.id || !item.videoUrl) return false;
          if (visibleIds.has(item.id) || pendingIds.has(item.id)) return false;
          if (
            options.requireNewerThanTop &&
            !isReelNewerThanTop(item, currentItems)
          ) {
            return false;
          }

          pendingIds.add(item.id);
          return true;
        })
        .sort(compareReelsNewestFirst);

      if (nextItems.length === 0) return;

      pendingNewReelsRef.current.push(...nextItems);
      setHasNewReels(true);
    },
    [],
  );

  useEffect(() => {
    reelsItemsRef.current = vm.items;

    if (!hasNewReels || pendingNewReelsRef.current.length === 0) return;

    const visibleIds = new Set(vm.items.map(item => item.id));
    pendingNewReelsRef.current = pendingNewReelsRef.current.filter(
      item =>
        item?.id &&
        !visibleIds.has(item.id) &&
        (vm.items.length === 0 || isReelNewerThanTop(item, vm.items)),
    );

    if (pendingNewReelsRef.current.length === 0) {
      setHasNewReels(false);
    }
  }, [vm.items, hasNewReels]);

  const handleOpenNewReels = useCallback(() => {
    const currentItems = reelsItemsRef.current;
    const visibleIds = new Set(currentItems.map(item => item.id));
    const pendingItems = pendingNewReelsRef.current
      .filter(
        item =>
          item?.id &&
          item.videoUrl &&
          !visibleIds.has(item.id) &&
          (currentItems.length === 0 || isReelNewerThanTop(item, currentItems)),
      )
      .sort(compareReelsNewestFirst);

    pendingNewReelsRef.current = [];
    setHasNewReels(false);

    if (pendingItems.length === 0) return;

    vm.prependReels(pendingItems);
    activeIndexRef.current = 0;
    setReelsActiveIndexRef.current(0);
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({ index: 0, animated: true });
    });
  }, [vm]);

  const checkForRemoteNewReels = useCallback(async () => {
    if (!isReelsFocusedRef.current) return;
    if (
      isUserDraggingRef.current ||
      isCommentsOpenRef.current ||
      isShareSheetOpenRef.current ||
      isPublisherOverlayOpenRef.current
    ) {
      return;
    }
    if (!hasReelsLoadedOnceRef.current || isReelsLoadingRef.current) return;
    if (AppState.currentState !== 'active') return;
    if (isCheckingLatestReelsRef.current) return;

    isCheckingLatestReelsRef.current = true;
    try {
      const latestItems = await vm.peekLatestReels(REELS_NEW_VIDEO_PROBE_LIMIT);
      enqueueNewReelCandidates(latestItems, {
        requireNewerThanTop: true,
      });
    } catch (caught) {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.warn('[ReelsScreen] latest reel probe failed', caught);
      }
    } finally {
      isCheckingLatestReelsRef.current = false;
    }
  }, [enqueueNewReelCandidates, vm]);

  useEffect(() => {
    if (!isFocusedScreen) return undefined;

    const firstProbe = setTimeout(() => {
      checkForRemoteNewReels().catch(() => undefined);
    }, 1200);
    const interval = setInterval(() => {
      checkForRemoteNewReels().catch(() => undefined);
    }, REELS_NEW_VIDEO_PROBE_INTERVAL_MS);

    return () => {
      clearTimeout(firstProbe);
      clearInterval(interval);
    };
  }, [checkForRemoteNewReels, isFocusedScreen]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      setIsAppActive(nextState === 'active');
      if (nextState === 'active') {
        checkForRemoteNewReels().catch(() => undefined);
      }
    });

    return () => subscription.remove();
  }, [checkForRemoteNewReels]);

  useEffect(() => {
    return postCreatedEvents.subscribe(post => {
      if (post.kind !== 'video' || !post.videoUrl) return;
      enqueueNewReelCandidates([mapFeedVideoPostToReel(post)]);
    });
  }, [enqueueNewReelCandidates]);

  // Tracks which `initialVideoId` we've already handled, so a new
  // tap on a different video (from Home feed, Page detail, etc.)
  // re-runs the scroll logic. Without this, the effect would skip
  // on the second tap because `initialScrollIndexValue` is already
  // non-null, and the user would land on the previous reel.
  const consumedInitialVideoIdRef = useRef<string | null>(null);

  // After loadInitial resolves (items array is populated AND the
  // deeplinked reel is merged in), record the index of that reel so
  // the FlatList can use it as `initialScrollIndex`. We watch
  // `vm.items.length` transitioning from 0 → N as the signal that
  // loadInitial finished — the deeplinked reel sits at index 0
  // (prepended) or at its natural position in the feed.
  useEffect(() => {
    if (!isFocusedScreen) return;
    if (!initialVideoId || !initialPost) return;
    if (vm.items.length === 0) return; // wait for loadInitial
    // Skip if we already consumed this exact `initialVideoId` — that
    // covers both the no-deeplink case (param was cleared) and the
    // case where the user has not yet tapped a *new* video.
    if (consumedInitialVideoIdRef.current === String(initialVideoId)) {
      return;
    }

    let targetIndex: number;
    const index = vm.items.findIndex(
      item => String(item.id) === String(initialVideoId),
    );
    if (index >= 0) {
      targetIndex = index;
    } else {
      // The deeplinked reel wasn't found in the first page (e.g. it's
      // older than PAGE_SIZE items). Fall back to merging it back in
      // via `setInitialVideo` — that prepends it at index 0.
      vm.setInitialVideo(String(initialVideoId), initialPost);
      targetIndex = 0;
    }

    setInitialScrollIndexValue(targetIndex);

    // `initialScrollIndex` only works on FlatList's FIRST mount.
    // For subsequent navigations (user tapping a different video from
    // feed while Reels tab is already mounted), we must imperatively
    // scroll to the correct position.
    vm.setActiveIndex(targetIndex);
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({
        index: targetIndex,
        animated: false,
      });
    });

    // Mark this id as consumed BEFORE clearing the route param so we
    // don't loop on the next render.
    consumedInitialVideoIdRef.current = String(initialVideoId);

    // Clear navigation params so the deep-link doesn't re-trigger on
    // subsequent renders / focus changes.
    navigation.setParams({
      initialVideoId: undefined,
      post: undefined,
      seekTime: undefined,
    });
  }, [
    isFocusedScreen,
    initialVideoId,
    initialPost,
    vm.items,
    vm.setInitialVideo,
    vm.setActiveIndex,
    vm,
    navigation,
  ]);

  // When the screen loses focus (user goes back to feed), clear the
  // consumed ref so re-tapping the SAME video works next time.
  useEffect(() => {
    if (!isFocusedScreen) {
      consumedInitialVideoIdRef.current = null;
    }
  }, [isFocusedScreen]);

  // Use the full screen height — the feed is meant to be edge-to-edge.
  const [viewportHeight, setViewportHeight] = useState(
    () => Dimensions.get('window').height,
  );
  const viewportHeightRef = useRef(viewportHeight);
  const itemHeight = viewportHeight;

  const [isMuted, setIsMuted] = useState(false); // start unmuted by default
  // Keep preloadRadius constant at 1 so the ±1 neighbor videos stay mounted
  // and buffered at all times. Previously we dropped to 0 during scroll to
  // reduce lag, but that caused a black-screen flash because the next video
  // had to rebuffer from scratch after being unmounted.
  const preloadRadius = PRELOAD_RADIUS;
  const hasActivatedPlayback =
    isPlaybackMountReady || isPlaybackRouteFocused;
  const shouldKeepPlayersMounted =
    hasActivatedPlayback &&
    isAppActive &&
    (isTabRoute || isPlaybackRouteFocused || isDismissing);
  const shouldPlayActiveReel =
    isPlaybackRouteFocused && !isDismissing;
  const activePreloadRadius = isNeighborPreloadReady ? preloadRadius : 0;

  // Drives the swipe-back gesture's transform. Declared up here (not down
  // by the gesture definition) so the focus effect below can reset it —
  // we have to undo a successful dismissal when the user returns.
  const dragX = useSharedValue(0);
  const screenDismissX = useSharedValue(0);

  // Also resets the swipe-back transform to 0. Without this, the second
  // visit to Reels renders blank: a successful dismiss leaves dragX at
  // SCREEN_WIDTH, so when the screen regains focus the whole content is
  // still translated off the right edge → user sees the white nav stack
  // background.
  useFocusEffect(
    useCallback(() => {
      navigationActionInFlightRef.current = false;
      isUserDraggingRef.current = false;
      setIsDismissing(false);
      // Mount the active player immediately. The old focus delay exposed the
      // poster/layout for a noticeable moment every time Home opened Reels.
      setIsPlaybackMountReady(true);
      if (scrollReleaseTimerRef.current !== null) {
        clearTimeout(scrollReleaseTimerRef.current);
        scrollReleaseTimerRef.current = null;
      }
      if (dismissNavigationFrameRef.current !== null) {
        cancelAnimationFrame(dismissNavigationFrameRef.current);
        dismissNavigationFrameRef.current = null;
      }
      dragX.value = 0;
      screenDismissX.value = 0;
      const neighborPlayerTimer = setTimeout(() => {
        setIsNeighborPreloadReady(true);
      }, REELS_NEIGHBOR_PLAYER_MOUNT_DELAY_MS);
      if (isTabRoute) {
        tabBarVisibility.setVisible(false);
      }

      return () => {
        clearTimeout(neighborPlayerTimer);
        if (isTabRoute) {
          tabBarVisibility.setVisible(true);
        }
      };
    }, [dragX, screenDismissX, isTabRoute]),
  );

  // FlatList requires `onViewableItemsChanged` to have a stable identity
  // across renders, otherwise it throws "Changing onViewableItemsChanged
  // on the fly is not supported". We stash the latest activeIndex setter
  // in a ref so the stable callback can always reach the freshest value.
  const setActiveIndexRef = useRef(vm.setActiveIndex);
  setActiveIndexRef.current = vm.setActiveIndex;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (isCommentsOpenRef.current) return;
      if (viewableItems.length === 0) return;
      const first = viewableItems[0];
      if (first.isViewable !== false && typeof first.index === 'number') {
        if (first.index !== activeIndexRef.current) {
          activeIndexRef.current = first.index;
          setActiveIndexRef.current(first.index);
        }
        if (
          shouldPrefetchMoreReels({
            visibleIndex: first.index,
            itemCount: itemsLengthRef.current,
            hasMore: hasMoreRef.current,
            isLoadingMore: isLoadingMoreRef.current,
          })
        ) {
          isLoadingMoreRef.current = true;
          loadMoreRef.current();
        }
      }
    },
  ).current;

  const handleToggleMute = useCallback(() => setIsMuted(m => !m), []);

  const lockActiveReelPosition = useCallback(() => {
    const height = viewportHeightRef.current;
    if (height <= 0 || activeIndexRef.current < 0) return;
    flatListRef.current?.scrollToOffset({
      offset: activeIndexRef.current * height,
      animated: false,
    });
  }, []);

  const cancelPendingAutoAdvance = useCallback(() => {
    if (autoAdvanceFrameRef.current === null) return;
    cancelAnimationFrame(autoAdvanceFrameRef.current);
    autoAdvanceFrameRef.current = null;
  }, []);

  const handleOpenComments = useCallback(
    (postId: string) => {
      cancelPendingAutoAdvance();
      isCommentsOpenRef.current = true;
      if (scrollReleaseTimerRef.current !== null) {
        clearTimeout(scrollReleaseTimerRef.current);
        scrollReleaseTimerRef.current = null;
      }
      isUserDraggingRef.current = false;
      lockActiveReelPosition();
      requestAnimationFrame(() => {
        if (isCommentsOpenRef.current) lockActiveReelPosition();
      });
      openReelComments(postId).catch(() => undefined);
    },
    [cancelPendingAutoAdvance, lockActiveReelPosition, openReelComments],
  );

  const handleCommentsOpenStart = useCallback(() => {
    setIsCommentsPreviewVisible(true);
  }, []);

  const handleCommentsCloseStart = useCallback(() => {
    setIsCommentsPreviewVisible(false);
  }, []);

  const handleCloseComments = useCallback(() => {
    setIsCommentsPreviewVisible(false);
    closeReelComments();
    isCommentsOpenRef.current = false;
  }, [closeReelComments]);

  const handleVideoEnd = useCallback((index: number) => {
    if (
      isCommentsOpenRef.current ||
      isShareSheetOpenRef.current ||
      isPublisherOverlayOpenRef.current ||
      isUserDraggingRef.current
    ) {
      return false;
    }
    if (!autoScrollEnabledRef.current) return false;
    if (index !== activeIndexRef.current) return false;

    if (index >= itemsLengthRef.current - 1) {
      if (hasMoreRef.current && !isLoadingMoreRef.current) {
        isLoadingMoreRef.current = true;
        loadMoreRef.current();
      }
      return false;
    }

    const nextIndex = index + 1;
    autoAdvanceFrameRef.current = requestAnimationFrame(() => {
      autoAdvanceFrameRef.current = null;
      if (
        isCommentsOpenRef.current ||
        isShareSheetOpenRef.current ||
        isPublisherOverlayOpenRef.current ||
        isUserDraggingRef.current ||
        !autoScrollEnabledRef.current ||
        activeIndexRef.current !== index
      ) {
        return;
      }
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    });
    return true;
  }, []);

  const commitActiveIndexFromOffset = useCallback(
    (offsetY: number) => {
      if (isCommentsOpenRef.current) return;
      if (itemHeight <= 0 || itemsLengthRef.current <= 0) return;
      const nextIndex = Math.max(
        0,
        Math.min(itemsLengthRef.current - 1, Math.round(offsetY / itemHeight)),
      );
      if (nextIndex === activeIndexRef.current) return;
      activeIndexRef.current = nextIndex;
      setReelsActiveIndexRef.current(nextIndex);
    },
    [itemHeight],
  );

  const handleReelScrollBeginDrag = useCallback(() => {
    isUserDraggingRef.current = true;
    cancelPendingAutoAdvance();
    if (scrollReleaseTimerRef.current !== null) {
      clearTimeout(scrollReleaseTimerRef.current);
      scrollReleaseTimerRef.current = null;
    }
  }, [cancelPendingAutoAdvance]);

  const handleReelMomentumScrollBegin = useCallback(() => {
    isUserDraggingRef.current = true;
    if (scrollReleaseTimerRef.current !== null) {
      clearTimeout(scrollReleaseTimerRef.current);
      scrollReleaseTimerRef.current = null;
    }
  }, []);

  const handleReelScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      if (scrollReleaseTimerRef.current !== null) {
        clearTimeout(scrollReleaseTimerRef.current);
      }
      scrollReleaseTimerRef.current = setTimeout(() => {
        scrollReleaseTimerRef.current = null;
        isUserDraggingRef.current = false;
        commitActiveIndexFromOffset(offsetY);
      }, 180);
    },
    [commitActiveIndexFromOffset],
  );

  const handleReelMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (scrollReleaseTimerRef.current !== null) {
        clearTimeout(scrollReleaseTimerRef.current);
        scrollReleaseTimerRef.current = null;
      }
      isUserDraggingRef.current = false;
      commitActiveIndexFromOffset(event.nativeEvent.contentOffset.y);
    },
    [commitActiveIndexFromOffset],
  );

  const handleOpenProfile = useCallback(
    (userId: string) => {
      cancelPendingAutoAdvance();
      isPublisherOverlayOpenRef.current = true;
      setSelectedPublisherId(userId);
    },
    [cancelPendingAutoAdvance],
  );

  const handleClosePublisherOverlay = useCallback(() => {
    isPublisherOverlayOpenRef.current = false;
    setSelectedPublisherId(null);
  }, []);

  const handleOpenShareReel = useCallback(
    (item: ReelsItem) => {
      if (!isReelShareable(item)) return;
      const post = mapReelToFeedVideoPost(item);
      if (!isFeedPostShareable(post)) return;
      cancelPendingAutoAdvance();
      isShareSheetOpenRef.current = true;
      setSharingPost(post);
      setShareModalVisible(true);
    },
    [cancelPendingAutoAdvance],
  );

  const handleCloseShareModal = useCallback(() => {
    isShareSheetOpenRef.current = false;
    setShareModalVisible(false);
    setTimeout(() => {
      setSharingPost(undefined);
    }, 300);
  }, []);

  const handleInternalSharePost = useCallback(
    (input: SharePostInput) => {
      return vm.sharePost(input);
    },
    [vm],
  );

  const handlePlayPublisherReel = useCallback(
    (reel: ReelsItem) => {
      const existingIndex = vm.items.findIndex(
        item => String(item.id) === String(reel.id),
      );
      const targetIndex = existingIndex >= 0 ? existingIndex : 0;

      if (existingIndex >= 0) {
        activeIndexRef.current = targetIndex;
        vm.setActiveIndex(targetIndex);
      } else {
        activeIndexRef.current = 0;
        vm.prependReels([reel]);
        vm.setActiveIndex(0);
      }

      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({
          index: targetIndex,
          animated: false,
        });
      });
    },
    [vm],
  );

  const handleContainerLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const nextHeight = Math.round(event.nativeEvent.layout.height);
      const resolvedHeight = resolveReelsViewportHeight({
        currentHeight: viewportHeightRef.current,
        nextHeight,
        commentsOpen: isCommentsOpenRef.current,
      });

      if (isCommentsOpenRef.current) {
        requestAnimationFrame(lockActiveReelPosition);
        return;
      }

      viewportHeightRef.current = resolvedHeight;
      setViewportHeight(prev =>
        prev === resolvedHeight ? prev : resolvedHeight,
      );
    },
    [lockActiveReelPosition],
  );

  const selectedCommentReel = useMemo(
    () => vm.items.find(item => item.id === vm.selectedCommentPostId) ?? null,
    [vm.items, vm.selectedCommentPostId],
  );
  const isPublisherOverlayOpen = selectedPublisherId !== null;
  const currentReelId = vm.items[vm.activeIndex]?.id ?? null;

  const handleRetryComments = useCallback(() => {
    if (vm.selectedCommentPostId) {
      openReelComments(vm.selectedCommentPostId).catch(() => undefined);
    }
  }, [openReelComments, vm.selectedCommentPostId]);

  const renderItem = useCallback(
    ({ item, index }: { item: ReelsItem; index: number }) => {
      const shouldMount = shouldMountReelVideoPlayer({
        isPlaybackRouteFocused:
          shouldKeepPlayersMounted && !isPublisherOverlayOpen,
        index,
        activeIndex: vm.activeIndex,
        preloadRadius: activePreloadRadius,
      });
      const isCurrent = index === vm.activeIndex;
      // A reel only counts as "active" when this screen has focus —
      // when the user switches tabs, every reel becomes inactive (paused).
      const isActive = isReelItemActive({
        isScreenFocused: shouldPlayActiveReel && !isPublisherOverlayOpen,
        index,
        activeIndex: vm.activeIndex,
      });

      const initialSeekTime =
        String(item.id) === String(initialVideoId)
          ? route.params?.seekTime
          : undefined;

      return (
        <ReelItem
          item={item}
          height={itemHeight}
          isActive={isActive}
          isCurrent={isCurrent}
          commentsPreviewVisible={isCommentsPreviewVisible && isCurrent}
          commentsPreviewHeight={Math.round(
            itemHeight * REELS_COMMENTS_PREVIEW_RATIO,
          )}
          shouldMount={shouldMount}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onReaction={vm.toggleReaction}
          onSave={vm.toggleSave}
          onShare={handleOpenShareReel}
          onOpenComments={handleOpenComments}
          onUnavailable={vm.markUnavailable}
          onFollow={vm.followPublisher}
          onOpenProfile={handleOpenProfile}
          index={index}
          initialSeekTime={initialSeekTime}
          onVideoEnd={handleVideoEnd}
        />
      );
    },
    [
      vm.activeIndex,
      isCommentsPreviewVisible,
      vm.toggleReaction,
      vm.toggleSave,
      vm.markUnavailable,
      vm.followPublisher,
      handleOpenProfile,
      handleOpenShareReel,
      itemHeight,
      isMuted,
      isPublisherOverlayOpen,
      activePreloadRadius,
      shouldKeepPlayersMounted,
      shouldPlayActiveReel,
      handleToggleMute,
      handleOpenComments,
      initialVideoId,
      route.params?.seekTime,
      handleVideoEnd,
    ],
  );

  const keyExtractor = useCallback((item: ReelsItem) => item.id, []);

  const getItemLayout = useCallback(
    (_: ArrayLike<ReelsItem> | null | undefined, index: number) => ({
      length: itemHeight,
      offset: itemHeight * index,
      index,
    }),
    [itemHeight],
  );

  const handleEndReached = useCallback(() => {
    if (hasMoreRef.current && !isLoadingMoreRef.current) {
      isLoadingMoreRef.current = true;
      loadMoreRef.current();
    }
  }, []);

  const reelsRefreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={vm.isRefreshing}
        onRefresh={vm.refresh}
        tintColor="#fff"
        colors={['#fff']}
        progressBackgroundColor="#222"
      />
    ),
    [vm.isRefreshing, vm.refresh],
  );

  const reelsFooter = useMemo(
    () =>
      vm.isLoadingMore ? (
        <View style={[styles.footerLoader, { height: itemHeight }]}>
          <ActivityIndicator color="#fff" size="small" />
        </View>
      ) : null,
    [itemHeight, vm.isLoadingMore],
  );

  // ── Swipe-from-left to go back ───────────────────────────────────────
  // Facebook-style: drag the screen to the right and release past a
  // threshold to dismiss the reels feed back to home.
  //
  // The gesture is configured so it does NOT fight the vertical pager:
  //   • `activeOffsetX(15)` — only activate after the user moves
  //     at least 18px to the RIGHT (positive X). A leftward drag never
  //     activates this gesture.
  //   • `failOffsetY([-15, 15])` — the moment the user moves 15+px up or
  //     down, this gesture FAILS and yields to the FlatList's vertical
  //     pager. This makes "swipe up to next reel" still feel instant.
  //   • `enabled(!vm.isCommentsOpen)` — comments sheet has its own
  //     dismiss gesture; don't double-handle.
  // (dragX is declared above the focus effect — see comment there for why)

  // ReelsScreen is mounted in two places (see routeRegistry):
  //   1. Inside MainTabs (the default tab experience)
  //   2. As a top-level Root Stack screen (when launched from a
  //      share / deep-link from PostDetail)
  // `navigation` therefore points at *whichever* navigator mounted
  // us. `getParent()` walks up to the RootStack, and only the
  // RootStack knows about `MAIN_TABS` — that's the only place a
  // nested `{ screen: FEED }` payload is valid, so we always
  // dispatch from there. This avoids the "Feed was not handled
  // by any navigator" warning that hits when ReelsScreen is
  // mounted directly under RootStack and we call
  // `navigation.navigate(FEED)` locally.
  const navigateToFeed = useCallback(() => {
    const rootNavigator = navigation.getParent() ?? navigation;
    rootNavigator.navigate(ROUTES.MAIN_TABS, { screen: ROUTES.FEED });
  }, [navigation]);

  const prepareFeedStatusBarForReturn = useCallback(() => {
    if (Platform.OS !== 'android') return;

    // Reels draws below a translucent status bar while Home owns an opaque
    // brand-coloured bar. Restore Home's native chrome before popping Reels
    // so Android never inserts its default white status-bar frame between the
    // two screens.
    StatusBar.setBarStyle('light-content', false);
    StatusBar.setBackgroundColor(APP_BRAND_COLOR, false);
    StatusBar.setTranslucent(false);
  }, []);

  const goBackToFeed = useCallback(() => {
    if (navigationActionInFlightRef.current) return;
    navigationActionInFlightRef.current = true;

    if (isTabRoute) {
      prepareFeedStatusBarForReturn();
      navigation.navigate(ROUTES.FEED);
      return;
    }

    setIsDismissing(true);
    dismissNavigationFrameRef.current = requestAnimationFrame(() => {
      dismissNavigationFrameRef.current = null;
      prepareFeedStatusBarForReturn();
      // Keep decoder teardown outside the visible native fade.
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigateToFeed();
      }
    });
  }, [
    isTabRoute,
    navigation,
    navigateToFeed,
    prepareFeedStatusBarForReturn,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return undefined;

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          goBackToFeed();
          return true;
        },
      );

      return () => subscription.remove();
    }, [goBackToFeed]),
  );

  const beginDismissTransition = useCallback(() => {
    setIsDismissing(true);
  }, []);

  const swipeBackGesture = useMemo(
    () =>
      Gesture.Pan()
        .hitSlop({ left: BACK_GESTURE_START_X, width: BACK_GESTURE_WIDTH })
        .activeOffsetX(BACK_GESTURE_ACTIVE_OFFSET_X)
        .failOffsetY([-BACK_GESTURE_FAIL_OFFSET_Y, BACK_GESTURE_FAIL_OFFSET_Y])
        .enabled(
          !isTabRoute &&
            !vm.isCommentsOpen &&
            !shareModalVisible &&
            !isPublisherOverlayOpen,
        )
        .onUpdate(event => {
          'worklet';
          // Track swipe progress for the back indicator and reveal the
          // previous screen under the transparent root Reels route.
          const nextX = Math.max(0, event.translationX);
          dragX.value = nextX;
          screenDismissX.value = nextX;
        })
        .onEnd(event => {
          'worklet';
          // Either far enough OR fast enough → dismiss.
          const shouldDismiss =
            event.translationX > SCREEN_WIDTH * 0.32 || event.velocityX > 700;

          if (shouldDismiss) {
            // Animate both indicator and screen out, then hop to feed.
            runOnJS(beginDismissTransition)();
            dragX.value = withTiming(SCREEN_WIDTH, { duration: 180 });
            screenDismissX.value = withTiming(
              SCREEN_WIDTH,
              { duration: 180 },
              finished => {
                if (finished) runOnJS(goBackToFeed)();
              },
            );
          } else {
            // Return in one direction only. A spring can overshoot zero and
            // make a short, cancelled swipe visibly wobble left/right.
            const returnDuration = Math.max(
              BACK_GESTURE_RETURN_MIN_DURATION_MS,
              Math.min(
                BACK_GESTURE_RETURN_MAX_DURATION_MS,
                (Math.max(0, event.translationX) / (SCREEN_WIDTH * 0.32)) *
                  BACK_GESTURE_RETURN_MAX_DURATION_MS,
              ),
            );
            const returnConfig = {
              duration: returnDuration,
              easing: BACK_GESTURE_RETURN_EASING,
            };
            dragX.value = withTiming(0, returnConfig);
            screenDismissX.value = withTiming(0, returnConfig);
          }
        })
        .onFinalize((_event, success) => {
          'worklet';
          if (success) return;
          const returnConfig = {
            duration: BACK_GESTURE_RETURN_MIN_DURATION_MS,
            easing: BACK_GESTURE_RETURN_EASING,
          };
          dragX.value = withTiming(0, returnConfig);
          screenDismissX.value = withTiming(0, returnConfig);
        }),
    [
      dragX,
      screenDismissX,
      beginDismissTransition,
      goBackToFeed,
      isTabRoute,
      isPublisherOverlayOpen,
      shareModalVisible,
      vm.isCommentsOpen,
    ],
  );

  const screenAnimatedStyle = useAnimatedStyle(() => {
    const dismissX = Math.max(0, screenDismissX.value);
    const progress = Math.min(1, dismissX / SCREEN_WIDTH);
    return {
      borderTopLeftRadius: interpolate(progress, [0, 1], [0, 22], 'clamp'),
      borderBottomLeftRadius: interpolate(progress, [0, 1], [0, 22], 'clamp'),
      opacity: interpolate(progress, [0, 1], [1, 0.92], 'clamp'),
      transform: [
        { translateX: dismissX },
        { scale: interpolate(progress, [0, 1], [1, 0.97], 'clamp') },
      ],
    };
  });

  const backIndicatorStyle = useAnimatedStyle(() => {
    const threshold = SCREEN_WIDTH * 0.32;
    // Fade in the indicator as user drags.
    const opacity = interpolate(
      dragX.value,
      [0, 40, threshold],
      [0, 0.85, 1],
      'clamp',
    );
    // Scale up the circle indicator slightly.
    const scale = interpolate(dragX.value, [0, threshold], [0.6, 1.2], 'clamp');
    // Slide indicator from left margin inwards.
    const translateX = interpolate(
      dragX.value,
      [0, threshold],
      [-60, 20],
      'clamp',
    );
    // Highlight indicator background blue if dragged far enough to trigger back.
    const isReady = dragX.value >= threshold;

    return {
      opacity,
      backgroundColor: isReady
        ? 'rgba(8, 102, 255, 0.85)'
        : 'rgba(0, 0, 0, 0.65)',
      transform: [{ translateX }, { scale }],
    };
  });

  // ── Render branches ──────────────────────────────────────────────────

  if (vm.isInitialLoading) {
    return (
      <View style={styles.fullCenter}>
        <FocusAwareStatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.helperText}>{copy.loading}</Text>
      </View>
    );
  }

  if (vm.error && vm.items.length === 0) {
    return (
      <View style={styles.fullCenter}>
        <FocusAwareStatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <Text style={styles.errorTitle}>{copy.failedLoad}</Text>
        <Text style={styles.errorMsg}>{vm.error}</Text>
        <TouchableOpacity onPress={vm.retry} style={styles.retryButton}>
          <RotateCcw size={16} color="#fff" />
          <Text style={styles.retryLabel}>{copy.tryAgain}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (vm.items.length === 0) {
    return (
      <View style={styles.fullCenter}>
        <FocusAwareStatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <Text style={styles.emptyTitle}>{copy.noReels}</Text>
        <Text style={styles.emptyMsg}>{copy.beFirst}</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.CREATE_REEL)}
          style={styles.retryButton}
        >
          <Text style={styles.retryLabel}>{copy.postReel}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <GestureDetector gesture={swipeBackGesture}>
      <Animated.View
        style={[styles.container, screenAnimatedStyle]}
        onLayout={handleContainerLayout}
      >
        <FocusAwareStatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

        <FlatList
          ref={flatListRef}
          data={vm.items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          // Only supply `initialScrollIndex` when we have a real
          // deeplink — leaving it `undefined` for normal visits keeps
          // RN's default behaviour (scroll to top). The `??` form
          // makes sure we never accidentally pass `null`, which
          // FlatList treats as "0" and would snap the user to the
          // newest reel on every cold start.
          initialScrollIndex={initialScrollIndexValue ?? undefined}
          pagingEnabled
          scrollEnabled={!vm.isCommentsOpen}
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          bounces={false}
          overScrollMode="never"
          style={styles.list}
          onScrollBeginDrag={handleReelScrollBeginDrag}
          onScrollEndDrag={handleReelScrollEndDrag}
          onMomentumScrollBegin={handleReelMomentumScrollBegin}
          onMomentumScrollEnd={handleReelMomentumScrollEnd}
          // ── Virtualization tuning ───────────────────────────────────
          // windowSize=3 means: keep ~1 screen above + current + ~1 screen
          // below in the tree. Combined with our per-item mount gate this
          // gives smooth scrolling without exploding memory.
          windowSize={3}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          updateCellsBatchingPeriod={32}
          removeClippedSubviews={Platform.OS !== 'android'}
          // ──────────────────────────────────────────────────────────
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY_CONFIG}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={reelsRefreshControl}
          ListFooterComponent={reelsFooter}
        />

        {hasNewReels ? (
          <TouchableOpacity
            onPress={handleOpenNewReels}
            activeOpacity={0.9}
            style={[styles.newReelsButton, { top: newReelsButtonTop }]}
          >
            <ArrowUp size={15} color="#fff" />
            <Text style={styles.newReelsButtonText}>{copy.newVideoButton}</Text>
          </TouchableOpacity>
        ) : null}

        {/* Floating controls: back, auto-scroll, and sound. */}
        <View
          pointerEvents="box-none"
          collapsable={false}
          style={[styles.headerOverlay, { top: reelsHeaderTop }]}
        >
          {/* Reels may be kept alive as a tab for fast Home transitions, but
              it must still expose an explicit way back to Home. */}
          <TouchableOpacity
            delayPressIn={0}
            activeOpacity={0.65}
            onPress={goBackToFeed}
            style={styles.headerButton}
            hitSlop={HEADER_EDGE_HIT_SLOP}
            accessibilityRole="button"
          >
            <ChevronLeft size={26} color="#fff" />
          </TouchableOpacity>

          {/* Right: Auto scroll toggle + Mute button */}
          <View pointerEvents="box-none" style={styles.headerRightRow}>
            <TouchableOpacity
              delayPressIn={0}
              activeOpacity={0.65}
              onPress={toggleAutoScroll}
              style={[
                styles.headerButton,
                autoScrollEnabled && styles.headerButtonActive,
              ]}
              hitSlop={HEADER_ACTION_HIT_SLOP}
            >
              <ChevronsDown size={20} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity
              delayPressIn={0}
              activeOpacity={0.65}
              onPress={handleToggleMute}
              style={styles.headerButton}
              hitSlop={HEADER_ACTION_HIT_SLOP}
            >
              {isMuted ? (
                <VolumeX size={20} color="#fff" />
              ) : (
                <Volume2 size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <ReelCommentsSheet
          visible={vm.isCommentsOpen}
          sheetHeight="64%"
          backdropColor="rgba(0,0,0,0.08)"
          comments={vm.comments}
          commentCount={selectedCommentReel?.commentCount ?? vm.comments.length}
          isLoading={vm.isCommentsLoading}
          isLoadingMore={vm.isCommentsLoadingMore}
          isSubmitting={vm.isSubmittingComment}
          error={vm.commentError}
          repliesById={vm.repliesById}
          loadingRepliesIds={vm.loadingRepliesIds}
          replyingTo={vm.replyingTo}
          onOpenStart={handleCommentsOpenStart}
          onCloseStart={handleCommentsCloseStart}
          composerAvatarUrl={vm.currentUser?.avatarUrl}
          onClose={handleCloseComments}
          onEndReached={vm.loadMoreComments}
          onRetry={handleRetryComments}
          onSubmit={vm.submitComment}
          onSubmitReply={vm.submitReply}
          onSearchMentions={vm.searchCommentMentions}
          onSetReaction={vm.setCommentReaction}
          onDelete={vm.deleteComment}
          onEdit={vm.editComment}
          onLoadReplies={vm.loadReplies}
          onCollapseReplies={vm.collapseReplies}
          onStartReply={vm.startReplyTo}
          onCancelReply={vm.cancelReply}
          onRetryFailedComment={vm.retryFailedComment}
          onDeleteFailedComment={vm.deleteFailedComment}
        />

        <FeedShareBottomSheet
          visible={shareModalVisible}
          onClose={handleCloseShareModal}
          post={sharingPost}
          onInternalShare={handleInternalSharePost}
        />

        <ReelPublisherOverlay
          visible={selectedPublisherId !== null}
          userId={selectedPublisherId}
          currentReelId={currentReelId}
          onClose={handleClosePublisherOverlay}
          onPlayReel={handlePlayPublisherReel}
          onFollowToggled={(userId, isFollowing) => {
            if (isFollowing) {
              vm.followPublisher(userId);
            }
          }}
        />

        {/* Left edge back swipe indicator bubble */}
        <Animated.View
          style={[
            styles.backIndicatorContainer,
            backIndicatorStyle,
            { top: viewportHeight / 2 - 25 },
          ]}
        >
          <ChevronLeft size={24} color="#FFF" />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', overflow: 'hidden' },
  list: { flex: 1, backgroundColor: '#000' },
  headerOverlay: {
    position: 'absolute',
    left: 12,
    right: 12,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: REELS_HEADER_LAYER_Z,
    elevation: 32,
  },
  headerButton: {
    height: 44,
    width: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: REELS_HEADER_LAYER_Z + 1,
    elevation: 33,
  },
  headerButtonActive: {
    backgroundColor: APP_BRAND_COLOR,
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  newReelsButton: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 12,
    minHeight: 38,
    borderRadius: 19,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_BRAND_COLOR,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  newReelsButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  fullCenter: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  helperText: {
    color: 'rgba(255,255,255,0.65)',
    marginTop: 12,
    fontSize: 13,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  errorMsg: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptyMsg: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: APP_BRAND_COLOR,
  },
  retryLabel: {
    color: '#fff',
    fontWeight: '700',
    marginLeft: 6,
  },
  footerLoader: {
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  backIndicatorContainer: {
    position: 'absolute',
    left: 0,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
});
