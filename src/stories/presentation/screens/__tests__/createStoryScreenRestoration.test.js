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
    expect(source).toContain("publishButton: 'Đăng'");
    expect(source).toContain('const handlePickImage = useCallback');
    expect(source).toContain("mediaType: 'photo' as MediaType");
    expect(source).toContain('const handlePickVideo = useCallback');
    expect(source).toContain("mediaType: 'video' as MediaType");
    expect(source).not.toContain("mediaType: 'mixed' as MediaType");
  });

  it('uses the large contain preview and removes the generic status form', () => {
    expect(source).toContain('height: 440');
    expect(source).toMatch(/resizeMode="contain"/);
    expect(source).toContain('disabled={!vm.canSubmit}');
    expect(source).toContain('<SafeAreaView');
    expect(source).toContain("edges={['top']}");
    expect(source).not.toContain("headerTitle: 'Tạo trạng thái mới'");
    expect(source).not.toContain('mediaPlaceholder');
  });
});
