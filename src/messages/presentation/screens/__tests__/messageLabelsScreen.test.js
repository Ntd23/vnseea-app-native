const fs = require('fs');
const path = require('path');

const read = relativePath => {
  const absolutePath = path.join(process.cwd(), relativePath);
  return fs.existsSync(absolutePath)
    ? fs.readFileSync(absolutePath, 'utf8')
    : '';
};

describe('message labels native-stack screen', () => {
  const routes = read('src/navigation/constants/routes.ts');
  const types = read('src/navigation/types.ts');
  const registry = read('src/navigation/routeRegistry.tsx');
  const exportsSource = read('src/messages/index.ts');
  const messages = read('src/messages/presentation/screens/MessageScreen.tsx');
  const screen = read(
    'src/messages/presentation/screens/MessageLabelsScreen.tsx',
  );
  const repositoryContract = read(
    'src/messages/domain/repositories/MessagesRepository.ts',
  );
  const repository = read(
    'src/messages/infrastructure/repositories/ApiMessagesRepository.ts',
  );
  const tagsEndpoint = read('phtml/api/v2/endpoints/tags.php');
  const tagFunctions = read('phtml/assets/includes/functions_one.php');

  it('registers a typed route with assign and create entry modes', () => {
    expect(routes).toContain("MESSAGE_LABELS: 'MessageLabels'");
    expect(types).toContain('export type MessageLabelTarget = {');
    expect(types).toContain("| { mode: 'assign'; target: MessageLabelTarget }");
    expect(types).toContain(
      "| { mode: 'create'; initialTarget?: MessageLabelTarget }",
    );
    expect(types).toContain(
      '[ROUTES.MESSAGE_LABELS]: MessageLabelsRouteParams;',
    );
    expect(exportsSource).toContain(
      "export { default as MessageLabelsScreen } from './presentation/screens/MessageLabelsScreen';",
    );
    expect(registry).toContain(
      '{ name: ROUTES.MESSAGE_LABELS, component: MessageLabelsScreen }',
    );
  });

  it('opens the same screen from customer assignment and broadcast creation', () => {
    expect(messages).toMatch(
      /navigation\.navigate\(ROUTES\.MESSAGE_LABELS, \{\s+mode: 'assign',/,
    );
    expect(messages).toMatch(
      /navigation\.navigate\(ROUTES\.MESSAGE_LABELS, \{\s+mode: 'create',/,
    );
    expect(messages).not.toContain('function MessageLabelsModal(');
    expect(messages).not.toContain('function CreateLabelBroadcastModal(');
  });

  it('uses the existing label APIs, safe area and native color picker', () => {
    expect(screen).toContain('typeof ROUTES.MESSAGE_LABELS');
    expect(screen).toContain('<SafeAreaView');
    expect(screen).toContain('<KeyboardAvoidingView');
    expect(screen).toContain('<ColorPicker');
    expect(screen).toContain('const DEFAULT_LABEL_COLOR = APP_BRAND_COLOR;');
    expect(screen).toContain('repository.listLabels()');
    expect(screen).toContain('repository.listTargetLabels(');
    expect(screen).toContain('repository.attachLabel(');
    expect(screen).toContain('repository.detachLabel(');
    expect(screen).toContain('repository.deleteLabel(');
    expect(screen).toContain('repository.updateLabel(');
  });

  it('renders assign and manage tabs with an actionable detach label state', () => {
    expect(screen).toContain("type ScreenMode = 'assign' | 'manage';");
    expect(screen).toContain("manageTab: 'Quản lý thẻ'");
    expect(screen).toContain("detach: 'Gỡ thẻ'");
    expect(screen).toContain(
      "route.params.mode === 'assign' ? 'assign' : 'manage'",
    );
    expect(screen).toContain("(['assign', 'manage'] as const)");
    expect(screen).toContain('attached ? copy.detach : copy.attach');
    expect(screen).not.toContain("attached: 'Đã gắn'");
  });

  it('uses thẻ terminology for customer labels across message screens', () => {
    expect(messages).toContain("openLabels: 'Gắn thẻ khách hàng'");
    expect(messages).toContain("broadcastLabel: 'Thẻ'");
    expect(messages).toContain("createNewLabelTitle: 'Tạo thẻ mới'");
    expect(screen).toContain("title: 'Thẻ khách hàng'");
    expect(screen).toContain("create: 'Tạo thẻ'");

    const customerLabelCopy = `${messages}\n${screen}`
      .replaceAll('nhãn dán', '')
      .replaceAll('Nhãn dán', '');

    expect(customerLabelCopy).not.toMatch(/nhãn/i);
  });

  it('places the create/edit form above the managed label list', () => {
    expect(screen).toContain('testID="message-labels-manage-list"');
    expect(screen).toContain('testID="message-labels-create-form"');
    expect(screen).toContain('repository.deleteLabel(label.id)');
    expect(screen).toContain('copy.manageLabels');
    expect(screen.indexOf('testID="message-labels-create-form"')).toBeLessThan(
      screen.indexOf('<Pencil'),
    );
  });

  it('supports editing a label without replacing its id or assignments', () => {
    expect(repositoryContract).toContain(
      'updateLabel(labelId: string, name: string, color: string): Promise<void>;',
    );
    expect(repository).toContain("s: 'update_label'");
    expect(repository).toContain('label_id: labelId');
    expect(tagsEndpoint).toContain("if ($action == 'update_label')");
    expect(tagsEndpoint).toContain('Wo_UpdateTagLabel($label_id, array(');
    expect(tagFunctions).toContain('function Wo_UpdateTagLabel(');
    expect(tagFunctions).toContain(
      'WHERE owner_id={$owner_id} AND id={$label_id} LIMIT 1',
    );
    expect(screen).toContain('const startEditingLabel = useCallback(');
    expect(screen).toContain('<Pencil');
    expect(screen).toContain('editingLabel ? copy.update : copy.create');
  });

  it('allows selecting a one-to-one target before assigning labels', () => {
    expect(screen).toContain('selectedTarget');
    expect(screen).toContain('selectCustomer');
    expect(screen).toContain('repository.listTargetLabels(target.userId)');
    expect(screen).toContain("chat.chatType !== 'user'");
  });
});
