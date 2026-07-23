// Description: Shows the current user's uploaded video posts — premium redesign
// with video-poster thumbnails, gradient overlays, and modern card aesthetics.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { APP_COLORS } from '../../../shared-kernel/presentation/theme/appColors';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ImageErrorEventData,
  type ListRenderItemInfo,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Clock,
  Film,
  Heart,
  MessageCircle,
  Play,
  RotateCw,
  Search,
  Video as VideoIcon,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigateToReels } from '../../../navigation/reelsNavigation';
import type { FeedVideoPost } from '../../../feed/domain/types/feed.types';
import { useMyVideosViewModel } from '../../application/view-models/useMyVideosViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LIST_PADDING = 16;
const CARD_GAP = 10;
const CARD_WIDTH = Math.floor((SCREEN_WIDTH - LIST_PADDING * 2 - CARD_GAP) / 2);
const THUMB_HEIGHT = Math.round(CARD_WIDTH * 1.35);

/* ─── Colors ──────────────────────────────────────────────────── */
const COLORS = {
  headerBg: APP_COLORS.brand.primary,
  headerBgLight: APP_COLORS.brand.pressed,
  accent: APP_COLORS.brand.primary,
  accentLight: APP_COLORS.brand.onPrimaryMuted,
  accentBg: APP_COLORS.brand.soft,
  cardBg: APP_COLORS.neutral.surface,
  screenBg: APP_COLORS.neutral.muted,
  textPrimary: APP_COLORS.neutral.text,
  textSecondary: APP_COLORS.neutral.textMuted,
  textMuted: APP_COLORS.neutral.iconMuted,
  heartPink: '#FF6B8A',
  white: '#FFFFFF',
  gradientDark1: '#1a1a2e',
  gradientDark2: '#16213e',
  gradientDark3: '#0f3460',
};

/* ─── Helpers ─────────────────────────────────────────────────── */

