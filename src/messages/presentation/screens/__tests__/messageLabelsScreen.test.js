const fs = require('fs');
const path = require('path');

const read = relativePath => {
  const absolutePath = path.join(process.cwd(), relativePath);
  return fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : '';
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

  it('registers a typed route with assign and create modes', () => {
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
    expect(screen).toContain("typeof ROUTES.MESSAGE_LABELS");
    expect(screen).toContain('<SafeAreaView');
    expect(screen).toContain('<KeyboardAvoidingView');
    expect(screen).toContain('<ColorPicker');
    expect(screen).toContain('repository.listLabels()');
    expect(screen).toContain('repository.listTargetLabels(');
    expect(screen).toContain('repository.attachLabel(');
    expect(screen).toContain('repository.detachLabel(');
    expect(screen).toContain('repository.deleteLabel(');
    expect(screen).toContain('Promise.allSettled(');
  });
});
