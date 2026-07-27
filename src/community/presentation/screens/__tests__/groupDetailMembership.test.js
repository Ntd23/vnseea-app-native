const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('GroupDetailScreen membership and canonical data', () => {
  it('loads canonical group data and exposes join through the repository', () => {
    const repository = read(
      'src/community/domain/repositories/CommunityRepository.ts',
    );
    const screen = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );

    expect(repository).toContain('getGroupById(');
    expect(repository).toContain('joinGroup(');
    expect(screen).toContain('communityRepository.getGroupById');
    expect(screen).toContain('communityRepository.joinGroup');
  });

  it('keeps a successful join result when the canonical refresh fails', () => {
    const screen = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );

    expect(screen).toContain('const nextStatus = await communityRepository.joinGroup');
    expect(screen).toContain('catch (refreshError)');
    expect(screen).toContain('group_detail_refresh_after_join_failed');
  });

  it('does not render the Feed filter bar and only shows composer to members', () => {
    const screen = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );

    expect(screen).not.toContain('FeedFilterTabs');
    expect(screen).not.toContain('activeFilterSource');
    expect(screen).toContain('const canCreatePost =');
    expect(screen).toContain('{canCreatePost ? (');
    expect(screen).toContain(
      '{isJoinRequested ? copy.joinRequested : copy.joinGroup}',
    );
  });

  it('renders image fallbacks after native image loading errors', () => {
    const screen = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );

    expect(screen).toContain('onError={() => setImageFailed(true)}');
    expect(screen).toContain('onError={() => setCoverFailed(true)}');
  });
});
