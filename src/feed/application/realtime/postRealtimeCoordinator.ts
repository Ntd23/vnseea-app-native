export type PostRealtimeMutation =
  | 'reaction'
  | 'comment'
  | 'share'
  | 'edited'
  | 'deleted';

export type PostChangedEvent = {
  eventId: string;
  postId: string;
  mutation: PostRealtimeMutation;
  occurredAt: number;
};

export type PostRealtimeEvent<TPost> =
  | { type: 'snapshot'; postId: string; post: TPost }
  | { type: 'deleted'; postId: string; eventId: string }
  | { type: 'mutation'; change: PostChangedEvent };

type CoordinatorOptions<TPost> = {
  fetchPost: (postId: string) => Promise<TPost>;
  watch: (postIds: string[]) => void;
  unwatch: (postIds: string[]) => void;
  debounceMs?: number;
  maxConcurrent?: number;
  maxWatched?: number;
  initiallyConnected?: boolean;
};

type FetchState = {
  timer: ReturnType<typeof setTimeout> | null;
  inFlight: boolean;
  queued: boolean;
  dirty: boolean;
};

function normalizePostIds(values: Array<string | number>, limit: number) {
  return Array.from(
    new Set(
      values
        .map(value => String(value).trim())
        .filter(value => /^[1-9][0-9]*$/.test(value)),
    ),
  ).slice(0, limit);
}

export function createPostRealtimeCoordinator<TPost>(
  options: CoordinatorOptions<TPost>,
) {
  const debounceMs = options.debounceMs ?? 150;
  const maxConcurrent = options.maxConcurrent ?? 3;
  const maxWatched = options.maxWatched ?? 8;
  const refs = new Map<string, number>();
  const fetchStates = new Map<string, FetchState>();
  const listeners = new Set<(event: PostRealtimeEvent<TPost>) => void>();
  const seenEventIds = new Set<string>();
  const fetchQueue: string[] = [];
  let activeFetches = 0;
  let connected = options.initiallyConnected ?? true;
  let disposed = false;

  const emit = (event: PostRealtimeEvent<TPost>) => {
    listeners.forEach(listener => listener(event));
  };

  const stateFor = (postId: string) => {
    let state = fetchStates.get(postId);
    if (!state) {
      state = { timer: null, inFlight: false, queued: false, dirty: false };
      fetchStates.set(postId, state);
    }
    return state;
  };

  const drainQueue = () => {
    if (disposed) return;
    while (activeFetches < maxConcurrent && fetchQueue.length > 0) {
      const postId = fetchQueue.shift();
      if (!postId || !refs.has(postId)) continue;
      const state = stateFor(postId);
      state.queued = false;
      if (state.inFlight) {
        state.dirty = true;
        continue;
      }
      state.inFlight = true;
      activeFetches += 1;
      void options
        .fetchPost(postId)
        .then(post => {
          if (!disposed && refs.has(postId)) {
            emit({ type: 'snapshot', postId, post });
          }
        })
        .catch(() => undefined)
        .finally(() => {
          activeFetches -= 1;
          state.inFlight = false;
          if (state.dirty && refs.has(postId)) {
            state.dirty = false;
            state.queued = true;
            fetchQueue.push(postId);
          }
          drainQueue();
        });
    }
  };

  const enqueue = (postId: string) => {
    if (!refs.has(postId) || disposed) return;
    const state = stateFor(postId);
    if (state.inFlight) {
      state.dirty = true;
      return;
    }
    if (state.queued) return;
    state.queued = true;
    fetchQueue.push(postId);
    drainQueue();
  };

  const schedule = (postId: string) => {
    const state = stateFor(postId);
    if (state.inFlight) {
      state.dirty = true;
      return;
    }
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      state.timer = null;
      enqueue(postId);
    }, debounceMs);
  };

  const removeState = (postId: string) => {
    const state = fetchStates.get(postId);
    if (state?.timer) clearTimeout(state.timer);
    fetchStates.delete(postId);
    const queueIndex = fetchQueue.indexOf(postId);
    if (queueIndex >= 0) fetchQueue.splice(queueIndex, 1);
  };

  return {
    watchPosts(values: Array<string | number>) {
      const requestedPostIds = normalizePostIds(values, maxWatched);
      const postIds: string[] = [];
      const newlyWatched: string[] = [];
      requestedPostIds.forEach(postId => {
        const count = refs.get(postId) ?? 0;
        if (count === 0 && refs.size >= maxWatched) return;
        postIds.push(postId);
        refs.set(postId, count + 1);
        if (count === 0) newlyWatched.push(postId);
      });
      if (connected && newlyWatched.length > 0) options.watch(newlyWatched);

      let released = false;
      return () => {
        if (released) return;
        released = true;
        const noLongerWatched: string[] = [];
        postIds.forEach(postId => {
          const next = (refs.get(postId) ?? 1) - 1;
          if (next <= 0) {
            refs.delete(postId);
            removeState(postId);
            noLongerWatched.push(postId);
          } else {
            refs.set(postId, next);
          }
        });
        if (connected && noLongerWatched.length > 0) {
          options.unwatch(noLongerWatched);
        }
      };
    },
    setConnected(nextConnected: boolean) {
      const didReconnect = !connected && nextConnected;
      connected = nextConnected;
      if (didReconnect && refs.size > 0) {
        options.watch(Array.from(refs.keys()).slice(0, maxWatched));
      }
    },
    handleChanged(change: PostChangedEvent) {
      const postId = normalizePostIds([change.postId], 1)[0];
      if (!postId || !refs.has(postId) || seenEventIds.has(change.eventId)) {
        return;
      }
      seenEventIds.add(change.eventId);
      if (seenEventIds.size > 500) {
        const oldest = seenEventIds.values().next().value;
        if (oldest) seenEventIds.delete(oldest);
      }
      emit({ type: 'mutation', change: { ...change, postId } });
      if (change.mutation === 'deleted') {
        removeState(postId);
        emit({ type: 'deleted', postId, eventId: change.eventId });
        return;
      }
      schedule(postId);
    },
    refreshWatchedPosts() {
      refs.forEach((_count, postId) => schedule(postId));
    },
    subscribe(listener: (event: PostRealtimeEvent<TPost>) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getWatchedPostIds() {
      return Array.from(refs.keys());
    },
    dispose() {
      disposed = true;
      fetchStates.forEach(state => {
        if (state.timer) clearTimeout(state.timer);
      });
      fetchStates.clear();
      fetchQueue.length = 0;
      listeners.clear();
      refs.clear();
    },
  };
}
