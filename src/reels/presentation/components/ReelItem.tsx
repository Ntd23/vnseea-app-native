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
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import VideoPlayer from 'react-native-video';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bookmark,
  Heart,
  MessageCircle,
  Play,
  Share2,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import type { ReelsItem } from '../../domain/types/reels.types';

const AVATAR_FALLBACK = 'https://demo.vnseea.vn/upload/photos/d-avatar.jpg';

// Screen width used by the SVG gradient — computed once at module level.
// Rotation is not a concern for a portrait-locked reels feed.
const SCREEN_W = Dimensions.get('window').width;

interface Props {
  item: ReelsItem;
  /** Pixel height of the visible viewport — drives fullscreen layout. */
  height: number;
  /** True when this is the currently-visible reel (plays + unmutes). */
  isActive: boolean;
  /** True when this reel is within the preload window (current ±1). */
  shouldMount: boolean;
  /** Global mute state shared across the feed. */
  isMuted: boolean;
  onToggleMute: () => void;
  onLike: (postId: string) => void;
  onSave: (postId: string) => void;
  onOpenComments?: (postId: string) => void;
  onShare?: (item: ReelsItem) => void;
  onOpenProfile?: (userId: string) => void;
}

function formatCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function ReelItemBase({
  item,
  height,
  isActive,
  shouldMount,
  isMuted,
  onToggleMute,
  onLike,
  onSave,
  onOpenComments,
  onShare,
  onOpenProfile,
}: Props) {
  const insets = useSafeAreaInsets();
  const [userPaused, setUserPaused] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  // The video plays iff: active + not manually paused + no decode error.
  const playing = isActive && !userPaused && !hasError;

  // Show the big center play icon only when the user has explicitly tapped
  // to pause (or on decode error). We do NOT show it for non-active items —
  // those are just visually paused and don't need a UI affordance.
  const showPauseOverlay = isActive && (userPaused || hasError);

  const handleSurfaceTap = useCallback(() => {
    setUserPaused(prev => !prev);
  }, []);

  // Bottom safe-area offset so action buttons clear the home indicator.
  const railBottom = Math.max(insets.bottom + 28, 44);
  const infoBottom = Math.max(insets.bottom + 12, 24);

  // Each reel needs a unique SVG gradient ID — if two SVGs share the same
  // id the wrong gradient can bleed across items.
  const gradId = `rg-${item.id}`;

  return (
    <View style={{ width: '100%', height, backgroundColor: '#000', overflow: 'hidden' }}>

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
          source={{ uri: item.videoUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          repeat
          paused={!playing}
          muted={isMuted || !isActive}
          ignoreSilentSwitch="ignore"
          playInBackground={false}
          playWhenInactive={false}
          progressUpdateInterval={1000}
          onReadyForDisplay={() => setIsReady(true)}
          onLoad={() => setIsReady(true)}
          onError={() => {
            setHasError(true);
            setIsReady(true);
          }}
        />
      ) : null}

      {/* ── Tap surface — captures taps to toggle play/pause ────────── */}
      <TouchableWithoutFeedback onPress={handleSurfaceTap}>
        <View style={StyleSheet.absoluteFill} />
      </TouchableWithoutFeedback>

      {/* ── Bottom gradient overlay — makes text/icons legible ──────── */}
      {/* react-native-svg LinearGradient — no extra package needed.    */}
      <Svg
        width={SCREEN_W}
        height={height}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#000" stopOpacity="0.24" />
            <Stop offset="0.2" stopColor="#000" stopOpacity="0" />
            <Stop offset="0.52" stopColor="#000" stopOpacity="0" />
            <Stop offset="1" stopColor="#000" stopOpacity="0.88" />
          </LinearGradient>
        </Defs>
        <Rect width={SCREEN_W} height={height} fill={`url(#${gradId})`} />
      </Svg>

      {/* ── Center play / error overlay ──────────────────────────────── */}
      {showPauseOverlay ? (
        <View pointerEvents="none" style={styles.centerOverlay}>
          <View style={styles.centerBubble}>
            {hasError ? (
              <Text style={styles.errorText}>⚠ Không phát được</Text>
            ) : (
              <Play
                size={50}
                color="rgba(255,255,255,0.92)"
                fill="rgba(255,255,255,0.92)"
              />
            )}
          </View>
        </View>
      ) : null}

      {/* ── Buffering dot — tiny indicator near top while decoding ───── */}
      {shouldMount && isActive && !isReady && !hasError ? (
        <View pointerEvents="none" style={styles.bufferContainer}>
          <View style={styles.bufferDot} />
        </View>
      ) : null}

      {/* ── Top-right: mute toggle ────────────────────────────────────── */}
      <TouchableOpacity
        onPress={onToggleMute}
        style={[styles.muteBtn, { top: Math.max(insets.top + 10, 14) }]}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        {isMuted ? (
          <VolumeX size={20} color="#fff" />
        ) : (
          <Volume2 size={20} color="#fff" />
        )}
      </TouchableOpacity>

      {/* ── Right rail: avatar → like → comment → save → share ──────── */}
      <View
        style={[styles.rightRail, { bottom: railBottom }]}
        pointerEvents="box-none"
      >
        {/* Avatar — tapping goes to profile */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() =>
            item.publisher.userId && onOpenProfile?.(item.publisher.userId)
          }
          style={styles.avatarWrap}
        >
          <Image
            source={{ uri: item.publisher.avatarUrl || AVATAR_FALLBACK }}
            style={styles.avatarImg}
          />
          {/* Follow (+) badge overlapping the bottom of the avatar */}
          <View style={styles.followBadge}>
            <Text style={styles.followPlus}>+</Text>
          </View>
        </TouchableOpacity>

        {/* Spacer between avatar and action buttons */}
        <View style={styles.railSpacer} />

        <RailButton
          icon={
            <Heart
              size={32}
              color={item.isLiked ? '#ff2d55' : '#fff'}
              fill={item.isLiked ? '#ff2d55' : 'transparent'}
            />
          }
          label={formatCount(item.likeCount)}
          onPress={() => onLike(item.id)}
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
          label="Lưu"
          onPress={() => onSave(item.id)}
        />
        <RailButton
          icon={<Share2 size={26} color="#fff" />}
          label="Chia sẻ"
          onPress={() => onShare?.(item)}
        />
        <MusicDisc
          avatarUrl={item.publisher.avatarUrl || AVATAR_FALLBACK}
          isSpinning={playing}
        />
      </View>

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

    </View>
  );
}

// ── RailButton ────────────────────────────────────────────────────────────

function RailButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
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
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isSpinning) {
      loopRef.current?.stop();
      loopRef.current = Animated.loop(
        Animated.timing(rotateAnim, {
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
    <Animated.View style={[styles.musicDisc, { transform: [{ rotate: spin }] }]}>
      <View style={styles.musicDiscRing}>
        <Image source={{ uri: avatarUrl }} style={styles.musicDiscAvatar} />
        <View style={styles.musicDiscHole} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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

  // Mute button — top-right corner
  muteBtn: {
    position: 'absolute',
    right: 16,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
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
    prev.shouldMount === next.shouldMount &&
    prev.isMuted === next.isMuted &&
    prev.height === next.height
  );
});
