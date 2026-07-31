import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
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
  releaseFeedMedia,
  useFeedMediaLoaded,
} from '../../application/state/feedMediaLoadState';

type FeedMediaImageProps = {
  uri: string;
  className?: string;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageProps['resizeMode'];
  blurRadius?: ImageProps['blurRadius'];
  enabled?: boolean;
};

const FEED_MEDIA_PLACEHOLDER_STYLE = { backgroundColor: '#E5E7EB' };
const FEED_MEDIA_RETRY_DELAY_MS = 220;

/**
 * A viewport-gated image that is retained briefly after it loads.
 * In-flight requests may be cancelled when their row leaves the viewport;
 * completed images survive short FlashList recycle loops without becoming
 * globally sticky for the rest of the feed session.
 */
export const FeedMediaImage = React.memo(function FeedMediaImage({
  uri,
  className,
  style,
  resizeMode = 'cover',
  blurRadius,
  enabled = true,
}: FeedMediaImageProps) {
  const loaded = useFeedMediaLoaded(uri);
  const shouldMountImage = enabled || loaded;
  const [retryAttempt, setRetryAttempt] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const source = useMemo<ImageURISource>(
    () => ({
      uri,
      cache: retryAttempt > 0 ? 'reload' : 'force-cache',
    }),
    [retryAttempt, uri],
  );

  useEffect(() => {
    setRetryAttempt(0);
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [uri]);

  const handleLoadError = useCallback(() => {
    releaseFeedMedia(uri);
    if (!enabled || retryAttempt >= 1 || retryTimerRef.current) return;

    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      setRetryAttempt(current => Math.min(1, current + 1));
    }, FEED_MEDIA_RETRY_DELAY_MS);
  }, [enabled, retryAttempt, uri]);

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
      key={`${uri}:${retryAttempt}`}
      source={source}
      className={className}
      style={style}
      resizeMode={resizeMode}
      blurRadius={blurRadius}
      fadeDuration={0}
      resizeMethod="resize"
      progressiveRenderingEnabled
      onLoad={() => markFeedMediaLoaded(uri)}
      onError={handleLoadError}
    />
  );
});
