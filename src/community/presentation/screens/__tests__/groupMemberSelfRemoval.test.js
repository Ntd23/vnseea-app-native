const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = relativePath =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('group member self-removal guards', () => {
  it('hides the community remove action for the signed-in member', () => {
    const screen = read(
      'src/community/presentation/screens/CreateGroupScreen.tsx',
    );
    const repository = read(
      'src/community/infrastructure/repositories/ApiCommunityRepository.ts',
    );

    expect(screen).toContain('isSelfGroupMemberRemoval(currentUserId');
    expect(screen).toContain('SELF_GROUP_MEMBER_REMOVAL_MESSAGE');
    expect(screen).toContain('{isCurrentUser ? (');
    expect(repository).toContain('assertNotSelfGroupMemberRemoval(');
  });

  it('also protects the group-chat member removal path', () => {
    const screen = read(
      'src/messages/presentation/screens/GroupInfoScreen.tsx',
    );
    const repository = read(
      'src/messages/infrastructure/repositories/ApiMessagesRepository.ts',
    );

    expect(screen).toContain(
      '!isSelfGroupMemberRemoval(currentUserId, member.id)',
    );
    expect(repository).toContain('assertNotSelfGroupMemberRemoval(');
  });
});
