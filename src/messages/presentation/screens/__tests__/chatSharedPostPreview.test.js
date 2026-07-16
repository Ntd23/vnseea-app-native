const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('ChatScreen shared post preview', () => {
  it('renders shared posts as a dedicated list item and opens Post Detail', () => {
    const source = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(source).toContain('SharedPostMessageCard');
    expect(source).toContain("return 'shared-post'");
    expect(source).toContain(
      'keyExtractor={item => `${getChatListItemType(item)}:${item.id}`}',
    );
    expect(source).toContain('message.sharedPost');
    expect(source).toContain('ROUTES.POST_DETAIL');
    expect(source).toContain('postId');
    expect(source).toContain('onOpenSharedPost');
  });

  it('adds a shared-post reference to optimistic messages', () => {
    const source = read(
      'src/messages/application/view-models/useChatViewModel.ts',
    );

    expect(source).toContain('parseSharedPostMessage');
    expect(source).toContain(
      'sharedPost: parseSharedPostMessage(message, apiConfig.webBaseUrl)',
    );
  });

  it('keeps the message-share backend payload text-only', () => {
    const source = read(
      'src/feed/infrastructure/repositories/ApiFeedRepository.ts',
    );
    const messageShare = source.slice(
      source.indexOf("if (input.destination === 'message')"),
      source.indexOf('// We don\'t have a fresh FeedPost'),
    );

    expect(messageShare).toContain('text: messageBody');
    expect(messageShare).not.toContain('post_id:');
    expect(messageShare).not.toContain('message_type:');
  });
});
