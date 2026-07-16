import { ROUTES } from '../constants/routes';
import { createReelsNavigationTarget, navigateToReels } from '../reelsNavigation';

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

  it('falls back to navigate for minimal navigators without push', () => {
    const navigation = {
      navigate: jest.fn(),
    };

    navigateToReels(navigation, params, 'ios');

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.REELS, params);
  });
});
