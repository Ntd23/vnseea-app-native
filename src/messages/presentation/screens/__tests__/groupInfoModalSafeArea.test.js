const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Group info screen safe area', () => {
  it('owns the top safe area in its native-stack screen', () => {
    const chat = read('src/messages/presentation/screens/ChatScreen.tsx');
    const screen = read('src/messages/presentation/screens/GroupInfoScreen.tsx');

    expect(chat).not.toContain('GROUP_INFO_MODAL_SAFE_AREA_EDGES');
    expect(chat).not.toContain('isGroupInfoVisible');
    expect(screen).toContain('<SafeAreaView');
    expect(screen).toContain("edges={['top']}");
    expect(screen).toContain('ConversationScreenHeader');
  });
});
