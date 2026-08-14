const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('message relationship activity backend contract', () => {
  it('returns recent follow activity and records timestamps for new relationships', () => {
    const friendsEndpoint = read('phtml/api/v2/endpoints/get-friends.php');
    const chatsEndpoint = read('phtml/api/v2/endpoints/get_chats.php');
    const followFunctions = read('phtml/assets/includes/functions_one.php');
    const realtimeRelay = read('phtml/client/realtime/notification-server.mjs');
    const messagesRepository = read(
      'src/messages/infrastructure/repositories/ApiMessagesRepository.ts',
    );

    expect(friendsEndpoint).toContain("$_POST['sort_by_activity']");
    expect(friendsEndpoint).toContain('ctype_digit($requested_user_id)');
    expect(friendsEndpoint).toContain('$activity_owner_user_id');
    expect(friendsEndpoint).toContain("'relationship_activity_at'");
    expect(friendsEndpoint).toContain('ORDER BY `relationship_activity_at` DESC');
    expect(chatsEndpoint).toContain('COALESCE(MAX(f.`time`), 0)');
    expect(followFunctions).toContain(
      '(`following_id`,`follower_id`,`active`,`time`)',
    );
    expect(followFunctions).toContain("SET `active` = '1', `time` =");
    expect(followFunctions).toContain(
      'VNSEEA_PublishRealtimeRelationshipPair',
    );
    expect(followFunctions).toContain("'relationships' => array(");
    expect(followFunctions).toContain(
      'Wo_IsFollowRequested($follower_id, $following_id)',
    );
    expect(followFunctions).toContain(
      '$updated_request = $query && mysqli_affected_rows($sqlConnect) === 1;',
    );
    expect(followFunctions).toContain('mysqli_begin_transaction($sqlConnect)');
    expect(followFunctions).toContain('mysqli_commit($sqlConnect)');
    expect(realtimeRelay).toContain('relationship: ["relationship:changed"]');
    expect(messagesRepository).toContain('sort_by_activity: 1');
  });
});
