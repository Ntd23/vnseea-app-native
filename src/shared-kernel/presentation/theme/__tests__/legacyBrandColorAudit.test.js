const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const sourceRoot = path.join(projectRoot, 'src');
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);
const legacyBrandHexes = new Set([
  '#000080',
  '#0000A3',
  '#0000CC',
  '#0000E6',
  '#0000FF',
  '#002FFF',
  '#0758FF',
  '#0866FF',
  '#0084FF',
  '#1200FF',
  '#2563FF',
  '#3435F7',
  '#5252FF',
]);
const semanticHexAllowlist = new Map([
  [
    'src/feed/presentation/components/FeedReactionAssets.ts',
    new Set(['#0866FF']),
  ],
  [
    'src/shared-kernel/presentation/components/ColorPicker.tsx',
    new Set(['#0000FF', '#0758FF']),
  ],
  [
    'src/shared-kernel/presentation/components/PhotoViewerModal.tsx',
    new Set(['#0866FF']),
  ],
]);
const legacyBlueUtility =
  /\b(?:bg|border|text|ring|shadow)-(?:blue|indigo)-(?:50|100|200|300|400|500|600|700|800|900)(?:\/\d+)?\b/g;
const legacyBrandRgb = /rgba?\(\s*0\s*,\s*0\s*,\s*255\b/gi;
const semanticUtilityAllowlist = new Map([
  [
    'src/pages/presentation/screens/PageSettingsScreen.tsx',
    new Set(['bg-blue-50', 'border-blue-100']),
  ],
]);
const modernSemanticBlueHexes = new Set([
  '#1877F2',
  '#2563EB',
  '#1D4ED8',
  '#3B82F6',
  '#0EA5E9',
  '#0284C7',
  '#0369A1',
  '#38BDF8',
  '#4F46E5',
  '#60A5FA',
  '#818CF8',
]);
const modernSemanticBlueAllowlist = new Map([
  // Canonical info status and user-selectable color swatches.
  ['src/shared-kernel/presentation/theme/appColors.ts', new Set(['#3B82F6'])],
  ['src/shared-kernel/presentation/components/ColorPicker.tsx', new Set(['#3B82F6', '#2563EB', '#1D4ED8'])],
  ['src/pages/presentation/screens/PageSettingsScreen.tsx', new Set(['#2563EB'])],
  // Maps, locations and public-audience information.
  ['src/feed/presentation/components/PostCards.tsx', new Set(['#2563EB'])],
  ['src/pages/presentation/components/PageLocationPickerModal.tsx', new Set(['#1D4ED8'])],
  ['src/user/presentation/components/MapPlaceDetailSheet.tsx', new Set(['#1D4ED8', '#0369A1'])],
  ['src/user/presentation/screens/NearbyUsersScreen.tsx', new Set(['#4F46E5', '#2563EB', '#1D4ED8'])],
  ['src/photos/presentation/screens/CreateAlbumScreen.tsx', new Set(['#1D4ED8'])],
  // Reactions, calls, notifications and informational message previews.
  ['src/messages/presentation/components/MessageReactions.tsx', new Set(['#3B82F6'])],
  ['src/messages/presentation/components/CallAudioOutputSelector.tsx', new Set(['#60A5FA'])],
  ['src/messages/presentation/components/MessageLinkPreviewCard.tsx', new Set(['#2563EB'])],
  ['src/messages/presentation/screens/MessageScreen.tsx', new Set(['#3B82F6'])],
  ['src/notifications/presentation/components/NotificationCard.tsx', new Set(['#3B82F6', '#0EA5E9'])],
  ['src/notifications/presentation/components/NotificationsFilterSheet.tsx', new Set(['#1877F2'])],
  // Domain-specific content icons and semantic order states.
  ['src/feed/presentation/components/ComposerCard.tsx', new Set(['#3B82F6'])],
  ['src/feed/presentation/screens/CreatePostScreen.tsx', new Set(['#0284C7', '#0EA5E9'])],
  ['src/shared-kernel/presentation/components/CreateActionSheet.tsx', new Set(['#0284C7', '#0EA5E9'])],
  ['src/shared-kernel/presentation/components/EditProfileActionSheet.tsx', new Set(['#0EA5E9'])],
  ['src/shared-kernel/presentation/components/StoryOptionsSheet.tsx', new Set(['#0EA5E9'])],
  ['src/settings/presentation/screens/SettingsScreen.tsx', new Set(['#0284C7'])],
  ['src/settings/presentation/screens/UserDashboardScreen.tsx', new Set(['#0284C7'])],
  ['src/pages/presentation/screens/PageDetailScreen.tsx', new Set(['#0EA5E9'])],
  ['src/reels/presentation/components/ReelCommentsSheet.tsx', new Set(['#4F46E5'])],
  ['src/reels/presentation/screens/CreateReelScreen.tsx', new Set(['#60A5FA'])],
  ['src/product/presentation/screens/MyProductsScreen.tsx', new Set(['#0EA5E9', '#0284C7', '#38BDF8'])],
  ['src/orders/presentation/screens/OrderDetailScreen.tsx', new Set(['#0EA5E9', '#0284C7', '#38BDF8'])],
  ['src/offers/presentation/components/OfferDiscountBadge.tsx', new Set(['#3B82F6'])],
  // Facebook keeps its official external brand color.
  ['src/blogs/presentation/screens/BlogDetailScreen.tsx', new Set(['#1877F2'])],
]);
const modernSemanticBlueRgb =
  /rgba?\(\s*(?:37\s*,\s*99\s*,\s*235|59\s*,\s*130\s*,\s*246|79\s*,\s*70\s*,\s*229|99\s*,\s*102\s*,\s*241)(?:\s*,\s*[\d.]+)?\s*\)/gi;
const modernSemanticBlueRgbAllowlist = new Set([
  'src/user/presentation/screens/NearbyUsersScreen.tsx',
]);

function collectSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') return [];
      return collectSourceFiles(absolutePath);
    }
    return sourceExtensions.has(path.extname(entry.name)) ? [absolutePath] : [];
  });
}

