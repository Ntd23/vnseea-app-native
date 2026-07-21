const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Go Live keyboard avoidance', () => {
  it('moves only the bottom controls and keeps the preview stable', () => {
    const source = read('src/live/presentation/screens/GoLiveScreen.tsx');

    expect(source).not.toContain('KeyboardSafeView');
    expect(source).toContain("Dimensions.get('screen')");
    expect(source).toContain("'keyboardWillChangeFrame'");
    expect(source).toContain("'keyboardWillHide'");
    expect(source).toContain('IOS_LIVE_KEYBOARD_GAP');
    expect(source).toContain('transform: [{ translateY:');
    expect(source).toContain('returnKeyType="done"');
  });

  it('releases the setup camera before opening the LiveKit room', () => {
    const source = read('src/live/presentation/screens/GoLiveScreen.tsx');
    const handler = source.slice(
      source.indexOf('const handleStartLive'),
      source.indexOf('const handleBack'),
    );

    expect(handler).toContain('prepareIosLiveCameraRelease()');
    expect(handler).toContain('setPreviewEnabled(false)');
    expect(handler).toContain('await waitForCameraRelease()');
    expect(handler.indexOf('prepareIosLiveCameraRelease()')).toBeLessThan(
      handler.indexOf('setPreviewEnabled(false)'),
    );
    expect(handler.indexOf('await waitForCameraRelease()')).toBeLessThan(
      handler.indexOf('navigation.replace(ROUTES.LIVE_ROOM'),
    );
    expect(source).not.toContain('setTimeout(resolve, 80)');
  });

  it('uses the native AVCaptureSession stop notification on iOS', () => {
    const nativeSource = read('ios/VNSEEA/VNSEEALiveKitNativeView.swift');
    const bridgeSource = read('ios/VNSEEA/VNSEEALiveKitNativeViewManager.m');

    expect(nativeSource).toContain('AVCaptureSession.didStopRunningNotification');
    expect(nativeSource).toContain('@objc(VnseeaCameraLifecycle)');
    expect(bridgeSource).toContain('RCT_EXTERN_MODULE(VnseeaCameraLifecycle');
    expect(bridgeSource).toContain('prepareForPreviewStop');
    expect(bridgeSource).toContain('waitForPreviewStop');
  });
});
