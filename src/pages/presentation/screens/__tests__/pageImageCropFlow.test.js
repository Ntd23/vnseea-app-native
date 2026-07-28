const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Page avatar and cover crop flow', () => {
  it('opens the shared profile cropper from the Edit Page media tab', () => {
    const source = read(
      'src/pages/presentation/screens/CreatePageScreen.tsx',
    );

    expect(source).toContain('PROFILE_IMAGE_PICKER_OPTIONS');
    expect(source).toContain('waitForImagePickerDismissal');
    expect(source).toContain('prepareProfileImageForCrop(asset, field)');
    expect(source).toContain(
      "const shouldCrop = field === 'avatar' || field === 'cover';",
    );
    expect(source).toContain('handleCroppedPageMedia');
    expect(source).toContain('target={pageCropRequest?.field ?? \'avatar\'}');
    expect(source).toContain('onComplete={handleCroppedPageMedia}');
    expect(source).toContain("if (field === 'background_image')");
  });

  it('crops before uploading from the Page detail avatar and cover controls', () => {
    const source = read(
      'src/pages/presentation/screens/PageDetailScreen.tsx',
    );

    expect(source).toContain('selectPageImageForCrop');
    expect(source).toContain('prepareProfileImageForCrop(asset, target)');
    expect(source).toContain("void selectPageImageForCrop('avatar')");
    expect(source).toContain("void selectPageImageForCrop('cover')");
    expect(source).toContain('await vm.updatePageAvatar(asset)');
    expect(source).toContain('await vm.updatePageCover(asset)');
    expect(source).toContain('target={pageCropRequest?.target ?? \'avatar\'}');
    expect(source).toContain('onComplete={handleCroppedPageImage}');
  });

  it('keeps the cropper header below tall Android status bars', () => {
    const cropper = read(
      'src/shared-kernel/presentation/components/ImageCropperModal.tsx',
    );

    expect(cropper).toContain('StatusBar.currentHeight');
    expect(cropper).toContain(
      'Math.max(insets.top, androidStatusBarHeight, 12)',
    );
    expect(cropper).toContain('paddingTop: topSafeInset + 8');
  });
});
