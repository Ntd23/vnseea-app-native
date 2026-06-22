// Description: Full-screen Facebook-style photo viewer shared across
// Feed, Profile and Page Detail. Tap a photo in a post → this modal
// opens with swipeable pages, reaction / comment / share actions, and
// a publisher header. Originally lived inside FeedScreen.tsx; moved
// here so the three screens stay in sync and Page Detail can open it
// the same way Feed/Profile do.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  Text,
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
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { ReactionPickerOverlay } from '../../../feed/presentation/components/PostCards';

import { useAppLanguage } from '../../application/hooks/useAppLanguage';
import { createProfileRepository } from '../../../profile/infrastructure/repositories/ApiProfileRepository';
import { sessionStorage } from '../../infrastructure/storage/sessionStorage';
import FocusAwareStatusBar from './FocusAwareStatusBar';

export type PhotoViewerState = {
  post: FeedTextPost;
  initialIndex: number;
} | null;

const PHOTO_VIEWER_IMAGE_HEIGHT_RATIO = 0.62;

// Local copy of the reaction emoji → image map. Kept inline here
// (instead of importing from FeedScreen) so this component has zero
// coupling to any specific screen.
const REACTION_IMAGES: Record<ReactionType, any> = {
  like: require('../../../assets/reactions/reactions_like.png'),
  love: require('../../../assets/reactions/reactions_love.png'),
  haha: require('../../../assets/reactions/reactions_haha.png'),
  wow: require('../../../assets/reactions/reactions_wow.png'),
  sad: require('../../../assets/reactions/reactions_sad.png'),
  angry: require('../../../assets/reactions/reactions_angry.png'),
};

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

