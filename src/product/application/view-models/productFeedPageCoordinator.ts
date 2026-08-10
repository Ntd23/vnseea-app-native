type ProductFeedPageCursor = string | number;

type ProductFeedLoadMoreGuard = {
  isFirstPageLoading: boolean;
  isLoadingMore: boolean;
  isAllLoaded: boolean;
  hasProducts: boolean;
};

export function canLoadMoreProductFeed({
  isFirstPageLoading,
  isLoadingMore,
  isAllLoaded,
  hasProducts,
}: ProductFeedLoadMoreGuard): boolean {
  return !isFirstPageLoading && !isLoadingMore && !isAllLoaded && hasProducts;
}

type BufferedPage<T> = {
  cursor: ProductFeedPageCursor;
  items: T[];
};

type InFlightPage<T> = {
  cursor: ProductFeedPageCursor;
  promise: Promise<T[]>;
};

export type ProductFeedPageCoordinator<T> = {
  prefetch: (
    cursor: ProductFeedPageCursor,
    load: () => Promise<T[]>,
  ) => Promise<T[]>;
  consume: (
    cursor: ProductFeedPageCursor,
    load: () => Promise<T[]>,
  ) => Promise<T[]>;
  peek: (cursor: ProductFeedPageCursor) => T[] | null;
  reset: () => void;
};

export function createProductFeedPageCoordinator<
  T,
>(): ProductFeedPageCoordinator<T> {
  let generation = 0;
  let requestSequence = 0;
  let latestRequestSequence = 0;
  let bufferedPage: BufferedPage<T> | null = null;
  const inFlightPages = new Map<ProductFeedPageCursor, InFlightPage<T>>();

  const startOrJoin = (
    cursor: ProductFeedPageCursor,
    load: () => Promise<T[]>,
  ) => {
    if (bufferedPage?.cursor === cursor) {
      return Promise.resolve(bufferedPage.items);
    }
    const inFlightPage = inFlightPages.get(cursor);
    if (inFlightPage) {
      return inFlightPage.promise;
    }

    const requestGeneration = generation;
    const requestOrder = ++requestSequence;
    latestRequestSequence = requestOrder;
    let requestPromise: Promise<T[]>;
    requestPromise = load()
      .then(items => {
        if (
          requestGeneration === generation &&
          requestOrder === latestRequestSequence
        ) {
          bufferedPage = { cursor, items };
        }
        return items;
      })
      .finally(() => {
        if (inFlightPages.get(cursor)?.promise === requestPromise) {
          inFlightPages.delete(cursor);
        }
      });
    inFlightPages.set(cursor, { cursor, promise: requestPromise });
    return requestPromise;
  };

  return {
    prefetch: startOrJoin,
    async consume(cursor, load) {
      if (bufferedPage?.cursor === cursor) {
        const items = bufferedPage.items;
        bufferedPage = null;
        return items;
      }

      const consumeGeneration = generation;
      const items = await startOrJoin(cursor, load);
      if (consumeGeneration === generation && bufferedPage?.cursor === cursor) {
        bufferedPage = null;
      }
      return items;
    },
    peek(cursor) {
      return bufferedPage?.cursor === cursor ? bufferedPage.items : null;
    },
    reset() {
      generation += 1;
      latestRequestSequence = ++requestSequence;
      bufferedPage = null;
      inFlightPages.clear();
    },
  };
}