describe('legacy VNSEEA brand color audit', () => {
  it('does not use legacy blue brand literals outside semantic allowlists', () => {
    const offenders = [];

    for (const absolutePath of collectSourceFiles(sourceRoot)) {
      const relativePath = path.relative(projectRoot, absolutePath);
      const source = fs.readFileSync(absolutePath, 'utf8');
      const allowed = semanticHexAllowlist.get(relativePath) ?? new Set();
      const matches = source.match(/#[0-9a-fA-F]{6}\b/g) ?? [];

      for (const match of matches) {
        const normalized = match.toUpperCase();
        if (legacyBrandHexes.has(normalized) && !allowed.has(normalized)) {
          offenders.push(`${relativePath}: ${match}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('uses named brand or info utilities instead of raw blue utilities', () => {
    const offenders = [];

    for (const absolutePath of collectSourceFiles(sourceRoot)) {
      const relativePath = path.relative(projectRoot, absolutePath);
      const source = fs.readFileSync(absolutePath, 'utf8');
      const allowed = semanticUtilityAllowlist.get(relativePath) ?? new Set();
      const matches = source.match(legacyBlueUtility) ?? [];
      const unexpected = matches.filter(match => !allowed.has(match));
      if (unexpected.length > 0) {
        offenders.push(`${relativePath}: ${Array.from(new Set(unexpected)).join(', ')}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('does not retain the old pure-blue brand as rgb or rgba', () => {
    const offenders = [];

    for (const absolutePath of collectSourceFiles(sourceRoot)) {
      const relativePath = path.relative(projectRoot, absolutePath);
      const source = fs.readFileSync(absolutePath, 'utf8');
      const matches = source.match(legacyBrandRgb) ?? [];
      if (matches.length > 0) {
        offenders.push(`${relativePath}: ${Array.from(new Set(matches)).join(', ')}`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it('keeps modern blue literals inside documented semantic exceptions', () => {
    const offenders = [];

    for (const absolutePath of collectSourceFiles(sourceRoot)) {
      const relativePath = path.relative(projectRoot, absolutePath);
      const source = fs.readFileSync(absolutePath, 'utf8');
      const allowed = modernSemanticBlueAllowlist.get(relativePath) ?? new Set();
      const matches = source.match(/#[0-9a-fA-F]{6}\b/g) ?? [];

      for (const match of matches) {
        const normalized = match.toUpperCase();
        if (modernSemanticBlueHexes.has(normalized) && !allowed.has(normalized)) {
          offenders.push(`${relativePath}: ${match}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('limits blue rgb overlays to documented map rendering', () => {
    const offenders = [];

    for (const absolutePath of collectSourceFiles(sourceRoot)) {
      const relativePath = path.relative(projectRoot, absolutePath);
      const source = fs.readFileSync(absolutePath, 'utf8');
      const matches = source.match(modernSemanticBlueRgb) ?? [];
      if (
        matches.length > 0 &&
        !modernSemanticBlueRgbAllowlist.has(relativePath)
      ) {
        offenders.push(`${relativePath}: ${Array.from(new Set(matches)).join(', ')}`);
      }
    }

    expect(offenders).toEqual([]);
  });
});
