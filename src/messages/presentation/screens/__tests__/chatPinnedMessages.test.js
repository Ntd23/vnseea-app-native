const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const read = relativePath =>
  fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

describe('Chat pinned messages', () => {
  it('renders a compact expandable pinned banner directly below the header', () => {
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
    expect(banner).toContain('getPinnedMessageText(latestPinnedMessage)');
    expect(banner).toContain('pinnedMessages.length');
    expect(banner).not.toContain('Tin nhắn đã ghim\n');
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
    expect(repository).toContain("'pinned_by_user_id'");
    expect(repository).toContain("readBool(item, 'can_unpin')");
  });

  it('renders persisted pin events as centered timeline rows', () => {
    const types = read('src/messages/domain/types/messages.types.ts');
    const repository = read(
      'src/messages/infrastructure/repositories/ApiMessagesRepository.ts',
    );
    const chat = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(types).toContain("type: 'message_pinned'");
    expect(types).toContain('systemEvent?: MessageSystemEvent');
    expect(repository).toContain('mapMessageSystemEvent');
    expect(chat).toContain("return 'system-message-pinned'");
    expect(chat).toContain('<PinnedMessageSystemRow');
    expect(chat).toContain('targetMessageId');
  });
});
