const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('Create Post metadata layout', () => {
  it('keeps privacy and the three metadata actions in the author card', () => {
    const source = read(
      'src/feed/presentation/screens/CreatePostScreen.tsx',
    );
    const authorCardStart = source.indexOf('const AuthorPrivacyCard');
    const authorCardEnd = source.indexOf('interface CaptionComposerProps');
    const authorCard = source.slice(authorCardStart, authorCardEnd);

    expect(source).toContain('onTagPeoplePress');
    expect(source).toContain('onLocationPress');
    expect(source).toContain('onFeelingPress');
    expect(source).toContain('label: copy.tagPeople');
    expect(source).toContain('label: copy.location');
    expect(source).toContain('label: copy.feeling');
    expect(source).toContain('accessibilityLabel={action.label}');
    expect(authorCard).toContain('horizontal');
    expect(authorCard).toContain('{action.label}');
    expect(authorCard).toContain("flexDirection: 'row'");
    expect(authorCard).not.toContain(
      'text-white text-[10px] font-bold leading-none',
    );
  });

  it('removes the anonymous controls and inline caption shortcuts', () => {
    const source = read(
      'src/feed/presentation/screens/CreatePostScreen.tsx',
    );
    const captionStart = source.indexOf('const CaptionComposer');
    const captionEnd = source.indexOf('interface MediaPreviewStripProps');
    const caption = source.slice(captionStart, captionEnd);

    expect(source).not.toContain('stableSetAnonymous');
    expect(source).not.toContain('value={vm.draft.isAnonymous}');
    expect(caption).not.toContain('<Hash');
    expect(caption).not.toContain('<AtSign');
    expect(caption).not.toContain('onInsertChar');
    expect(caption).not.toContain('onFeelingPress');
  });

  it('caps the growing caption at twelve lines and shares Feed media geometry', () => {
    const source = read(
      'src/feed/presentation/screens/CreatePostScreen.tsx',
    );
    const captionLayout = read(
      'src/feed/presentation/screens/createPostCaptionLayout.ts',
    );

    expect(captionLayout).toContain('CAPTION_MAX_LINES = 12');
    expect(source).toContain('CAPTION_MAX_HEIGHT');
    expect(source).toContain('onContentSizeChange');
    expect(source).toContain('function AutoGrowingComposerInput');
    expect(source).toContain('useAutoGrowingCaptionLayout');
    expect(source).toContain('function CaptionHeightMeasurer');
    expect(source).toContain('testID="create-post-caption-measurer"');
    expect(source).toContain('numberOfLines={CAPTION_MEASURE_LINES}');
    expect(source).toContain("Platform.OS === 'ios' ? undefined");
    expect(source).toContain('scrollEnabled={isOverflowing}');
    expect(source).not.toContain("color: hasValue ? 'transparent'");
    expect(source).toContain('getPhotoGridItemLayout');
    expect(source).toContain('getPhotoGridItemGutterStyle');
    expect(source).toContain('getPhotoGridRows');
    expect(source).toContain('photoRows.map((row, rowIndex)');
    expect(source).toContain('FeedMediaFrame');
    expect(source).toContain('copy.editMedia');
  });

  it('uses checkbox-only tag results inside an explicitly safe full-screen sheet', () => {
    const source = read(
      'src/feed/presentation/screens/CreatePostScreen.tsx',
    );
    const sheetStart = source.indexOf('function TagPeoplePickerSheet');
    const sheetEnd = source.indexOf('function LocationPickerSheet');
    const tagSheet = source.slice(sheetStart, sheetEnd);

    expect(tagSheet).toContain('const safeTopInset = Math.max(');
    expect(tagSheet).toContain('initialWindowMetrics?.insets.top ?? 0');
    expect(tagSheet).toContain("edges={['left', 'right', 'bottom']}");
    expect(tagSheet).toContain('paddingTop: safeTopInset');
    expect(tagSheet).not.toContain('selectedUsers.map(user =>');
    expect(tagSheet).toContain('isSelected ? <Check');
  });

  it('composes caption and selected media inside one post preview surface', () => {
    const source = read(
      'src/feed/presentation/screens/CreatePostScreen.tsx',
    );
    const screenStart = source.indexOf("if (presentation === 'screen')");
    const screenEnd = source.indexOf(
      'return (\\n    <Modal',
      screenStart,
    );
    const screenPresentation = source.slice(screenStart, screenEnd);

    expect(source).toContain('const PostContentPreview = React.memo');
    expect(source).toContain('testID="create-post-content-preview"');
    expect(screenPresentation).toContain('<PostContentPreview>');
    expect(screenPresentation).toContain('<CaptionComposer');
    expect(screenPresentation).toContain('<MediaPreviewStrip');
    expect(screenPresentation).toContain('<VideoPreviewCard');
    expect(screenPresentation).toContain('embedded');
  });
});
