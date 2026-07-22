const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/stories/presentation/screens/StoryViewerScreen.tsx'),
  'utf8',
);

describe('Story Viewer reply gesture', () => {
  it('opens reply on upward swipe and keeps downward dismiss', () => {
    expect(source).toContain('const REPLY_SWIPE_THRESHOLD = 72;');
    expect(source).toContain('const REPLY_SWIPE_VELOCITY = -700;');
    expect(source).toContain('openReplyComposer');
    expect(source).toContain('closeReplyComposer');
    expect(source).toContain('Vuốt lên để trả lời');
  });

  it('sends a canonical Story reply without navigating away', () => {
    expect(source).toContain('story_id');
    expect(source).toContain('storyReply:');
    expect(source).toContain('Đã trả lời tin');
    expect(source).not.toContain('navigation.navigate(ROUTES.CHAT');
  });

  it('pauses the timer without resetting progress while composing', () => {
    expect(source).toContain('progressFractionRef');
    expect(source).toContain('isReplyComposerOpen');
    expect(source).toContain('segmentMs * (1 - progressFractionRef.current)');
  });
});
