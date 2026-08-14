const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

describe('ReelItem caption integration', () => {
  it('uses the measured expandable caption without replacing the video item', () => {
    const source = fs.readFileSync(
      path.join(projectRoot, 'src/reels/presentation/components/ReelItem.tsx'),
      'utf8',
    );

    expect(source).toContain("import { ReelCaption } from './ReelCaption'");
    expect(source).toContain('<ReelCaption');
    expect(source).toContain('reelId={item.id}');
    expect(source).toContain('text={item.caption}');
    expect(source).not.toContain(
      '<Text style={styles.caption} numberOfLines={3}>',
    );
  });
});
