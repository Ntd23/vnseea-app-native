const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Group info native-stack navigation', () => {
  it('uses the stack gesture instead of a manual modal pan responder', () => {
    const registry = read('src/navigation/routeRegistry.tsx');
    const chat = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(registry).toContain('{ name: ROUTES.GROUP_INFO, component: GroupInfoScreen }');
    expect(chat).toContain(
      'navigation.navigate(ROUTES.GROUP_INFO, { chat: displayChat })',
    );
    expect(chat).not.toContain('GROUP_INFO_DISMISS_SWIPE_DISTANCE');
    expect(chat).not.toContain('groupInfoDismissPanResponder');
  });
});
