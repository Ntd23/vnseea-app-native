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
//     When the user switches tabs we flip an `isFocused` flag, which
//     forces every reel to compute isActive=false — pauses all decoders
//     without losing the scroll position.

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  LayoutChangeEvent,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
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
import { ChevronLeft, RotateCcw } from 'lucide-react-native';
import { useReelsViewModel } from '../../application/view-models/useReelsViewModel';
import type { ReelsItem } from '../../domain/types/reels.types';
import { ROUTES } from '../../../navigation/constants/routes';
import { ReelItem } from '../components/ReelItem';
import { ReelCommentsSheet } from '../components/ReelCommentsSheet';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 80,
  minimumViewTime: 80, // ms — avoids flicker during fast swipes
};

const PRELOAD_RADIUS = 1; // mount video for current ± this many neighbors

// Screen width — used by the swipe-back gesture to compute the dismiss
// threshold and target translation.
const SCREEN_WIDTH = Dimensions.get('window').width;

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList) as any;

const REELS_COPY = {
  vi: {
    loading: 'Đang tải reels...',
    failedLoad: 'Không tải được reels',
    tryAgain: 'Thử lại',
    noReels: 'Chưa có reel nào',
    beFirst: 'Hãy là người đầu tiên đăng một video Reel!',
    postReel: 'Đăng Reel',
  },
  en: {
    loading: 'Loading reels...',
    failedLoad: 'Failed to load reels',
    tryAgain: 'Try again',
    noReels: 'No reels yet',
    beFirst: 'Be the first one to post a Reel!',
    postReel: 'Post Reel',
  },
};

