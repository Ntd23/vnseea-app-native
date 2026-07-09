import { ROUTES } from '../constants/routes';
import { createReelsNavigationTarget } from '../reelsNavigation';

describe('reels navigation target', () => {
  const params = {
    initialVideoId: 'video-1',
    source: 'saved' as const,
  };

  it('opens Reels through the root stack on iOS for instant full-screen playback', () => {
    expect(createReelsNavigationTarget('ios', params)).toEqual({
      name: ROUTES.REELS,
      params,
    });
  });

  it('opens Reels through the root stack on Android for instant full-screen playback', () => {
    expect(createReelsNavigationTarget('android', params)).toEqual({
      name: ROUTES.REELS,
      params,
    });
  });
});
