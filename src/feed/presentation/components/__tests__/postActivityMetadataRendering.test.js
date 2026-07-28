const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

describe('post activity metadata rendering', () => {
  it('uses the shared formatter in regular post identity headers', () => {
    const source = read('../PostCards.tsx');

    expect(source).toContain('buildPostActivityContext({');
    expect(source).toContain('taggedUsers: post?.taggedUsers');
    expect(source).toContain('location: post?.location');
    expect(source).toContain('numberOfLines={2}');
    expect(source).toContain('postActivity.segments.map');
    expect(source).toContain("segment.kind === 'feeling'");
    expect(source).toContain("segment.kind === 'location'");
    expect(source).not.toContain(
      "post.feeling && (\\n              <View className=\"flex-row",
    );
  });

  it('uses the same formatter for polls and shared-post previews', () => {
    const pollSource = read('../PollPostCard.tsx');
    const sharedSource = read('../SharedPostPreviewCard.tsx');

    for (const source of [pollSource, sharedSource]) {
      expect(source).toContain('buildPostActivityContext({');
      expect(source).toContain('taggedUsers:');
      expect(source).toContain('location:');
      expect(source).toContain('numberOfLines={2}');
      expect(source).toContain('.segments.map');
    }
  });
});
