const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Home and Messages navigation performance', () => {
  it('warms the Messages route and startup snapshot from both Home headers', () => {
    const androidHeader = read(
      'src/feed/presentation/components/FeedHeader.tsx',
    );
    const iosHeader = read(
      'src/feed/presentation/components/FeedHeader.ios.tsx',
    );

    for (const source of [androidHeader, iosHeader]) {
      expect(source).toContain('preloadMessagesStartupChats()');
      expect(source).toContain(
        "navigation.getParent()?.preload(ROUTES.MESSAGES)",
      );
      expect(source).toContain('useFocusEffect(');
    }
  });

  it('keeps expensive profile drawers unmounted until they are requested', () => {
    const androidHeader = read(
      'src/feed/presentation/components/FeedHeader.tsx',
    );
    const iosHeader = read(
      'src/feed/presentation/components/FeedHeader.ios.tsx',
    );
    const messages = read(
      'src/messages/presentation/screens/MessageScreen.tsx',
    );

    for (const source of [androidHeader, iosHeader, messages]) {
      expect(source).toContain('const [hasOpenedMenu, setHasOpenedMenu]');
      expect(source).toContain('{hasOpenedMenu ? (');
      expect(source).toContain('<HeaderProfileDrawer');
    }
  });

  it('uses lightweight latest-page syncs for realtime and polling updates', () => {
    const messages = read(
      'src/messages/presentation/screens/MessageScreen.tsx',
    );

    expect(messages).not.toContain('useNotificationBadgeViewModel();');
    expect(messages).toContain('await syncLatestChats();');
    expect(messages).toContain('syncLatestChats().catch(() => undefined);');
    expect(messages).not.toContain("forceRefresh: true,\n              includeDiscovery: false");
  });

  it('limits first-frame list work and preserves unchanged rows', () => {
    const messages = read(
      'src/messages/presentation/screens/MessageScreen.tsx',
    );

    expect(messages).toContain(
      'const ChatListItem = React.memo(function ChatListItem',
    );
    expect(messages).toContain(
      'initialNumToRender={MESSAGE_LIST_INITIAL_RENDER_COUNT}',
    );
    expect(messages).toContain('renderItem={renderConversationChatItem}');
    expect(messages).not.toContain(
      'extraData={`${activeFilter}:${selectedRecipients.size}',
    );
  });
});
