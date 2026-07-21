import { NativeModules, Platform } from 'react-native';

type CameraReleaseStatus = 'stopped' | 'timeout' | 'superseded' | 'not_required';

type CameraReleaseResult = {
  status: CameraReleaseStatus;
};

type NativeCameraLifecycle = {
  prepareForPreviewStop(timeoutMs: number): Promise<number>;
  waitForPreviewStop(token: number): Promise<CameraReleaseResult>;
};

const nativeCameraLifecycle = NativeModules.VnseeaCameraLifecycle as
  | NativeCameraLifecycle
  | undefined;

function nextAnimationFrame() {
  return new Promise<void>(resolve => {
    requestAnimationFrame(() => resolve());
  });
}

export async function prepareIosLiveCameraRelease(): Promise<
  () => Promise<CameraReleaseResult>
> {
  if (Platform.OS !== 'ios' || !nativeCameraLifecycle) {
    return async () => {
      await nextAnimationFrame();
      return { status: 'not_required' };
    };
  }

  const token = await nativeCameraLifecycle.prepareForPreviewStop(2500);
  return () => nativeCameraLifecycle.waitForPreviewStop(token);
}
