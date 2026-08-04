const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const read = relativePath =>
  fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');

describe('iOS voice messages', () => {
  it('keeps the native M4A filename and audio MIME on iOS', () => {
    const recorder = read(
      'src/shared-kernel/application/hooks/useAudioRecorder.ts',
    );

    expect(recorder).toContain("Platform.OS === 'ios'");
    expect(recorder).toContain(".m4a`");
    expect(recorder).toContain("type: 'audio/mp4'");
    expect(recorder).toContain('validateRecordedAudioFile');
  });

  it('requires the mirrored backend to reject failed audio uploads', () => {
    const direct = read('phtml/api/v2/endpoints/send-message.php');
    const group = read('phtml/api/v2/endpoints/group_chat.php');

    expect(direct).toContain("$is_audio_message");
    expect(direct).toContain("$media === false");
    expect(group).toContain("$is_audio_message");
    expect(group).toContain("$message_data['type_two'] = 'audio'");
    expect(group).toContain("$media === false");
  });

  it('uses the cross-platform recorder for iOS voice comments', () => {
    const commentsSheet = read(
      'src/reels/presentation/components/ReelCommentsSheet.tsx',
    );
    const iosRecorder = read(
      'src/shared-kernel/application/hooks/useCommentAudioRecorder.ios.ts',
    );
    const androidRecorder = read(
      'src/shared-kernel/application/hooks/useCommentAudioRecorder.ts',
    );
    const commentsEndpoint = read('phtml/api/v2/endpoints/comments.php');

    expect(commentsSheet).toContain('useCommentAudioRecorder');
    expect(commentsSheet).not.toContain('useWavAudioRecorder');
    expect(iosRecorder).toContain('useAudioRecorder');
    expect(androidRecorder).toContain('useWavAudioRecorder');
    expect(commentsEndpoint).toContain('mp3,wav,ogg,m4a,mp4,aac');
    expect(commentsEndpoint).toContain("$media === false");
  });
});
