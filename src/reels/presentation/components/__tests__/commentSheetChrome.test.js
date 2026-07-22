const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('iOS comment sheet chrome', () => {
  it('keeps Liquid Glass behind the platform-specific comment chrome wrapper', () => {
    const defaultSource = read(
      'src/reels/presentation/components/CommentSheetChrome.tsx',
    );
    const iosSource = read(
      'src/reels/presentation/components/CommentSheetChrome.ios.tsx',
    );

    expect(defaultSource).not.toContain('@callstack/liquid-glass');
    expect(defaultSource).not.toContain('AdaptiveGlassSurface');
    expect(iosSource).toContain('AdaptiveGlassSurface');
    expect(iosSource).toContain('CommentSheetHeaderBadge');
    expect(iosSource).toContain('CommentSheetReactionBadgeSurface');
    expect(iosSource).toContain('CommentSheetComposerDock');
    expect(iosSource).toContain('CommentSheetComposerInputSurface');
    expect(iosSource).toContain('CommentSheetReactionPickerSurface');
  });

  it('uses comment chrome wrappers from ReelCommentsSheet without importing Liquid Glass directly', () => {
    const source = read(
      'src/reels/presentation/components/ReelCommentsSheet.tsx',
    );

    expect(source).toContain("from './CommentSheetChrome'");
    expect(source).not.toContain('AdaptiveGlassSurface');
    expect(source).not.toContain('@callstack/liquid-glass');
    expect(source).toContain('<CommentSheetHeaderBadge');
    expect(source).toContain('<CommentSheetControlSurface');
    expect(source).toContain('<CommentSheetReactionBadgeSurface');
    expect(source).toContain('<CommentSheetComposerDock');
    expect(source).toContain('<CommentSheetComposerInputSurface');
    expect(source).toContain('<CommentSheetReactionPickerSurface');
  });

  it('keeps the existing comment behavior handlers wired', () => {
    const source = read(
      'src/reels/presentation/components/ReelCommentsSheet.tsx',
    );

    expect(source).toContain('onSetReaction');
    expect(source).toContain('onSubmit');
    expect(source).toContain('onSubmitReply');
    expect(source).toContain('onStartReply');
    expect(source).toContain('onLoadReplies');
    expect(source).toContain('onDelete');
  });

  it('uses display names for reply drafts and blue leading reply mentions', () => {
    const source = read(
      'src/reels/presentation/components/ReelCommentsSheet.tsx',
    );

    expect(source).toContain('targetCommentId');
    expect(source).toContain('getReplyDraftPrefix(replyDisplayName)');
    expect(source).toContain('replyMentionName');
    expect(source).toContain('splitLeadingReplyMention');
    expect(source).toContain('styles.commentMentionText');
    expect(source).toContain('scheduleReplyTargetReveal(replyTarget)');
    expect(source).toContain('viewPosition: isInline ? 0.76 : 0.58');
    expect(source).toContain('onScrollToIndexFailed');
    expect(source).not.toContain("copy.replyingPlaceholder.replace('{username}'");
  });

  it('does not render a quick-emoji row below the comment composer', () => {
    const source = read(
      'src/reels/presentation/components/ReelCommentsSheet.tsx',
    );

    expect(source).not.toContain('REPLY_QUICK_EMOJIS');
    expect(source).not.toContain('REPLY_EMOJI_BAR_HEIGHT');
    expect(source).not.toContain('handleInsertReplyEmoji');
    expect(source).not.toContain('replyEmojiRailVisible');
    expect(source).not.toContain('styles.replyEmojiRail');
  });

  it('puts the iOS bottom safe-area padding inside the composer dock', () => {
    const source = read(
      'src/reels/presentation/components/ReelCommentsSheet.tsx',
    );

    expect(source).toContain(
      "const bottomSafeInset = Math.max(insets.bottom, Platform.OS === 'android' ? 18 : 10);",
    );
    expect(source).toMatch(
      /const sheetBottomPadding =\s+Platform\.OS === 'ios' \|\| isKeyboardVisible \? 0 : bottomSafeInset;/,
    );
    expect(source).toContain(
      'const composerBottomPadding = isKeyboardVisible ? 6 : bottomSafeInset;',
    );
    expect(source).toContain('Keyboard.addListener');
    expect(source).toContain("'keyboardWillShow'");
    expect(source).toContain("'keyboardWillHide'");
    expect(source).toContain(
      'return () => {',
    );
    expect(source).toContain('paddingBottom: sheetBottomPadding');
    expect(source).toContain(
      '<CommentSheetComposerDock style={[styles.inputBar, { paddingBottom: composerBottomPadding }]}>',
    );
  });

  it('does not double-apply Android keyboard insets while the window resizes', () => {
    const source = read(
      'src/reels/presentation/components/ReelCommentsSheet.tsx',
    );

    expect(source).toContain(
      "Platform.OS === 'android' && isKeyboardVisible ? '100%' : sheetHeight",
    );
    expect(source).toContain(
      'style={isInline ? styles.inlineRoot : styles.modalRoot}',
    );
    expect(source).toContain(
      'enabled={visible && isScreenFocused && shouldOwnKeyboardAvoidance}',
    );
    expect(source).toContain('keyboardVerticalOffset={0}');
    expect(source).not.toContain(
      "Platform.OS === 'android' && { paddingBottom: keyboardHeight }",
    );
  });
});
