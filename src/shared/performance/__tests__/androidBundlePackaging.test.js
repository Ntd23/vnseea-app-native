const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '../../../..');
const buildGradlePath = path.join(repoRoot, 'android/app/build.gradle');
const checkedInBundlePath = path.join(
  repoRoot,
  'android/app/src/main/assets/index.android.bundle',
);

describe('Android standalone debug packaging', () => {
  it('bundles standalone debug builds without a checked-in JS bundle', () => {
    const buildGradle = fs.readFileSync(buildGradlePath, 'utf8');

    expect(buildGradle).toContain(
      'def standaloneDebugBuild = project.hasProperty("standaloneDebug")',
    );
    expect(buildGradle).toContain(
      'debuggableVariants = standaloneDebugBuild ? [] : ["debug", "debugOptimized"]',
    );
    expect(fs.existsSync(checkedInBundlePath)).toBe(false);
  });
});
