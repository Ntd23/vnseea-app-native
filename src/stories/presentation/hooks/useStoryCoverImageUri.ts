import { useEffect, useMemo, useState } from 'react';
import { InteractionManager } from 'react-native';
import type { StoryItem, StoryMedia } from '../../domain/types/stories.types';
import {
  createCachedVideoPosterThumbnail,
  getCachedVideoPosterThumbnail,
} from '../../../shared-kernel/application/utils/videoThumbnails';

const STORY_VIDEO_COVER_CACHE_PREFIX = 'story-cover';
const VIDEO_URL_PATTERN = /\.(mp4|m4v|mov|webm|3gp|avi|mkv)(?:[?#]|$)/i;

export type StoryCoverImageInput = {
  story?: StoryItem | null;
  segment?: StoryMedia | null;
  fallbackUri?: string;
};

export type StoryCoverImageSource = {
  imageUri: string;
  videoUri?: string;
  cacheKey?: string;
};

function cleanUri(value?: string | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function isVideoUrl(uri: string) {
  return VIDEO_URL_PATTERN.test(uri);
}

function getNewestStorySegment(story?: StoryItem | null) {
  if (!story?.media.length) return null;

  let newest: StoryMedia | null = null;
  let newestTimestamp = Number.NEGATIVE_INFINITY;
  let newestIndex = -1;

  story.media.forEach((item, index) => {
    const timestamp = item.postedAt ?? story.postedAt ?? 0;
    if (
      !newest ||
      timestamp > newestTimestamp ||
      (timestamp === newestTimestamp && index > newestIndex)
    ) {
      newest = item;
      newestTimestamp = timestamp;
      newestIndex = index;
    }
  });

  return newest;
}

function getSafeImageFallback({
  story,
  coverSegment,
  fallbackUri,
}: StoryCoverImageInput & { coverSegment?: StoryMedia | null }) {
  const segmentUri = cleanUri(coverSegment?.url);
  if (coverSegment?.type === 'image' && segmentUri && !isVideoUrl(segmentUri)) {
    return segmentUri;
  }

  const storyThumbnail = cleanUri(story?.thumbnailUrl);
  if (storyThumbnail && !isVideoUrl(storyThumbnail)) {
    return storyThumbnail;
  }

  const publisherAvatar = cleanUri(story?.publisher.avatarUrl);
  if (publisherAvatar) {
    return publisherAvatar;
  }

  const fallback = cleanUri(fallbackUri);
  return fallback && !isVideoUrl(fallback) ? fallback : '';
}

export function resolveStoryCoverImageSource({
  story,
  segment,
  fallbackUri,
}: StoryCoverImageInput): StoryCoverImageSource {
  const coverSegment = segment ?? getNewestStorySegment(story);
  const segmentUri = cleanUri(coverSegment?.url);
  const videoUri =
    coverSegment?.type === 'video' && segmentUri ? segmentUri : undefined;
  const imageUri = getSafeImageFallback({
    story,
    coverSegment,
    fallbackUri,
  });

  return {
    imageUri,
    videoUri,
    cacheKey: videoUri
      ? [
          STORY_VIDEO_COVER_CACHE_PREFIX,
          story?.publisher.userId,
          story?.id,
          coverSegment?.storyId,
          coverSegment?.id,
          videoUri,
        ]
          .filter(Boolean)
          .join(':')
      : undefined,
  };
}

export function useStoryCoverImageUri({
  story,
  segment,
  fallbackUri,
}: StoryCoverImageInput) {
  const source = useMemo(
    () => resolveStoryCoverImageSource({ story, segment, fallbackUri }),
    [fallbackUri, segment, story],
  );

  const [generatedPosterUri, setGeneratedPosterUri] = useState(() => {
    if (!source.videoUri) return undefined;
    return getCachedVideoPosterThumbnail(source.videoUri, source.cacheKey)?.uri;
  });

  useEffect(() => {
    if (!source.videoUri) {
      setGeneratedPosterUri(undefined);
      return;
    }
    setGeneratedPosterUri(
      getCachedVideoPosterThumbnail(source.videoUri, source.cacheKey)?.uri,
    );
  }, [source.cacheKey, source.videoUri]);

  useEffect(() => {
    if (!source.videoUri || generatedPosterUri) {
      return;
    }

    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      createCachedVideoPosterThumbnail(source.videoUri!, source.cacheKey).then(
        thumbnail => {
          if (cancelled || !thumbnail?.uri) return;
          setGeneratedPosterUri(thumbnail.uri);
        },
      );
    });

    return () => {
      cancelled = true;
      task.cancel?.();
    };
  }, [generatedPosterUri, source.cacheKey, source.videoUri]);

  return generatedPosterUri || source.imageUri;
}
