const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    'src/stories/infrastructure/repositories/ApiStoriesRepository.ts',
  ),
  'utf8',
);

describe('stories repository startup performance', () => {
  it('does not synchronously log every story while the home feed is mounting', () => {
    expect(source).not.toContain('console.log(');
    expect(source).not.toContain('[StoriesRepo]');
    expect(source).not.toContain('[ApiStoriesRepository] mapStory');
  });
});
