const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const reelsScreenSource = fs.readFileSync(
  path.join(projectRoot, 'src/reels/presentation/screens/ReelsScreen.tsx'),
  'utf8',
);

describe('Reels scroll stability', () => {
  it('enables auto-scroll by default while preserving the stored preference', () => {
    expect(reelsScreenSource).toContain("'reels.autoScroll.v2'");
    expect(reelsScreenSource).toContain(
      "reelsStorage.getBoolean('reels.autoScroll.v2') ?? true",
    );
    expect(reelsScreenSource).toContain(
      "reelsStorage.set('reels.autoScroll.v2', next)",
    );
    expect(reelsScreenSource).toContain('disableIntervalMomentum');
  });
});
