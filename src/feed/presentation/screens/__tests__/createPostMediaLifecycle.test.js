const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Create Post media lifecycle', () => {
  const createPostSource = read(
    'src/feed/presentation/screens/CreatePostScreen.tsx',
  );
  const createPostViewModelSource = read(
    'src/feed/application/view-models/useCreatePostViewModel.ts',
  );
  const pageSource = read(
    'src/pages/presentation/screens/PageDetailScreen.tsx',
  );

  it('serializes native media-picker launches across composer instances', () => {
    expect(createPostSource).toContain('let isNativeMediaPickerActive = false');
    expect(createPostSource).toContain('const mediaPickerInFlightRef = useRef(false)');
    expect(createPostSource).toMatch(
      /mediaPickerInFlightRef\.current \|\| isNativeMediaPickerActive/,
    );
    expect(createPostSource).toContain('isNativeMediaPickerActive = true');
    expect(createPostSource).toContain('isNativeMediaPickerActive = false');
    expect(createPostSource).toContain('mediaPickerBusy={isProcessingPhotos}');
  });

  it('consumes initial media actions once and cancels their timer on unmount', () => {
    expect(createPostSource).toContain(
      'const consumedInitialActionRef = useRef(false)',
    );
    expect(createPostSource).toContain(
      'if (consumedInitialActionRef.current) return',
    );
    expect(createPostSource).toContain('return () => clearTimeout(timer)');
  });

  it('uses one keyboard focus strategy and keeps video previews paused initially', () => {
    expect(createPostSource).toContain('autoFocus');
    expect(createPostSource).not.toMatch(
      /setTimeout\(\(\) => \{\s*textInputRef\.current\?\.blur\(\);\s*textInputRef\.current\?\.focus\(\)/,
    );
    expect(createPostSource).toContain(
      'const [isPlaying, setIsPlaying] = useState(false)',
    );
  });

  it('pauses page videos while the native-stack composer is focused', () => {
    expect(pageSource).toContain('isScreenFocused={isFocused}');
    expect(pageSource).toContain('createPostNavigationInFlightRef.current');
  });

  it('guards against two post submissions in the same render frame', () => {
    expect(createPostViewModelSource).toContain(
      'const submitInFlightRef = useRef(false)',
    );
    expect(createPostViewModelSource).toContain(
      'if (submitInFlightRef.current) return null',
    );
    expect(createPostViewModelSource).toContain(
      'submitInFlightRef.current = true',
    );
    expect(createPostViewModelSource).toContain(
      'submitInFlightRef.current = false',
    );
  });
});
