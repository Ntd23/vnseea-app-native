const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('Home feed video autoplay safety', () => {
  it('does not activate the first feed video before it is viewable', () => {
    const feedScreenSource = read('src/feed/presentation/screens/FeedScreen.tsx');

    expect(feedScreenSource).not.toContain('Autoplay the first video on mount / load');
    expect(feedScreenSource).not.toContain("feedPosts.find(p => p.kind === 'video')");
  });

  it('uses shared muted autoplay state instead of local-only unmute behavior', () => {
    const postCardsSource = read('src/feed/presentation/components/PostCards.tsx');

    expect(postCardsSource).toContain('export let feedVideoMutedSnapshot = true');
    expect(postCardsSource).toContain('function useFeedVideoMuted()');
    expect(postCardsSource).toContain('publishFeedVideoMuted(!muted)');
    expect(postCardsSource).not.toContain('setMuted(false)');
    expect(postCardsSource).not.toContain('setMuted(true)');
    expect(postCardsSource).not.toContain('const [muted, setMuted] = useState(');
  });
});
