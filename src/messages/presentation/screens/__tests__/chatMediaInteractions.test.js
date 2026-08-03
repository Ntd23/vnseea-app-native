const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

describe('Chat media interaction contract', () => {
  it('forwards long press into the touchable used by a single image or video', () => {
    const chat = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(chat).toContain('onLongPress={() => onLongPress?.(message)}');
    expect(chat).toContain('onLongPress={onLongPress}');
    expect(chat).toContain('delayLongPress={320}');
  });

  it('creates and propagates a group id only for a multi-media send action', () => {
    const chat = read('src/messages/presentation/screens/ChatScreen.tsx');
    const viewModel = read(
      'src/messages/application/view-models/useChatViewModel.ts',
    );
    const repository = read(
      'src/messages/infrastructure/repositories/ApiMessagesRepository.ts',
    );

    expect(chat).toContain('groupableAttachmentCount > 1');
    expect(chat).toContain('? { mediaGroupId }');
    expect(viewModel).toContain('mediaGroupId: options?.mediaGroupId');
    expect(viewModel).toContain(
      'mediaGroupId: message.mediaGroupId ?? current.mediaGroupId',
    );
    expect(repository).toContain('media_group_id: options.mediaGroupId');
    expect(repository).toContain(
      "readString(raw, 'media_group_id', 'mediaGroupId')",
    );
  });

  it('persists media group ids in direct and group chat backend messages', () => {
    const directEndpoint = read('phtml/api/v2/endpoints/send-message.php');
    const groupEndpoint = read('phtml/api/v2/endpoints/group_chat.php');
    const migration = read(
      'phtml/database/migrations/20260803_message_media_groups.sql',
    );

    expect(directEndpoint).toContain("$message_data['media_group_id']");
    expect(groupEndpoint).toContain("$message_data['media_group_id']");
    expect(migration).toContain('ADD COLUMN `media_group_id` VARCHAR(64) NULL');
  });
});
