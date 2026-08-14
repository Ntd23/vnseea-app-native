import React, { useEffect, useState } from 'react';
import { FeedMediaImage } from './FeedMediaImage';

type StaggeredFeedMediaImageProps = Omit<
  React.ComponentProps<typeof FeedMediaImage>,
  'enabled'
> & {
  enabled?: boolean;
  mountOrder: number;
  staggerEnabled?: boolean;
  staggerMs?: number;
};

export const PHOTO_GRID_IMAGE_STAGGER_MS = 48;

/** Spreads cold photo-grid mounts while leaving loaded-image retention intact. */
export const StaggeredFeedMediaImage = React.memo(
  function StaggeredFeedMediaImage({
    uri,
    enabled = true,
    mountOrder,
    staggerEnabled = false,
    staggerMs = PHOTO_GRID_IMAGE_STAGGER_MS,
    ...imageProps
  }: StaggeredFeedMediaImageProps) {
    const [readyUri, setReadyUri] = useState<string | null>(null);
    const delayMs = staggerEnabled ? Math.max(0, mountOrder * staggerMs) : 0;
    const mountEnabled = enabled && (delayMs <= 0 || readyUri === uri);

    useEffect(() => {
      if (!enabled) {
        setReadyUri(current => (current === null ? current : null));
        return undefined;
      }
      if (delayMs <= 0 || readyUri === uri) return undefined;

      const timer = setTimeout(() => setReadyUri(uri), delayMs);
      return () => clearTimeout(timer);
    }, [delayMs, enabled, readyUri, uri]);

    return (
      <FeedMediaImage
        {...imageProps}
        uri={uri}
        enabled={mountEnabled}
      />
    );
  },
);
