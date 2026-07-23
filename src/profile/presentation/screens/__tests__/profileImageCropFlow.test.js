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
    expect(source).toContain('PROFILE_AVATAR_OUTPUT_SIZE');
    expect(source).toContain('PROFILE_COVER_OUTPUT_SIZE');
    expect(source).toContain('PROFILE_AVATAR_ASPECT_RATIO');
    expect(source).toContain('PROFILE_COVER_ASPECT_RATIO');
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

  it('renders the profile cover at the same canonical 16:9 ratio', () => {
    const source = read(
      'src/profile/presentation/screens/ProfileScreen.tsx',
    );

    expect(source).toContain('PROFILE_COVER_ASPECT_RATIO');
    expect(source).toContain(
      'const PROFILE_COVER_HEIGHT = SCREEN_WIDTH / PROFILE_COVER_ASPECT_RATIO',
    );
    expect(source).not.toContain('const PROFILE_COVER_HEIGHT = 210');
  });

  it('uses canonical server urls instead of cropped temporary file urls', () => {
    const avatarViewerSource = read(
      'src/profile/presentation/screens/AvatarViewerScreen.tsx',
    );
    const coverViewerSource = read(
      'src/profile/presentation/screens/CoverViewerScreen.tsx',
    );

    expect(avatarViewerSource).toContain(
      'setLocalAvatarUrl(result.fullUrl || result.url)',
    );
    expect(avatarViewerSource).not.toContain('setLocalAvatarUrl(asset.uri)');
    expect(coverViewerSource).toContain(
      'setLocalCoverUrl(result.fullUrl || result.url)',
    );
  });
});
