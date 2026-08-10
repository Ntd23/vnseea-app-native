export type FeedVisibleMediaListener = (isVisible: boolean) => void;

export function createFeedVisibleMediaStore() {
  let visiblePostIds = new Set<string>();
  const listenersByPostId = new Map<
    string,
    Set<FeedVisibleMediaListener>
  >();

  const notifyPost = (postId: string, isVisible: boolean) => {
    listenersByPostId
      .get(postId)
      ?.forEach(listener => listener(isVisible));
  };

  const publish = (postIds: Iterable<string>) => {
    const nextPostIds = new Set(postIds);
    if (
      visiblePostIds.size === nextPostIds.size &&
      [...nextPostIds].every(postId => visiblePostIds.has(postId))
    ) {
      return;
    }

    const previousPostIds = visiblePostIds;
    visiblePostIds = nextPostIds;

    previousPostIds.forEach(postId => {
      if (!nextPostIds.has(postId)) notifyPost(postId, false);
    });
    nextPostIds.forEach(postId => {
      if (!previousPostIds.has(postId)) notifyPost(postId, true);
    });
  };

  const subscribe = (postId: string, listener: FeedVisibleMediaListener) => {
    let listeners = listenersByPostId.get(postId);
    if (!listeners) {
      listeners = new Set();
      listenersByPostId.set(postId, listeners);
    }
    listeners.add(listener);

    return () => {
      listeners?.delete(listener);
      if (listeners?.size === 0) listenersByPostId.delete(postId);
    };
  };

  return {
    isVisible: (postId: string) => visiblePostIds.has(postId),
    publish,
    subscribe,
  };
}

export const feedVisibleMediaStore = createFeedVisibleMediaStore();
