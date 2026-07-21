const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('Live camera preview contract', () => {
  it('uses CameraKit cover preview on iOS and reports actual startup', () => {
    const source = read(
      'src/live/presentation/components/LiveCameraPreview.tsx',
    );

    expect(source).toContain("from 'react-native-camera-kit'");
    expect(source).toContain('export type LiveCameraPreviewStatus');
    expect(source).toContain("requestCallMediaPermissions('video')");
    expect(source).toContain("Platform.OS === 'ios'");
    expect(source).toContain('cameraType=');
    expect(source).toContain('resizeMode="cover"');
    expect(source).toContain('onZoom={handlePreviewReady}');
    expect(source).toContain('onError={handlePreviewError}');
    expect(source).not.toContain('onLayout={handlePreviewReady}');
    expect(source).not.toContain('Camera live tạm thời chỉ hỗ trợ Android.');
  });

  it('keeps Android preview center-cropped and reports the first frame', () => {
    const source = read(
      'android/app/src/main/java/com/vnseea/android/live/LiveCameraPreviewView.kt',
    );
    const manager = read(
      'android/app/src/main/java/com/vnseea/android/live/LiveCameraPreviewManager.kt',
    );

    expect(source).toContain('Matrix()');
    expect(source).toContain('applyPreviewTransform');
    expect(source).toContain('textureView.setTransform');
    expect(source).toContain('Looper.getMainLooper()');
    expect(source).toContain('onSurfaceTextureUpdated');
    expect(source).toContain('emitPreviewStatus("ready")');
    expect(manager).toContain('onPreviewStatusChange');
  });
});
