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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { ChevronLeft, RotateCcw } from 'lucide-react-native';
import { useReelsViewModel } from '../../application/view-models/useReelsViewModel';
import type { ReelsItem } from '../../domain/types/reels.types';
import { ROUTES } from '../../../navigation/constants/routes';
import { ReelItem } from '../components/ReelItem';
import { ReelCommentsSheet } from '../components/ReelCommentsSheet';

const VIEWABILITY_CONFIG = {
  itemVisiblePercentThreshold: 80,
  minimumViewTime: 80, // ms — avoids flicker during fast swipes
};

const PRELOAD_RADIUS = 1; // mount video for current ± this many neighbors

export default function ReelsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const vm = useReelsViewModel();

  // Use the full screen height — the feed is meant to be edge-to-edge.
  const [viewportHeight, setViewportHeight] = useState(
    () => Dimensions.get('window').height,
  );
  const itemHeight = viewportHeight;

  const [isMuted, setIsMuted] = useState(true); // start muted (TikTok-style)
  const [isFocused, setIsFocused] = useState(true);

  // Pause everything when the user navigates away from the tab — by toggling
  // a focus flag rather than resetting activeIndex. This way the user's
  // scroll position is preserved across tab switches.
  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      return () => setIsFocused(false);
    }, []),
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
      const shouldMount = distance <= PRELOAD_RADIUS;
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
          onLike={vm.toggleLike}
          onSave={vm.toggleSave}
          onOpenComments={vm.openComments}
        />
      );
    },
    [
      vm.activeIndex,
      vm.isCommentsOpen,
      vm.toggleLike,
      vm.toggleSave,
      vm.openComments,
      itemHeight,
      isMuted,
      isFocused,
      handleToggleMute,
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

  // ── Render branches ──────────────────────────────────────────────────

  if (vm.isInitialLoading) {
    return (
      <View style={styles.fullCenter}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <ActivityIndicator color="#fff" size="large" />
        <Text style={styles.helperText}>Đang tải reels...</Text>
      </View>
    );
  }

  if (vm.error && vm.items.length === 0) {
    return (
      <View style={styles.fullCenter}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <Text style={styles.errorTitle}>Không tải được reels</Text>
        <Text style={styles.errorMsg}>{vm.error}</Text>
        <TouchableOpacity onPress={vm.retry} style={styles.retryButton}>
          <RotateCcw size={16} color="#fff" />
          <Text style={styles.retryLabel}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (vm.items.length === 0) {
    return (
      <View style={styles.fullCenter}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <Text style={styles.emptyTitle}>Chưa có reel nào</Text>
        <Text style={styles.emptyMsg}>
          Hãy là người đầu tiên đăng một video Reel!
        </Text>
        <TouchableOpacity
          onPress={() => navigation.navigate(ROUTES.CREATE_REEL)}
          style={styles.retryButton}
        >
          <Text style={styles.retryLabel}>Đăng Reel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={handleContainerLayout}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <FlatList
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
        onPress={() => navigation.navigate(ROUTES.FEED)}
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
        onClose={vm.closeComments}
        onEndReached={vm.loadMoreComments}
        onRetry={handleRetryComments}
        onSubmit={vm.submitComment}
      />
    </View>
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
