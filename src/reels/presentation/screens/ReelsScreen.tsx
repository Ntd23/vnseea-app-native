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
//       • `removeClippedSubviews` recovers GPU work on Android.
//
//   viewabilityConfig
//     `itemVisiblePercentThreshold: 80` means a row only becomes "active"
//     after the user has nearly fully snapped to it — prevents the wrong
//     video from briefly playing while the user is mid-swipe.
//
//   Mount window of ±1
//     The active reel plays. Its immediate neighbors are mounted+paused so
//     the decoder warms up the GPU and the next swipe is instant. Items
//     further away unmount their VideoPlayer entirely (the poster image
//     stays via FlatList virtualization).
//
//   Pause-on-blur
//     When the user switches tabs we derive playback from React
//     Navigation focus. Native iOS tabs may mount Video in the background,
//     so a reel must never auto-play unless the Video tab is actually focused.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Dimensions,
  FlatList,
  Image,
  LayoutChangeEvent,
  Platform,
  RefreshControl,
  StyleSheet,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
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
  interpolate,
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { ArrowUp, ChevronLeft, RotateCcw, ChevronsDown, VolumeX, Volume2 } from 'lucide-react-native';
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
  shouldMountReelVideoPlayer,
} from './reelsPlayback';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  publishNativeTabScrollBehavior,
  publishNativeTabScrollPresentation,
} from '../../../navigation/nativeTabScrollPublisher';
import { useMainTabContentInsets } from '../../../navigation/useMainTabContentInsets';
import { postCreatedEvents } from '../../../feed/application/events/postCreatedEvents';
import { FeedShareBottomSheet } from '../../../feed/presentation/components/FeedShareBottomSheet';
import type { FeedPost, FeedVideoPost } from '../../../feed/domain/types/feed.types';
import type { SharePostInput } from '../../../feed/domain/repositories/FeedRepository';

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 80,
  minimumViewTime: 80, // ms — avoids flicker during fast swipes
};

const PRELOAD_RADIUS = 1; // mount video for current ± this many neighbors
const NATIVE_TAB_SCROLL_DOWN_THRESHOLD = 8;
const NATIVE_TAB_SCROLL_UP_THRESHOLD = 1;
const NATIVE_TAB_SCROLL_BEHAVIOR_NONE = 0;
const NATIVE_TAB_SCROLL_BEHAVIOR_ON_SCROLL_DOWN = 1;
const REELS_NEW_VIDEO_PROBE_INTERVAL_MS = 30000;
const REELS_NEW_VIDEO_PROBE_LIMIT = 6;
const REELS_HEADER_TOP_GAP = 10;
const REELS_NEW_BUTTON_HEADER_GAP = 50;
const REELS_HEADER_LAYER_Z = 10030;

// Screen width — used by the swipe-back gesture to compute the dismiss
// threshold and target translation.
const SCREEN_WIDTH = Dimensions.get('window').width;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as any;
const AnimatedImage = Animated.createAnimatedComponent(Image);

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

