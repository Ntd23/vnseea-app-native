const fs = require('fs');
const path = require('path');

function read(relativePath) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('Home and Messages navigation performance', () => {
  it('warms Messages data without mounting a placeholder route', () => {
    const androidHeader = read(
      'src/feed/presentation/components/FeedHeader.tsx',
    );
    const iosHeader = read(
      'src/feed/presentation/components/FeedHeader.ios.tsx',
    );

    for (const source of [androidHeader, iosHeader]) {
      expect(source).toContain('preloadMessagesStartupChats()');
      expect(source).not.toContain(
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

  it('matches the Android Home header chrome without showing a logo hint', () => {
    const messages = read(
      'src/messages/presentation/screens/MessageScreen.tsx',
    );

    expect(messages).toContain("const isAndroid = Platform.OS === 'android'");
    expect(messages).toContain('isAndroid ? styles.androidHeaderRoot : null');
    expect(messages).toContain('backgroundColor: APP_BRAND_COLOR');
    expect(messages).toContain('APP_COLORS.brand.onPrimary');
    expect(messages).not.toContain('showTooltip');
    expect(messages).not.toContain('styles.tooltipBubble');
  });

  it('uses lightweight latest-page syncs for realtime and polling updates', () => {
    const messages = read(
      'src/messages/presentation/screens/MessageScreen.tsx',
    );
    const viewModel = read(
      'src/messages/application/view-models/useMessagesViewModel.ts',
    );

    expect(messages).not.toContain('useNotificationBadgeViewModel();');
    expect(messages).toContain('await syncLatestChats();');
    expect(viewModel).toContain('const [latestChats, groupChats] = await Promise.all');
    expect(viewModel).toContain('repository.getGroupChats().catch(() => [])');
    expect(viewModel).toContain(
      'mergeChatItems(prev.chats, latestChats, groupChats)',
    );
    expect(messages).toContain('MESSAGE_LIST_FALLBACK_POLL_DELAYS_MS');
    expect(messages).toContain('getBoundedFallbackPollDelay(');
    expect(messages).not.toContain('const interval = setInterval(() => {');
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
