const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../../../../..');
const screensRoot = path.join(projectRoot, 'src');

function listScreenFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return listScreenFiles(fullPath);
    }

    if (
      entry.isFile() &&
      entry.name.endsWith('.tsx') &&
      fullPath.includes(`${path.sep}presentation${path.sep}screens${path.sep}`) &&
      !entry.name.includes('.codex-backup')
    ) {
      return [fullPath];
    }

    return [];
  });
}

describe('focus-aware status bar usage', () => {
  it('uses route focus when rendering StatusBar from screen files', () => {
    const offenders = listScreenFiles(screensRoot)
      .filter(filePath => fs.readFileSync(filePath, 'utf8').includes('<StatusBar'))
      .map(filePath => path.relative(projectRoot, filePath));

    expect(offenders).toEqual([]);
  });
});
