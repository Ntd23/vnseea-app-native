import {
  canLoadMoreProductFeed,
  createProductFeedPageCoordinator,
} from '../productFeedPageCoordinator';

describe('canLoadMoreProductFeed', () => {
  it('blocks load-more while a first-page load or refresh is active', () => {
    expect(
      canLoadMoreProductFeed({
        isFirstPageLoading: true,
        isLoadingMore: false,
        isAllLoaded: false,
        hasProducts: true,
      }),
    ).toBe(false);
  });

  it('blocks load-more while another load-more request is active', () => {
    expect(
      canLoadMoreProductFeed({
        isFirstPageLoading: false,
        isLoadingMore: true,
        isAllLoaded: false,
        hasProducts: true,
      }),
    ).toBe(false);
  });

  it('blocks load-more after the final page', () => {
    expect(
      canLoadMoreProductFeed({
        isFirstPageLoading: false,
        isLoadingMore: false,
        isAllLoaded: true,
        hasProducts: true,
      }),
    ).toBe(false);
  });

  it('blocks load-more until the first page has products', () => {
    expect(
      canLoadMoreProductFeed({
        isFirstPageLoading: false,
        isLoadingMore: false,
        isAllLoaded: false,
        hasProducts: false,
      }),
    ).toBe(false);
  });

  it('allows load-more when every guard is clear', () => {
    expect(
      canLoadMoreProductFeed({
        isFirstPageLoading: false,
        isLoadingMore: false,
        isAllLoaded: false,
        hasProducts: true,
      }),
    ).toBe(true);
  });
});

describe('createProductFeedPageCoordinator', () => {
  it('shares one in-flight request between prefetch and consume', async () => {
    const coordinator = createProductFeedPageCoordinator<number>();
    let resolveRequest: ((items: number[]) => void) | undefined;
    const load = jest.fn(
      () =>
        new Promise<number[]>(resolve => {
          resolveRequest = resolve;
        }),
    );

    const prefetchPromise = coordinator.prefetch(10, load);
    const consumePromise = coordinator.consume(10, load);
    resolveRequest?.([11, 12]);

    await expect(prefetchPromise).resolves.toEqual([11, 12]);
    await expect(consumePromise).resolves.toEqual([11, 12]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('consumes a prefetched page once without another request', async () => {
    const coordinator = createProductFeedPageCoordinator<number>();
    const load = jest.fn().mockResolvedValue([21, 22]);

    await coordinator.prefetch(20, load);

    await expect(coordinator.consume(20, load)).resolves.toEqual([21, 22]);
    expect(load).toHaveBeenCalledTimes(1);
    expect(coordinator.peek(20)).toBeNull();
  });

  it('ignores stale prefetch completion after reset', async () => {
    const coordinator = createProductFeedPageCoordinator<number>();
    let resolveRequest: ((items: number[]) => void) | undefined;
    const load = jest.fn(
      () =>
        new Promise<number[]>(resolve => {
          resolveRequest = resolve;
        }),
    );

    const stalePrefetch = coordinator.prefetch(30, load);
    coordinator.reset();
    resolveRequest?.([31]);
    await stalePrefetch;

    expect(coordinator.peek(30)).toBeNull();
  });

  it('does not let a stale consume clear a newer same-cursor buffer', async () => {
    const coordinator = createProductFeedPageCoordinator<number>();
    let resolveStale: ((items: number[]) => void) | undefined;
    let resolveFresh: ((items: number[]) => void) | undefined;

    const staleConsume = coordinator.consume(
      40,
      () =>
        new Promise<number[]>(resolve => {
          resolveStale = resolve;
        }),
    );
    coordinator.reset();

    const freshPrefetch = coordinator.prefetch(
      40,
      () =>
        new Promise<number[]>(resolve => {
          resolveFresh = resolve;
        }),
    );
    resolveFresh?.([41, 42]);
    await freshPrefetch;
    expect(coordinator.peek(40)).toEqual([41, 42]);

    resolveStale?.([401, 402]);
    await staleConsume;

    expect(coordinator.peek(40)).toEqual([41, 42]);
  });

  it('does not let an older cursor overwrite a newer buffered page', async () => {
    const coordinator = createProductFeedPageCoordinator<number>();
    let resolveOlder: ((items: number[]) => void) | undefined;
    let resolveNewer: ((items: number[]) => void) | undefined;

    const older = coordinator.prefetch(
      10,
      () =>
        new Promise<number[]>(resolve => {
          resolveOlder = resolve;
        }),
    );
    const newer = coordinator.prefetch(
      20,
      () =>
        new Promise<number[]>(resolve => {
          resolveNewer = resolve;
        }),
    );

    resolveNewer?.([21, 22]);
    await newer;
    expect(coordinator.peek(20)).toEqual([21, 22]);

    resolveOlder?.([11, 12]);
    await older;
    expect(coordinator.peek(20)).toEqual([21, 22]);
    expect(coordinator.peek(10)).toBeNull();
  });
});
