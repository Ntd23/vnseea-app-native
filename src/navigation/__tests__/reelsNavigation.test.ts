import { ROUTES } from '../constants/routes';
import { createReelsNavigationTarget, navigateToReels } from '../reelsNavigation';

describe('reels navigation target', () => {
  const params = {
    initialVideoId: 'video-1',
    source: 'saved' as const,
  };

  it('opens Reels through MainTabs on iOS so the bottom bar stays visible', () => {
    expect(createReelsNavigationTarget('ios', params)).toEqual({
      name: ROUTES.MAIN_TABS,
      params: {
        screen: ROUTES.REELS,
        params,
      },
    });
  });

  it('opens Reels through MainTabs on Android for a consistent tab entrypoint', () => {
    expect(createReelsNavigationTarget('android', params)).toEqual({
      name: ROUTES.MAIN_TABS,
      params: {
        screen: ROUTES.REELS,
        params,
      },
    });
  });

  it('navigates through MainTabs instead of pushing the legacy root Reels route', () => {
    const navigation = {
      navigate: jest.fn(),
      push: jest.fn(),
    };

    navigateToReels(navigation, params, 'ios');

    expect(navigation.push).not.toHaveBeenCalled();
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.MAIN_TABS, {
      screen: ROUTES.REELS,
      params,
    });
  });
});
