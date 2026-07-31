// Description: Runs feed fallback requests with bounded concurrency.

export async function mapFeedRequestsWithConcurrency<T, TResult>(
  items: readonly T[],
  requestedConcurrency: number,
  worker: (item: T, index: number) => Promise<TResult>,
): Promise<TResult[]> {
  if (items.length === 0) return [];

  const concurrency = Math.min(
    items.length,
    Math.max(1, Math.floor(requestedConcurrency)),
  );
  const results = new Array<TResult>(items.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(items[index], index);
      }
    }),
  );

  return results;
}
