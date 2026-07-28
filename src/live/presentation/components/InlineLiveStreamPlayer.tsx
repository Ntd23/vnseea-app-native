import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  StyleSheet,
  View,
} from 'react-native';
import type { LiveStreamItem } from '../../domain/types/live.types';
import { useInlineLiveSession } from '../hooks/useInlineLiveSession';
import { LiveKitStreamView } from './LiveKitStreamView';
import type { InlineLiveVideoDimensions } from './inlineLiveAspect';

type InlineLiveStreamPlayerProps = {
  active: boolean;
  item: LiveStreamItem;
  onVideoDimensionsChange?: (dimensions: InlineLiveVideoDimensions) => void;
};

const INLINE_LIVE_VIDEO_READY_TIMEOUT_MS = 8_000;
const INLINE_LIVE_SESSION_READY_TIMEOUT_MS = 10_000;
const INLINE_LIVE_RETRY_DELAY_MS = 650;
const INLINE_LIVE_MAX_RETRIES = 2;

export const InlineLiveStreamPlayer = React.memo(
  function InlineLiveStreamPlayer({
    active,
    item,
    onVideoDimensionsChange,
  }: InlineLiveStreamPlayerProps) {
    const shouldPlay = active && item.state === 'live';
    const { error, hasEnded, retry, session } = useInlineLiveSession(
      item,
      shouldPlay,
    );
    const [videoReady, setVideoReady] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [hasTimedOut, setHasTimedOut] = useState(false);
    const playbackKey = `${item.postId}:${item.streamName}`;
    const activeAttemptRef = useRef(retryCount);
    const activePlaybackKeyRef = useRef(playbackKey);
    const hasEndedRef = useRef(hasEnded);
    const mountedRef = useRef(true);
    const retryCountRef = useRef(0);
    const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const shouldPlayRef = useRef(shouldPlay);
    const videoReadyRef = useRef(false);
    const posterOpacity = useRef(new Animated.Value(1)).current;
    activeAttemptRef.current = retryCount;
    activePlaybackKeyRef.current = playbackKey;
    hasEndedRef.current = hasEnded;
    shouldPlayRef.current = shouldPlay;

    useEffect(() => {
      videoReadyRef.current = false;
      setVideoReady(false);
      setHasTimedOut(false);
      posterOpacity.stopAnimation();
      posterOpacity.setValue(1);
    }, [posterOpacity, session?.roomName, session?.token, shouldPlay]);

    useEffect(() => {
      retryCountRef.current = 0;
      activeAttemptRef.current = 0;
      videoReadyRef.current = false;
      setRetryCount(0);
      setHasTimedOut(false);
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    }, [playbackKey, shouldPlay]);

    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
          retryTimerRef.current = null;
        }
      };
    }, []);

    const requestRetry = useCallback(
      (delayMs = INLINE_LIVE_RETRY_DELAY_MS, force = false) => {
        if (
          !mountedRef.current ||
          !shouldPlayRef.current ||
          hasEndedRef.current ||
          retryTimerRef.current ||
          (!force && videoReadyRef.current)
        ) {
          return;
        }
        if (retryCountRef.current >= INLINE_LIVE_MAX_RETRIES) {
          setHasTimedOut(true);
          return;
        }

        retryTimerRef.current = setTimeout(() => {
          retryTimerRef.current = null;
          if (
            !mountedRef.current ||
            !shouldPlayRef.current ||
            hasEndedRef.current ||
            (!force && videoReadyRef.current)
          ) {
            return;
          }
          const nextRetryCount = retryCountRef.current + 1;
          retryCountRef.current = nextRetryCount;
          activeAttemptRef.current = nextRetryCount;
          setRetryCount(nextRetryCount);
          setHasTimedOut(false);
          videoReadyRef.current = false;
          setVideoReady(false);
          retry();
        }, delayMs);
      },
      [retry],
    );

    const handleVideoReady = useCallback(() => {
      if (
        activePlaybackKeyRef.current !== playbackKey ||
        activeAttemptRef.current !== retryCount ||
        !shouldPlayRef.current
      ) {
        return;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      setHasTimedOut(false);
      videoReadyRef.current = true;
      setVideoReady(true);
      Animated.timing(posterOpacity, {
        duration: 180,
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }, [playbackKey, posterOpacity, retryCount]);

    const handleConnectionStateChange = useCallback(
      (state: 'connected' | 'disconnected' | 'error') => {
        if (
          state === 'connected' ||
          activePlaybackKeyRef.current !== playbackKey ||
          activeAttemptRef.current !== retryCount ||
          !shouldPlayRef.current
        ) {
          return;
        }

        posterOpacity.stopAnimation();
        posterOpacity.setValue(1);
        videoReadyRef.current = false;
        setVideoReady(false);
        setHasTimedOut(false);
        requestRetry(undefined, true);
      },
      [playbackKey, posterOpacity, requestRetry, retryCount],
    );

    useEffect(() => {
      if (!shouldPlay || videoReady || hasEnded) return undefined;

      if (error) {
        if (retryCountRef.current < INLINE_LIVE_MAX_RETRIES) {
          requestRetry();
        } else {
          setHasTimedOut(true);
        }
        return undefined;
      }

      const timeout = setTimeout(() => {
        if (retryCountRef.current < INLINE_LIVE_MAX_RETRIES) {
          requestRetry(0);
        } else {
          setHasTimedOut(true);
        }
      }, session
        ? INLINE_LIVE_VIDEO_READY_TIMEOUT_MS
        : INLINE_LIVE_SESSION_READY_TIMEOUT_MS);

      return () => clearTimeout(timeout);
    }, [
      error,
      hasEnded,
      requestRetry,
      retryCount,
      session,
      shouldPlay,
      videoReady,
    ]);
    const posterVisibilityStyle = useMemo(
      () => ({ opacity: shouldPlay && videoReady ? posterOpacity : 1 }),
      [posterOpacity, shouldPlay, videoReady],
    );

    return (
      <View pointerEvents="none" style={styles.container}>
        {shouldPlay && session ? (
          <LiveKitStreamView
            key={`${session.postId}:${session.roomName}:${retryCount}`}
            session={session}
            isHost={false}
            audioEnabled={false}
            diagnosticsEnabled={false}
            // Keep the full frame visible while the card settles on the
            // decoded portrait/landscape ratio. The outer card supplies the
            // matching aspect ratio after the first frame callback.
            objectFit="contain"
            onConnectionStateChange={handleConnectionStateChange}
            onVideoReady={handleVideoReady}
            onVideoDimensionsChange={onVideoDimensionsChange}
          />
        ) : null}

        <Animated.View
          style={[styles.poster, posterVisibilityStyle]}
          pointerEvents={videoReady ? 'none' : 'auto'}
        >
          {item.thumbnailUrl ? (
            <Image
              source={{ uri: item.thumbnailUrl }}
              resizeMode="cover"
              style={styles.posterImage}
            />
          ) : (
            <View style={styles.posterFallback} />
          )}
          {shouldPlay && !videoReady && !hasTimedOut && !hasEnded ? (
            <View style={styles.loadingBadge}>
              <ActivityIndicator color="#ffffff" size="small" />
            </View>
          ) : null}
        </Animated.View>
      </View>
    );
  },
  (previous, next) =>
    previous.active === next.active &&
    previous.item.postId === next.item.postId &&
    previous.item.streamName === next.item.streamName &&
    previous.item.state === next.item.state &&
    previous.item.thumbnailUrl === next.item.thumbnailUrl &&
    previous.onVideoDimensionsChange === next.onVideoDimensionsChange,
);

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#020617',
    overflow: 'hidden',
  },
  loadingBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.48)',
    borderRadius: 999,
    height: 42,
    justifyContent: 'center',
    left: '50%',
    marginLeft: -21,
    marginTop: -21,
    position: 'absolute',
    top: '50%',
    width: 42,
  },
  poster: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#020617',
  },
  posterFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#020617',
  },
  posterImage: {
    ...StyleSheet.absoluteFill,
    height: '100%',
    width: '100%',
  },
});
