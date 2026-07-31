const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = relativePath =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('group post identity header', () => {
  it('shows the group first with the member identity layered on its avatar', () => {
    const source = read(
      'src/feed/presentation/components/GroupPostIdentityHeader.tsx',
    );

    expect(source).toContain('{group.title}');
    expect(source).toContain('source={{ uri: group.avatarUrl }}');
    expect(source).toContain('source={{ uri: publisher.avatarUrl }}');
    expect(source).toContain('{publisherName}');
    expect(source).toContain('navigation.navigate(ROUTES.GROUP_DETAIL');
  });

  it('uses the group header for text, photo, video and poll cards', () => {
    const cards = read('src/feed/presentation/components/PostCards.tsx');
    const polls = read('src/feed/presentation/components/PollPostCard.tsx');
    const feed = read('src/feed/presentation/screens/FeedScreen.tsx');
    const groupDetail = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );

    expect(cards).toContain('if (showGroupContext && post?.groupContext)');
    expect(cards).toContain('<GroupPostIdentityHeader');
    expect(polls).toContain(
      'showIdentityHeader && showGroupContext && post.groupContext',
    );
    expect(polls).toContain('<GroupPostIdentityHeader');
    expect(
      (feed.match(/showGroupContext/g) || []).length,
    ).toBeGreaterThanOrEqual(3);
    expect(groupDetail).not.toContain('showGroupContext');
  });

  it('keeps the native app interaction bars for every post type', () => {
    const cards = read('src/feed/presentation/components/PostCards.tsx');
    const polls = read('src/feed/presentation/components/PollPostCard.tsx');

    expect(
      (cards.match(/<VideoPostActions/g) || []).length,
    ).toBeGreaterThanOrEqual(2);
    expect(polls).toContain('<FeedGlassActionBar');
  });
});
