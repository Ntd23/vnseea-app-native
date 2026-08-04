const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function collectSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') return [];
      return collectSourceFiles(absolutePath);
    }

    return /\.(?:js|ts|tsx)$/.test(entry.name) ? [absolutePath] : [];
  });
}

describe('app-wide Snackbar contract', () => {
  it('mounts exactly one global host above the navigation tree', () => {
    const appSource = read('App.tsx');

    expect(appSource).toContain('import { SnackbarProvider }');
    expect(appSource.match(/<SnackbarProvider>/g)).toHaveLength(1);
    expect(appSource.match(/<\/SnackbarProvider>/g)).toHaveLength(1);
    expect(appSource.indexOf('<SnackbarProvider>')).toBeLessThan(
      appSource.indexOf('<AppNavigator />'),
    );
  });

  it('keeps position, duration, queueing and accessibility centralized', () => {
    const source = read(
      'src/shared-kernel/presentation/components/Snackbar.tsx',
    );

    expect(source).toContain('SNACKBAR_SHORT_DURATION_MS = 3200');
    expect(source).toContain('SNACKBAR_LONG_DURATION_MS = 5000');
    expect(source).toContain('SNACKBAR_TOP_SAFE_GAP = 8');
    expect(source).toContain('useSafeAreaInsets');
    expect(source).toContain('Math.max(insets.top, SNACKBAR_EDGE_GAP)');
    expect(source).not.toContain('bottom: Math.max(insets.bottom');
    expect(source).toContain('MAX_QUEUED_SNACKBARS = 3');
    expect(source).toContain('accessibilityRole="alert"');
    expect(source).toContain('duration?: SnackbarDuration');
    expect(source).toContain('pointerEvents="auto"');
    expect(source).toContain('testID="snackbar-close"');
    expect(source).toContain('dismissFallbackRef');
    expect(source).toContain('key={queue[0].id}');
  });

  it('does not allow screen-level toast hosts or platform-only ToastAndroid', () => {
    const sourceRoot = path.join(root, 'src');
    const legacyAdapter = path.join(
      sourceRoot,
      'shared-kernel/presentation/components/ToastNotification.tsx',
    );
    const source = collectSourceFiles(sourceRoot)
      .filter(file => file !== legacyAdapter)
      .map(file => fs.readFileSync(file, 'utf8'))
      .join('\n');

    expect(source).not.toContain('<ToastContainer');
    expect(source).not.toContain('ToastAndroid');
    expect(source).not.toContain("presentation/components/ToastNotification'");
  });
});
