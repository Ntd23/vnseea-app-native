// Description: Lets callers with the same request key share one in-flight request, cancelled only once all of them leave.

export type SharedRequestOptions = {
  /** The caller's own cancellation; it leaves the shared request instead of cancelling it for others. */
  signal?: AbortSignal;
  /** Wait before starting a new request. A caller joining with no delay starts a waiting request at once. */
  delayMs?: number;
};

type SharedEntry<T> = {
  controller: AbortController;
  promise: Promise<T>;
  subscribers: number;
  startNow: () => void;
};

function createAbortError() {
  const error = new Error('The request was aborted.');
  error.name = 'AbortError';
  return error;
}

export function createSharedInFlightRequests<T>() {
  const entries = new Map<string, SharedEntry<T>>();

  function createEntry(
    key: string,
    delayMs: number,
    start: (signal: AbortSignal) => Promise<T>,
  ) {
    const controller = new AbortController();
    let startNow = () => undefined as void;
    const delay = new Promise<void>(resolve => {
      if (!(delayMs > 0)) {
        resolve();
        return;
      }
      const timer = setTimeout(resolve, delayMs);
      startNow = () => {
        clearTimeout(timer);
        resolve();
      };
    });
    controller.signal.addEventListener('abort', () => startNow(), {
      once: true,
    });

    const entry: SharedEntry<T> = {
      controller,
      subscribers: 0,
      startNow: () => startNow(),
      promise: delay.then(() => {
        if (controller.signal.aborted) throw createAbortError();
        return start(controller.signal);
      }),
    };
    const forget = () => {
      if (entries.get(key) === entry) entries.delete(key);
    };
    entry.promise.then(forget, forget);
    entries.set(key, entry);
    return entry;
  }

  function leave(key: string, entry: SharedEntry<T>) {
    entry.subscribers -= 1;
    if (entry.subscribers > 0) return;
    // Wait one task before cancelling: a caller that replaces another in the
    // same tick (typing -> pressing Search) joins the request instead of
    // restarting it.
    setTimeout(() => {
      if (entry.subscribers > 0 || entries.get(key) !== entry) return;
      entries.delete(key);
      entry.controller.abort();
    }, 0);
  }

  function join(
    key: string,
    options: SharedRequestOptions,
    start: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const { signal } = options;
    if (signal?.aborted) return Promise.reject(createAbortError());

    const delayMs = options.delayMs ?? 0;
    const entry = entries.get(key) ?? createEntry(key, delayMs, start);
    entry.subscribers += 1;
    if (!(delayMs > 0)) entry.startNow();

    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const onAbort = () => {
        if (settled) return;
        settled = true;
        leave(key, entry);
        reject(createAbortError());
      };
      signal?.addEventListener('abort', onAbort, { once: true });
      entry.promise.then(
        value => {
          if (settled) return;
          settled = true;
          signal?.removeEventListener('abort', onAbort);
          entry.subscribers -= 1;
          resolve(value);
        },
        error => {
          if (settled) return;
          settled = true;
          signal?.removeEventListener('abort', onAbort);
          entry.subscribers -= 1;
          reject(error);
        },
      );
    });
  }

  return { join };
}
