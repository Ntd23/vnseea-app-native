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

  it('supports Facebook-style @mentions in every shared comment composer', () => {
    const sheetSource = read(
      'src/reels/presentation/components/ReelCommentsSheet.tsx',
    );
    const modalSource = read(
      'src/reels/presentation/components/ReelCommentComposerModal.tsx',
    );
    const hosts = [
      'src/feed/presentation/screens/FeedScreen.tsx',
      'src/feed/presentation/screens/PostDetailScreen.tsx',
      'src/reels/presentation/screens/ReelsScreen.tsx',
      'src/community/presentation/screens/GroupDetailScreen.tsx',
      'src/events/presentation/screens/EventDetailScreen.tsx',
      'src/pages/presentation/screens/PageDetailScreen.tsx',
      'src/profile/presentation/screens/ProfileScreen.tsx',
    ];

    expect(sheetSource).toContain('getActiveCommentMentionToken');
    expect(sheetSource).toContain('applyCommentMentionSuggestion');
    expect(sheetSource).toContain('serializeCommentMentions');
    expect(sheetSource).toContain('splitCommentMentionSegments');
    expect(sheetSource).toContain('<CommentMentionSuggestions');
    expect(sheetSource).toContain('onSearchMentions(activeToken.query)');
    expect(sheetSource).toContain('onPressProfile(segment.mention!.userId)');
    expect(modalSource).toContain('<CommentMentionSuggestions');
    expect(modalSource).toContain('onSelectMention');
    hosts.forEach(relativePath => {
      expect(read(relativePath)).toContain('onSearchMentions=');
    });
  });

  it('keeps Reel comments compact so the playing video remains visible', () => {
    const screenSource = read('src/reels/presentation/screens/ReelsScreen.tsx');
    const sheetSource = read(
      'src/reels/presentation/components/ReelCommentsSheet.tsx',
    );

    expect(screenSource).toContain('sheetHeight="64%"');
    expect(screenSource).toContain('backdropColor="rgba(0,0,0,0.08)"');
    expect(screenSource).toContain('scrollEnabled={!vm.isCommentsOpen}');
    expect(screenSource).toContain('lockActiveReelPosition');
    expect(screenSource).toContain('resolveReelsViewportHeight');
    expect(screenSource).toContain('commentsOpen: isCommentsOpenRef.current');
    expect(screenSource).toMatch(
      /const commitActiveIndexFromOffset[\s\S]*if \(isCommentsOpenRef\.current\) return;/,
    );
    expect(sheetSource).toContain('backdropColor?: string');
    expect(sheetSource).toContain("backdropColor = 'rgba(0,0,0,0.36)'");
    expect(sheetSource).toContain('backgroundColor: backdropColor');
    expect(sheetSource).toContain('SHEET_TRANSITION_DURATION_MS = 150');
    expect(sheetSource).toContain(
      'resolveSheetTravelDistance(sheetHeight, stableSheetViewportHeight)',
    );
    expect(sheetSource).toContain('outputRange: [sheetTravelDistance, 0]');
    expect(sheetSource).toContain('toValue: sheetTravelDistance');
    expect(sheetSource).not.toContain('outputRange: [screenHeight, 0]');
    expect(sheetSource).toContain(
      'if (!finished || !isClosingRef.current) return;',
    );
    expect(sheetSource).toContain('onShow: handlePresentationShow');
    expect(sheetSource).toContain(
      'onLayout={isInline ? undefined : handleSheetViewportLayout}',
    );
    expect(sheetSource).toContain('isSheetGestureEnabledRef.current = false');
    expect(sheetSource).toContain('SHEET_DRAG_SETTLE_DURATION_MS = 120');
    expect(sheetSource).toContain('CommentsLoadingSkeleton');
    expect(sheetSource).toContain('COMMENT_SKELETON_ROW_COUNT = 4');
    expect(sheetSource).toContain('Animated.loop(');
    expect(sheetSource).toContain('<CommentsLoadingSkeleton />');
    expect(sheetSource).toContain('commentSkeletonAvatar');
    expect(sheetSource).toContain('settleSheetPan()');
    expect(sheetSource).not.toContain('Animated.spring(panY');
    expect(sheetSource).toContain('onCloseStart?.()');
    expect(sheetSource).toContain('schedulePanUpdate');
    expect(sheetSource).toContain('flushPanUpdate');
    expect(screenSource).toContain('onCloseStart={handleCommentsCloseStart}');
    expect(screenSource).toContain('onOpenStart={handleCommentsOpenStart}');
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
    expect(source).not.toContain(
      "copy.replyingPlaceholder.replace('{username}'",
    );
  });

  it('opens a dedicated white and red composer modal with quick emoji shortcuts', () => {
    const sheetSource = read(
      'src/reels/presentation/components/ReelCommentsSheet.tsx',
    );
    const modalSource = read(
      'src/reels/presentation/components/ReelCommentComposerModal.tsx',
    );

    expect(sheetSource).toContain('<ReelCommentComposerModal');
    expect(sheetSource).toContain('isComposerModalVisible');
    expect(sheetSource).toContain('style={styles.inputLauncher}');
    expect(sheetSource).not.toContain('styles.quickEmojiRail');
    expect(sheetSource).not.toContain('styles.keyboardComposerTools');
    expect(modalSource).toContain('QUICK_COMMENT_EMOJIS');
    expect(modalSource).toContain('animationType="none"');
    expect(modalSource).not.toContain('KeyboardSafeView');
    expect(modalSource).not.toContain('onShow={focusInput}');
    expect(modalSource).toContain('Keyboard.metrics?.()');
    expect(modalSource).toContain('panelTranslateY');
    expect(modalSource).toContain('panelOpacity');
    expect(modalSource).toContain('ANDROID_MANUAL_LIFT_FALLBACK_MS');
    expect(modalSource).toContain('ANDROID_KEYBOARD_SLIDE_DURATION_MS');
    expect(modalSource).toMatch(
      /Platform\.OS !== 'android' \|\| allowAndroidManualLift/,
    );
    expect(modalSource).toContain("'keyboardWillShow'");
    expect(modalSource).toContain("Keyboard.addListener('keyboardDidShow'");
    expect(modalSource).toContain('COMPOSER_FALLBACK_REVEAL_MS');
    expect(modalSource).toContain('refocusInput');
    expect(modalSource).toContain('handleRootLayout');
    expect(modalSource).toMatch(
      /const handleKeyboardHide[\s\S]*keyboardHeightRef\.current = 0;[\s\S]*if \(closeAnimationInFlightRef\.current\) return;/,
    );
    expect(modalSource).toMatch(
      /Animated\.timing\(panelOpacity,[\s\S]*\.start\(\(\) => \{[\s\S]*if \(visibleRef\.current\) onClose\(\);/,
    );
    expect(modalSource).toContain('rounded-t-[22px]');
    expect(modalSource).not.toContain('mx-2');
    expect(modalSource).toContain('bg-white');
    expect(modalSource).toContain('btn-primary');
    expect(modalSource).not.toContain("backgroundColor: '#171717'");
    expect(modalSource).not.toContain("backgroundColor: '#393939'");
  });

  it('puts the iOS bottom safe-area padding inside the composer dock', () => {
    const source = read(
      'src/reels/presentation/components/ReelCommentsSheet.tsx',
    );

    expect(source).toMatch(
      /const bottomSafeInset = Math\.max\(\s*insets\.bottom,\s*Platform\.OS === 'android' \? 18 : 10,?\s*\);/,
    );
    expect(source).toMatch(
      /const sheetBottomPadding =\s+Platform\.OS === 'ios' \|\| isInlineKeyboardVisible \? 0 : bottomSafeInset;/,
    );
    expect(source).toContain(
      'const composerBottomPadding = isInlineKeyboardVisible ? 6 : bottomSafeInset;',
    );
    expect(source).toContain('Keyboard.addListener');
    expect(source).toContain("'keyboardWillShow'");
    expect(source).toContain("'keyboardWillHide'");
    expect(source).toContain('return () => {');
    expect(source).toContain('paddingBottom: sheetBottomPadding');
    expect(source).toContain('paddingBottom: composerBottomPadding');
  });

  it('keeps the sheet fixed and delegates typing to a separate modal', () => {
    const source = read(
      'src/reels/presentation/components/ReelCommentsSheet.tsx',
    );

    expect(source).toContain('const activeSheetHeight = sheetTravelDistance;');
    expect(source).toContain('stableSheetViewportHeight - activeSheetHeight');
    expect(source).toContain('stableSheetViewportHeightRef');
    expect(source).toContain('freezeSheetViewportRef');
    expect(source).toContain('latestSheetViewportHeightRef');
    expect(source).toContain('widthChanged ||');
    expect(source).toContain('sheetViewportReleaseTimerRef');
    expect(source).toContain('handleOpenComposer');
    expect(source).toContain('isSubmitting');
    expect(source).toMatch(
      /submitInFlightRef\.current = true;\s*handleCloseComposer\(\);\s*try/,
    );
    expect(source).toContain(
      'const commentSubmission = onSubmit(trimmed, image, audio, mentions);',
    );
    expect(source).toContain('scheduleCommentsAutoScrollToEnd();');
    expect(source).toContain('const replySubmission = onSubmitReply(');
    expect(source).toContain('scheduleReplyTargetReveal(replyingTo);');
    expect(source).not.toContain('if (submittedComment)');
    expect(source).not.toContain('if (submittedReply)');
    expect(source).toContain('handleCloseComposer();');
    expect(source).toContain('<ReelCommentComposerModal');
    expect(source).toContain("position: 'absolute'");
    expect(source).toContain('top: activeSheetTop');
    expect(source).not.toContain('sheetComposerKeyboardOffset');
    expect(source).not.toContain('modalViewportHeight');
    expect(source).not.toContain('bottom: keyboardHeight');
    expect(source).toContain(
      'style={isInline ? styles.inlineRoot : styles.modalRoot}',
    );
    expect(source).toContain('isInline &&');
    expect(source).toContain('keyboardVerticalOffset={0}');
    expect(source).not.toContain("isKeyboardVisible ? '100%' : sheetHeight");
  });
});
