const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('GroupDetailScreen membership and canonical data', () => {
  it('loads canonical group data and exposes join through the repository', () => {
    const repository = read(
      'src/community/domain/repositories/CommunityRepository.ts',
    );
    const screen = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );

    expect(repository).toContain('getGroupById(');
    expect(repository).toContain('joinGroup(');
    expect(screen).toContain('communityRepository.getGroupById');
    expect(screen).toContain('communityRepository.joinGroup');
  });

  it('keeps a successful join result when the canonical refresh fails', () => {
    const screen = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );

    expect(screen).toContain(
      'const nextStatus = await communityRepository.joinGroup',
    );
    expect(screen).toContain('catch (refreshError)');
    expect(screen).toContain('group_detail_refresh_after_join_failed');
  });

  it('does not render the Feed filter bar and only shows composer to members', () => {
    const screen = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );

    expect(screen).not.toContain('FeedFilterTabs');
    expect(screen).not.toContain('activeFilterSource');
    expect(screen).toContain('const canCreatePost =');
    expect(screen).toContain('canCurrentUserPostToGroup(group)');
    expect(screen).toContain('{canCreatePost ? (');
    expect(screen).toContain('isJoinRequested');
    expect(screen).toContain('copy.joinRequested');
    expect(screen).toContain('copy.joinGroup');
  });

  it('rechecks canonical membership before opening the group composer', () => {
    const screen = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );

    expect(screen).toContain(
      'const canonicalGroup = await communityRepository.getGroupById',
    );
    expect(screen).toContain('if (!canCurrentUserPostToGroup(canonicalGroup))');
    expect(screen).toContain('groupMembershipRequiredMessage');
    expect(screen).toContain('group_post_access_check_failed');
  });

  it('renders image fallbacks after native image loading errors', () => {
    const screen = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );

    expect(screen).toContain('onError={() => setImageFailed(true)}');
    expect(screen).toContain('onError={() => setCoverFailed(true)}');
  });

  it('shows quick group image controls only to the group owner', () => {
    const screen = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );

    expect(screen).toContain(
      "import { launchImageLibrary } from 'react-native-image-picker'",
    );
    expect(screen).toContain("const canEdit = membershipStatus === 'owner'");
    expect(screen).toContain('{canEdit ? (');
    expect(screen).toContain('copy.groupCoverAction');
    expect(screen).toContain('copy.groupAvatarAction');
    expect(screen).toContain("handleUpdateGroupMedia('cover')");
    expect(screen).toContain("handleUpdateGroupMedia('avatar')");
    expect(screen).toContain('communityRepository.updateGroupMedia');
  });

  it('matches the Page crop and full-screen viewer flow for group media', () => {
    const screen = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );

    expect(screen).toContain('PROFILE_IMAGE_PICKER_OPTIONS');
    expect(screen).toContain('waitForImagePickerDismissal');
    expect(screen).toContain('prepareProfileImageForCrop(asset, field)');
    expect(screen).toContain('onPress={handleViewGroupCover}');
    expect(screen).toContain('onPress={handleViewGroupAvatar}');
    expect(screen).toContain("setGroupMediaViewer('cover')");
    expect(screen).toContain("setGroupMediaViewer('avatar')");
    expect(screen).toContain('<PageMediaViewerModal');
    expect(screen).toContain('onChange={handleChangeGroupMediaFromViewer}');
    expect(screen).toContain('<ImageCropperModal');
    expect(screen).toContain('onComplete={handleCroppedGroupMedia}');
  });

  it('places owner camera controls directly on the cover and avatar', () => {
    const screen = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );

    expect(screen).toContain(
      'className="absolute bottom-3 right-3 h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-[#E4E6EB] shadow-sm"',
    );
    expect(screen).toContain(
      'className="absolute bottom-0 right-0 h-[30px] w-[30px] items-center justify-center rounded-full border-2 border-white bg-[#E4E6EB]"',
    );
    expect(screen).not.toContain('copy.groupMediaTitle');
  });

  it('matches the Home status-bar chrome while keeping the shared header', () => {
    const screen = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );

    expect(screen).toContain('<SafeAreaFeedHeader');
    expect(screen).toContain('safeAreaBackgroundColor={');
    expect(screen).toContain("Platform.OS === 'android'");
    expect(screen).toContain("? 'light-content' : 'dark-content'");
    expect(screen).toContain('? APP_BRAND_COLOR');
    expect(screen).toContain('translucent={false}');
  });

  it('puts group context and post search before the post feed', () => {
    const screen = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );
    const aboutIndex = screen.indexOf('title={copy.sectionAbout}');
    const searchIndex = screen.indexOf('placeholder={copy.searchPlaceholder}');
    const postsIndex = screen.indexOf('displayedPosts.map(renderGroupPost)');

    expect(aboutIndex).toBeGreaterThan(-1);
    expect(searchIndex).toBeGreaterThan(aboutIndex);
    expect(postsIndex).toBeGreaterThan(searchIndex);
    expect(screen).toContain('accessibilityLabel={copy.backLabel}');
    expect(screen).toContain('keyboardShouldPersistTaps="handled"');
    expect(screen).not.toContain('right={copy.membersStats}');
    expect(screen).not.toContain('label={`0 ${copy.postsStatsSuffix}`}');
  });

  it('uses the same card chrome as Home posts and the shared composer', () => {
    const screen = read(
      'src/community/presentation/screens/GroupDetailScreen.tsx',
    );

    expect(screen).toContain(
      "import { FEED_CARD_CLASS } from '../../../feed/presentation/components/FeedCardChrome'",
    );
    expect(screen).toContain(
      'className={`${FEED_CARD_CLASS} overflow-hidden`}',
    );
    expect(screen).toContain('className={FEED_CARD_CLASS}');
    expect(screen).toContain('<ComposerCard');
    expect(screen).not.toContain('surface-card');
    expect(screen).not.toContain('className="mx-3');
  });
});
