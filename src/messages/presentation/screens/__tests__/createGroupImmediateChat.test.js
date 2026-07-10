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

describe('Group chat immediate membership backend contract', () => {
  it('lets API v2 create group chats with auto-active selected members', () => {
    const functionsSource = read('phtml/assets/includes/functions_three.php');
    const endpointSource = read('phtml/api/v2/endpoints/group_chat.php');

    expect(functionsSource).toContain(
      "function Wo_CreateGChat($name = false, $parts = array(), $type = 'group', $auto_active = false)",
    );
    expect(functionsSource).toContain('$active = $auto_active ? 1 : 0;');
    expect(endpointSource).toMatch(/Wo_CreateGChat\(\$name,\s*\$users,\s*\$type,\s*true\)/);
  });

  it('adds selected users as active members and can reactivate pending rows', () => {
    const source = read('phtml/api/v2/endpoints/group_chat.php');
    const addUserBlock = extractBlock(
      source,
      "if ($_POST['type'] == 'add_user')",
      "if ($_POST['type'] == 'search_addable_users')",
    );

    expect(addUserBlock).toContain("`active` = '1'");
    expect(addUserBlock).toContain('UPDATE " . T_GROUP_CHAT_USERS');
    expect(addUserBlock).toContain("(`id`,`user_id`,`group_id`,`active`,`last_seen`) VALUES");
    expect(addUserBlock).not.toContain('$active = 0;');
  });

  it('only excludes active members from addable user search', () => {
    const source = read('phtml/api/v2/endpoints/group_chat.php');
    const searchBlock = extractBlock(
      source,
      "if ($_POST['type'] == 'search_addable_users')",
      "if ($_POST['type'] == 'remove_user')",
    );

    expect(searchBlock).toMatch(
      /SELECT\s+`user_id`\s+FROM\s+" \. T_GROUP_CHAT_USERS \. "\s+WHERE\s+`group_id`\s+=\s+\{\$group_id\}\s+AND\s+`active`\s+=\s+'1'/,
    );
  });
});

describe('Create group screen opens the created chat immediately', () => {
  it('maps WoWonder group_id responses into the group chat item id', () => {
    const source = read('src/messages/infrastructure/repositories/ApiGroupChatRepository.ts');

    expect(source).toContain('id: Number(raw?.id ?? raw?.group_id ?? 0)');
  });

  it('maps the created group to a Chat route payload and replaces into chat', () => {
    const source = read('src/messages/presentation/screens/CreateGroupScreen.tsx');

    expect(source).toContain("import { ROUTES } from '../../../navigation/constants/routes';");
    expect(source).toContain("import type { ChatItem } from '../../domain/types/messages.types';");
    expect(source).toContain('function mapCreatedGroupToChat(group: GroupChatItem): ChatItem');
    expect(source).toContain("chatType: 'group'");
    expect(source).toContain('groupId: String(group.id)');
    expect(source).toContain('navigation.replace(ROUTES.CHAT, {');
    expect(source).toContain('chat: mapCreatedGroupToChat(result)');
  });

  it('does not show the old invite success delay before leaving the screen', () => {
    const source = read('src/messages/presentation/screens/CreateGroupScreen.tsx');

    expect(source).not.toContain('setShowSuccessModal(true)');
    expect(source).not.toContain('setTimeout(() => {');
    expect(source).not.toContain('Thành viên được mời cần chấp nhận lời mời');
  });
});
