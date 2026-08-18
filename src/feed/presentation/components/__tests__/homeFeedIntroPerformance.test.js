const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../HomeFeedIntro.tsx'),
  'utf8',
);

describe('Android home stories rail performance', () => {
  it('virtualizes story cards instead of mounting the full horizontal rail', () => {
    expect(source).toContain('FlatList');
    expect(source).not.toContain('<ScrollView');
    expect(source).toContain('initialNumToRender={4}');
    expect(source).toContain('maxToRenderPerBatch={3}');
    expect(source).toContain('windowSize={3}');
    expect(source).toContain('removeClippedSubviews');
    expect(source).toContain('getItemLayout={getDefaultStoryRailItemLayout}');
  });
});
