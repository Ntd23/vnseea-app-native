import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';

export type ScrollPostLayout = {
  postId: string;
  y: number;
  height: number;
};

export type ScrollPostViewport = {
  offsetY: number;
  height: number;
};

const MAX_VISIBLE_REALTIME_POSTS = 8;

export function selectVisibleScrollPostIds(
  layouts: ScrollPostLayout[],
  viewport: ScrollPostViewport,
  limit = MAX_VISIBLE_REALTIME_POSTS,
) {
  if (viewport.height <= 0 || limit <= 0) return [];
  const viewportBottom = viewport.offsetY + viewport.height;

  return Array.from(
    new Map(
      layouts
        .filter(
          layout =>
            /^[1-9][0-9]*$/.test(layout.postId) &&
            layout.height > 0 &&
            layout.y < viewportBottom &&
            layout.y + layout.height > viewport.offsetY,
        )
        .sort((left, right) => left.y - right.y)
        .map(layout => [layout.postId, layout] as const),
    ).keys(),
  ).slice(0, limit);
}

function areEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((postId, index) => postId === right[index])
  );
}

export function useScrollViewPostRealtimeIds(
  candidatePostIds: Array<string | number>,
) {
  const candidateSignature = useMemo(
    () =>
      Array.from(
        new Set(
          candidatePostIds
            .map(value => String(value).trim())
            .filter(value => /^[1-9][0-9]*$/.test(value)),
        ),
      ).join(','),
    [candidatePostIds],
  );
  const candidateIdsRef = useRef(new Set<string>());
  candidateIdsRef.current = new Set(
    candidateSignature ? candidateSignature.split(',') : [],
  );
  const layoutsRef = useRef(new Map<string, ScrollPostLayout>());
  const listOffsetYRef = useRef(0);
  const viewportRef = useRef<ScrollPostViewport>({ offsetY: 0, height: 0 });
  const [postIds, setPostIds] = useState<string[]>([]);

  const recompute = useCallback(() => {
    const layouts = Array.from(layoutsRef.current.values())
      .filter(layout => candidateIdsRef.current.has(layout.postId))
      .map(layout => ({
        ...layout,
        y: layout.y + listOffsetYRef.current,
      }));
    const nextPostIds = selectVisibleScrollPostIds(
      layouts,
      viewportRef.current,
    );
    setPostIds(current => (areEqual(current, nextPostIds) ? current : nextPostIds));
  }, []);

  useEffect(() => {
    layoutsRef.current.forEach((_layout, postId) => {
      if (!candidateIdsRef.current.has(postId)) {
        layoutsRef.current.delete(postId);
      }
    });
    recompute();
  }, [candidateSignature, recompute]);

  const onViewportLayout = useCallback(
    (event: LayoutChangeEvent) => {
      viewportRef.current.height = event.nativeEvent.layout.height;
      recompute();
    },
    [recompute],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      viewportRef.current = {
        offsetY: event.nativeEvent.contentOffset.y,
        height: event.nativeEvent.layoutMeasurement.height,
      };
      recompute();
    },
    [recompute],
  );

  const onPostListLayout = useCallback(
    (event: LayoutChangeEvent) => {
      listOffsetYRef.current = event.nativeEvent.layout.y;
      recompute();
    },
    [recompute],
  );

  const onPostLayout = useCallback(
    (postId: string | number, event: LayoutChangeEvent) => {
      const normalizedPostId = String(postId).trim();
      if (!candidateIdsRef.current.has(normalizedPostId)) return;
      const { y, height } = event.nativeEvent.layout;
      layoutsRef.current.set(normalizedPostId, {
        postId: normalizedPostId,
        y,
        height,
      });
      recompute();
    },
    [recompute],
  );

  return {
    postIds,
    onViewportLayout,
    onScroll,
    onPostListLayout,
    onPostLayout,
  };
}
