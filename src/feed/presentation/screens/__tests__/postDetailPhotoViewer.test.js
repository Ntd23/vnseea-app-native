const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('post detail photo viewer', () => {
  it('opens the shared viewer with the tapped photo index', () => {
    const source = read('src/feed/presentation/screens/PostDetailScreen.tsx');

    expect(source).toContain(
      "PhotoViewerModal,\n  type PhotoViewerState,",
    );
    expect(source).toContain(
      'const [photoViewer, setPhotoViewer] = useState<PhotoViewerState>(null);',
    );
    expect(source).toContain(
      'const handlePhotoPress = useCallback(\n    (photoPost: FeedTextPost, photoIndex: number)',
    );
    expect(source).toContain(
      'const safeIndex = Math.min(Math.max(photoIndex, 0), totalPhotos - 1);',
    );
    expect(source).toContain('initialIndex: safeIndex');
    expect(source).toContain('onPhotoPress={handlePhotoPress}');
    expect(source).not.toContain('onPhotoPress={() => {}}');
  });

  it('mounts the full-screen viewer on the detail surface', () => {
    const source = read('src/feed/presentation/screens/PostDetailScreen.tsx');

    expect(source).toContain('<PhotoViewerModal');
    expect(source).toContain('state={photoViewer}');
    expect(source).toContain('onClose={handleClosePhotoViewer}');
    expect(source).toContain('onCommentTap={handlePhotoViewerCommentTap}');
    expect(source).toContain('posts={activePost ? [activePost as FeedPost] : []}');
  });

  it('keeps the viewer index contract for multi-photo posts', () => {
    const viewer = read(
      'src/shared-kernel/presentation/components/PhotoViewerModal.tsx',
    );

    expect(viewer).toContain('initialScrollIndex={state.initialIndex}');
  });
});
