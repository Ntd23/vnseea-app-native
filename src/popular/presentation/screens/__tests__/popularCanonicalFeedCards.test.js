const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');

describe('Popular Posts canonical Feed cards', () => {
  it('maps backend rows through the canonical Feed mapper', () => {
    const repository = read(
      'src/popular/infrastructure/repositories/ApiPopularRepository.ts',
    );
    expect(repository).toContain("import { mapFeedPost }");
    expect(repository).toContain('.map(raw => mapFeedPost(raw))');
  });

  it('uses interactive Feed cards and the existing action surfaces', () => {
    const screen = read('src/popular/presentation/screens/PopularScreen.tsx');

    expect(screen).toContain('TextPostCard');
    expect(screen).toContain('HomeVideoPostCard');
    expect(screen).toContain('PollPostCard');
    expect(screen).toContain('FeedShareBottomSheet');
    expect(screen).toContain('PostMenuActionSheet');
    expect(screen).toContain('handleToggleReaction');
    expect(screen).toContain('navigateToPostComments');
    expect(screen).not.toContain('function PostCard(');
  });
});
