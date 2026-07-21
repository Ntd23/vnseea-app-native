const fs = require('fs');
const path = require('path');

const root = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('post comments use the full post detail screen', () => {
  it('navigates post comments with the post context and focus flag', () => {
    const helper = read('src/navigation/postNavigation.ts');
    const types = read('src/navigation/types.ts');

    expect(helper).toContain('export function navigateToPostComments');
    expect(helper).toContain('focusComments: true');
    expect(helper).toContain('...(post ? { post } : {})');
    expect(types).toContain('focusComments?: boolean;');
  });

  it('routes feed cards to detail while allowing PostDetail to focus inline comments', () => {
    const cards = read('src/feed/presentation/components/PostCards.tsx');
    const poll = read('src/feed/presentation/components/PollPostCard.tsx');
    const product = read(
      'src/product/presentation/components/ProductPostCard.tsx',
    );
    const detail = read('src/feed/presentation/screens/PostDetailScreen.tsx');

    expect(cards).toContain('navigateToPostComments(navigation, post.id, post);');
    expect(poll).toContain('navigateToPostComments(navigation, post.id, post);');
    expect(product).toContain('navigateToPostComments(');
    expect(detail).toContain('commentNavigationMode="callback"');
    expect(detail).toContain('focusComments = false');
    expect(detail).toContain('useFeedCommentsViewModel');
    expect(detail).toContain('presentation="inline"');
    expect(detail).toContain('listHeaderComponent={postListHeader}');
    expect(detail).toContain('autoFocusComposer={focusComments}');
    expect(detail).toContain('composerFocusSignal={commentFocusSignal}');
  });

  it('keeps reel comments on the existing reel sheet', () => {
    const reels = read('src/reels/presentation/screens/ReelsScreen.tsx');
    const detail = read('src/feed/presentation/screens/PostDetailScreen.tsx');
    const comments = read(
      'src/reels/presentation/components/ReelCommentsSheet.tsx',
    );

    expect(reels).toContain('<ReelCommentsSheet');
    expect(reels).not.toContain('presentation="inline"');
    expect(detail).toContain('presentation="inline"');
    expect(comments).toContain("presentation?: 'sheet' | 'inline';");
    expect(comments).toContain("const isInline = presentation === 'inline';");
  });

  it('uses a compact header, flush post layout, and centered empty state', () => {
    const detail = read('src/feed/presentation/screens/PostDetailScreen.tsx');
    const comments = read(
      'src/reels/presentation/components/ReelCommentsSheet.tsx',
    );

    expect(detail).toContain('Bình luận ({commentCount})');
    expect(detail).toContain('commentCount={displayedCommentCount}');
    expect(detail).not.toContain(
      'mt-2 flex-row items-center border-y border-[#E4E6EB]',
    );
    expect(comments).toContain(
      'isInline ? styles.inlineListContent : styles.listContent',
    );
    expect(comments).toContain('inlineEmptyBox: {');
    expect(comments).toContain("justifyContent: 'center'");
    expect(comments).toContain('keyboardVerticalOffset={0}');
    expect(comments).toContain(
      'Hãy là người đầu tiên bình luận bài viết này.',
    );
  });

  it('lets PostDetail swipe from the left edge while revealing the previous screen', () => {
    const detail = read('src/feed/presentation/screens/PostDetailScreen.tsx');
    const navigator = read('src/navigation/AppNavigator.tsx');

    expect(detail).toContain('GestureDetector gesture={postDetailSwipeBackGesture}');
    expect(detail).toContain('postDetailBackTranslateX.value = Math.min(');
    expect(detail).toContain('runOnJS(handlePostDetailBack)();');
    expect(detail).toContain('postDetailStyles.swipeBackCue');
    expect(navigator).toContain('const POST_DETAIL_OPTIONS: NativeStackNavigationOptions = {');
    expect(navigator).toContain("presentation: 'transparentModal'");
    expect(navigator).toContain("contentStyle: { backgroundColor: 'transparent' }");
    expect(navigator).toContain('options={POST_DETAIL_OPTIONS}');
  });
});
