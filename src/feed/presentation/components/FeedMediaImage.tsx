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
} from '../../application/state/feedMediaLoadState';
import {
  getClientUiPerformanceActiveSurface,
  recordClientMediaLoad,
} from '../../../shared/performance/clientUiPerformanceMetrics';

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
 * A viewport-gated image. In-flight requests may be cancelled when the row
 * leaves the viewport; the shared media state still remembers completed
 * requests for cache/retry coordination without keeping an offscreen native
 * Image mounted.
 */
export const FeedMediaImage = React.memo(function FeedMediaImage({
  uri,
  className,
  style,
  resizeMode = 'cover',
  blurRadius,
  enabled = true,
}: FeedMediaImageProps) {
  // A completed prefetch is only a cache hint. It must not force a native
  // Image to mount while this row is outside the viewport: on Android that
  // turns a harmless prefetch into a bitmap decode/upload burst during a
  // fling. Once this exact row/URI has genuinely loaded, though, keep its
  // native image alive for as long as the recycled holder still owns it so a
  // short back-scroll does not flash the placeholder and decode it again.
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const shouldMountImage = enabled || loadedUri === uri;
  const [retryAttempt, setRetryAttempt] = useState(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadMeasurementRef = useRef({
    surface: getClientUiPerformanceActiveSurface(),
    isInViewport: enabled,
  });
  const source = useMemo<ImageURISource>(
    () => ({
      uri,
      cache: retryAttempt > 0 ? 'reload' : 'force-cache',
    }),
    [retryAttempt, uri],
  );

  useEffect(() => {
    setRetryAttempt(0);
    setLoadedUri(null);
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [uri]);

  const handleLoadError = useCallback(() => {
    setLoadedUri(null);
    releaseFeedMedia(uri);
    if (!enabled || retryAttempt >= 1 || retryTimerRef.current) return;

    retryTimerRef.current = setTimeout(() => {
      retryTimerRef.current = null;
      setRetryAttempt(current => Math.min(1, current + 1));
    }, FEED_MEDIA_RETRY_DELAY_MS);
  }, [enabled, retryAttempt, uri]);

  const handleLoadStart = useCallback(() => {
    loadMeasurementRef.current = {
      surface: getClientUiPerformanceActiveSurface(),
      isInViewport: enabled,
    };
  }, [enabled]);

  const handleLoad = useCallback(() => {
    const measurement = loadMeasurementRef.current;
    if (measurement.surface) {
      recordClientMediaLoad(
        measurement.surface,
        'image',
        measurement.isInViewport,
      );
    }
    setLoadedUri(uri);
    markFeedMediaLoaded(uri);
  }, [uri]);

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
      onLoadStart={handleLoadStart}
      onLoad={handleLoad}
      onError={handleLoadError}
    />
  );
});
