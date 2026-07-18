const fs = require('fs');
const path = require('path');

const root = process.cwd();
const read = relativePath =>
  fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('app privacy source contracts', () => {
  it('requires canShare and gates every post/reel share entry point', () => {
    const types = read('src/feed/domain/types/feed.types.ts');
    expect(types).toMatch(/canShare:\s*boolean/);
    expect(types).not.toMatch(/canShare\?:\s*boolean/);

    const guardedFiles = [
      'src/feed/presentation/components/PostCards.tsx',
      'src/feed/presentation/components/PollPostCard.tsx',
      'src/feed/presentation/screens/FeedScreen.tsx',
      'src/feed/presentation/screens/PostDetailScreen.tsx',
      'src/profile/presentation/screens/ProfileScreen.tsx',
      'src/pages/presentation/screens/PageDetailScreen.tsx',
      'src/community/presentation/screens/GroupDetailScreen.tsx',
      'src/events/presentation/screens/EventDetailScreen.tsx',
    ];

    guardedFiles.forEach(file => {
      expect(read(file)).toContain('isFeedPostShareable');
    });
    expect(
      read('src/reels/presentation/components/ReelItem.tsx'),
    ).toContain('isReelShareable');
    const reelsScreen = read('src/reels/presentation/screens/ReelsScreen.tsx');
    expect(reelsScreen).toContain('isReelShareable');
    expect(reelsScreen).toContain('isFeedPostShareable');
  });

  it('guards every FeedShareBottomSheet execution path', () => {
    const source = read(
      'src/feed/presentation/components/FeedShareBottomSheet.tsx',
    );
    expect(source).toContain('const canShare = isFeedPostShareable(post);');
    expect(source).toMatch(/handleCopyLink[\s\S]*?if \(!canShare/);
    expect(source).toMatch(/handleExternalShare[\s\S]*?if \(!canShare/);
    expect(source).toMatch(/handleStoryShare[\s\S]*?if \(!canShare/);
    expect(source).toMatch(/handlePrimaryShare[\s\S]*?if \(!canShare/);
    expect(source).toMatch(/handleSendMessages[\s\S]*?if \(!canShare/);
  });

  it('applies all four audiences to the actual exported album screen and payload', () => {
    const source = read(
      'src/photos/presentation/screens/CreateAlbumScreen.tsx',
    );
    const exportedScreen = source.slice(source.indexOf('function CreateAlbumScreen()'));

    expect(exportedScreen).toContain("useState<PrivacyOption>('public')");
    expect(exportedScreen).toContain('PRIVACY_OPTIONS.map');
    expect(exportedScreen).toContain('postPrivacy: audienceToWire(selectedPrivacy)');
    expect(exportedScreen).toContain('privacy_contract: CONTENT_AUDIENCE_CONTRACT');
  });

  it('makes composer context explicit and renders anonymous as a separate personal toggle', () => {
    const screen = read('src/feed/presentation/screens/CreatePostScreen.tsx');
    const repository = read(
      'src/feed/infrastructure/repositories/ApiFeedRepository.ts',
    );

    expect(screen).toContain('!targetPage && !targetGroupId && !eventId');
    expect(screen).toContain("composerContext === 'page'");
    expect(screen).toMatch(/targetGroupId[\s\S]*\? 'group'/);
    expect(screen).toMatch(/eventId[\s\S]*\? 'event'/);
    expect(screen).toMatch(/vm\.draft\.isAnonymous\s*\?\s*\([\s\S]*<EyeOff[\s\S]*:\s*vm\.draft\.privacy === 'public'[\s\S]*<Globe2/);
    expect(screen).toMatch(/vm\.draft\.isAnonymous\s*\?\s*copy\.privacyAnonymous\s*:\s*vm\.draft\.privacy === 'public'[\s\S]*\? copy\.privacyPublic/);
    expect(screen).toContain('<Switch');
    expect(screen).toContain('value={vm.draft.isAnonymous}');
    expect(screen).toContain('onValueChange={stableSetAnonymous}');
    expect(screen).toContain('disabled={vm.draft.isAnonymous}');
    expect(screen).toContain('opacity: vm.draft.isAnonymous ? 0.45 : 1');
    expect(repository).toContain('resolveCreatePostContext');
  });

  it('keeps anonymous repository data locale-neutral and localizes presentation', () => {
    const repository = read(
      'src/feed/infrastructure/repositories/ApiFeedRepository.ts',
    );
    expect(repository).not.toContain("name: 'Ẩn danh'");
    expect(repository).not.toMatch(/isIdentityRedacted[\s\S]{0,100}\? 'Ẩn danh'/);

    const cards = read('src/feed/presentation/components/PostCards.tsx');
    const poll = read('src/feed/presentation/components/PollPostCard.tsx');
    const reel = read('src/reels/presentation/components/ReelItem.tsx');
    expect(cards).toMatch(
      /post\.isAnonymous\s*\? copy\.anonymousPrivacyLabel\s*:\s*post\.publisher\.name/,
    );
    expect(poll).toMatch(
      /post\.isAnonymous\s*\? copy\.anonymousPrivacyLabel\s*:\s*post\.publisher\?\.name/,
    );
    expect(reel).toMatch(
      /item\.isAnonymous\s*\? copy\.anonymous\s*:\s*item\.publisher\.name/,
    );
    expect(reel).toContain("anonymous: 'Anonymous'");
  });

  it('shows a friends audience label/icon in text/video and poll cards', () => {
    for (const file of [
      'src/feed/presentation/components/PostCards.tsx',
      'src/feed/presentation/components/PollPostCard.tsx',
    ]) {
      const source = read(file);
      expect(source).toContain("case 'friends':");
      expect(source).toContain('friendsPrivacyLabel');
      expect(source).toMatch(/case 'friends':[\s\S]*Icon: Users/);
    }
  });

  it('uses followers as the story read fallback and sends compatibility privacy fields', () => {
    const source = read(
      'src/stories/infrastructure/repositories/ApiStoriesRepository.ts',
    );
    expect(source).toContain("fallback: 'followers'");
    expect(source).toContain('postPrivacy: storyPrivacy');
    expect(source).toContain('privacy: storyPrivacy');
  });

  it('keeps optimistic reel audience and feed privacy documentation aligned', () => {
    const createReel = read(
      'src/reels/presentation/screens/CreateReelScreen.tsx',
    );
    const reelTypes = read('src/reels/domain/types/reels.types.ts');
    const reelViewModel = read(
      'src/reels/application/view-models/useCreateReelViewModel.ts',
    );
    expect(createReel).toContain('privacy: vm.draft.privacy');
    expect(createReel).toContain(
      '[feedRepo, vm.draft.caption, vm.draft.privacy]',
    );
    expect(reelTypes).toMatch(/privacy:\s*ReelPrivacy/);
    expect(reelTypes).not.toMatch(/privacy\?:\s*ReelPrivacy/);
    expect(reelViewModel).toContain("Pick<ReelDraft, 'privacy'>");

    const feedRepository = read(
      'src/feed/infrastructure/repositories/ApiFeedRepository.ts',
    );
    expect(feedRepository).toContain('1=mutual friends');
    expect(feedRepository).not.toContain('1=people the author follows');
  });
});
