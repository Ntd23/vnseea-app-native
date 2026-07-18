const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../../');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('profile image crop flow', () => {
  it('supports pan, pinch and fixed output sizes in the shared cropper', () => {
    const source = read(
      'src/shared-kernel/presentation/components/ImageCropperModal.tsx',
    );

    expect(source).toContain('Gesture.Pan()');
    expect(source).toContain('Gesture.Pinch()');
    expect(source).toContain('.numberOfTaps(2)');
    expect(source).toContain('captureRef(cropViewportRef');
    expect(source).toContain('{ width: 1080, height: 1080 }');
    expect(source).toContain('{ width: 1600, height: 900 }');
    expect(source).toContain('collapsable={false}');
  });

  it('opens the cropper before uploading from every profile image entry point', () => {
    const profileSource = read(
      'src/profile/presentation/screens/ProfileScreen.tsx',
    );
    const avatarViewerSource = read(
      'src/profile/presentation/screens/AvatarViewerScreen.tsx',
    );
    const coverViewerSource = read(
      'src/profile/presentation/screens/CoverViewerScreen.tsx',
    );

    expect(profileSource).toContain('selectProfileImageForCrop');
    expect(profileSource).toContain('handleCroppedProfileImage');
    expect(profileSource).toContain('target={profileCropRequest?.target');
    expect(avatarViewerSource).toContain('target="avatar"');
    expect(avatarViewerSource).toContain('onComplete={uploadAvatar}');
    expect(coverViewerSource).toContain('target="cover"');
    expect(coverViewerSource).toContain('onComplete={handleCroppedCover}');
  });
});
