const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('one-to-one conversation details', () => {
  it('registers typed detail, search, media and pinned routes', () => {
    const routes = read('src/navigation/constants/routes.ts');
    const types = read('src/navigation/types.ts');
    const registry = read('src/navigation/routeRegistry.tsx');

    for (const route of [
      'CONVERSATION_DETAILS',
      'CONVERSATION_SEARCH',
      'CONVERSATION_MEDIA',
      'CONVERSATION_PINNED',
    ]) {
      expect(routes).toContain(`${route}:`);
      expect(types).toContain(`[ROUTES.${route}]`);
      expect(registry).toContain(`ROUTES.${route}`);
    }
    expect(types).toContain('highlightMessageId?: string');
  });

  it('uses the app theme and top safe area with only real actions', () => {
    const source = read(
      'src/messages/presentation/screens/ConversationDetailsScreen.tsx',
    );

    expect(source).toContain("edges={['top']}");
    expect(source).toContain('surface-base');
    expect(source).toContain('surface-card');
    expect(source).toContain('Trang cá nhân');
    expect(source).toContain('Tìm kiếm');
    expect(source).toContain('Tắt thông báo');
    expect(source).toContain('Tạo nhóm');
    expect(source).toContain('File phương tiện, liên kết và tệp');
    expect(source).toContain('Tin nhắn đã ghim');
    expect(source).toContain('Chia sẻ thông tin liên hệ');
    expect(source).toContain('Chặn');
    expect(source).toContain('Báo cáo');
    expect(source).toContain('Xóa đoạn chat');
    expect(source).toContain('apiConfig.webBaseUrl');
    expect(source).toContain("Alert.alert(\n      'Xóa đoạn chat?'");
    expect(source).toContain('navigation.popTo(ROUTES.MESSAGES)');
    expect(source).toContain('reportVisible');
    expect(source).not.toContain('Mã hóa đầu cuối');
    expect(source).not.toContain('Tin nhắn tự hủy');
  });

  it('provides real repository operations for every rendered action', () => {
    const contract = read(
      'src/messages/domain/repositories/MessagesRepository.ts',
    );
    const implementation = read(
      'src/messages/infrastructure/repositories/ApiMessagesRepository.ts',
    );
    const apiRoutes = read(
      'src/shared-kernel/application/constants/route-registry.ts',
    );

    for (const method of [
      'searchConversationMessages',
      'getConversationAssets',
      'setConversationNotifications',
      'getPinnedMessages',
      'setMessagePinned',
      'blockConversationUser',
      'reportConversationUser',
    ]) {
      expect(contract).toContain(`${method}(`);
      expect(implementation).toContain(`async ${method}(`);
    }
    for (const route of [
      'chat:',
      'mute:',
      'pinnedMessages:',
      'pinMessage:',
      'reportUser:',
    ]) {
      expect(apiRoutes).toContain(route);
    }
  });

  it('uses separate functional screens for search, media and pinned messages', () => {
    const search = read(
      'src/messages/presentation/screens/ConversationSearchScreen.tsx',
    );
    const media = read(
      'src/messages/presentation/screens/ConversationMediaScreen.tsx',
    );
    const pinned = read(
      'src/messages/presentation/screens/ConversationPinnedScreen.tsx',
    );

    expect(search).toContain('searchConversationMessages');
    expect(search).toContain('highlightMessageId');
    expect(media).toContain('getConversationAssets');
    expect(media).toContain('requestVersionRef');
    expect(media).toContain('nextCursor');
    expect(media).toContain('extractConversationLink');
    expect(media).toContain("'media'");
    expect(media).toContain("'files'");
    expect(media).toContain("'links'");
    expect(pinned).toContain('getPinnedMessages');
    expect(pinned).toContain('setMessagePinned');
  });

  it('supports pinning from the existing message action sheet', () => {
    const source = read('src/messages/presentation/screens/ChatScreen.tsx');
    const viewModel = read(
      'src/messages/application/view-models/useChatViewModel.ts',
    );

    expect(source).toContain('handleSelectOptionPin');
    expect(source).toContain('Ghim tin nhắn');
    expect(source).toContain('setMessagePinned');
    expect(source).toContain('findConversationMessageListItemIndex');
    expect(source).toContain('onScrollToIndexFailed');
    expect(source).not.toContain(
      'chat.participantId || chat.userId || chat.chatId',
    );
    expect(viewModel).toContain('initialLoadPromiseRef');
    expect(viewModel).toContain('await initialLoadPromiseRef.current');
    expect(viewModel).toContain('throw err');
  });

  it('keeps synthetic recipients separate from conversation record ids', () => {
    const messages = read(
      'src/messages/presentation/screens/MessageScreen.tsx',
    );
    const broadcastStart = messages.indexOf('const broadcastRecipientChats');
    const broadcastEnd = messages.indexOf(
      'const filteredBroadcastRecipients',
      broadcastStart,
    );

    expect(messages.slice(broadcastStart, broadcastEnd)).not.toContain(
      'chatId: recipient.userId',
    );
  });

});
