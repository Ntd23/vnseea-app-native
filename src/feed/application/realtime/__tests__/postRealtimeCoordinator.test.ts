import {
  createPostRealtimeCoordinator,
  type PostChangedEvent,
} from '../postRealtimeCoordinator';

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('post realtime coordinator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reference-counts watched posts and restores them after reconnect', () => {
    const watch = jest.fn();
    const unwatch = jest.fn();
    const coordinator = createPostRealtimeCoordinator({
      fetchPost: jest.fn(),
      watch,
      unwatch,
    });

    const first = coordinator.watchPosts(['10', '11']);
    const second = coordinator.watchPosts(['10']);

    expect(watch).toHaveBeenCalledWith(['10', '11']);
    second();
    expect(unwatch).not.toHaveBeenCalledWith(['10']);

    coordinator.setConnected(false);
    coordinator.setConnected(true);
    expect(watch).toHaveBeenLastCalledWith(['10', '11']);

    first();
    expect(unwatch).toHaveBeenCalledWith(['10', '11']);
  });

  it('caps the combined watched set across multiple scopes', () => {
    const watch = jest.fn();
    const coordinator = createPostRealtimeCoordinator({
      fetchPost: jest.fn(),
      watch,
      unwatch: jest.fn(),
      maxWatched: 3,
    });

    const releaseFirst = coordinator.watchPosts(['1', '2']);
    const releaseSecond = coordinator.watchPosts(['2', '3', '4']);

    expect(coordinator.getWatchedPostIds()).toEqual(['1', '2', '3']);
    expect(watch).toHaveBeenNthCalledWith(1, ['1', '2']);
    expect(watch).toHaveBeenNthCalledWith(2, ['3']);

    releaseSecond();
    releaseFirst();
  });

  it('defaults to eight watched posts to bound HTTP fallback fan-out', () => {
    const watch = jest.fn();
    const coordinator = createPostRealtimeCoordinator({
      fetchPost: jest.fn(),
      watch,
      unwatch: jest.fn(),
    });

    coordinator.watchPosts(Array.from({ length: 12 }, (_, index) => index + 1));

    expect(coordinator.getWatchedPostIds()).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
    ]);
    expect(watch).toHaveBeenCalledWith([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
    ]);
  });

  it('debounces mutations and refetches once more when dirty during a fetch', async () => {
    let resolveFirst: ((value: { id: string; revision: number }) => void) | undefined;
    const fetchPost = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise(resolve => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce({ id: '10', revision: 2 });
    const snapshots: unknown[] = [];
    const coordinator = createPostRealtimeCoordinator({
      fetchPost,
      watch: jest.fn(),
      unwatch: jest.fn(),
      debounceMs: 150,
    });
    coordinator.subscribe(event => {
      if (event.type === 'snapshot') snapshots.push(event.post);
    });
    coordinator.watchPosts(['10']);

    const changed: PostChangedEvent = {
      eventId: 'a',
      postId: '10',
      mutation: 'reaction',
      occurredAt: 1,
    };
    coordinator.handleChanged(changed);
    coordinator.handleChanged({ ...changed, eventId: 'b' });
    jest.advanceTimersByTime(150);
    await flush();
    expect(fetchPost).toHaveBeenCalledTimes(1);

    coordinator.handleChanged({ ...changed, eventId: 'c' });
    jest.advanceTimersByTime(150);
    resolveFirst?.({ id: '10', revision: 1 });
    await flush();
    await flush();

    expect(fetchPost).toHaveBeenCalledTimes(2);
    expect(snapshots).toEqual([
      { id: '10', revision: 1 },
      { id: '10', revision: 2 },
    ]);
  });

  it('limits snapshot requests to three and removes deleted posts immediately', async () => {
    let active = 0;
    let peak = 0;
    const resolvers: Array<() => void> = [];
    const fetchPost = jest.fn(async (postId: string) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise<void>(resolve => resolvers.push(resolve));
      active -= 1;
      return { id: postId };
    });
    const events: unknown[] = [];
    const coordinator = createPostRealtimeCoordinator({
      fetchPost,
      watch: jest.fn(),
      unwatch: jest.fn(),
      debounceMs: 0,
      maxConcurrent: 3,
    });
    coordinator.subscribe(event => events.push(event));
    coordinator.watchPosts(['1', '2', '3', '4']);

    for (const postId of ['1', '2', '3', '4']) {
      coordinator.handleChanged({
        eventId: `event-${postId}`,
        postId,
        mutation: 'reaction',
        occurredAt: 1,
      });
    }
    jest.runOnlyPendingTimers();
    await flush();
    expect(fetchPost).toHaveBeenCalledTimes(3);
    expect(peak).toBe(3);

    resolvers.splice(0).forEach(resolve => resolve());
    await flush();
    await flush();
    expect(fetchPost).toHaveBeenCalledTimes(4);

    coordinator.handleChanged({
      eventId: 'deleted-4',
      postId: '4',
      mutation: 'deleted',
      occurredAt: 2,
    });
    expect(events).toContainEqual({
      type: 'deleted',
      postId: '4',
      eventId: 'deleted-4',
    });
  });
});
