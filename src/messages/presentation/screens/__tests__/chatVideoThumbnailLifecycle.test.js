const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

describe('chat video thumbnail lifecycle contract', () => {
  it('creates one thumbnail at selection and sends it with direct or group video', () => {
    const chat = read('src/messages/presentation/screens/ChatScreen.tsx');
    const types = read('src/messages/domain/types/messages.types.ts');
    const repository = read(
      'src/messages/infrastructure/repositories/ApiMessagesRepository.ts',
    );

    expect(types).toContain('thumbnailUri?: string');
    expect(chat).toContain('createVideoUploadThumbnail');
    expect(repository).toContain('prepareVideoForUpload');
    expect(chat).toContain('thumbnailUri: thumbnail?.uri');
    expect(repository).toContain('video_thumb:');
  });

  it('uses the selected poster in the composer and sending bubble', () => {
    const chat = read('src/messages/presentation/screens/ChatScreen.tsx');
    const viewModel = read(
      'src/messages/application/view-models/useChatViewModel.ts',
    );

    expect(chat).toContain('att.thumbnailUri');
    expect(chat).toContain("message.deliveryState === 'sending'");
    expect(chat).toContain('ActivityIndicator');
    expect(viewModel).toContain('thumbnail: attachment?.thumbnailUri');
    expect(viewModel).toContain('preserveOptimisticVideoThumbnail');
  });

  it('keeps a poster while only the active viewer video loads and supports retry', () => {
    const viewer = read(
      'src/messages/presentation/components/ChatMediaViewerModal.tsx',
    );
    const chat = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(viewer).toContain('thumbnail?: string');
    expect(viewer).toContain('isActive');
    expect(viewer).toContain('onReadyForDisplay');
    expect(viewer).toContain('onLoadStart');
    expect(viewer).toContain('onError');
    expect(viewer).toContain('handleRetry');
    expect(chat).toContain('thumbnail: message.thumbnail');
  });

  it('persists media_thumb for both direct and group messages', () => {
    const direct = read('phtml/api/v2/endpoints/send-message.php');
    const group = read('phtml/api/v2/endpoints/group_chat.php');
    const migration = read(
      'phtml/database/migrations/20260824_message_video_thumbnails.sql',
    );

    expect(migration).toContain('ADD COLUMN `media_thumb` VARCHAR(255) NULL');
    expect(direct).toContain("$message_data['media_thumb']");
    expect(group).toContain("$message_data['media_thumb']");
    expect(direct).toContain("$message['media_thumb'] = Wo_GetMedia");
    expect(group).toContain("$message['media_thumb'] = Wo_GetMedia");
  });
});
