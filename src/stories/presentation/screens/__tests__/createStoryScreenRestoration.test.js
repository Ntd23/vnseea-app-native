const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../..');
const source = fs.readFileSync(
  path.join(root, 'src/stories/presentation/screens/CreateStoryScreen.tsx'),
  'utf8',
);

describe('Create Story screen restoration', () => {
  it('keeps the Story-specific header and separate media pickers', () => {
    expect(source).toContain("headerTitle: 'Tạo tin'");
    expect(source).toContain('const handlePickImage = useCallback');
    expect(source).toContain("mediaType: 'photo' as MediaType");
    expect(source).toContain('const handlePickVideo = useCallback');
    expect(source).toContain("mediaType: 'video' as MediaType");
    expect(source).not.toContain("mediaType: 'mixed' as MediaType");
  });

  it('opens the full-screen story editor once media is picked', () => {
    const editorSource = fs.readFileSync(
      path.join(root, 'src/stories/presentation/components/overlay/StoryEditor.tsx'),
      'utf8',
    );

    expect(source).toContain('if (vm.media) {');
    expect(source).toContain('<StoryEditor');
    expect(source).toContain('onShare={handleSubmit}');
    expect(source).toContain('<SafeAreaView');
    expect(source).toContain("edges={['top']}");
    // Text overlays replace the old title/description form.
    expect(source).not.toContain('copy.titlePlaceholder');
    expect(source).not.toContain('height: 440');
    expect(source).not.toContain("headerTitle: 'Tạo trạng thái mới'");
    expect(source).not.toContain('mediaPlaceholder');
    expect(editorSource.match(/resizeMode="contain"/g)).toHaveLength(2);
  });
});
