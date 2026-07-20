const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const canonicalRelativePath =
  'src/feed/presentation/components/FeedReactionAssets.ts';
const canonicalSource = fs.readFileSync(
  path.join(projectRoot, canonicalRelativePath),
  'utf8',
);
const sharedCatalogSource = fs.readFileSync(
  path.join(
    projectRoot,
    'src/shared-kernel/domain/reactions/reactionCatalog.ts',
  ),
  'utf8',
);

const reactionSurfaces = [
  'src/feed/presentation/components/PollPostCard.tsx',
  'src/feed/presentation/components/PostCards.tsx',
  'src/feed/presentation/components/PostReactionsSheet.tsx',
  'src/feed/presentation/screens/PostDetailScreen.tsx',
  'src/live/presentation/screens/LiveRoomScreen.tsx',
  'src/popular/presentation/screens/PopularScreen.tsx',
  'src/reels/presentation/components/ReelCommentsSheet.tsx',
  'src/reels/presentation/components/ReelItem.tsx',
  'src/shared-kernel/presentation/components/PhotoViewerModal.tsx',
  'src/stories/presentation/screens/StoryViewerScreen.tsx',
];

describe('Feed reaction assets', () => {
  it('defines the six Feed reaction images in canonical order', () => {
    const expectedTypes = ['like', 'love', 'haha', 'wow', 'sad', 'angry'];
    const positions = expectedTypes.map(type => {
      expect(canonicalSource).toContain(`reactions_${type}.png`);
      return canonicalSource.indexOf(`${type}: require(`);
    });

    expect(positions.every(position => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it('keeps every reaction surface connected to the Feed asset module', () => {
    reactionSurfaces.forEach(relativePath => {
      const source = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
      expect(source).toContain('FeedReactionAssets');
      expect(source).not.toMatch(/const\s+(REACTION_EMOJI|STORY_REACTION_EMOJI)/);
      expect(source).not.toContain('assets/reactions/reactions_');
    });
  });

  it('uses one shared type and wire mapping across Feed, Reels and Stories', () => {
    expect(canonicalSource).toContain(
      'shared-kernel/domain/reactions/reactionCatalog',
    );
    expect(sharedCatalogSource).toContain('REACTION_TO_WIRE');
    expect(sharedCatalogSource).toContain('WIRE_TO_REACTION');

    const repositories = [
      'src/feed/infrastructure/repositories/ApiFeedRepository.ts',
      'src/reels/infrastructure/repositories/ApiReelsRepository.ts',
      'src/stories/infrastructure/repositories/ApiStoriesRepository.ts',
    ];

    repositories.forEach(relativePath => {
      const source = fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
      expect(source).toContain(
        'shared-kernel/domain/reactions/reactionCatalog',
      );
      expect(source).not.toMatch(/const\s+REACTION_TO_WIRE/);
      expect(source).not.toMatch(/const\s+WIRE_TO_REACTION/);
    });

    const reelsTypes = fs.readFileSync(
      path.join(projectRoot, 'src/reels/domain/types/reels.types.ts'),
      'utf8',
    );
    expect(reelsTypes).toContain("export type { ReactionType }");
    expect(reelsTypes).not.toMatch(/export type ReactionType\s*=/);
  });
});
