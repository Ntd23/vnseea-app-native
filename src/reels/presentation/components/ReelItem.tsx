// Description: Renders ONE reel in the TikTok-style vertical feed.
//
// Memory & performance contract (this is the heart of the feed):
//   • The VideoPlayer is mounted only when `shouldMount` is true.
//     The parent passes shouldMount=true for the active index AND ±1 so
//     scrolling feels instant (the next/prev video is already buffered),
//     yet the device never holds more than 3 decoders in RAM at once.
//   • The VideoPlayer is paused (and muted) whenever `isActive` is false.
//     This lets us keep neighbors preloaded without burning battery or
//     emitting audio from off-screen items.
//   • A poster image (thumbnailUrl) stands in for the player whenever the
//     player isn't mounted yet, so the user never sees a black square.
//
// Layout (TikTok-style):
//   ┌──────────────────────────────────┐
//   │  [mute]                    top   │
//   │                                  │
//   │         video / thumbnail        │
//   │                                  │
//   │                        [avatar]  │
//   │                          [like]  │
//   │                       [comment]  │
//   │                          [save]  │
//   │                         [share]  │
//   │  @username ✓                     │
//   │  Caption text…                   │
//   └──────────────────────────────────┘

import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated as RNAnimated,
  Dimensions,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import VideoPlayer from 'react-native-video';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bookmark,
  Heart,
  MessageCircle,
  Play,
  Volume2,
  VolumeX,
  Forward,
} from 'lucide-react-native';
import type { ReactionType, ReelsItem } from '../../domain/types/reels.types';
import { ALL_REACTION_TYPES } from '../../domain/types/reels.types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';

const REEL_ITEM_COPY = {
  vi: {
    save: 'Lưu',
    share: 'Chia sẻ',
    originalSound: 'Âm thanh gốc',
  },
  en: {
    save: 'Save',
    share: 'Share',
    originalSound: 'Original sound',
  },
};

const AVATAR_FALLBACK = 'https://v2.vnseea.vn/upload/photos/d-avatar.jpg';

// Screen width used by the SVG gradient — computed once at module level.
// Rotation is not a concern for a portrait-locked reels feed.
const SCREEN_W = Dimensions.get('window').width;

// Maps a backend reaction type to the emoji we render in the picker and
// (when applicable) inside the heart button itself.
const REACTION_EMOJI: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
};

// Time window within which two taps count as a double-tap. 320ms is
// slightly more forgiving than Apple's 280ms — testing on Android showed
// the second tap sometimes arrived at ~300ms when the user wasn't trying
// to be especially fast.
const DOUBLE_TAP_MS = 320;

interface Props {
  item: ReelsItem;
  /** Pixel height of the visible viewport — drives fullscreen layout. */
  height: number;
  /** True when this is the currently-visible reel (plays + unmutes). */
  isActive: boolean;
  /** True when this is the active selected item in the vertical feed. */
  isCurrent: boolean;
  /** True when this reel is within the preload window (current ±1). */
  shouldMount: boolean;
  /** Global mute state shared across the feed. */
  isMuted: boolean;
  onToggleMute: () => void;
  /**
   * Toggle a rich reaction on this reel.
   *   • Single-tap on the heart button → onReaction(id, 'love')
   *   • Long-press on the heart button → opens picker, onReaction(id, picked)
   *   • Double-tap anywhere on the surface → onReaction(id, 'love')
   *
   * The view-model handles the "same reaction tapped twice = clear" logic,
   * so this component always passes a concrete ReactionType and lets the
   * parent decide whether to add, swap, or clear.
   */
  onReaction: (postId: string, reaction: ReactionType, forceSet?: boolean) => void;
  onSave: (postId: string) => void;
  onOpenComments?: (postId: string) => void;
  onShare?: (item: ReelsItem) => void;
  onOpenProfile?: (userId: string) => void;
  onFollow?: (userId: string) => void;
  /**
   * Fired the first time the underlying VideoPlayer reports an error
   * (404, decode failure, broken CDN url, …). The screen-level handler
   * should treat this as "this reel is permanently bad — remove it from
   * the feed and don't return it on future page loads".
   */
  onUnavailable?: (postId: string) => void;
  scrollY?: SharedValue<number>;
  index?: number;
  initialSeekTime?: number;
  autoScrollEnabled: boolean;
  onVideoEnd?: (index: number) => void;
}

function formatCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const formatTime = (seconds: number) => {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

function ReelItemBase({
  item,
  height,
  isActive,
  isCurrent,
  shouldMount,
  isMuted,
  onToggleMute,
  onReaction,
  onSave,
  onOpenComments,
  onShare,
  onOpenProfile,
  onUnavailable,
  onFollow,
  initialSeekTime,
  autoScrollEnabled,
  onVideoEnd,
  index = 0,
}: Props) {
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const copy = REEL_ITEM_COPY[language];
  const currentUserId = sessionStorage.getSession()?.userId;
  const isOwnVideo = currentUserId && String(item.publisher.userId) === String(currentUserId);
  const showFollowBadge = !isOwnVideo && !item.publisher.isFollowing;
  const [userPaused, setUserPaused] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [seekTime, setSeekTime] = useState<number | undefined>(undefined);
  const videoRef = useRef<React.ElementRef<typeof VideoPlayer>>(null);

  // Video progress & scrubbing states
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekProgress, setSeekProgress] = useState(0);

  const handleTouchStart = useCallback((event: any) => {
    if (duration <= 0) return;
    const touchX = event.nativeEvent.pageX;
    const progress = Math.min(1, Math.max(0, touchX / SCREEN_W));
    setIsSeeking(true);
    setSeekProgress(progress);
    if (videoRef.current) {
      videoRef.current.seek(progress * duration);
    }
  }, [duration]);

  const handleTouchMove = useCallback((event: any) => {
    if (duration <= 0 || !isSeeking) return;
    const touchX = event.nativeEvent.pageX;
    const progress = Math.min(1, Math.max(0, touchX / SCREEN_W));
    setSeekProgress(progress);
    if (videoRef.current) {
      videoRef.current.seek(progress * duration);
    }
  }, [duration, isSeeking]);

  const handleTouchEnd = useCallback(() => {
    if (duration <= 0) return;
    setIsSeeking(false);
    if (videoRef.current) {
      const targetTime = seekProgress * duration;
      videoRef.current.seek(targetTime);
      setCurrentTime(targetTime);
    }
  }, [duration, seekProgress]);

  useEffect(() => {
    if (initialSeekTime !== undefined && initialSeekTime > 0) {
      setSeekTime(initialSeekTime);
    }
  }, [initialSeekTime]);

  useEffect(() => {
    if (isActive && isReady && seekTime !== undefined && videoRef.current) {
      console.log(`[ReelItem] Seeking active video to ${seekTime}s`);
      videoRef.current.seek(seekTime);
      setSeekTime(undefined);
    }
  }, [isActive, isReady, seekTime]);

  const prevIsCurrentRef = useRef(false);

  useEffect(() => {
    if (isCurrent && !prevIsCurrentRef.current) {
      const hasInitialSeek = initialSeekTime !== undefined && initialSeekTime > 0;
      if (seekTime === undefined && !hasInitialSeek) {
        if (isReady && videoRef.current) {
          videoRef.current.seek(0);
        } else {
          setSeekTime(0);
        }
      }
    }
    prevIsCurrentRef.current = isCurrent;
  }, [isCurrent, isReady, initialSeekTime]);

  useEffect(() => {
    if (isActive) {
      setUserPaused(false);
    }
  }, [isActive]);

  // Removed scale/opacity/translateY parallax — it was causing items to
  // appear misaligned ("lệch") during and after scrolling.
  const animatedStyle = useAnimatedStyle(() => {
    return {};
  });

  // The video plays iff: active + not manually paused + no decode error.
  const playing = isActive && !userPaused && !hasError;

  // Only the user-paused state shows the big center play overlay. Errors
  // do NOT — instead the parent is notified via `onUnavailable` and the
  // reel is removed from the feed (see effect below). Showing an error
  // overlay would be visual noise the user would only see for ~120ms.
  const showPauseOverlay = isActive && userPaused;

  // ── Tap-surface gesture ──────────────────────────────────────────────
  //
  // Why not react-native-gesture-handler?
  //   Tried Gesture.Exclusive(doubleTap, singleTap) — works in isolation
  //   but inside a FlatList the native ScrollView consistently steals the
  //   second tap, so double-tap detection silently failed. We get more
  //   reliable behaviour using plain RN's TouchableWithoutFeedback + a
  //   manual timer to disambiguate single vs double.
  //
  // Algorithm (TikTok-style):
  //   • First tap arrives → schedule the single-tap action after DOUBLE_TAP_MS.
  //   • If a second tap arrives WITHIN DOUBLE_TAP_MS → cancel the pending
  //     timer and fire the double-tap action (heart) instead.
  //   • If no second tap arrives → timer fires the single-tap (pause).
  //
  //   This gives:
  //     - Double-tap → only heart, no pause flash (timer was cancelled)
  //     - Single-tap → only pause, after a ~320 ms wait (acceptable, matches
  //       what TikTok itself does)
  //
  // Refs we keep across renders:
  //   - lastTapAtRef         → timestamp of the most recent tap
  //   - singleTapTimerRef    → handle for the pending single-tap timer
  //   - onReactionRef/itemIdRef → so the callback sees freshest values
  //     even when the memo skips re-renders.

  const lastTapAtRef = useRef(0);
  const singleTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onReactionRef = useRef(onReaction);
  onReactionRef.current = onReaction;
  const itemIdRef = useRef(item.id);
  itemIdRef.current = item.id;

  const [floatingHearts, setFloatingHearts] = useState<Array<{ id: number; x: number; y: number; rotate: string; anim: RNAnimated.Value }>>([]);
  const heartCounter = useRef(0);

  const triggerHeartBurst = useCallback((x: number, y: number) => {
    const id = heartCounter.current++;
    const anim = new RNAnimated.Value(0);
    const randomRotate = `${Math.floor(Math.random() * 40) - 20}deg`;
    
    setFloatingHearts(prev => [...prev, { id, x, y, rotate: randomRotate, anim }]);

    RNAnimated.sequence([
      RNAnimated.timing(anim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.back(2.2)),
        useNativeDriver: true,
      }),
      RNAnimated.delay(380),
      RNAnimated.timing(anim, {
        toValue: 2,
        duration: 420,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start((result) => {
      if (result.finished) {
        setFloatingHearts(prev => prev.filter(h => h.id !== id));
      }
    });
  }, []);

  const handleSurfaceTap = useCallback((event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    const now = Date.now();
    const sinceLast = now - lastTapAtRef.current;
    lastTapAtRef.current = now;

    // Second tap within the double-tap window → cancel the pending
    // single-tap timer (so pause never fires) and trigger the heart.
    if (sinceLast < DOUBLE_TAP_MS && singleTapTimerRef.current !== null) {
      clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
      lastTapAtRef.current = 0;
      triggerHeartBurst(locationX, locationY);
      onReactionRef.current(itemIdRef.current, 'love', true);
      return;
    }

    // First tap — schedule the single-tap (pause) for after the window
    // expires. If a second tap arrives in time, the branch above cancels
    // this timer before it ever runs.
    if (singleTapTimerRef.current !== null) {
      clearTimeout(singleTapTimerRef.current);
    }
    singleTapTimerRef.current = setTimeout(() => {
      singleTapTimerRef.current = null;
      setUserPaused(prev => !prev);
    }, DOUBLE_TAP_MS);
  }, [triggerHeartBurst]);

  // Clean up any pending single-tap timer when the reel unmounts so we
  // don't try to toggle state on a dead component.
  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current !== null) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
    };
  }, []);

  // Close picker when the user scrolls past this reel (otherwise a
  // forgotten open picker leaks into the next item visually).
  useEffect(() => {
    if (!isActive && isPickerOpen) setIsPickerOpen(false);
  }, [isActive, isPickerOpen]);

  // ── Auto-remove broken reels ─────────────────────────────────────────
  // When the VideoPlayer fires onError we flip `hasError`. This effect
  // bubbles that up to the parent via `onUnavailable` so the reel can be
  // dropped from the list. We use a setTimeout(0) escape hatch so we don't
  // mutate the parent's state synchronously during our own render commit.
  useEffect(() => {
    if (!hasError) return;
    if (!onUnavailable) return;
    const handle = setTimeout(() => onUnavailable(item.id), 0);
    return () => clearTimeout(handle);
  }, [hasError, item.id, onUnavailable]);

  // Bottom safe-area offset so action buttons clear the home indicator.
  const railBottom = Math.max(insets.bottom + 28, 44);
  const infoBottom = Math.max(insets.bottom + 12, 24);

  // Each reel needs a unique SVG gradient ID — if two SVGs share the same
  // id the wrong gradient can bleed across items.
  const gradId = `rg-${item.id}`;

  return (
    <Animated.View style={[styles.reelRoot, { height }, animatedStyle]}>

      {/* ── Thumbnail / poster ───────────────────────────────────────── */}
      {item.thumbnailUrl ? (
        <Image
          source={{ uri: item.thumbnailUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : null}

      {/* ── Video — mounted only when in the ±1 preload window ─────── */}
      {shouldMount && item.videoUrl ? (
        <VideoPlayer
          ref={videoRef}
          source={{ uri: item.videoUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="contain"
          // Don't use `repeat` prop here. When autoScrollEnabled flips
 // false → true mid-playback, react-native-video doesn't reliably
 // turn off the active loop, so onEnd never fires and the user
 // gets stuck on the last video. We handle looping ourselves in
 // onEnd by seeking back to 0.
 repeat={false}
          paused={!playing}
          muted={isMuted || !isActive}
          ignoreSilentSwitch="ignore"
          playInBackground={false}
          playWhenInactive={false}
          progressUpdateInterval={250}
          useTextureView={false}
          onReadyForDisplay={() => setIsReady(true)}
          onLoad={(data) => {
            setIsReady(true);
            if (data?.duration) {
              setDuration(data.duration);
            }
          }}
          onProgress={(data) => {
            if (!isSeeking && data?.currentTime !== undefined) {
              setCurrentTime(data.currentTime);
            }
          }}
          onEnd={() => {
 if (autoScrollEnabled) {
 // Auto-scroll ON -> ask parent to jump to the next reel.
 onVideoEnd?.(index);
 } else if (videoRef.current) {
 // Auto-scroll OFF -> loop the current reel by seeking to 0.
 videoRef.current.seek(0);
 }
 }}
          onError={() => {
            setHasError(true);
            setIsReady(true);
          }}
        />
      ) : null}

      {/* ── Tap surface ─────────────────────────────────────────────────
            Double-tap → heart reaction (fires on the 2nd tap, no delay)
            Single-tap → pause / play  (fires ~320 ms after the 1st tap if
                          no second tap arrives — so it never races the
                          heart) */}
      <TouchableWithoutFeedback onPress={handleSurfaceTap}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      {/* ── Bottom gradient overlay — only covers the lower portion where
           text/icons sit, so the video itself stays clean. */}
      <Svg
        width={SCREEN_W}
        height={height * 0.35}
        style={styles.bottomGradient}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity="0" />
            <Stop offset="0.4" stopColor="#000" stopOpacity="0.3" />
            <Stop offset="1" stopColor="#000" stopOpacity="0.7" />
          </LinearGradient>
        </Defs>
        <Rect width={SCREEN_W} height={height * 0.35} fill={`url(#${gradId})`} />
      </Svg>

      {/* ── Center play overlay (only when user explicitly paused) ──── */}
      {showPauseOverlay ? (
        <View pointerEvents="none" style={styles.centerOverlay}>
          <View style={styles.centerBubble}>
            <Play
              size={50}
              color="rgba(255,255,255,0.92)"
              fill="rgba(255,255,255,0.92)"
            />
          </View>
        </View>
      ) : null}

      {/* ── Buffering dot — tiny indicator near top while decoding ───── */}
      {shouldMount && isActive && !isReady && !hasError ? (
        <View pointerEvents="none" style={styles.bufferContainer}>
          <View style={styles.bufferDot} />
        </View>
      ) : null}

      {/* ── Floating heart on double-tap ─────────────────────────────── */}
      {/* Animated.Value progresses 0 → 1 → 2:
            • 0 → 1: pop-in with back easing
            • 1 → 2: float up + fade out
          The Animated.View only matters during the burst — at rest its
          opacity is 0 so it doesn't capture touches. */}
      {floatingHearts.map(heart => (
        <RNAnimated.View
          key={heart.id}
          pointerEvents="none"
          style={[
            styles.floatingHeartItem,
            {
              left: heart.x - 60,
              top: heart.y - 60,
              opacity: heart.anim.interpolate({
                inputRange: [0, 0.4, 1, 2],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  scale: heart.anim.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [0.4, 1, 1.3],
                  }),
                },
                {
                  translateY: heart.anim.interpolate({
                    inputRange: [0, 1, 2],
                    outputRange: [0, 0, -100],
                  }),
                },
                {
                  rotate: heart.rotate,
                },
              ],
            },
          ]}
        >
          <Heart size={120} color="#ff2d55" fill="#ff2d55" />
        </RNAnimated.View>
      ))}

      {/* Mute button is now handled globally at the ReelsScreen header level */}

      {/* ── Right rail: avatar → like → comment → save → share ──────── */}
      <View
        style={[styles.rightRail, { bottom: railBottom }]}
        pointerEvents="box-none"
      >
        {/* Avatar — tapping goes to profile */}
        <View style={styles.avatarWrap}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              item.publisher.userId && onOpenProfile?.(item.publisher.userId)
            }
          >
            <Image
              source={{ uri: item.publisher.avatarUrl || AVATAR_FALLBACK }}
              style={styles.avatarImg}
            />
          </TouchableOpacity>
          {/* Follow (+) badge overlapping the bottom of the avatar, only shown if not followed and not own video */}
          {showFollowBadge && (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => item.publisher.userId && onFollow?.(item.publisher.userId)}
              style={styles.followBadge}
            >
              <Text style={styles.followPlus}>+</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Spacer between avatar and action buttons */}
        <View style={styles.railSpacer} />

        <RailButton
          icon={<ReactionIcon reaction={item.myReaction} />}
          label={formatCount(item.likeCount)}
          onPress={() => onReaction(item.id, item.myReaction ?? 'love')}
          onLongPress={() => setIsPickerOpen(true)}
        />
        <RailButton
          icon={<MessageCircle size={30} color="#fff" />}
          label={formatCount(item.commentCount)}
          onPress={() => onOpenComments?.(item.id)}
        />
        <RailButton
          icon={
            <Bookmark
              size={28}
              color={item.isSaved ? '#ffd60a' : '#fff'}
              fill={item.isSaved ? '#ffd60a' : 'transparent'}
            />
          }
          label={copy.save}
          onPress={() => onSave(item.id)}
        />
        <RailButton
          icon={<Forward size={30} color="#fff" />}
          label={copy.share}
          onPress={() => onShare?.(item)}
        />
        <MusicDisc
          avatarUrl={item.publisher.avatarUrl || AVATAR_FALLBACK}
          isSpinning={playing}
        />
      </View>

      {/* ── Reaction picker overlay (long-press the heart to open) ───── */}
      {/* Rendered AFTER the right rail so it sits on top of it. A full-
          screen invisible backdrop catches taps outside the pill itself
          and dismisses the picker. The pill is positioned to the left of
          the heart icon, near the right edge. */}
      {isPickerOpen ? (
        <>
          <TouchableWithoutFeedback onPress={() => setIsPickerOpen(false)}>
            <View style={StyleSheet.absoluteFill} />
          </TouchableWithoutFeedback>
          <View
            style={[
              styles.reactionPicker,
              {
                // Roughly align the picker with the heart button (which
                // sits ~270px above railBottom: avatar + spacer + button).
                bottom: railBottom + 290,
              },
            ]}
          >
            {ALL_REACTION_TYPES.map(type => {
              const isCurrent = item.myReaction === type;
              return (
                <TouchableOpacity
                  key={type}
                  activeOpacity={0.7}
                  onPress={() => {
                    setIsPickerOpen(false);
                    onReaction(item.id, type);
                  }}
                  style={[
                    styles.reactionPickerItem,
                    isCurrent && styles.reactionPickerItemActive,
                  ]}
                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                >
                  <Text style={styles.reactionPickerEmoji}>
                    {REACTION_EMOJI[type]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      ) : null}

      {/* ── Bottom-left: @username + caption ─────────────────────────── */}
      <View
        style={[styles.bottomLeft, { bottom: infoBottom }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() =>
            item.publisher.userId && onOpenProfile?.(item.publisher.userId)
          }
          style={styles.publisherRow}
        >
          <Text style={styles.publisherName} numberOfLines={1}>
            @{item.publisher.username || item.publisher.name || 'unknown'}
          </Text>
          {item.publisher.isVerified ? (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedTick}>✓</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        {item.caption ? (
          <Text style={styles.caption} numberOfLines={3}>
            {item.caption}
          </Text>
        ) : null}
      </View>

      {/* ── Progress bar/seekbar ── */}
      {duration > 0 && (
        <View
          style={styles.progressBarContainer}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <View style={[
            styles.progressTrack,
            isSeeking && { height: 5 }
          ]}>
            <View
              style={[
                styles.progressFill,
                { width: `${(isSeeking ? seekProgress : currentTime / duration) * 100}%` },
              ]}
            />
            {isSeeking && (
              <View
                style={[
                  styles.progressThumb,
                  { left: `${seekProgress * 100}%` },
                ]}
              />
            )}
          </View>
        </View>
      )}

      {/* ── Seek time overlay in center of the screen ── */}
      {isSeeking && (
        <View style={styles.seekTimeOverlay}>
          <Text style={styles.seekTimeText}>
            {formatTime(seekProgress * duration)} / {formatTime(duration)}
          </Text>
        </View>
      )}

    </Animated.View>
  );
}

// ── ReactionIcon ──────────────────────────────────────────────────────────
// Renders the icon inside the heart RailButton based on the viewer's
// current reaction.
//
//   • null  → outline Heart (white)
//   • 'love' → filled red Heart (matches the floating double-tap heart so
//             the two pieces of UI feel like the same thing)
//   • any other reaction → emoji at heart-icon size
//
// Using emoji for non-love reactions sidesteps the fact that lucide-react
// doesn't ship love/haha/wow/sad/angry icons that match its visual style.

function ReactionIcon({ reaction }: { reaction: ReactionType | null }) {
  if (reaction === null) {
    return <Heart size={32} color="#fff" fill="transparent" />;
  }
  if (reaction === 'love') {
    return <Heart size={32} color="#ff2d55" fill="#ff2d55" />;
  }
  return <Text style={styles.reactionIconEmoji}>{REACTION_EMOJI[reaction]}</Text>;
}

// ── RailButton ────────────────────────────────────────────────────────────

function RailButton({
  icon,
  label,
  onPress,
  onLongPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      onLongPress={onLongPress}
      // 280ms feels snappier than RN's 500ms default but is still safe
      // against accidental long-presses while scrolling.
      delayLongPress={280}
      style={styles.railBtn}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {icon}
      {label ? <Text style={styles.railLabel}>{label}</Text> : null}
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────

function MusicDisc({
  avatarUrl,
  isSpinning,
}: {
  avatarUrl: string;
  isSpinning: boolean;
}) {
  const rotateAnim = useRef(new RNAnimated.Value(0)).current;
  const loopRef = useRef<RNAnimated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isSpinning) {
      loopRef.current?.stop();
      loopRef.current = RNAnimated.loop(
        RNAnimated.timing(rotateAnim, {
          toValue: 1,
          duration: 3600,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      );
      loopRef.current.start();
      return;
    }

    loopRef.current?.stop();
  }, [isSpinning, rotateAnim]);

  useEffect(() => {
    return () => {
      loopRef.current?.stop();
    };
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <RNAnimated.View style={[styles.musicDisc, { transform: [{ rotate: spin }] }]}>
      <View style={styles.musicDiscRing}>
        <Image source={{ uri: avatarUrl }} style={styles.musicDiscAvatar} />
        <View style={styles.musicDiscHole} />
      </View>
    </RNAnimated.View>
  );
}

const styles = StyleSheet.create({
  reelRoot: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  // Center play / error overlay
  centerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBubble: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 8,
  },

  // Buffering
  bufferContainer: {
    position: 'absolute',
    top: 22,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  bufferDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },

  // Floating double-tap heart — centered on the reel
  floatingHeart: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatingHeartItem: {
    position: 'absolute',
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Reaction picker (long-press popover)
  reactionPicker: {
    position: 'absolute',
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(28,28,30,0.92)',
    borderRadius: 28,
    paddingHorizontal: 6,
    paddingVertical: 6,
    // Soft shadow to lift off the video
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 10,
  },
  reactionPickerItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  reactionPickerItemActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  reactionPickerEmoji: {
    fontSize: 26,
    // Counter-acting font baseline so the emoji sits visually centered
    lineHeight: 30,
  },

  // Emoji inside the heart RailButton (when myReaction is non-love)
  reactionIconEmoji: {
    fontSize: 30,
    lineHeight: 36,
  },

  // Mute button style is no longer needed since it's in ReelsScreen.tsx
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 30,
    justifyContent: 'flex-end',
    paddingBottom: 6,
    zIndex: 10,
  },
  progressTrack: {
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.24)',
    width: '100%',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  progressThumb: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#fff',
    top: -3.5,
    marginLeft: -5,
  },
  seekTimeOverlay: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  seekTimeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'monospace',
  },

  // Right action rail
  rightRail: {
    position: 'absolute',
    right: 12,
    alignItems: 'center',
  },

  // Avatar container (in rail)
  avatarWrap: {
    alignItems: 'center',
    marginBottom: 4,
  },
  avatarImg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#333',
  },
  followBadge: {
    position: 'absolute',
    bottom: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fe2c55',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  followPlus: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19,
  },

  // Gap between avatar and action buttons
  railSpacer: { height: 26 },

  // Each action button in the rail
  railBtn: {
    alignItems: 'center',
    marginBottom: 16,
    width: 58,
  },
  railLabel: {
    marginTop: 3,
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Bottom-left info block
  bottomLeft: {
    position: 'absolute',
    left: 16,
    right: 84, // clear the right rail
  },
  publisherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  publisherName: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  verifiedBadge: {
    marginLeft: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#1d9bf0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedTick: { color: '#fff', fontSize: 10, fontWeight: '700' },
  caption: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 21,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  musicDisc: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginTop: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  musicDiscRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 6,
    borderColor: '#151515',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050505',
  },
  musicDiscAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  musicDiscHole: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
});

// Memoize — only re-render when something the user can actually see changes.
// This is critical: without this, every onViewableItemsChanged update would
// re-render all mounted items, thrashing the UI thread.
export const ReelItem = memo(ReelItemBase, (prev, next) => {
  return (
    prev.item === next.item &&
    prev.isActive === next.isActive &&
    prev.isCurrent === next.isCurrent &&
    prev.shouldMount === next.shouldMount &&
    prev.isMuted === next.isMuted &&
    prev.height === next.height &&
    prev.scrollY === next.scrollY &&
    prev.index === next.index &&
    prev.autoScrollEnabled === next.autoScrollEnabled
  );
});
