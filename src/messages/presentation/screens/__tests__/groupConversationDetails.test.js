const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = relativePath =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('group conversation details', () => {
  it('uses one native-stack screen instead of the embedded group modal', () => {
    const types = read('src/navigation/types.ts');
    const chat = read('src/messages/presentation/screens/ChatScreen.tsx');
    const screen = read('src/messages/presentation/screens/GroupInfoScreen.tsx');

    expect(types).toContain('[ROUTES.GROUP_INFO]: { chat: ChatItem }');
    expect(chat).not.toContain('function GroupInfoModal(');
    expect(chat).not.toContain('<GroupInfoModal');
    expect(screen).toContain("edges={['top']}");
    expect(screen).toContain('ConversationScreenHeader');
    expect(screen).toContain('useFocusEffect(');
    expect(screen).not.toContain(
      "useEffect(() => {\n    loadGroupInfo(true).catch(() => undefined);",
    );
  });

  it('renders only real group actions with owner/member permission branches', () => {
    const screen = read('src/messages/presentation/screens/GroupInfoScreen.tsx');

    for (const copy of [
      'Tìm kiếm',
      'Tắt thông báo',
      'Tin nhắn đã ghim',
      'File phương tiện, liên kết và tệp',
      'Thêm thành viên',
      'Chỉnh sửa nhóm',
      'Xóa lịch sử với tôi',
      'Rời nhóm',
      'Xóa nhóm',
    ]) {
      expect(screen).toContain(copy);
    }
    expect(screen).toContain('groupInfo?.isOwner');
    expect(screen).not.toContain('onPress={() => undefined}');
    expect(screen).toContain('navigateToUserProfile');
    expect(screen).toContain('clearGroupHistory');
    expect(screen).toContain('setConversationNotifications');
  });

  it('reuses search, media and pinned screens with the full chat target', () => {
    const search = read(
      'src/messages/presentation/screens/ConversationSearchScreen.tsx',
    );
    const media = read(
      'src/messages/presentation/screens/ConversationMediaScreen.tsx',
    );

    expect(search).toContain('searchConversationMessages(chat,');
    expect(media).toContain('getConversationAssets(\n          chat,');
    expect(search).not.toContain('const participantId =');
    expect(media).not.toContain('const participantId =');
  });
});