function formatCount(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function formatPostedAt(timestamp?: number) {
  if (!timestamp) return 'Vừa xong';
  const postedMs = timestamp > 1000000000000 ? timestamp : timestamp * 1000;
  const diffSeconds = Math.max(0, Math.floor((Date.now() - postedMs) / 1000));
  if (diffSeconds < 60) return 'Vừa xong';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} phút trước`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} giờ trước`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)} ngày trước`;
  return new Date(postedMs).toLocaleDateString('vi-VN');
}

/* ─── Video Thumbnail with Poster Frame ────────────────────── */
// Try to use thumbnailUrl first; if unavailable, attempt to load
// the video URL itself as an image (some CDNs serve poster frames).
// Falls back to a cinematic dark-gradient placeholder instead of black.

const VideoThumbnail = React.memo(function VideoThumbnail({
  thumbnailUrl,
  videoUrl,
}: {
  thumbnailUrl?: string;
  videoUrl: string;
}) {
  const [source, setSource] = useState<string | null>(thumbnailUrl || videoUrl || null);
  const [failed, setFailed] = useState(false);

  const handleError = useCallback(
    (_: NativeSyntheticEvent<ImageErrorEventData>) => {
      if (source === thumbnailUrl && videoUrl && videoUrl !== thumbnailUrl) {
        setSource(videoUrl);
      } else {
        setFailed(true);
      }
    },
    [source, thumbnailUrl, videoUrl],
  );

  if (failed || !source) {
    // Cinematic gradient fallback — NOT a boring black box
    return (
      <View style={styles.thumbnailFull}>
        <View style={styles.fallbackGradient}>
          <View style={styles.fallbackGradientLayer1} />
          <View style={styles.fallbackGradientLayer2} />
          <View style={styles.fallbackIconWrap}>
            <Film size={30} color="rgba(255,255,255,0.3)" strokeWidth={1.6} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: source }}
      style={styles.thumbnailFull}
      resizeMode="cover"
      onError={handleError}
    />
  );
});

/* ─── Skeleton Loader (animated pulse) ─────────────────────── */

function PulseSkeleton() {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View style={styles.skeletonGrid}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Animated.View key={i} style={[styles.skeletonCard, { opacity }]}>
          <View style={styles.skeletonThumb} />
          <View style={styles.skeletonBottom}>
            <View style={styles.skeletonLineWide} />
            <View style={styles.skeletonLineShort} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
}

/* ─── Main Screen ──────────────────────────────────────────── */

function MyVideosScreen() {
  const navigation = useNavigation<any>();
  const vm = useMyVideosViewModel();

  const handleOpenVideo = useCallback(
    (post: FeedVideoPost) => {
      navigateToReels(navigation, {
        initialVideoId: post.id,
        post,
        source: 'myVideos',
      });
    },
    [navigation],
  );

  /* ─── Video Card ─────────────────────────────────────────── */
  const renderVideo = useCallback(
    ({ item }: ListRenderItemInfo<FeedVideoPost>) => (
      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.videoCard}
        onPress={() => handleOpenVideo(item)}
      >
        <View style={styles.thumbnailWrap}>
          {/* Poster thumbnail — NOT a black box */}
          <VideoThumbnail
            thumbnailUrl={item.thumbnailUrl}
            videoUrl={item.videoUrl}
          />

          {/* Bottom gradient fade */}
          <View style={styles.bottomFade} />

          {/* Play button — frosted glass circle */}
          <View style={styles.playBadge}>
            <View style={styles.playBadgeInner}>
              <Play size={15} color={COLORS.white} fill={COLORS.white} strokeWidth={0} />
            </View>
          </View>

          {/* Bottom stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Heart size={11} color={COLORS.heartPink} fill={COLORS.heartPink} strokeWidth={0} />
              <Text style={styles.statText}>{formatCount(item.likeCount)}</Text>
            </View>
            <View style={styles.statItem}>
              <MessageCircle size={11} color={COLORS.white} strokeWidth={2} />
              <Text style={styles.statText}>{formatCount(item.commentCount)}</Text>
            </View>
          </View>
        </View>

        {/* Caption area */}
        <View style={styles.captionArea}>
          <Text style={styles.caption} numberOfLines={2}>
            {item.caption || 'Video bài đăng'}
          </Text>
          <View style={styles.metaRow}>
            <Clock size={10} color={COLORS.textMuted} strokeWidth={2.2} />
            <Text style={styles.metaText}>{formatPostedAt(item.postedAt)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [handleOpenVideo],
  );

  const showEmpty = !vm.isLoading && vm.videos.length === 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FocusAwareStatusBar barStyle="light-content" backgroundColor={COLORS.headerBg} />

      {/* ─── Header ──────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.headerBtn}
            activeOpacity={0.7}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color={COLORS.white} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Video của tôi</Text>
            {vm.videos.length > 0 && (
              <Text style={styles.headerSubtitle}>
                {vm.videos.length} video
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.headerBtn}
          activeOpacity={0.7}
          onPress={() => navigation.navigate(ROUTES.SEARCH)}
        >
          <Search size={20} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* ─── Content ────────────────────────────────────────── */}
      <FlatList
        data={vm.videos}
        keyExtractor={item => item.id}
        renderItem={renderVideo}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[
          styles.listContent,
          showEmpty && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={vm.isRefreshing}
            onRefresh={vm.refresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
            progressBackgroundColor={COLORS.screenBg}
          />
        }
        ListHeaderComponent={
          vm.videos.length > 0 ? (
            <View style={styles.summaryCard}>
              <View style={styles.summaryIconWrap}>
                <Film size={18} color={COLORS.accent} strokeWidth={2} />
              </View>
              <View style={styles.summaryTextWrap}>
                <Text style={styles.summaryTitle}>
                  {vm.videos.length} video bài đăng
                </Text>
                <Text style={styles.summarySubtitle}>
                  Chỉ hiển thị những video do bạn đã đăng.
                </Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          vm.isLoading ? (
            <PulseSkeleton />
          ) : (
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIconCircle}>
                {vm.error ? (
                  <RotateCw size={52} color={COLORS.accent} strokeWidth={1.5} />
                ) : (
                  <VideoIcon size={56} color={COLORS.accent} strokeWidth={1.5} />
                )}
              </View>

              <Text style={styles.emptyTitle}>
                {vm.error ? 'Không tải được video' : 'Chưa có video !!'}
              </Text>
              <Text style={styles.emptyText}>
                {vm.error ??
                  'Những video bạn đăng sẽ xuất hiện ở đây để xem lại nhanh.'}
              </Text>

              <TouchableOpacity
                style={styles.retryButton}
                activeOpacity={0.85}
                onPress={vm.retry}
              >
                {vm.isLoading ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <RotateCw size={17} color={COLORS.white} />
                )}
                <Text style={styles.retryText}>Thử lại</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

/* ─── Styles ───────────────────────────────────────────────── */

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.screenBg,
  },

  /* Header */
  header: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    backgroundColor: COLORS.headerBg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 1,
  },

  /* List */
  listContent: {
    paddingHorizontal: LIST_PADDING,
    paddingTop: 16,
    paddingBottom: 32,
  },
  emptyListContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  column: {
    justifyContent: 'space-between',
  },

  /* Summary Card */
  summaryCard: {
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: APP_COLORS.brand.soft,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.brand.border,
  },
  summaryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  summarySubtitle: {
    marginTop: 3,
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },

  /* Video Card */
  videoCard: {
    width: CARD_WIDTH,
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: COLORS.cardBg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: APP_COLORS.brand.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  thumbnailWrap: {
    width: CARD_WIDTH,
    height: THUMB_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailFull: {
    width: '100%',
    height: '100%',
  },

  /* Fallback gradient layers (simulating LinearGradient without dependency) */
  fallbackGradient: {
    flex: 1,
    position: 'relative',
  },
  fallbackGradientLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.gradientDark2,
  },
  fallbackGradientLayer2: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: COLORS.gradientDark3,
    opacity: 0.6,
  },
  fallbackIconWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  /* Bottom gradient fade on thumbnail */
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '55%',
    backgroundColor: 'transparent',
    // We simulate a gradient with multiple sub-layers via borderTop
    borderTopWidth: 0,
    // Actually use an overlay approach:
    // Use a semi-transparent black
  },
  // We'll layer two View overlays for the gradient effect

  playBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -21,
    marginLeft: -21,
  },
  playBadgeInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statsRow: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  statText: {
    color: COLORS.white,
    fontSize: 11.5,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  /* Caption Area */
  captionArea: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  caption: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  metaRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },

  /* Empty State */
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingBottom: 48,
  },
  emptyIconCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.brand.soft,
    borderWidth: 1,
    borderColor: APP_COLORS.brand.border,
  },
  emptyTitle: {
    marginTop: 24,
    color: COLORS.textPrimary,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  emptyText: {
    marginTop: 10,
    maxWidth: 300,
    color: COLORS.textSecondary,
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
  },
  retryButton: {
    marginTop: 28,
    minHeight: 50,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 28,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },

  /* Skeleton */
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  skeletonCard: {
    width: CARD_WIDTH,
    marginBottom: 14,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: COLORS.cardBg,
  },
  skeletonThumb: {
    width: CARD_WIDTH,
    height: THUMB_HEIGHT,
    backgroundColor: '#E2E8F0',
  },
  skeletonBottom: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  skeletonLineWide: {
    width: '80%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  skeletonLineShort: {
    marginTop: 7,
    width: '55%',
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F1F5F9',
  },
});

export default MyVideosScreen;
