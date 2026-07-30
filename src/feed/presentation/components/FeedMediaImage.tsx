import React, { useEffect, useMemo } from 'react';
import {
  Image,
  View,
  type ImageProps,
  type ImageStyle,
  type ImageURISource,
  type StyleProp,
} from 'react-native';
import {
  markFeedMediaLoaded,
  markFeedMediaRequested,
  useFeedMediaRetained,
} from '../../application/state/feedMediaLoadState';

type FeedMediaImageProps = {
  uri: string;
  className?: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageProps['resizeMode'];
  enabled?: boolean;
};

const FEED_MEDIA_PLACEHOLDER_STYLE = { backgroundColor: '#E5E7EB' };

/**
 * A viewport-gated image that becomes sticky after its first request.
 * FlashList may recycle or clip the native view, but scrolling must never
 * turn an image that already started loading back into a placeholder.
 */
export const FeedMediaImage = React.memo(function FeedMediaImage({
  uri,
  className,
  style,
  resizeMode = 'cover',
  enabled = true,
}: FeedMediaImageProps) {
  const retained = useFeedMediaRetained(uri);
  const shouldMountImage = enabled || retained;
  const source = useMemo<ImageURISource>(
    () => ({ uri, cache: 'force-cache' }),
    [uri],
  );

  useEffect(() => {
    if (shouldMountImage) {
      markFeedMediaRequested(uri);
    }
  }, [shouldMountImage, uri]);

  if (!shouldMountImage) {
    return (
      <View
        className={className}
        style={[style, FEED_MEDIA_PLACEHOLDER_STYLE]}
      />
    );
  }

  return (
    <Image
      source={source}
      className={className}
      style={style}
      resizeMode={resizeMode}
      fadeDuration={0}
      resizeMethod="resize"
      progressiveRenderingEnabled
      onLoadStart={() => markFeedMediaRequested(uri)}
      onLoad={() => markFeedMediaLoaded(uri)}
    />
  );
});
