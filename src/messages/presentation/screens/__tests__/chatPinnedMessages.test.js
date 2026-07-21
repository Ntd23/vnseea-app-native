const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const read = relativePath =>
  fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

describe('Chat pinned messages', () => {
  it('renders an inline expandable pinned banner directly below the header', () => {
    const chat = read('src/messages/presentation/screens/ChatScreen.tsx');
    const banner = read(
      'src/messages/presentation/components/PinnedMessagesBanner.tsx',
    );

    expect(chat).toContain('<PinnedMessagesBanner');
    expect(chat.indexOf('<PinnedMessagesBanner')).toBeGreaterThan(
      chat.indexOf('{/* Header */}'),
    );
    expect(chat.indexOf('<PinnedMessagesBanner')).toBeLessThan(
      chat.indexOf('{/* Messages */}'),
    );
    expect(banner).toContain('maxHeight: 240');
    expect(banner).toContain('expanded');
    expect(banner).toContain('pinnedMessages[0]');
    expect(banner).toContain('onOpenMessage');
  });

  it('loads and toggles pinned messages for user and group chats', () => {
    const viewModel = read(
      'src/messages/application/view-models/useChatViewModel.ts',
    );
    const repository = read(
      'src/messages/infrastructure/repositories/ApiMessagesRepository.ts',
    );

    expect(viewModel).toContain('pinnedMessages');
    expect(viewModel).toContain('loadPinnedMessages');
    expect(viewModel).toContain('repository.getPinnedMessages(chat)');
    expect(repository).toContain("chat.chatType === 'group' ? 'group' : 'user'");
    expect(repository).toContain("readNumber(item, 'pinned_at')");
  });
});
