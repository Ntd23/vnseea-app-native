const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../../../../');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

describe('ProfileScreen reload behavior', () => {
  it('does not refetch profile data on every focus cycle', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain('const routeProfileKey = route.params?.userId');
    expect(source).toContain('const lastLoadedUserIdRef = useRef<string | null>(null);');
    expect(source).toContain('if (lastLoadedUserIdRef.current === routeProfileKey) {');
    expect(source).not.toMatch(
      /useFocusEffect\(useCallback\(\(\) => \{\s*loadProfile\(\{\s*userId:\s*route\.params\?\.(?:userId),\s*includeFriends:\s*true,\s*\}\)\.catch\(\(\) => undefined\);\s*\},\s*\[loadProfile,\s*route\.params\?\.(?:userId)\]\)\);/s,
    );
  });

  it('uses the same bold Instagram story ring palette around profile avatars', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain('id="profileAvatarStoryInstagramGradient"');
    expect(source).toContain('stroke="url(#profileAvatarStoryInstagramGradient)"');
    expect(source).toContain('<Stop offset="0%" stopColor="#FEDA75" />');
    expect(source).toContain('<Stop offset="19%" stopColor="#FA7E1E" />');
    expect(source).toContain('<Stop offset="45%" stopColor="#D62976" />');
    expect(source).toContain('<Stop offset="72%" stopColor="#962FBF" />');
    expect(source).toContain('<Stop offset="100%" stopColor="#4F5BD5" />');
    expect(source).toContain('strokeWidth={5.2}');
    expect(source).toContain('strokeLinecap="round"');
    expect(source).not.toContain('stroke="url(#storyRingGrad)"');
  });

  it('opens a working relationship action sheet from the followed profile button', () => {
    const source = read('src/profile/presentation/screens/ProfileScreen.tsx');

    expect(source).toContain('const [isRelationshipSheetVisible, setRelationshipSheetVisible] = useState(false);');
    expect(source).toContain('const openRelationshipActionsSheet = useCallback(() => {');
    expect(source).toContain('onPress={openRelationshipActionsSheet}');
    expect(source).toContain('visible={isRelationshipSheetVisible}');
    expect(source).toContain('{copy.unfollow}');
    expect(source).toContain('{copy.blockUser}');
    expect(source).toContain('await toggleFollow(String(targetUserId));');
    expect(source).toContain('apiRoutes.social.block');
    expect(source).toContain("block_action: 'block'");
    expect(source).toContain('UserMinus size={18} color="#2563EB"');
    expect(source).toContain('UserRoundX size={18} color="#EF4444"');
    expect(source).toContain('isRelationshipSheetVisible ||');
  });
});
