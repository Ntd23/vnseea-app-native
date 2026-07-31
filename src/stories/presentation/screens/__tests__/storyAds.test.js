const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('story ad delivery', () => {
  it('hydrates story ads as viewer-only inventory', () => {
    const viewModel = read(
      'src/stories/application/view-models/useStoriesViewModel.ts',
    );
    const types = read('src/stories/domain/types/stories.types.ts');
    const expiration = read('src/stories/domain/policies/storyExpiration.ts');

    expect(viewModel).toContain('feedRepository.getAllPosts(30)');
    expect(viewModel).toContain('canAdAppearInStoryViewer(post.appears)');
    expect(viewModel).toContain('isAd: true');
    expect(viewModel).toContain('storyAds,');
    expect(viewModel).toContain('allStories.filter(story => !story.isAd)');
    expect(types).toContain('adTargetUrl?: string;');
    expect(expiration).toContain('if (story.isAd)');
  });

  it('hides ad tiles from discovery UI and keeps the viewer CTA', () => {
    const cell = read('src/stories/presentation/components/StoryGridCell.tsx');
    const home = read('src/feed/presentation/components/HomeFeedIntro.tsx');
    const viewer = read('src/stories/presentation/screens/StoryViewerScreen.tsx');

    expect(cell).not.toContain('row.isAd');
    expect(home).not.toContain('story.isAd');
    expect(viewer).toContain('selectNextStoryAd');
    expect(viewer).toContain('storyAdRotationStorage.markViewed');
    expect(viewer).toContain('handleOpenAd');
    expect(viewer).toContain('Tìm hiểu thêm');
  });

  it('keeps story-only ads off the home feed', () => {
    const feed = read('src/feed/presentation/screens/FeedScreen.tsx');
    expect(feed).toContain('canPostAppearOnHomeFeed');
    expect(feed).toContain('canAdAppearInHomeFeed(post.appears)');
  });
});