const PhotoViewerImage = React.memo(function PhotoViewerImage({
  url,
  width,
  height,
}: {
  url: string;
  width: number;
  height: number;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setShowSpinner(false);

    // Only show spinner if the image takes longer than 150ms to load
    const timer = setTimeout(() => {
      setShowSpinner(true);
    }, 150);

    return () => clearTimeout(timer);
  }, [url]);

  return (
    <View
      style={{
        width,
        height,
        justifyContent: 'center',
        alignItems: 'center',
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
        <Image
          source={{ uri: url }}
          style={{ width: '100%', height: '100%' }}
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
  );
});

export function PhotoViewerModal({
  state,
  copy = FEED_COPY.vi,
  onClose,
  onReact,
  onCommentTap,
  posts,
}: {
  state: PhotoViewerState;
  copy?: FeedCopy;
  onClose: () => void;
  onReact: (postId: string, reaction: ReactionType) => void;
  onCommentTap: (postId: string) => void;
  posts: FeedPost[];
}) {
  const language = useAppLanguage();
  const insets = useSafeAreaInsets();
  const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [topBarHeight, setTopBarHeight] = useState(0);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const [pickerAnchor, setPickerAnchor] = useState<{
    postId: string;
    x: number;
    y: number;
  } | null>(null);
  const [isFollowedLocally, setIsFollowedLocally] = useState<
    boolean | undefined
  >(undefined);

  const localGestureX = useSharedValue(0);
  const localGestureY = useSharedValue(0);
  const localGestureActive = useSharedValue(false);
  const localHasDragged = useSharedValue(false);

  const translateY = useSharedValue(0);
  const openProgress = useSharedValue(0);
  const openScale = useSharedValue(0.92);
  const contentOpacity = useSharedValue(0);

  // Sync page on mount + animate open with snappy fade + scale
  useEffect(() => {
    if (state) {
      setCurrentIndex(state.initialIndex);
      translateY.value = 0;
      openProgress.value = 0;
      openScale.value = 0.92;
      contentOpacity.value = 0;
      // Open animation: snappy fade-in + scale-up (parallel, native driver)
      openProgress.value = withTiming(1, {
        duration: 160,
        easing: Easing.out(Easing.cubic),
      });
      openScale.value = withSpring(1, {
        stiffness: 140,
        damping: 12,
      });
      contentOpacity.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [state, translateY, openProgress, openScale, contentOpacity]);

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
      setIsFollowedLocally(livePost.publisher.isFollowing);
    }
  }, [livePost?.publisher.isFollowing, livePost?.id]);

  const handleLocalPickReaction = useCallback(
    (reaction: ReactionType) => {
      if (!livePost) return;
      onReact(livePost.id, reaction);
      setPickerAnchor(null);
    },
    [livePost, onReact],
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

  const handleFollowPress = useCallback(async () => {
    if (!livePost || isFollowedLocally) return;
    setIsFollowedLocally(true);
    try {
      const profileRepo = createProfileRepository();
      await profileRepo.toggleFollow(livePost.publisher.id);
    } catch {
      setIsFollowedLocally(false);
    }
  }, [livePost, isFollowedLocally]);

  const handleClose = useCallback(() => {
    // Animate close first, then call onClose when animation finishes
    animateClose();
  }, [animateClose]);

  const handleCommentPress = useCallback(() => {
    if (!livePost) return;
    const postId = livePost.id;
    setPickerAnchor(null);
    // Open the comment sheet on top of the viewer so the user stays
    // in the modal flow instead of losing context.
    onCommentTap(postId);
  }, [livePost, onCommentTap]);

  const handleTopBarLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    setTopBarHeight(previousHeight =>
      Math.abs(previousHeight - nextHeight) < 0.5 ? previousHeight : nextHeight,
    );
  }, []);

  const handleBottomPanelLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = event.nativeEvent.layout.height;
    setBottomPanelHeight(previousHeight =>
      Math.abs(previousHeight - nextHeight) < 0.5 ? previousHeight : nextHeight,
    );
  }, []);

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-15, 15])
    .onUpdate(event => {
      'worklet';
      translateY.value = event.translationY;
    })
    .onEnd(event => {
      'worklet';
      // Dismiss on big vertical drag or high velocity; otherwise snap back.
      const absTranslationY = Math.abs(event.translationY);
      const absVelocityY = Math.abs(event.velocityY);
      const shouldDismiss =
        absTranslationY > 120 ||
        absVelocityY > 500 ||
        (absTranslationY > 60 && absVelocityY > 300);

      if (shouldDismiss) {
        const targetY = event.translationY > 0 ? SCREEN_H : -SCREEN_H;
        translateY.value = withTiming(targetY, { duration: 150 });
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
        translateY.value = withSpring(0, { damping: 15, stiffness: 200 });
      }
    });

  const containerStyle = useAnimatedStyle(() => {
    const dragProgress = interpolate(
      Math.abs(translateY.value),
      [0, SCREEN_H * 0.5],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const dragOpacity = Math.max(0, Math.min(1, dragProgress));
    const finalOpacity = Math.min(openProgress.value, dragOpacity);
    return {
      flex: 1,
      backgroundColor: `rgba(0, 0, 0, ${finalOpacity})`,
    };
  });

  const contentStyle = useAnimatedStyle(() => {
    const dragScale = interpolate(
      Math.abs(translateY.value),
      [0, SCREEN_H * 0.5],
      [1, 0.8],
      Extrapolation.CLAMP,
    );
    const finalScale = openScale.value * dragScale;
    return {
      flex: 1,
      transform: [
        { translateY: translateY.value },
        { scale: finalScale },
      ],
      opacity: contentOpacity.value,
    };
  });

  if (!state || !livePost) return null;
  const { post } = state;
  const total = post.photos.length;
  const hasMeasuredViewerChrome = topBarHeight > 0 && bottomPanelHeight > 0;
  const fallbackPhotoViewportHeight =
    SCREEN_H * PHOTO_VIEWER_IMAGE_HEIGHT_RATIO;
  const photoViewportTop = hasMeasuredViewerChrome
    ? topBarHeight
    : (SCREEN_H - fallbackPhotoViewportHeight) / 2;
  const photoViewportHeight = hasMeasuredViewerChrome
    ? Math.max(1, SCREEN_H - topBarHeight - bottomPanelHeight)
    : fallbackPhotoViewportHeight;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <FocusAwareStatusBar barStyle="light-content" backgroundColor="#000" translucent />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={containerStyle}>
            <Animated.View style={[contentStyle, { flex: 1 }]}>
              {/* Top bar: progress segments + page counter + close */}
              <View
                onLayout={handleTopBarLayout}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  zIndex: 30,
                  paddingTop: Math.max(insets.top, 16) + 6,
                  paddingHorizontal: 16,
                }}
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
                  <Text
                    style={{
                      color: '#ffffff',
                      fontSize: 16,
                      fontWeight: '700',
                    }}
                  >
                    {total > 1 ? `${currentIndex + 1} / ${total}` : '1 / 1'}
                  </Text>

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
              </View>

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
                  data={post.photos}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
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
                  }}
                  keyExtractor={(url, i) => `viewer-${i}-${url}`}
                  renderItem={({ item: url }) => (
                    <PhotoViewerImage
                      url={url}
                      width={SCREEN_W}
                      height={photoViewportHeight}
                    />
                  )}
                />
              </View>

              {/* Bottom overlay: caption, publisher, action capsules */}
              <View
                onLayout={handleBottomPanelLayout}
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  backgroundColor: '#1E1B1B',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  paddingHorizontal: 16,
                  paddingTop: 10,
                  paddingBottom: Math.max(insets.bottom, 16) + 12,
                }}
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
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      flex: 1,
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
                    <View style={{ flex: 1 }}>
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
                  </View>

                  {/* Follow button only shown when not own post and not followed yet */}
                  {(() => {
                    const currentUserId = sessionStorage.getSession()?.userId;
                    const showFollowButton =
                      livePost.publisher.id !== currentUserId &&
                      !isFollowedLocally;
                    if (!showFollowButton) return null;
                    return (
                      <GHTouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleFollowPress}
                        style={{
                          borderWidth: 1,
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                          borderRadius: 20,
                          paddingHorizontal: 16,
                          paddingVertical: 6,
                        }}
                      >
                        <Text
                          style={{
                            color: '#ffffff',
                            fontSize: 13,
                            fontWeight: '600',
                          }}
                        >
                          {language === 'vi' ? 'Theo dõi' : 'Follow'}
                        </Text>
                      </GHTouchableOpacity>
                    );
                  })()}
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
                      onPress={() => onReact(livePost.id, 'like')}
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
                      {livePost.myReaction ? (
                        <Image
                          source={REACTION_IMAGES[livePost.myReaction]}
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
                        {livePost.likeCount}
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
                    onPress={() => onReact(livePost.id, 'like')}
                    onLongPress={() => handleLikeLongPress(true)}
                    delayLongPress={400}
                    activeOpacity={0.75}
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 21,
                      backgroundColor: livePost.myReaction
                        ? 'rgba(255, 255, 255, 0.12)'
                        : '#0866FF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {livePost.myReaction ? (
                      <Image
                        source={REACTION_IMAGES[livePost.myReaction]}
                        style={{ width: 24, height: 24 }}
                        resizeMode="contain"
                      />
                    ) : (
                      <ThumbsUp size={18} color="#ffffff" fill="#ffffff" />
                    )}
                  </GHTouchableOpacity>
                </View>
              </View>

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
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

