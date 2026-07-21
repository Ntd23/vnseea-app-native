const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function extractBlock(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('ChatScreen header navigation', () => {
  it('renders the header back button only outside iOS', () => {
    const source = read('src/messages/presentation/screens/ChatScreen.tsx');
    const headerBlock = extractBlock(
      source,
      '{/* Header */}',
      '{/* Messages */}',
    );

    expect(headerBlock).toContain("Platform.OS !== 'ios'");
    expect(headerBlock).toContain('navigation.goBack()');
    expect(headerBlock).toContain('<ArrowLeft size={22} color="#050505" />');
  });

  it('uses one pressable header area for avatar and conversation text', () => {
    const source = read('src/messages/presentation/screens/ChatScreen.tsx');
    const headerBlock = extractBlock(
      source,
      '{/* Header */}',
      '{/* Messages */}',
    );
    const detailsPressable = extractBlock(
      headerBlock,
      'onPress={handleOpenConversationInfo}',
      '{conversationHeaderActions.map',
    );

    expect(detailsPressable).toContain('source={{ uri: chat.avatar }}');
    expect(detailsPressable).toContain('{chat.name}');
    expect(detailsPressable).toContain('{conversationSubtitle}');
  });

  it('opens conversation details for one-to-one chats without treating chat id as a user id', () => {
    const source = read('src/messages/presentation/screens/ChatScreen.tsx');
    const handlerBlock = extractBlock(
      source,
      'const conversationPartnerId = useMemo(',
      'const conversationSubtitle = useMemo',
    );

    expect(handlerBlock).toContain('chat.participantId || chat.userId ||');
    expect(handlerBlock).not.toContain('chat.chatId');
    expect(handlerBlock).toContain(
      'navigation.navigate(ROUTES.CONVERSATION_DETAILS, { chat });',
    );
    expect(handlerBlock).not.toContain('navigateToUserProfile');
  });

  it('keeps group header taps routed to group info', () => {
    const source = read('src/messages/presentation/screens/ChatScreen.tsx');
    const handlerBlock = extractBlock(
      source,
      'const handleOpenConversationInfo = useCallback(() => {',
      'const conversationSubtitle = useMemo',
    );

    expect(handlerBlock).toContain("if (chat.chatType === 'group')");
    expect(handlerBlock).toContain(
      'navigation.navigate(ROUTES.GROUP_INFO, { chat });',
    );
    expect(handlerBlock).not.toContain('handleOpenGroupInfo();');
  });
});
