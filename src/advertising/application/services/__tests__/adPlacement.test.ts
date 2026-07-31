import {
  canAdAppearInHomeFeed,
  canAdAppearInStoryViewer,
} from '../adPlacement';

describe('ad placement policy', () => {
  it('keeps story-only ads out of the home feed', () => {
    expect(canAdAppearInStoryViewer('story')).toBe(true);
    expect(canAdAppearInHomeFeed('story')).toBe(false);
  });

  it('keeps feed placements out of the story viewer', () => {
    expect(canAdAppearInHomeFeed('post')).toBe(true);
    expect(canAdAppearInHomeFeed('timeline')).toBe(true);
    expect(canAdAppearInStoryViewer('post')).toBe(false);
    expect(canAdAppearInStoryViewer('timeline')).toBe(false);
  });

  it('supports entire and legacy unscoped ads on both surfaces', () => {
    expect(canAdAppearInHomeFeed('entire')).toBe(true);
    expect(canAdAppearInStoryViewer('entire')).toBe(true);
    expect(canAdAppearInHomeFeed(undefined)).toBe(true);
    expect(canAdAppearInStoryViewer(undefined)).toBe(true);
  });
});
