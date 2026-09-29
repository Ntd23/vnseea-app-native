// Description: Press-and-hold preview for home stories: a short muted video loop, or a slow zoom over a photo.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import VideoPlayer, { type VideoRef, ViewType } from 'react-native-video';
import type { StoryItem } from '../../../stories/domain/types/stories.types';
import {
  resolveStoryCoverImageSource,
  useStoryCoverImageUri,
} from '../../../stories/presentation/hooks/useStoryCoverImageUri';
import { FeedMediaImage } from './FeedMediaImage';
import { HOME_INTRO_FALLBACK_AVATAR } from './HomeFeedIntro.shared';
import { HomeStoryCardCover, isStoryFrameCover } from './HomeStoryCardCover';

// Loop only the opening seconds so a preview never downloads a whole video.
const PREVIEW_CLIP_SECONDS = 4;
const PREVIEW_MAX_WIDTH = 300;
const PREVIEW_ZOOM_SCALE = 1.08;
const PREVIEW_ZOOM_MS = 4000;

function PeekVideo({ uri }: { uri: string }) {
  const videoRef = useRef<VideoRef>(null);
  const [isReady, setIsReady] = useState(false);

  return (
    <VideoPlayer
      ref={videoRef}
      source={{ uri }}
      style={[StyleSheet.absoluteFill, !isReady && styles.hidden]}
      resizeMode="cover"
      muted
      repeat
      disableFocus
      playInBackground={false}
      shutterColor="transparent"
      viewType={ViewType.TEXTURE}
      progressUpdateInterval={250}
      onReadyForDisplay={() => setIsReady(true)}
      onProgress={({ currentTime }) => {
        if (currentTime >= PREVIEW_CLIP_SECONDS) {
          videoRef.current?.seek(0);
        }
      }}
    />
  );
}

function PeekPhoto({ uri }: { uri: string }) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const zoom = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: PREVIEW_ZOOM_SCALE,
          duration: PREVIEW_ZOOM_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: PREVIEW_ZOOM_MS,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    zoom.start();
    return () => zoom.stop();
  }, [scale]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale }] }]}>
      <FeedMediaImage uri={uri} style={StyleSheet.absoluteFill} resizeMode="cover" />
    </Animated.View>
  );
}

function PeekMedia({ story }: { story: StoryItem }) {
  const coverUri = useStoryCoverImageUri({ story });
  const { videoUri } = useMemo(
    () => resolveStoryCoverImageSource({ story }),
    [story],
  );
  const hasFrame = isStoryFrameCover(story, coverUri);

  return (
    <>
      {hasFrame ? (
        <PeekPhoto uri={coverUri} />
      ) : (
        <HomeStoryCardCover story={story} shadeIdSuffix="peek" />
      )}
      {videoUri ? <PeekVideo uri={videoUri} /> : null}
    </>
  );
}

export function HomeStoryPeekPreview({
  story,
  onClose,
  onOpenStory,
}: {
  story: StoryItem | null;
  onClose: () => void;
  onOpenStory: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const cardWidth = Math.min(width * 0.7, PREVIEW_MAX_WIDTH, (height * 0.72 * 9) / 16);
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!story) return;
    appear.setValue(0);
    Animated.spring(appear, {
      toValue: 1,
      damping: 18,
      stiffness: 260,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [appear, story]);

  if (!story) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={{
            opacity: appear,
            transform: [
              {
                scale: appear.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.86, 1],
                }),
              },
            ],
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xem story của ${story.publisher.name}`}
            onPress={onOpenStory}
            style={[
              styles.card,
              { width: cardWidth, height: (cardWidth * 16) / 9 },
            ]}
          >
            <PeekMedia story={story} />
            <View style={styles.header}>
              <FeedMediaImage
                uri={story.publisher.avatarUrl || HOME_INTRO_FALLBACK_AVATAR}
                style={styles.avatar}
                resizeMode="cover"
              />
              <Text style={styles.name} numberOfLines={1}>
                {story.publisher.name}
              </Text>
            </View>
          </Pressable>
        </Animated.View>
        <Text style={styles.hint}>Chạm vào story để xem đầy đủ</Text>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.62)',
  },
  card: {
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#0f172a',
  },
  hidden: {
    opacity: 0,
  },
  header: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  name: {
    flex: 1,
    marginLeft: 8,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  hint: {
    marginTop: 16,
    color: 'rgba(255, 255, 255, 0.86)',
    fontSize: 12,
    fontWeight: '700',
  },
});
