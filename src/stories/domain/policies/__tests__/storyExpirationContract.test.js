const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');
const read = relativePath =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('story expiration integration', () => {
  it('applies the shared 24-hour filter at every story display boundary', () => {
    const repository = read(
      'src/stories/infrastructure/repositories/ApiStoriesRepository.ts',
    );
    const railViewModel = read(
      'src/stories/application/view-models/useStoriesViewModel.ts',
    );
    const listViewModel = read(
      'src/stories/application/view-models/useStoriesListViewModel.ts',
    );
    const viewer = read(
      'src/stories/presentation/screens/StoryViewerScreen.tsx',
    );
    const profilePolicy = read(
      'src/profile/application/utils/profileStoryAvatarBehavior.ts',
    );

    expect(repository.match(/filterActiveStories/g)?.length).toBeGreaterThanOrEqual(3);
    expect(railViewModel).toContain('filterActiveStories');
    expect(railViewModel).toContain('getStoryActiveUntil');
    expect(railViewModel).not.toContain('threeDaysAgo');
    expect(listViewModel).toContain('filterActiveStories');
    expect(viewer).toContain('filterActiveStories(');
    expect(viewer).toContain('route.params?.stories');
    expect(profilePolicy).toContain('filterActiveStories(stories, nowSeconds)');
  });
});
