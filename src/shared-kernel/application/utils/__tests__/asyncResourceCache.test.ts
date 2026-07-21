import { createAsyncResourceCache } from '../asyncResourceCache';

describe('createAsyncResourceCache', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('coalesces concurrent reads for the same resource', async () => {
    let resolveValue!: (value: string) => void;
    const loader = jest.fn(
      () =>
        new Promise<string>(resolve => {
          resolveValue = resolve;
        }),
    );
    const cache = createAsyncResourceCache<string>({ ttlMs: 1000 });

    const first = cache.getOrLoad('place:1', loader);
    const second = cache.getOrLoad('place:1', loader);

    await new Promise<void>(resolve => setImmediate(resolve));
    expect(loader).toHaveBeenCalledTimes(1);
    resolveValue('Ha Noi');
    await expect(Promise.all([first, second])).resolves.toEqual([
      'Ha Noi',
      'Ha Noi',
    ]);
  });

  it('serves cached values until the ttl expires', async () => {
    jest.useFakeTimers();
    const loader = jest
      .fn<Promise<string>, []>()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');
    const cache = createAsyncResourceCache<string>({ ttlMs: 1000 });

    await expect(cache.getOrLoad('query', loader)).resolves.toBe('first');
    await expect(cache.getOrLoad('query', loader)).resolves.toBe('first');
    expect(loader).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(1001);
    await expect(cache.getOrLoad('query', loader)).resolves.toBe('second');
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('does not cache rejected requests', async () => {
    const loader = jest
      .fn<Promise<string>, []>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('recovered');
    const cache = createAsyncResourceCache<string>({ ttlMs: 1000 });

    await expect(cache.getOrLoad('route', loader)).rejects.toThrow('offline');
    await expect(cache.getOrLoad('route', loader)).resolves.toBe('recovered');
    expect(loader).toHaveBeenCalledTimes(2);
  });
});
