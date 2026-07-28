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

type InlineLiveStreamPlayerProps = {
  active: boolean;
  item: LiveStreamItem;
};

export const InlineLiveStreamPlayer = React.memo(
  function InlineLiveStreamPlayer({
    active,
    item,
  }: InlineLiveStreamPlayerProps) {
    const shouldPlay = active && item.state === 'live';
    const { session } = useInlineLiveSession(item, shouldPlay);
    const [videoReady, setVideoReady] = useState(false);
    const posterOpacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
      setVideoReady(false);
      posterOpacity.stopAnimation();
      posterOpacity.setValue(1);
    }, [posterOpacity, session?.roomName, shouldPlay]);

    const handleVideoReady = useCallback(() => {
      setVideoReady(true);
      Animated.timing(posterOpacity, {
        duration: 180,
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }, [posterOpacity]);
    const posterVisibilityStyle = useMemo(
      () => ({ opacity: shouldPlay && videoReady ? posterOpacity : 1 }),
      [posterOpacity, shouldPlay, videoReady],
    );

    return (
      <View pointerEvents="none" style={styles.container}>
        {shouldPlay && session ? (
          <LiveKitStreamView
            session={session}
            isHost={false}
            audioEnabled={false}
            diagnosticsEnabled={false}
            objectFit="cover"
            onVideoReady={handleVideoReady}
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
          {shouldPlay && !videoReady ? (
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
    previous.item.thumbnailUrl === next.item.thumbnailUrl,
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
