const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const reelsScreenSource = fs.readFileSync(
  path.join(projectRoot, 'src/reels/presentation/screens/ReelsScreen.tsx'),
  'utf8',
);

describe('Reels scroll stability', () => {
  it('defaults to manual one-page scrolling in both directions', () => {
    expect(reelsScreenSource).toContain("'reels.autoScroll.v2'");
    expect(reelsScreenSource).toContain('?? false');
    expect(reelsScreenSource).toContain('disableIntervalMomentum');
  });
});
