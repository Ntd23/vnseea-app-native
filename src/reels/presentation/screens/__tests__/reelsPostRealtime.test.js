const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Reels and profile post realtime wiring', () => {
  const reelsScreen = read('src/reels/presentation/screens/ReelsScreen.tsx');
  const reelsViewModel = read(
    'src/reels/application/view-models/useReelsViewModel.ts',
  );
  const profileScreen = read(
    'src/profile/presentation/screens/ProfileScreen.tsx',
  );

  it('watches visible reels and applies canonical post snapshots', () => {
    expect(reelsScreen).toContain('useDeferredVisiblePostIds()');
    expect(reelsScreen).toContain('usePostRealtimeScope({');
    expect(reelsScreen).toContain('enabled: isPlaybackRouteFocused');
    expect(reelsScreen).toContain('onSnapshot: vm.applyRealtimePost');
    expect(reelsScreen).toContain('onDeleted: vm.removeRealtimePost');
    expect(reelsScreen).toContain('scheduleRealtimeVisibleReelIds(');
  });

  it('refreshes an open reel comment sheet after a realtime mutation', () => {
    expect(reelsScreen).toContain(
      'String(vm.selectedCommentPostId) === change.postId',
    );
    expect(reelsScreen).toContain('vm.refreshComments().catch');
    expect(reelsViewModel).toContain('const refreshComments = useCallback');
    expect(reelsViewModel).toContain("comment.id.startsWith('temp-')");
  });

  it('keeps profile reactions and open comments synchronized too', () => {
    expect(profileScreen).toContain("'postReactionChanged'");
    expect(profileScreen).toContain(
      'String(commentVm.selectedCommentPostId) === change.postId',
    );
    expect(profileScreen).toContain('commentVm.refreshComments().catch');
  });
});
