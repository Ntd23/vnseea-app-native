const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Group info modal swipe dismiss', () => {
  it('allows the iOS full-screen group info modal to close with a horizontal swipe', () => {
    const source = read('src/messages/presentation/screens/ChatScreen.tsx');
    const groupInfoModalStart = source.indexOf('function GroupInfoModal({');
    const groupInfoModalEnd = source.indexOf('function ChatScreen(', groupInfoModalStart);
    const groupInfoModalBlock = source.slice(groupInfoModalStart, groupInfoModalEnd);

    expect(source).toContain('const GROUP_INFO_DISMISS_SWIPE_DISTANCE =');
    expect(groupInfoModalBlock).toContain('PanResponder.create({');
    expect(groupInfoModalBlock).toContain("Platform.OS !== 'ios'");
    expect(groupInfoModalBlock).toContain('Math.abs(gestureState.dx)');
    expect(groupInfoModalBlock).toContain('onPanResponderRelease');
    expect(groupInfoModalBlock).toContain('onClose();');
    expect(groupInfoModalBlock).toContain('{...groupInfoDismissPanResponder.panHandlers}');
  });
});