export default function ReelsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const isFocusedScreen = useIsFocused();
  const insets = useSafeAreaInsets();
  const vm = useReelsViewModel();
  const language = useAppLanguage();
  const copy = REELS_COPY[language];

  const initialVideoId = route.params?.initialVideoId;
  const initialPost = route.params?.post;
  const flatListRef = useRef<FlatList>(null);
  const entryProgress = useSharedValue(1);

  useEffect(() => {
    if (isFocusedScreen && initialVideoId && initialPost) {
      // Trigger cinematic scale + slide + fade entry animation
      entryProgress.value = 0;
      entryProgress.value = withTiming(1, { duration: 350 });

      const index = vm.items.findIndex(item => String(item.id) === String(initialVideoId));
      
      vm.setInitialVideo(initialVideoId, initialPost);
      
      const targetIndex = index !== -1 ? index : 0;
      if (targetIndex > 0) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: targetIndex, animated: false });
        }, 150);
      }
      
      // Clear navigation params so we don't trigger repeatedly
      navigation.setParams({ initialVideoId: undefined, post: undefined });
    }
  }, [isFocusedScreen, initialVideoId, initialPost, vm, navigation, entryProgress]);

  // Use the full screen height — the feed is meant to be edge-to-edge.
  const [viewportHeight, setViewportHeight] = useState(
    () => Dimensions.get('window').height,
  );
  const itemHeight = viewportHeight;

  const [isMuted, setIsMuted] = useState(false); // start unmuted by default
  const [isFocused, setIsFocused] = useState(true);

  // Keep preloadRadius constant at 1 so the ±1 neighbor videos stay mounted
  // and buffered at all times. Previously we dropped to 0 during scroll to
  // reduce lag, but that caused a black-screen flash because the next video
  // had to rebuffer from scratch after being unmounted.
  const preloadRadius = PRELOAD_RADIUS;

  // Drives the swipe-back gesture's transform. Declared up here (not down
  // by the gesture definition) so the focus effect below can reset it —
  // we have to undo a successful dismissal when the user returns.
  const dragX = useSharedValue(0);

  const scrollY = useSharedValue(0);

  const handleScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (event && event.contentOffset) {
        scrollY.value = event.contentOffset.y;
      }
    },
  });

  // Pause everything when the user navigates away from the tab — by toggling
  // a focus flag rather than resetting activeIndex. This way the user's
  // scroll position is preserved across tab switches.
  //
  // Also resets the swipe-back transform to 0. Without this, the second
  // visit to Reels renders blank: a successful dismiss leaves dragX at
  // SCREEN_WIDTH, so when the screen regains focus the whole content is
  // still translated off the right edge → user sees the white nav stack
  // background.
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      dragX.value = 0;
      return () => setIsFocused(false);
    }, [dragX]),
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

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    setViewportHeight(prev => (prev === nextHeight ? prev : nextHeight));
  }, []);

  const selectedCommentReel = useMemo(
    () => vm.items.find(item => item.id === vm.selectedCommentPostId) ?? null,
    [vm.items, vm.selectedCommentPostId],
  );

  const handleRetryComments = useCallback(() => {
    if (vm.selectedCommentPostId) {
      vm.openComments(vm.selectedCommentPostId);
    }
  }, [vm]);

  const renderItem = useCallback(
    ({ item, index }: { item: ReelsItem; index: number }) => {
      const distance = Math.abs(index - vm.activeIndex);
      const shouldMount = distance <= preloadRadius;
      // A reel only counts as "active" when this screen has focus —
      // when the user switches tabs, every reel becomes inactive (paused).
      const isActive = isFocused && !vm.isCommentsOpen && index === vm.activeIndex;

      return (
        <ReelItem
          item={item}
          height={itemHeight}
          isActive={isActive}
          shouldMount={shouldMount}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
          onReaction={vm.toggleReaction}
          onSave={vm.toggleSave}
          onOpenComments={vm.openComments}
          onUnavailable={vm.markUnavailable}
          onFollow={vm.followPublisher}
          scrollY={scrollY}
          index={index}
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
      itemHeight,
      isMuted,
      isFocused,
      handleToggleMute,
      scrollY,
      preloadRadius,
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

  const goBackToFeed = useCallback(() => {
    // Prefer goBack when this screen sits on top of a stack — it POPS
    // the screen entirely, so the next visit re-mounts with fresh state
    // and we never have to worry about leftover transforms. Falls back
    // to navigate(FEED) for tab-based navigators where there's nothing
    // to pop.
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate(ROUTES.FEED);
    }
  }, [navigation]);

  const swipeBackGesture = useMemo(
    () =>
      Gesture.Pan()
        .hitSlop({ left: 0, width: 70 })
        .activeOffsetX([15, 999])
        .failOffsetY([-15, 15])
        .enabled(!vm.isCommentsOpen)
        .onUpdate(event => {
          'worklet';
          // Clamp to ≥ 0 so leftward overshoot doesn't push the screen
          // off the wrong side.
          dragX.value = Math.max(0, event.translationX);
        })
        .onEnd(event => {
          'worklet';
          // Either far enough OR fast enough → dismiss.
          const shouldDismiss =
            event.translationX > SCREEN_WIDTH * 0.32 ||
            event.velocityX > 700;

          if (shouldDismiss) {
            // Animate out, then hop to the feed on JS thread.
            dragX.value = withTiming(
              SCREEN_WIDTH,
              { duration: 180 },
              finished => {
                if (finished) runOnJS(goBackToFeed)();
              },
            );
          } else {
            // Spring back to origin.
            dragX.value = withSpring(0, { damping: 18, stiffness: 220 });
          }
        }),
    [dragX, goBackToFeed, vm.isCommentsOpen],
  );

  const screenAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(entryProgress.value, [0, 1], [0.5, 1]);
    const scale = interpolate(entryProgress.value, [0, 1], [0.92, 1]);
    const translateY = interpolate(entryProgress.value, [0, 1], [250, 0]);

    return {
      opacity,
      transform: [
        { translateX: dragX.value },
        { translateY },
        { scale },
      ],
    };
  });

  // ── Render branches ──────────────────────────────────────────────────

  if (vm.isInitialLoading) {
    return (
      <View style={styles.fullCenter}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.helperText}>{copy.loading}</Text>
      </View>
    );
  }

  if (vm.error && vm.items.length === 0) {
    return (
      <View style={styles.fullCenter}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
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
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
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
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        <AnimatedFlatList
          ref={flatListRef as any}
          data={vm.items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
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

        {/* Floating back button. Lives outside the list so it stays put while
            the user swipes through reels. */}
        <TouchableOpacity
          onPress={goBackToFeed}
          style={[styles.backFab, { top: Math.max(insets.top, 12) }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={26} color="#fff" />
        </TouchableOpacity>

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
          onLoadReplies={vm.loadReplies}
          onCollapseReplies={vm.collapseReplies}
          onStartReply={vm.startReplyTo}
          onCancelReply={vm.cancelReply}
          onRetryFailedComment={vm.retryFailedComment}
          onDeleteFailedComment={vm.deleteFailedComment}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  list: { flex: 1, backgroundColor: '#000' },
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
  backFab: {
    position: 'absolute',
    left: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
