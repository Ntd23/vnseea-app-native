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
    expect(source).toContain("Platform.OS === 'android' ? 'scale' : 'resize'");
    expect(source).toContain('captureLockRef.current');
    expect(source).toContain("Platform.OS === 'android' ? 'none' : 'fade'");
    expect(source).toContain('onError={handleImageLoadError}');
    expect(source).toContain('<Animated.View');
    expect(source).toContain('onLoadEnd={() =>');
    expect(source).toContain('CROP_IMAGE_READY_FALLBACK_MS = 1_200');
    expect(source).toContain('const fallbackTimer = setTimeout');
    expect(source).toContain('styles.cropCaptureSurface');
    expect(source).not.toContain("'VnseeaProfileCropImageView'");
    expect(source).not.toContain('usesNativeAndroidPreview');
    expect(source).not.toContain('<Animated.Image');
    expect(source).not.toContain('renderToHardwareTextureAndroid');
  });

  it('prepares a memory-bounded native preview after the picker closes', () => {
    const source = read(
      'src/shared-kernel/presentation/utils/profileImagePicker.ts',
    );
    const androidSource = read(
      'android/app/src/main/java/com/vnseea/android/image/ProfileImageToolsModule.kt',
    );

    expect(source).toContain('quality: 1');
    expect(source).not.toContain('maxWidth:');
    expect(source).not.toContain('maxHeight:');
    expect(source).toContain('waitForImagePickerDismissal');
    expect(source).toContain('requestAnimationFrame(() => {');
    expect(source).toContain('prepareProfileImageForCrop');
    expect(source).toContain('VnseeaProfileImageTools');
    expect(source).toContain('Native preview failed:');
    expect(source).toContain('return asset;');
    expect(source).toContain('PROFILE_AVATAR_PREVIEW_MAX_DIMENSION = 1024');
    expect(source).toContain('PROFILE_COVER_PREVIEW_MAX_DIMENSION = 1600');
    expect(androidSource).toContain('ImageDecoder.MEMORY_POLICY_LOW_RAM');
    expect(androidSource).toContain('decoder.setTargetSize');
    expect(androidSource).toContain('clearMemoryCaches()');

  });

  it('exports the exact canonical cover geometry expected by the API', () => {
    const source = read(
      'src/shared-kernel/application/constants/profileImageGeometry.ts',
    );

    expect(source).toContain('width: 1600');
    expect(source).toContain('height: 900');
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
    expect(profileSource).toContain(
      'prepareProfileImageForCrop(asset, target)',
    );
    expect(avatarViewerSource).toContain(
      "prepareProfileImageForCrop(asset, 'avatar')",
    );
    expect(coverViewerSource).toContain("'cover'");
    expect(profileSource).toContain('requestAnimationFrame(() => resolve())');
    expect(avatarViewerSource).toContain(
      'requestAnimationFrame(() => resolve())',
    );
    expect(coverViewerSource).toContain(
      'requestAnimationFrame(() => resolve())',
    );
  });

  it('uses the cover button as a direct change-cover action', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain('onPress={handleChangeCover}');
    expect(source).toContain("language === 'vi' ? 'Thay ảnh bìa' : 'Change cover'");
    expect(source).not.toContain('onPress={handleEditProfilePress}');
  });

  it('renders the profile cover at the same canonical 16:9 ratio', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

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
