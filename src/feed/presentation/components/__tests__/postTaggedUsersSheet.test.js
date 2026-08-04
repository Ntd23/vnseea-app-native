const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.resolve(__dirname, relativePath), 'utf8');

describe('post tagged users sheet', () => {
  it('renders tagged users with avatar and name and closes before navigation', () => {
    const source = read('../PostTaggedUsersSheet.tsx');

    expect(source).toContain('user.avatarUrl');
    expect(source).toContain('{user.name}');
    expect(source).toContain('pendingProfileUserIdRef');
    expect(source).toContain('navigateToUserProfile');
    expect(source).toContain('onDismiss={handleModalDismiss}');
  });

  it('replaces text-only alerts across post preview surfaces', () => {
    const cards = read('../PostCards.tsx');
    const poll = read('../PollPostCard.tsx');
    const shared = read('../SharedPostPreviewCard.tsx');

    for (const source of [cards, poll, shared]) {
      expect(source).toContain('<PostTaggedUsersSheet');
    }
    expect(cards).not.toContain("post.taggedUsers.map(user => user.name).join('\\n')");
  });
});
