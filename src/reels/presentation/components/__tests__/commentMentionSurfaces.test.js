const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('comment mention renderer coverage', () => {
  it.each([
    'src/reels/presentation/components/ReelCommentsSheet.tsx',
    'src/explore/presentation/screens/ExploreScreen.tsx',
    'src/blogs/presentation/screens/BlogDetailScreen.tsx',
    'src/movies/presentation/screens/MovieDetailScreen.tsx',
    'src/live/presentation/screens/LiveRoomScreen.tsx',
    'src/forum/presentation/screens/ForumScreen.tsx',
  ])('uses the shared renderer in %s', relativePath => {
    expect(read(relativePath)).toContain('CommentMentionText');
  });

  it('passes structured mention metadata on the Explore comment surface', () => {
    expect(
      read('src/explore/presentation/screens/ExploreScreen.tsx'),
    ).toContain('mentions={comment.mentions}');
  });
});
