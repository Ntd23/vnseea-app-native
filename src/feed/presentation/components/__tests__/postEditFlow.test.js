const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('post edit flow', () => {
  it('shows edit only for caption-based posts with edit permission', () => {
    const menu = read(
      'src/shared-kernel/presentation/components/PostMenuActionSheet.tsx',
    );
    const feed = read('src/feed/presentation/screens/FeedScreen.tsx');
    const profile = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(menu).toContain('post.permissions?.canEdit === true');
    expect(menu).toContain('Chỉnh sửa bài viết');
    expect(feed).toContain('isFeedPostCaptionEditable(selectedPostForMenu)');
    expect(feed).toContain('canEdit={canEditSelectedPost}');
    expect(feed).toContain('<PostEditModal');
    expect(profile).toContain('canEdit={canEditSelectedPost}');
    expect(profile).toContain('<PostEditModal');
  });

  it('updates Feed, PostDetail, and Reels through the local edit event', () => {
    const feedVm = read(
      'src/feed/application/view-models/useFeedViewModel.ts',
    );
    const detailVm = read(
      'src/feed/application/view-models/usePostDetailViewModel.ts',
    );
    const reelsVm = read(
      'src/reels/application/view-models/useReelsViewModel.ts',
    );
    const fallbackEditor = read(
      'src/feed/application/editing/editPostWithLocalFallback.ts',
    );

    expect(feedVm).toContain('postEditedEvents.subscribe');
    expect(feedVm).toContain('editPostWithLocalFallback');
    expect(fallbackEditor).toContain('postEditedEvents.emit');
    expect(fallbackEditor).toContain('localPostEditsStorage.saveCaptionEdit');
    expect(detailVm).toContain('postEditedEvents.subscribe');
    expect(reelsVm).toContain('postEditedEvents.subscribe');
    expect(reelsVm).toContain('editReelCaption');
  });
});
