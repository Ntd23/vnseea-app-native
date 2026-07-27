const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('PostDetail sticky identity header', () => {
  const detail = read('src/feed/presentation/screens/PostDetailScreen.tsx');
  const cards = read('src/feed/presentation/components/PostCards.tsx');
  const poll = read('src/feed/presentation/components/PollPostCard.tsx');
  const product = read(
    'src/product/presentation/components/ProductPostCard.tsx',
  );

  it('reuses one canonical identity header across every post kind', () => {
    expect(cards).toContain('export const PostIdentityHeader');
    expect(cards).toContain('showIdentityHeader?: boolean');
    expect(poll).toContain('showIdentityHeader?: boolean');
    expect(product).toContain('showIdentityHeader?: boolean');

    expect(detail).toContain('<PostIdentityHeader');
    expect(detail.match(/showIdentityHeader=\{false\}/g)).toHaveLength(4);
  });

  it('keeps the identity header fixed outside the scrolling post body', () => {
    const headerIndex = detail.indexOf('<PostIdentityHeader');
    const commentsIndex = detail.indexOf('<ReelCommentsSheet');

    expect(headerIndex).toBeGreaterThan(-1);
    expect(commentsIndex).toBeGreaterThan(headerIndex);
    expect(detail.match(/style=\{postDetailRootStyle\}/g)).toHaveLength(3);
    expect(detail).toContain('style={postDetailStyles.stickyIdentityHeader}');
    expect(detail).toContain("backgroundColor: '#FFFFFF'");
    expect(detail).toContain('backgroundColor="#FFFFFF"');
  });

  it('owns a stable top inset even when transparent modal runtime metrics are zero', () => {
    expect(detail).toContain('useSafeAreaInsets');
    expect(detail).toContain('initialWindowMetrics');
    expect(detail).toContain('resolveFeedChromeTopInset');
    expect(detail).toContain('androidContentWindowOffsetY');
    expect(detail).toContain(
      'resolvedPostDetailTopInset - androidContentWindowOffsetY',
    );
    expect(detail).toContain('paddingTop: postDetailTopInset');
    expect(detail.match(/translucent=\{false\}/g)).toHaveLength(3);
    expect(detail).not.toContain('<SafeAreaView');
  });

  it('dismisses the keyboard when the fixed header is touched', () => {
    expect(detail).toContain('const handleDismissKeyboardFromContent = useCallback');
    expect(detail).toContain('onTouchStart={handleDismissKeyboardFromContent}');
  });

  it('uses the Feed post menu permissions and keeps back only for unavailable state', () => {
    expect(detail).toContain('<PostMenuActionSheet');
    expect(detail).toContain('activePost.permissions?.canDelete === true');
    expect(detail).toContain('onMorePress={handleOpenPostMenu}');
    expect(detail).not.toContain('<PostHeader');
    expect(detail).toContain('accessibilityLabel="Quay lại"');
    expect(detail).toContain(
      'GestureDetector gesture={postDetailSwipeBackGesture}',
    );
  });
});
