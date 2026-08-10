import type { JobsItem } from '../../domain/types/jobs.types';

export function canLoadMoreJobFeed({
  isFirstPageLoading,
  isLoadingMore,
  isAllLoaded,
  hasJobs,
}: {
  isFirstPageLoading: boolean;
  isLoadingMore: boolean;
  isAllLoaded: boolean;
  hasJobs: boolean;
}) {
  return (
    !isFirstPageLoading && !isLoadingMore && !isAllLoaded && hasJobs
  );
}

export function mergeUniqueJobFeedItems(
  existingJobs: readonly JobsItem[],
  nextJobs: readonly JobsItem[],
) {
  const seenIds = new Set(existingJobs.map(job => String(job.id)));
  const merged = [...existingJobs];

  nextJobs.forEach(job => {
    const id = String(job.id);
    if (!id || seenIds.has(id)) return;
    seenIds.add(id);
    merged.push(job);
  });

  return merged;
}
