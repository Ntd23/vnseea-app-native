const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('group and event post realtime viewport subscriptions', () => {
  it.each([
    'src/community/presentation/screens/GroupDetailScreen.tsx',
    'src/events/presentation/screens/EventDetailScreen.tsx',
  ])('%s watches visible posts instead of the first page', relativePath => {
    const source = read(relativePath);

    expect(source).toContain('useScrollViewPostRealtimeIds');
    expect(source).toContain('onScroll={realtimePostViewport.onScroll}');
    expect(source).toContain('realtimePostViewport.onPostLayout(post.id, event)');
    expect(source).not.toContain('postIds: posts.slice(0, 20)');
  });
});
