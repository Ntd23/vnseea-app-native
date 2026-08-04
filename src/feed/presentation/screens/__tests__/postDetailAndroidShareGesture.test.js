const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../PostDetailScreen.tsx'),
  'utf8',
);

describe('Post Detail Android share interaction', () => {
  it('keeps the custom edge swipe gesture iOS-only', () => {
    expect(source).toContain("Platform.OS === 'ios' &&");
    expect(source).toContain("if (Platform.OS !== 'ios')");
  });

  it('blocks back gestures while the share surface is visible', () => {
    expect(source).toMatch(
      /const isPostDetailSwipeBackBlocked\s*=\s*[\s\S]*shareModalVisible/,
    );
  });

  it('opens sharing from the post supplied by the canonical card', () => {
    expect(source).toContain('const handleOpenShare = useCallback((selectedPost?: FeedPost)');
    expect(source).toContain('const targetPost = selectedPost ?? activePost;');
  });
});
