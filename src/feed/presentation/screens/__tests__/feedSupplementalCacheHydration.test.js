const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('feed supplemental cache hydration', () => {
  const cases = [
    [
      'src/product/application/view-models/useProductsOnFeedViewModel.ts',
      'autoLoad ? feedCacheStorage.getCachedProducts() : []',
    ],
    [
      'src/events/application/view-models/useEventsOnFeedViewModel.ts',
      'autoLoad ? feedCacheStorage.getCachedEvents() : []',
    ],
    [
      'src/jobs/application/view-models/useJobsOnFeedViewModel.ts',
      'autoLoad ? feedCacheStorage.getCachedJobs() : []',
    ],
    [
      'src/pages/application/view-models/usePagesOnFeedViewModel.ts',
      'autoLoad ? feedCacheStorage.getCachedPages() : []',
    ],
    [
      'src/funding/application/view-models/useFundingOnFeedViewModel.ts',
      'autoLoad ? feedCacheStorage.getCachedFunding() : []',
    ],
  ];

  it.each(cases)(
    'does not parse %s during FeedScreen render when autoLoad is disabled',
    (relativePath, expectedInitializer) => {
      expect(read(relativePath)).toContain(expectedInitializer);
    },
  );
});
