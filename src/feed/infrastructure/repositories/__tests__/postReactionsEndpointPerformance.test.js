const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

describe('post reactions PHP endpoint', () => {
  it('uses one paginated user query and batched counts/follow state', () => {
    const source = fs.readFileSync(
      path.join(root, 'phtml/api/v2/endpoints/post-reactions.php'),
      'utf8',
    );

    expect(source).toContain("'love' => '2'");
    expect(source).toContain('GROUP BY r.`reaction`');
    expect(source).toContain('LIMIT {$offset}, {$limit}');
    expect(source).toContain('`following_id` IN ({$user_ids_sql})');
    expect(source).not.toContain('foreach ($reaction_types as $reaction_type)');
    expect(source).not.toContain('Wo_IsFollowing(');
    expect(source).not.toContain('Wo_UserData(');
  });
});
