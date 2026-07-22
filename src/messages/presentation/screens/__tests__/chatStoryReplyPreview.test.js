const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Story reply message preview', () => {
  it('renders a dedicated Story card in ChatScreen', () => {
    const chat = read('src/messages/presentation/screens/ChatScreen.tsx');
    const card = read(
      'src/messages/presentation/components/StoryReplyMessageCard.tsx',
    );

    expect(chat).toContain('StoryReplyMessageCard');
    expect(chat).toContain('message.storyReply');
    expect(chat).toContain("return 'story-reply'");
    expect(chat).toContain('isSentByMe={Boolean(isSentByMe)}');
    expect(chat).toContain('conversationName={chatName}');
    expect(card).toContain('Tin không còn khả dụng');
    expect(card).toContain('ROUTES.STORY_VIEWER');
    expect(card).toContain('Play');
    expect(card).toContain('Bạn đã trả lời tin của');
    expect(card).toContain('Đã trả lời tin của bạn');
    expect(card).toContain('styles.bubble');
    expect(card).toContain("sentBubble: '#2563EB'");
  });

  it('keeps Story metadata in nested reply previews', () => {
    const reply = read('src/messages/application/replies/messageReply.ts');

    expect(reply).toContain("case 'story':");
    expect(reply).toContain('storyReply: message.storyReply');
  });

  it('keeps Story metadata in optimistic chat messages', () => {
    const viewModel = read(
      'src/messages/application/view-models/useChatViewModel.ts',
    );

    expect(viewModel).toContain('storyReply: options?.storyReply');
    expect(viewModel).toMatch(/options\?\.storyReply\s*\?\s*'story'/);
  });
});