function getFeedPrivacyFromReel(privacy?: number): FeedVideoPost['privacy'] {
  if (privacy === 1) return 'friends';
  if (privacy === 2) return 'only_me';
  return 'public';
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
    privacy: getFeedPrivacyFromReel(item.privacy),
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
  const isSelectedRoute = useNavigationState(state =>
    isNavigationRouteSelected(state, route.key, route.name),
  );
  const isPlaybackRouteFocused = isFocusedScreen && isSelectedRoute;
  const insets = useSafeAreaInsets();
  const reelsTopInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
    12,
  );
  const reelsHeaderTop = reelsTopInset + REELS_HEADER_TOP_GAP;
  const newReelsButtonTop = reelsHeaderTop + REELS_NEW_BUTTON_HEADER_GAP;
  const { bottomContentPadding } = useMainTabContentInsets();
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
  const [selectedPublisherId, setSelectedPublisherId] = useState<string | null>(null);
  const language = useAppLanguage();
  const copy = REELS_COPY[language];
  const isIosTabRoute =
    Platform.OS === 'ios' && navigation.getState?.().type === 'tab';

  const initialVideoId = route.params?.initialVideoId;
  const initialPost = route.params?.post;
  const initialLaunchCoverUri =
    typeof initialPost?.thumbnailUrl === 'string' &&
    initialPost.thumbnailUrl.length > 0
      ? initialPost.thumbnailUrl
      : undefined;
  const [launchCoverUri] = useState(initialLaunchCoverUri);
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
  const activeIndexRef = useRef(vm.activeIndex);
  const itemsLengthRef = useRef(vm.items.length);
  const hasMoreRef = useRef(vm.hasMore);
  const isLoadingMoreRef = useRef(vm.isLoadingMore);
  const isCommentsOpenRef = useRef(vm.isCommentsOpen);
  const isShareSheetOpenRef = useRef(false);
  const loadMoreRef = useRef(vm.loadMore);
  const setReelsActiveIndexRef = useRef(vm.setActiveIndex);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [sharingPost, setSharingPost] = useState<FeedPost | undefined>(undefined);
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
    isCommentsOpenRef.current = vm.isCommentsOpen;
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
    vm.isCommentsOpen,
    vm.isInitialLoading,
    vm.isLoadingMore,
    vm.isRefreshing,
    vm.items.length,
    vm.loadMore,
    vm.setActiveIndex,
  ]);

  useEffect(() => {
    isShareSheetOpenRef.current = shareModalVisible;
  }, [shareModalVisible]);

  const enqueueNewReelCandidates = useCallback((
    items: ReelsItem[],
    options: { requireNewerThanTop?: boolean } = {},
  ) => {
    if (items.length === 0) return;

    const currentItems = reelsItemsRef.current;
    const visibleIds = new Set(currentItems.map(item => item.id));
    const pendingIds = new Set(pendingNewReelsRef.current.map(item => item.id));
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
  }, []);

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
  }, [vm.prependReels]);

  const checkForRemoteNewReels = useCallback(async () => {
    if (!isReelsFocusedRef.current) return;
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
  }, [enqueueNewReelCandidates, vm.peekLatestReels]);

  useEffect(() => {
    if (!isFocusedScreen) return undefined;

    const firstProbe = setTimeout(() => {
      void checkForRemoteNewReels();
    }, 1200);
    const interval = setInterval(() => {
      void checkForRemoteNewReels();
    }, REELS_NEW_VIDEO_PROBE_INTERVAL_MS);

    return () => {
      clearTimeout(firstProbe);
      clearInterval(interval);
    };
  }, [checkForRemoteNewReels, isFocusedScreen]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        void checkForRemoteNewReels();
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
    navigation.setParams({ initialVideoId: undefined, post: undefined, seekTime: undefined });
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
  const [hasMeasuredViewport, setHasMeasuredViewport] = useState(false);
  const [isLaunchCoverVisible, setIsLaunchCoverVisible] = useState(
    () => Boolean(launchCoverUri),
  );
  const launchCoverOpacity = useSharedValue(launchCoverUri ? 1 : 0);
  const launchCoverScale = useSharedValue(launchCoverUri ? 1.01 : 1);
  const itemHeight = viewportHeight;

  const [isMuted, setIsMuted] = useState(false); // start unmuted by default
  // Keep preloadRadius constant at 1 so the ±1 neighbor videos stay mounted
  // and buffered at all times. Previously we dropped to 0 during scroll to
  // reduce lag, but that caused a black-screen flash because the next video
  // had to rebuffer from scratch after being unmounted.
  const preloadRadius = PRELOAD_RADIUS;

  // Drives the swipe-back gesture's transform. Declared up here (not down
  // by the gesture definition) so the focus effect below can reset it —
  // we have to undo a successful dismissal when the user returns.
  const dragX = useSharedValue(0);
  const screenDismissX = useSharedValue(0);

  const scrollY = useSharedValue(0);
  const nativeTabScrollLastY = useSharedValue(0);
  const nativeTabScrollDownwardDelta = useSharedValue(0);
  const nativeTabScrollUpwardDelta = useSharedValue(0);
  const nativeTabScrollLastBehavior = useSharedValue(
    NATIVE_TAB_SCROLL_BEHAVIOR_ON_SCROLL_DOWN,
  );

  const publishNativeTabScrollBehaviorFromWorklet = useCallback(
    (behavior: 0 | 1) => {
      const nextBehavior =
        behavior === NATIVE_TAB_SCROLL_BEHAVIOR_NONE
          ? 'none'
          : 'onScrollDown';
      publishNativeTabScrollPresentation(nextBehavior);
      publishNativeTabScrollBehavior(nextBehavior);
    },
    [],
  );

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (event && event.contentOffset) {
        const currentY = event.contentOffset.y;
        scrollY.value = currentY;

        if (!isIosTabRoute) {
          return;
        }

        if (currentY < 0) {
          nativeTabScrollLastY.value = 0;
          nativeTabScrollDownwardDelta.value = 0;
          nativeTabScrollUpwardDelta.value = 0;

          if (
            nativeTabScrollLastBehavior.value !==
            NATIVE_TAB_SCROLL_BEHAVIOR_NONE
          ) {
            nativeTabScrollLastBehavior.value =
              NATIVE_TAB_SCROLL_BEHAVIOR_NONE;
            runOnJS(publishNativeTabScrollBehaviorFromWorklet)(
              NATIVE_TAB_SCROLL_BEHAVIOR_NONE,
            );
          }
          return;
        }

        const nextY = Math.max(0, currentY);
        const delta = nextY - nativeTabScrollLastY.value;
        nativeTabScrollLastY.value = nextY;

        if (delta > 0) {
          nativeTabScrollDownwardDelta.value += delta;
          nativeTabScrollUpwardDelta.value = 0;

          if (
            nativeTabScrollDownwardDelta.value >=
              NATIVE_TAB_SCROLL_DOWN_THRESHOLD &&
            nativeTabScrollLastBehavior.value !==
              NATIVE_TAB_SCROLL_BEHAVIOR_ON_SCROLL_DOWN
          ) {
            nativeTabScrollDownwardDelta.value = 0;
            nativeTabScrollLastBehavior.value =
              NATIVE_TAB_SCROLL_BEHAVIOR_ON_SCROLL_DOWN;
            runOnJS(publishNativeTabScrollBehaviorFromWorklet)(
              NATIVE_TAB_SCROLL_BEHAVIOR_ON_SCROLL_DOWN,
            );
          }
          return;
        }

        if (delta < 0) {
          nativeTabScrollUpwardDelta.value += Math.abs(delta);
          nativeTabScrollDownwardDelta.value = 0;

          if (
            nativeTabScrollUpwardDelta.value >=
              NATIVE_TAB_SCROLL_UP_THRESHOLD &&
            nativeTabScrollLastBehavior.value !==
              NATIVE_TAB_SCROLL_BEHAVIOR_NONE
          ) {
            nativeTabScrollUpwardDelta.value = 0;
            nativeTabScrollLastBehavior.value =
              NATIVE_TAB_SCROLL_BEHAVIOR_NONE;
            runOnJS(publishNativeTabScrollBehaviorFromWorklet)(
              NATIVE_TAB_SCROLL_BEHAVIOR_NONE,
            );
          }
        }
      }
    },
  });

  useEffect(() => {
    if (!isIosTabRoute) return undefined;

    return () => {
      publishNativeTabScrollBehavior('onScrollDown');
    };
  }, [isIosTabRoute]);

  // Also resets the swipe-back transform to 0. Without this, the second
  // visit to Reels renders blank: a successful dismiss leaves dragX at
  // SCREEN_WIDTH, so when the screen regains focus the whole content is
  // still translated off the right edge → user sees the white nav stack
  // background.
  useFocusEffect(
    useCallback(() => {
      dragX.value = 0;
      screenDismissX.value = 0;

      return () => {
        if (isIosTabRoute) {
          publishNativeTabScrollBehavior('onScrollDown');
        }
      };
    }, [dragX, screenDismissX, isIosTabRoute]),
  );

  // FlatList requires `onViewableItemsChanged` to have a stable identity
  // across renders, otherwise it throws "Changing onViewableItemsChanged
  // on the fly is not supported". We stash the latest activeIndex setter
  // in a ref so the stable callback can always reach the freshest value.
  const setActiveIndexRef = useRef(vm.setActiveIndex);
  setActiveIndexRef.current = vm.setActiveIndex;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length === 0) return;
      const first = viewableItems[0];
      if (typeof first.index === 'number') {
        setActiveIndexRef.current(first.index);
      }
    },
  ).current;

  const handleToggleMute = useCallback(() => setIsMuted(m => !m), []);

  const handleVideoEnd = useCallback((index: number) => {
    if (!autoScrollEnabledRef.current) return false;
    if (index !== activeIndexRef.current) return false;
    if (isCommentsOpenRef.current || isShareSheetOpenRef.current) return false;

    if (index >= itemsLengthRef.current - 1) {
      if (hasMoreRef.current && !isLoadingMoreRef.current) {
        loadMoreRef.current();
      }
      return false;
    }

    const nextIndex = index + 1;
    activeIndexRef.current = nextIndex;
    setReelsActiveIndexRef.current(nextIndex);
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    });
    return true;
  }, []);

  const handleOpenProfile = useCallback((userId: string) => {
    setSelectedPublisherId(userId);
  }, []);

  const handleOpenShareReel = useCallback((item: ReelsItem) => {
    setSharingPost(mapReelToFeedVideoPost(item));
    setShareModalVisible(true);
  }, []);

  const handleCloseShareModal = useCallback(() => {
    setShareModalVisible(false);
    setTimeout(() => {
      setSharingPost(undefined);
    }, 300);
  }, []);

  const handleInternalSharePost = useCallback((input: SharePostInput) => {
    return vm.sharePost(input);
  }, [vm.sharePost]);

  const handlePlayPublisherReel = useCallback((reel: ReelsItem) => {
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
  }, [vm.items, vm.prependReels, vm.setActiveIndex]);

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    setHasMeasuredViewport(true);
    setViewportHeight(prev => (prev === nextHeight ? prev : nextHeight));
  }, []);

  const selectedCommentReel = useMemo(
    () => vm.items.find(item => item.id === vm.selectedCommentPostId) ?? null,
    [vm.items, vm.selectedCommentPostId],
  );
  const isPublisherOverlayOpen = selectedPublisherId !== null;
  const currentReelId = vm.items[vm.activeIndex]?.id ?? null;

  const handleRetryComments = useCallback(() => {
    if (vm.selectedCommentPostId) {
      vm.openComments(vm.selectedCommentPostId);
    }
  }, [vm]);

  const renderItem = useCallback(
    ({ item, index }: { item: ReelsItem; index: number }) => {
      const shouldMount = shouldMountReelVideoPlayer({
        isPlaybackRouteFocused,
        index,
        activeIndex: vm.activeIndex,
        preloadRadius,
      });
      const isCurrent = index === vm.activeIndex;
      // A reel only counts as "active" when this screen has focus —
      // when the user switches tabs, every reel becomes inactive (paused).
      const isActive = isReelItemActive({
        isScreenFocused: isPlaybackRouteFocused && !isPublisherOverlayOpen,
        isCommentsOpen: vm.isCommentsOpen,
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
          shouldMount={shouldMount}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onReaction={vm.toggleReaction}
          onSave={vm.toggleSave}
          onShare={handleOpenShareReel}
          onOpenComments={vm.openComments}
          onUnavailable={vm.markUnavailable}
          onFollow={vm.followPublisher}
          onOpenProfile={handleOpenProfile}
          scrollY={scrollY}
          index={index}
          initialSeekTime={initialSeekTime}
          onVideoEnd={handleVideoEnd}
          bottomOverlayInset={bottomContentPadding}
        />
      );
    },
    [
	      vm.activeIndex,
	      vm.isCommentsOpen,
	      vm.toggleReaction,
      vm.toggleSave,
      vm.openComments,
      vm.markUnavailable,
      vm.followPublisher,
      handleOpenProfile,
      handleOpenShareReel,
      itemHeight,
      isMuted,
      isPublisherOverlayOpen,
      isPlaybackRouteFocused,
      handleToggleMute,
      scrollY,
      preloadRadius,
      initialVideoId,
      route.params?.seekTime,
      handleVideoEnd,
      bottomContentPadding,
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
    if (vm.hasMore && !vm.isLoadingMore) {
      vm.loadMore();
    }
  }, [vm]);

  // ── Swipe-from-left to go back ───────────────────────────────────────
  // Facebook-style: drag the screen to the right and release past a
  // threshold to dismiss the reels feed back to home.
  //
  // The gesture is configured so it does NOT fight the vertical pager:
  //   • `activeOffsetX([18, ...])` — only activate after the user moves
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

  const goBackToFeed = useCallback(() => {
    // Prefer goBack when this screen sits on top of a stack — it POPS
    // the screen entirely, so the next visit re-mounts with fresh state
    // and we never have to worry about leftover transforms. Falls back
    // to a tab-switch when there is nothing to pop.
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigateToFeed();
    }
  }, [navigation, navigateToFeed]);

  const swipeBackGesture = useMemo(
    () =>
      Gesture.Pan()
        .hitSlop({ left: 0, width: 12 })
        .activeOffsetX([15, 999])
        .failOffsetY([-15, 15])
        .enabled(!isIosTabRoute && !vm.isCommentsOpen)
        .onUpdate(event => {
          'worklet';
          // Track swipe progress for the back indicator icon while keeping screen still.
          dragX.value = Math.max(0, event.translationX);
        })
        .onEnd(event => {
          'worklet';
          // Either far enough OR fast enough → dismiss.
          const shouldDismiss =
            event.translationX > SCREEN_WIDTH * 0.32 ||
            event.velocityX > 700;

          if (shouldDismiss) {
            // Animate both indicator and screen out, then hop to feed.
            dragX.value = withTiming(SCREEN_WIDTH, { duration: 180 });
            screenDismissX.value = withTiming(
              SCREEN_WIDTH,
              { duration: 180 },
              finished => {
                if (finished) runOnJS(goBackToFeed)();
              },
            );
          } else {
            // Spring back the indicator cleanly. Screen remains at 0.
            dragX.value = withSpring(0, { damping: 18, stiffness: 220 });
          }
        }),
    [dragX, screenDismissX, goBackToFeed, isIosTabRoute, vm.isCommentsOpen],
  );

  const screenAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: screenDismissX.value },
      ],
    };
  });

  const launchCoverAnimatedStyle = useAnimatedStyle(() => ({
    opacity: launchCoverOpacity.value,
    transform: [{ scale: launchCoverScale.value }],
  }));

  useEffect(() => {
    if (!isLaunchCoverVisible || !hasMeasuredViewport || vm.items.length === 0) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      launchCoverScale.value = withTiming(1.035, { duration: 220 });
      launchCoverOpacity.value = withTiming(0, { duration: 180 }, finished => {
        if (finished) {
          runOnJS(setIsLaunchCoverVisible)(false);
        }
      });
    }, 90);

    return () => clearTimeout(timeout);
  }, [
    hasMeasuredViewport,
    isLaunchCoverVisible,
    launchCoverOpacity,
    launchCoverScale,
    vm.items.length,
  ]);

  const backIndicatorStyle = useAnimatedStyle(() => {
    const threshold = SCREEN_WIDTH * 0.32;
    // Fade in the indicator as user drags.
    const opacity = interpolate(dragX.value, [0, 40, threshold], [0, 0.85, 1], 'clamp');
    // Scale up the circle indicator slightly.
    const scale = interpolate(dragX.value, [0, threshold], [0.6, 1.2], 'clamp');
    // Slide indicator from left margin inwards.
    const translateX = interpolate(dragX.value, [0, threshold], [-60, 20], 'clamp');
    // Highlight indicator background blue if dragged far enough to trigger back.
    const isReady = dragX.value >= threshold;

    return {
      opacity,
      backgroundColor: isReady ? 'rgba(8, 102, 255, 0.85)' : 'rgba(0, 0, 0, 0.65)',
      transform: [
        { translateX },
        { scale },
      ],
    };
  });

  // ── Render branches ──────────────────────────────────────────────────

  if (vm.isInitialLoading) {
    return (
      <View style={styles.fullCenter}>
        <FocusAwareStatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.helperText}>{copy.loading}</Text>
      </View>
    );
  }

  if (vm.error && vm.items.length === 0) {
    return (
      <View style={styles.fullCenter}>
        <FocusAwareStatusBar barStyle="light-content" translucent backgroundColor="transparent" />
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
        <FocusAwareStatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <Text style={styles.emptyTitle}>{copy.noReels}</Text>
        <Text style={styles.emptyMsg}>
          {copy.beFirst}
        </Text>
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
        <FocusAwareStatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <AnimatedFlatList
          ref={flatListRef as any}
          data={vm.items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          extraData={{
            isMuted,
            activeIndex: vm.activeIndex,
            isPlaybackRouteFocused,
            isPublisherOverlayOpen,
          }}
          // Only supply `initialScrollIndex` when we have a real
          // deeplink — leaving it `undefined` for normal visits keeps
          // RN's default behaviour (scroll to top). The `??` form
          // makes sure we never accidentally pass `null`, which
          // FlatList treats as "0" and would snap the user to the
          // newest reel on every cold start.
          initialScrollIndex={initialScrollIndexValue ?? undefined}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={itemHeight}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          bounces={false}
          overScrollMode="never"
          style={styles.list}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          // ── Virtualization tuning ───────────────────────────────────
          // windowSize=3 means: keep ~1 screen above + current + ~1 screen
          // below in the tree. Combined with our per-item mount gate this
          // gives smooth scrolling without exploding memory.
          windowSize={3}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews
          // ──────────────────────────────────────────────────────────
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={VIEWABILITY_CONFIG}
          onEndReached={handleEndReached}
          onEndReachedThreshold={1.5}
          refreshControl={
            <RefreshControl
              refreshing={vm.isRefreshing}
              onRefresh={vm.refresh}
              tintColor="#fff"
              colors={['#fff']}
              progressBackgroundColor="#222"
            />
          }
          ListFooterComponent={
            vm.isLoadingMore ? (
              <View style={[styles.footerLoader, { height: itemHeight }]}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            ) : null
          }
        />

        {isLaunchCoverVisible && launchCoverUri ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.launchCover, launchCoverAnimatedStyle]}
          >
            <AnimatedImage
              source={{ uri: launchCoverUri }}
              style={styles.launchCoverImage}
              resizeMode="cover"
            />
            <View style={styles.launchCoverShade} />
          </Animated.View>
        ) : null}

        {hasNewReels ? (
          <TouchableOpacity
            onPress={handleOpenNewReels}
            activeOpacity={0.9}
            style={[
              styles.newReelsButton,
              { top: newReelsButtonTop },
            ]}
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
          {/* Left: Back button (if stack navigator has back capability) */}
          {!isIosTabRoute ? (
            <TouchableOpacity
              delayPressIn={0}
              onPressIn={goBackToFeed}
              style={styles.headerButton}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
            >
              <ChevronLeft size={26} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View />
          )}

          {/* Right: Auto scroll toggle + Mute button */}
          <View pointerEvents="box-none" style={styles.headerRightRow}>
            <TouchableOpacity
              delayPressIn={0}
              onPressIn={toggleAutoScroll}
              style={[
                styles.headerCapsuleButton,
                autoScrollEnabled && styles.headerButtonActive,
              ]}
              hitSlop={{ top: 16, bottom: 16, left: 14, right: 14 }}
            >
              <ChevronsDown size={18} color="#fff" />
              <Text style={styles.headerButtonText}>
                {autoScrollEnabled ? copy.autoOn : copy.autoOff}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              delayPressIn={0}
              onPressIn={handleToggleMute}
              style={styles.headerButton}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
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
          comments={vm.comments}
          commentCount={selectedCommentReel?.commentCount ?? vm.comments.length}
          isLoading={vm.isCommentsLoading}
          isLoadingMore={vm.isCommentsLoadingMore}
          isSubmitting={vm.isSubmittingComment}
          error={vm.commentError}
          repliesById={vm.repliesById}
          loadingRepliesIds={vm.loadingRepliesIds}
          replyingTo={vm.replyingTo}
          onClose={vm.closeComments}
          onEndReached={vm.loadMoreComments}
          onRetry={handleRetryComments}
          onSubmit={vm.submitComment}
          onSubmitReply={vm.submitReply}
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
          onClose={() => setSelectedPublisherId(null)}
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
  container: { flex: 1, backgroundColor: '#000' },
  list: { flex: 1, backgroundColor: '#000' },
  launchCover: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#000',
    overflow: 'hidden',
    zIndex: 5,
  },
  launchCoverImage: {
    width: '100%',
    height: '100%',
  },
  launchCoverShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
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
  headerCapsuleButton: {
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 14,
    zIndex: REELS_HEADER_LAYER_Z + 1,
    elevation: 33,
  },
  headerButtonActive: {
    backgroundColor: '#0866ff',
  },
  headerRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
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
    backgroundColor: '#0866ff',
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
    backgroundColor: '#0000ff',
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
