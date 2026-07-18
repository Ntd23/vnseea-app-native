const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('post delete permissions', () => {
  const types = read('src/feed/domain/types/feed.types.ts');
  const repository = read('src/feed/infrastructure/repositories/ApiFeedRepository.ts');
  const genericMenu = read(
    'src/shared-kernel/presentation/components/PostMenuActionSheet.tsx',
  );
  const pageMenu = read(
    'src/pages/presentation/components/PagePostMenuActionSheet.tsx',
  );
  const groupMenu = read(
    'src/community/presentation/screens/GroupPostMenuActionSheet.tsx',
  );

  it('maps the backend permission into every post', () => {
    expect(types).toContain('export interface FeedPostPermissions');
    expect(types).toContain('permissions?: FeedPostPermissions');
    expect(repository).toContain(
      "canDelete: readBool(permissions, 'can_delete', 'canDelete')",
    );
  });

  it.each([
    ['generic', genericMenu],
    ['page', pageMenu],
    ['group', groupMenu],
  ])('hides delete and its related divider in the %s menu', (_name, source) => {
    expect(source).toContain('post.permissions?.canDelete === true');
  });
});
