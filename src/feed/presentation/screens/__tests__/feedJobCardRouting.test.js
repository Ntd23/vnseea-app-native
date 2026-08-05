const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/feed/presentation/screens/FeedScreen.tsx'),
  'utf8',
);
const viewModelSource = fs.readFileSync(
  path.join(
    process.cwd(),
    'src/feed/application/view-models/useFeedViewModel.ts',
  ),
  'utf8',
);

describe('Feed job card routing', () => {
  it('keeps canonical job posts in the main Feed and renders the job card branch', () => {
    expect(source).toContain("case 'job':");
    expect(source).not.toContain("p.kind !== 'job'");
    expect(viewModelSource).not.toContain("post.kind !== 'job'");
  });
});
