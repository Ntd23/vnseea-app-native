const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('ReelItem publisher display', () => {
  it('shows the publisher display name before falling back to username', () => {
    const source = read('src/reels/presentation/components/ReelItem.tsx');

    expect(source).toContain('{item.publisher.name || item.publisher.username || \'unknown\'}');
    expect(source).not.toContain('@{item.publisher.username || item.publisher.name || \'unknown\'}');
  });
});
