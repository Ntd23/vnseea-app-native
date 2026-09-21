const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');
const read = relativePath =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('chat message recall contract', () => {
  it('exposes recall only for owned one-to-one and group messages', () => {
    const screen = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(screen).toContain('selectedOptionMessage?.isSentByMe');
    expect(screen).toContain("chat.chatType !== 'page'");
    expect(screen).toContain('handleSelectOptionRecall');
    expect(screen).toContain('style: \'destructive\'');
  });

  it('protects ownership and publishes realtime after a successful recall', () => {
    const endpoint = read('phtml/api/v2/endpoints/recall_message.php');

    expect(endpoint).toContain("(int)$message->from_id !== $current_user_id");
    expect(endpoint).toContain('__VNSEEA_MESSAGE_RECALLED__:');
    expect(endpoint).toContain('VNSEEA_PublishRealtimeMessageChange');
    expect(endpoint.indexOf('->update(T_MESSAGES')).toBeLessThan(
      endpoint.indexOf('VNSEEA_PublishRealtimeMessageChange'),
    );
  });
});
