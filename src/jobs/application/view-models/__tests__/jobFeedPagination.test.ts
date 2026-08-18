import type { JobsItem } from '../../../domain/types/jobs.types';
import {
  canLoadMoreJobFeed,
  mergeUniqueJobFeedItems,
} from '../jobFeedPagination';

function job(id: string): JobsItem {
  return { id, title: `Job ${id}` } as JobsItem;
}

describe('job feed pagination', () => {
  it('blocks overlapping first-page and load-more requests', () => {
    expect(
      canLoadMoreJobFeed({
        isFirstPageLoading: true,
        isLoadingMore: false,
        isAllLoaded: false,
        hasJobs: true,
      }),
    ).toBe(false);
    expect(
      canLoadMoreJobFeed({
        isFirstPageLoading: false,
        isLoadingMore: true,
        isAllLoaded: false,
        hasJobs: true,
      }),
    ).toBe(false);
    expect(
      canLoadMoreJobFeed({
        isFirstPageLoading: false,
        isLoadingMore: false,
        isAllLoaded: false,
        hasJobs: true,
      }),
    ).toBe(true);
  });

  it('appends only unseen jobs while preserving existing order', () => {
    const existing = [job('10'), job('9')];
    const next = [job('9'), job('8'), job('8'), job('7')];

    expect(mergeUniqueJobFeedItems(existing, next).map(item => item.id)).toEqual(
      ['10', '9', '8', '7'],
    );
  });
});
