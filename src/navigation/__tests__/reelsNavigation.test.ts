import { ROUTES } from '../constants/routes';
import { createReelsNavigationTarget } from '../reelsNavigation';

describe('reels navigation target', () => {
  const params = {
    initialVideoId: 'video-1',
    source: 'saved' as const,
  };

  it('opens Reels through MainTabs on iOS so the native Video tab remains visible', () => {
    expect(createReelsNavigationTarget('ios', params)).toEqual({
      name: ROUTES.MAIN_TABS,
      params: {
        screen: ROUTES.REELS,
        params,
      },
    });
  });

  it('opens Reels through MainTabs on Android so the custom Reels tab remains selected', () => {
    expect(createReelsNavigationTarget('android', params)).toEqual({
      name: ROUTES.MAIN_TABS,
      params: {
        screen: ROUTES.REELS,
        params,
      },
    });
  });
});
