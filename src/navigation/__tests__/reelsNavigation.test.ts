import { ROUTES } from '../constants/routes';
import {
  createReelsNavigationTarget,
  navigateToReels,
  shouldOpenReelsInMainTab,
} from '../reelsNavigation';

describe('reels navigation target', () => {
  const params = {
    initialVideoId: 'video-1',
    source: 'saved' as const,
  };

  it('opens a tapped Reels item on the root Reels route on iOS', () => {
    expect(createReelsNavigationTarget('ios', params)).toEqual({
      name: ROUTES.REELS,
      params,
    });
  });

  it('opens a tapped Reels item on the root Reels route on Android', () => {
    expect(createReelsNavigationTarget('android', params)).toEqual({
      name: ROUTES.REELS,
      params,
    });
  });

  it('pushes root Reels so the custom swipe-back can reveal the previous screen', () => {
    const navigation = {
      navigate: jest.fn(),
      push: jest.fn(),
    };

    navigateToReels(navigation, params, 'ios');

    expect(navigation.push).toHaveBeenCalledWith(ROUTES.REELS, params);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('reuses the persistent Reels tab for the generic Video entry on Home', () => {
    const navigation = {
      navigate: jest.fn(),
      push: jest.fn(),
    };
    const homeParams = { source: 'home' as const };

    expect(shouldOpenReelsInMainTab(homeParams)).toBe(true);
    navigateToReels(navigation, homeParams, 'android');

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.MAIN_TABS, {
      screen: ROUTES.REELS,
      params: homeParams,
    });
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it('reuses the persistent Reels tab for a concrete video tapped on Home', () => {
    const navigation = {
      navigate: jest.fn(),
      push: jest.fn(),
    };
    const homeVideoParams = {
      source: 'home' as const,
      initialVideoId: 'video-1',
    };

    expect(shouldOpenReelsInMainTab(homeVideoParams)).toBe(true);
    navigateToReels(navigation, homeVideoParams, 'android');

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.MAIN_TABS, {
      screen: ROUTES.REELS,
      params: homeVideoParams,
    });
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it('switches directly when the caller already belongs to the tab navigator', () => {
    const navigation = {
      navigate: jest.fn(),
      push: jest.fn(),
      getState: () => ({ type: 'tab' }),
    };
    const homeParams = { source: 'home' as const };

    navigateToReels(navigation, homeParams, 'android');

    expect(navigation.navigate).toHaveBeenCalledWith(
      ROUTES.REELS,
      homeParams,
    );
    expect(navigation.push).not.toHaveBeenCalled();
  });

  it('falls back to navigate for minimal navigators without push', () => {
    const navigation = {
      navigate: jest.fn(),
    };

    navigateToReels(navigation, params, 'ios');

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.REELS, params);
  });
});
