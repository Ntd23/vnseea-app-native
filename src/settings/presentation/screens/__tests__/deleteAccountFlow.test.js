const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('delete account flow', () => {
  it('registers a dedicated native-stack screen from Settings', () => {
    const routes = read('src/navigation/constants/routes.ts');
    const types = read('src/navigation/types.ts');
    const registry = read('src/navigation/routeRegistry.tsx');
    const settings = read(
      'src/settings/presentation/screens/SettingsScreen.tsx',
    );

    expect(routes).toContain("DELETE_ACCOUNT: 'DeleteAccount'");
    expect(types).toContain('[ROUTES.DELETE_ACCOUNT]: undefined;');
    expect(registry).toContain(
      '{ name: ROUTES.DELETE_ACCOUNT, component: DeleteAccountScreen }',
    );
    expect(settings).toContain(
      'navigation.navigate(ROUTES.DELETE_ACCOUNT);',
    );
  });

  it('requires a secure password and final confirmation before deletion', () => {
    const screen = read(
      'src/settings/presentation/screens/DeleteAccountScreen.tsx',
    );

    expect(screen).toContain('secureTextEntry={!isPasswordVisible}');
    expect(screen).toContain('disabled={!password.trim() || isLoading}');
    expect(screen).toContain('Alert.alert(');
    expect(screen).toContain('copy.deletePermanently');
    expect(screen).toContain('await deleteAccount(password);');
    expect(screen).toContain("edges={['top', 'left', 'right', 'bottom']}");
  });
});
