import { createSharedInFlightRequests } from '../sharedInFlightRequests';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('createSharedInFlightRequests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shares one request between callers with the same key', async () => {
    const pool = createSharedInFlightRequests<string>();
    const response = deferred<string>();
    const start = jest.fn(() => response.promise);

    const first = pool.join('cafe', {}, start);
    const second = pool.join('cafe', {}, start);
    response.resolve('places');

    await expect(Promise.all([first, second])).resolves.toEqual(['places', 'places']);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('keeps the request alive when the typing caller is replaced by a search in the same tick', async () => {
    const pool = createSharedInFlightRequests<string>();
    const response = deferred<string>();
    let requestSignal: AbortSignal | undefined;
    const start = jest.fn((signal: AbortSignal) => {
      requestSignal = signal;
      return response.promise;
    });
    const typing = new AbortController();

    const typeahead = pool.join('cafe', { signal: typing.signal }, start);
    typeahead.catch(() => undefined);
    typing.abort();
    const search = pool.join('cafe', {}, start);
    await jest.advanceTimersByTimeAsync(10);
    response.resolve('places');

    await expect(typeahead).rejects.toMatchObject({ name: 'AbortError' });
    await expect(search).resolves.toBe('places');
    expect(start).toHaveBeenCalledTimes(1);
    expect(requestSignal?.aborted).toBe(false);
  });

  it('cancels the request once every caller has left', async () => {
    const pool = createSharedInFlightRequests<string>();
    let requestSignal: AbortSignal | undefined;
    const start = jest.fn((signal: AbortSignal) => {
      requestSignal = signal;
      return new Promise<string>(() => undefined);
    });
    const typing = new AbortController();

    pool.join('cafe', { signal: typing.signal }, start).catch(() => undefined);
    typing.abort();
    await jest.advanceTimersByTimeAsync(1);

    expect(requestSignal?.aborted).toBe(true);
  });

  it('waits for the typing pause but starts at once when a search joins', async () => {
    const pool = createSharedInFlightRequests<string>();
    const start = jest.fn(() => Promise.resolve('places'));

    const typeahead = pool.join('cafe', { delayMs: 300 }, start);
    await jest.advanceTimersByTimeAsync(100);
    expect(start).not.toHaveBeenCalled();

    const search = pool.join('cafe', {}, start);
    await jest.advanceTimersByTimeAsync(0);
    expect(start).toHaveBeenCalledTimes(1);
    await expect(Promise.all([typeahead, search])).resolves.toEqual(['places', 'places']);
  });

  it('never calls the backend when typing continues during the pause', async () => {
    const pool = createSharedInFlightRequests<string>();
    const start = jest.fn(() => Promise.resolve('places'));
    const typing = new AbortController();

    const typeahead = pool.join('cafe', { delayMs: 300, signal: typing.signal }, start);
    typeahead.catch(() => undefined);
    await jest.advanceTimersByTimeAsync(100);
    typing.abort();
    await jest.advanceTimersByTimeAsync(500);

    expect(start).not.toHaveBeenCalled();
  });

  it('starts a new request after the previous one finished', async () => {
    const pool = createSharedInFlightRequests<string>();
    const start = jest
      .fn()
      .mockResolvedValueOnce('first')
      .mockResolvedValueOnce('second');

    await expect(pool.join('cafe', {}, start)).resolves.toBe('first');
    await expect(pool.join('cafe', {}, start)).resolves.toBe('second');
    expect(start).toHaveBeenCalledTimes(2);
  });
});
