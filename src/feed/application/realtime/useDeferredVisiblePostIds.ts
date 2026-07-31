import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_VISIBLE_POST_SETTLE_MS = 180;
const MAX_VISIBLE_POST_IDS = 8;

function arePostIdListsEqual(left: string[], right: string[]) {
  return (
    left.length === right.length &&
    left.every((postId, index) => postId === right[index])
  );
}

function normalizeVisiblePostIds(values: Array<string | number>) {
  return Array.from(
    new Set(
      values
        .map(value => String(value).trim())
        .filter(value => /^[1-9][0-9]*$/.test(value)),
    ),
  ).slice(0, MAX_VISIBLE_POST_IDS);
}

/**
 * Keeps fast list scrolling from re-rendering the whole screen and rebuilding
 * realtime subscriptions for every small viewability change.
 */
export function useDeferredVisiblePostIds(
  settleDelayMs = DEFAULT_VISIBLE_POST_SETTLE_MS,
) {
  const [postIds, setPostIds] = useState<string[]>([]);
  const committedPostIdsRef = useRef<string[]>([]);
  const pendingPostIdsRef = useRef<string[]>([]);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedulePostIds = useCallback(
    (values: Array<string | number>) => {
      const nextPostIds = normalizeVisiblePostIds(values);
      if (arePostIdListsEqual(nextPostIds, pendingPostIdsRef.current)) return;

      pendingPostIdsRef.current = nextPostIds;
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }

      if (arePostIdListsEqual(nextPostIds, committedPostIdsRef.current)) return;

      settleTimerRef.current = setTimeout(() => {
        settleTimerRef.current = null;
        const settledPostIds = pendingPostIdsRef.current;
        if (arePostIdListsEqual(settledPostIds, committedPostIdsRef.current)) {
          return;
        }

        committedPostIdsRef.current = settledPostIds;
        setPostIds(settledPostIds);
      }, settleDelayMs);
    },
    [settleDelayMs],
  );

  useEffect(
    () => () => {
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    },
    [],
  );

  return { postIds, schedulePostIds };
}
