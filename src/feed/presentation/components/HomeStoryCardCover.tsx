// Description: Draws a home story card cover: a sharp story frame, or the publisher avatar centred until a frame exists.
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import type { StoryItem } from '../../../stories/domain/types/stories.types';
import { useStoryCoverImageUri } from '../../../stories/presentation/hooks/useStoryCoverImageUri';
import { FeedMediaImage } from './FeedMediaImage';
import { HOME_INTRO_FALLBACK_AVATAR } from './HomeFeedIntro.shared';

const FALLBACK_AVATAR_SIZE = 64;

/**
 * True when the cover shows the story itself. The cover hook falls back to the
 * publisher avatar; stretching that small image over a whole card is what made
 * the rail look blurry, so the avatar is drawn at its own size instead.
 */
export function isStoryFrameCover(story: StoryItem, coverUri: string) {
  return Boolean(coverUri) && coverUri !== story.publisher.avatarUrl;
}

export function HomeStoryCardCover({
  story,
  shadeIdSuffix = 'rail',
}: {
  story: StoryItem;
  /** Keeps SVG gradient ids unique when one story is drawn twice. */
  shadeIdSuffix?: string;
}) {
  const coverUri = useStoryCoverImageUri({ story });
  const gradientId = `home-story-shade-${story.id}-${shadeIdSuffix}`;

  return (
    <>
      {isStoryFrameCover(story, coverUri) ? (
        <FeedMediaImage
          uri={coverUri}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.avatarBackdrop}>
          <FeedMediaImage
            uri={story.publisher.avatarUrl || HOME_INTRO_FALLBACK_AVATAR}
            style={styles.avatar}
            resizeMode="cover"
          />
        </View>
      )}
      {/* Soft shades keep the avatar and name readable without dimming the whole story. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity={0.3} />
              <Stop offset="0.26" stopColor="#000000" stopOpacity={0} />
              <Stop offset="0.58" stopColor="#000000" stopOpacity={0} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.64} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
        </Svg>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  avatarBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#334155',
  },
  avatar: {
    width: FALLBACK_AVATAR_SIZE,
    height: FALLBACK_AVATAR_SIZE,
    borderRadius: FALLBACK_AVATAR_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
  },
});
