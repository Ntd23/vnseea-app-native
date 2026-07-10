const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Group info modal safe area', () => {
  it('uses the parent chat safe-area top inset for the full-screen group info modal', () => {
    const source = read('src/messages/presentation/screens/ChatScreen.tsx');
    const groupInfoModalStart = source.indexOf('function GroupInfoModal({');
    const groupInfoModalEnd = source.indexOf('function ChatScreen(', groupInfoModalStart);
    const groupInfoModalBlock = source.slice(groupInfoModalStart, groupInfoModalEnd);

    expect(source).toContain('type Edge');
    expect(source).toContain('const GROUP_INFO_MODAL_SAFE_AREA_EDGES: Edge[] =');
    expect(source).toContain("Platform.OS === 'ios' ? ['left', 'right'] : ROOT_SAFE_AREA_EDGES");
    expect(groupInfoModalBlock).toContain('topInset,');
    expect(groupInfoModalBlock).toContain('topInset: number;');
    expect(groupInfoModalBlock).toContain('edges={GROUP_INFO_MODAL_SAFE_AREA_EDGES}');
    expect(groupInfoModalBlock).toContain('paddingTop: topInset');
    expect(source).toContain('topInset={insets.top}');
  });
});
