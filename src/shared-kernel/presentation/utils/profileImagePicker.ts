import { NativeModules, Platform } from 'react-native';
import type { Asset, ImageLibraryOptions } from 'react-native-image-picker';

type PreparedProfileImage = {
  uri: string;
  width: number;
  height: number;
  fileName: string;
  type: string;
};

type ProfileImageToolsModule = {
  preparePreview: (
    uri: string,
    maxDimension: number,
  ) => Promise<PreparedProfileImage>;
};

const PROFILE_AVATAR_PREVIEW_MAX_DIMENSION = 1024;
const PROFILE_COVER_PREVIEW_MAX_DIMENSION = 1600;

export const PROFILE_IMAGE_PICKER_OPTIONS: ImageLibraryOptions = {
  mediaType: 'photo',
  selectionLimit: 1,
  includeBase64: false,
  // Keep the original file here. On Android, asking image-picker to resize
  // first decodes the full camera bitmap and can itself exhaust native memory.
  quality: 1,
};

export const prepareProfileImageForCrop = async (
  asset: Asset,
  target: 'avatar' | 'cover',
): Promise<Asset> => {
  if (!asset.uri || Platform.OS !== 'android') {
    return asset;
  }

  const nativeTools = NativeModules.VnseeaProfileImageTools as
    | ProfileImageToolsModule
    | undefined;
  if (!nativeTools?.preparePreview) {
    return asset;
  }

  let preview: PreparedProfileImage;
  try {
    preview = await nativeTools.preparePreview(
      asset.uri,
      target === 'avatar'
        ? PROFILE_AVATAR_PREVIEW_MAX_DIMENSION
        : PROFILE_COVER_PREVIEW_MAX_DIMENSION,
    );
  } catch (error) {
    // Some gallery providers expose a content URI that the native helper
    // cannot reopen after the picker closes. The React Native Image pipeline
    // may still render it, so keep the original asset as a safe fallback.
    console.warn('[profileImagePicker] Native preview failed:', error);
    return asset;
  }

  return {
    ...asset,
    uri: preview.uri,
    width: preview.width,
    height: preview.height,
    fileName: preview.fileName,
    type: preview.type,
    fileSize: undefined,
  };
};

/** Let the native picker finish dismissing before showing our crop modal. */
export const waitForImagePickerDismissal = (): Promise<void> =>
  new Promise(resolve => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
