const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

describe('chat media send performance contract', () => {
  it('returns picked files without picker-side re-encoding', () => {
    const chat = read('src/messages/presentation/screens/ChatScreen.tsx');
    const picker = chat.slice(
      chat.indexOf('const handlePickMedia = useCallback'),
      chat.indexOf('const handleRemoveAttachment = useCallback'),
    );

    expect(picker).toContain('quality: 1,');
    expect(picker).toContain("assetRepresentationMode: 'current'");
    expect(picker).not.toContain('maxWidth');
    expect(picker).toContain('startChatMediaPreparation');
    expect(picker).toContain('setIsPickingMedia(true)');
  });

  it('keeps the composer usable while earlier messages upload', () => {
    const chat = read('src/messages/presentation/screens/ChatScreen.tsx');

    expect(chat).not.toMatch(/\bisSending\s*\|\|/);
    expect(chat).not.toMatch(/!isSending\s*&&/);
    expect(chat).toContain('sendMessageBatch(outgoingMessages)');
    expect(chat).not.toContain('resolvePreparedAttachments');
  });

  it('registers the native upload image processor on both platforms', () => {
    const android = read(
      'android/app/src/main/java/com/vnseea/android/MainApplication.kt',
    );
    const androidModule = read(
      'android/app/src/main/java/com/vnseea/android/image/UploadImageProcessorModule.kt',
    );
    const xcodeProject = read('ios/VNSEEA.xcodeproj/project.pbxproj');
    const iosModule = read('ios/VNSEEA/VnseeaUploadImageProcessor.swift');

    expect(android).toContain('add(UploadImageProcessorPackage())');
    expect(androidModule).toContain('"VnseeaUploadImageProcessor"');
    expect(xcodeProject).toContain('VnseeaUploadImageProcessor.swift in Sources');
    expect(xcodeProject).toContain('VnseeaUploadImageProcessor.m in Sources');
    expect(iosModule).toContain('kCGImageSourceCreateThumbnailWithTransform: true');
    // Copying source metadata would re-add an Orientation tag to pixels that
    // are already upright.
    expect(iosModule).not.toContain('CGImageDestinationAddImageFromSource');
    expect(iosModule).not.toContain('kCGImagePropertyOrientation:');
  });
});
