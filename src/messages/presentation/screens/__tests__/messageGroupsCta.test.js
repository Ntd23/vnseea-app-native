const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Messages groups tab create CTA', () => {
  it('renders a create group chat CTA in the groups tab header', () => {
    const source = read('src/messages/presentation/screens/MessageScreen.tsx');
    const groupsPageStart = source.indexOf('{/* PAGE 2: Groups (Các nhóm) */}');
    const groupsPageEnd = source.indexOf('ListEmptyComponent={renderListEmpty(\'groups\')}', groupsPageStart);
    const groupsHeaderBlock = source.slice(groupsPageStart, groupsPageEnd);

    expect(groupsHeaderBlock).toContain('SearchBar');
    expect(groupsHeaderBlock).toContain('handleCreateGroupChat');
    expect(groupsHeaderBlock).toContain('copy.createGroupChat');
    expect(source).toContain('const handleCreateGroupChat = useCallback(() => {');
    expect(source).toContain('navigation.navigate(ROUTES.CREATE_GROUP_CHAT);');
  });

  it('keeps the floating mark-all-read action separate from group creation', () => {
    const source = read('src/messages/presentation/screens/MessageScreen.tsx');
    const floatingActionBlock = source.slice(
      source.indexOf("{activeFilter !== 'broadcast' && ("),
      source.indexOf('<ToastContainer', source.indexOf("{activeFilter !== 'broadcast' && (")),
    );

    expect(floatingActionBlock).toContain('onPress={handleMarkAllAsRead}');
    expect(floatingActionBlock).not.toContain('handleCreateGroupChat');
  });
});
