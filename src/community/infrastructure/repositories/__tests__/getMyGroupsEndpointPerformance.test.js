// Description: Guards the my-groups endpoint against per-group member count queries.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

describe('get-my-groups PHP endpoint', () => {
  it('loads member counts in one grouped query', () => {
    const source = fs.readFileSync(
      path.join(root, 'phtml/api/v2/endpoints/get-my-groups.php'),
      'utf8',
    );

    expect(source).toContain('GROUP BY `group_id`');
    expect(source).toContain('$attach_group_member_counts($groups);');
    expect(source).not.toContain('Wo_CountGroupMembers(');
  });
});
