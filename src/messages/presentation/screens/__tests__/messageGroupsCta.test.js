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
    const groupsPageEnd = source.indexOf(
      "ListEmptyComponent={renderListEmpty('groups')}",
      groupsPageStart,
    );
    const groupsHeaderBlock = source.slice(groupsPageStart, groupsPageEnd);

    expect(groupsHeaderBlock).toContain('SearchBar');
    expect(groupsHeaderBlock).toContain('handleCreateGroupChat');
    expect(groupsHeaderBlock).toContain('copy.createGroupChat');
    expect(source).toContain(
      'const handleCreateGroupChat = useCallback(() => {',
    );
    expect(source).toContain('navigation.navigate(ROUTES.CREATE_GROUP_CHAT);');
  });

  it('keeps the floating mark-all-read action separate from group creation', () => {
    const source = read('src/messages/presentation/screens/MessageScreen.tsx');
    const floatingActionBlock = source.slice(
      source.indexOf("{activeFilter !== 'broadcast' && ("),
      source.indexOf(
        '<ToastContainer',
        source.indexOf("{activeFilter !== 'broadcast' && ("),
      ),
    );

    expect(floatingActionBlock).toContain('onPress={handleMarkAllAsRead}');
    expect(floatingActionBlock).not.toContain('handleCreateGroupChat');
  });

  it('allows conversation details to preselect the other participant', () => {
    const types = read('src/navigation/types.ts');
    const createGroup = read(
      'src/messages/presentation/screens/CreateGroupScreen.tsx',
    );

    expect(types).toContain('initialMember?: ConversationGroupMember');
    expect(createGroup).toContain('route.params?.initialMember');
    expect(createGroup).toContain('setSelectedUsers');
  });

  it('uses an Instagram-style story ring in the messages story rail', () => {
    const source = read('src/messages/presentation/screens/MessageScreen.tsx');

    expect(source).toContain("import Svg, {");
    expect(source).toContain('LinearGradient as SvgLinearGradient');
    expect(source).toContain('Circle as SvgCircle');
    expect(source).toContain('styles.messageStoryInstagramRing');
    expect(source).toContain('styles.messageStoryRingSvg');
    expect(source).toContain('id="messageStoryInstagramGradient"');
    expect(source).toContain('stroke="url(#messageStoryInstagramGradient)"');
    expect(source).toContain('<Stop offset="0%" stopColor="#FEDA75" />');
    expect(source).toContain('<Stop offset="19%" stopColor="#FA7E1E" />');
    expect(source).toContain('<Stop offset="45%" stopColor="#D62976" />');
    expect(source).toContain('<Stop offset="72%" stopColor="#962FBF" />');
    expect(source).toContain('<Stop offset="100%" stopColor="#4F5BD5" />');
    expect(source).toContain('strokeWidth="4.2"');
    expect(source).toContain('opacity: 0.95');
    expect(source).toContain('styles.messageStoryAvatarFrame');
    expect(source).toContain('styles.messageStoryRingSvgSeen');
    expect(source).not.toContain("hasUnseen ? 'border-blue-500' : 'border-gray-200'");
    expect(source).not.toContain('messageStoryRingGlowPink');
  });
});
