const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

describe('message push grouping contract', () => {
  it('announces the album size with every item of a multi-media send', () => {
    const chat = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(chat).toContain(
      '{ mediaGroupId, mediaGroupSize: groupableAttachmentCount }',
    );
  });

  it('renders group pushes as an Android group conversation', () => {
    const renderer = read(
      'android/app/src/main/java/com/vnseea/android/messages/MessagePushNotification.kt',
    );

    expect(renderer).toContain('data.optString("sender_name")');
    expect(renderer).toContain('data.optString("conversation_title")');
    expect(renderer).toContain('.setConversationTitle(conversationTitle)');
    expect(renderer).toContain('.setGroupConversation(isGroupConversation)');
    // Each group member keeps a stable identity across pushes.
    expect(renderer).toContain('data.optString("sender_id")');
  });

  it('keeps the mirrored backend sending one push per album', () => {
    const push = read('phtml/assets/includes/vnseea_push_delivery.php');
    const media = read('phtml/assets/includes/vnseea_message_media.php');

    expect(push).toContain('VNSEEA_UpsertMediaGroupPushDelivery(');
    expect(push).toContain("' đã gửi đến '");
    expect(media).toContain('function VNSEEA_MessageMediaGroupSize(');
  });
});
