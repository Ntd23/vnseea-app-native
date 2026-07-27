import { navigateBackOrFeed } from '../profileBackNavigation';

type NavigationStub = {
  canGoBack: jest.Mock<boolean, []>;
  goBack: jest.Mock<void, []>;
  navigate: jest.Mock<void, [string, unknown?]>;
  getParent: jest.Mock<NavigationStub | undefined, []>;
};

function createNavigationStub(
  overrides: Partial<NavigationStub> = {},
): NavigationStub {
  return {
    canGoBack: jest.fn(() => false),
    goBack: jest.fn(),
    navigate: jest.fn(),
    getParent: jest.fn(() => undefined),
    ...overrides,
  };
}

describe('navigateBackOrFeed', () => {
  it('goes back on the closest navigator that owns history', () => {
    const parent = createNavigationStub({
      canGoBack: jest.fn(() => true),
    });
    const child = createNavigationStub({
      getParent: jest.fn(() => parent),
    });

    navigateBackOrFeed(child);

    expect(child.goBack).not.toHaveBeenCalled();
    expect(parent.goBack).toHaveBeenCalledTimes(1);
    expect(parent.navigate).not.toHaveBeenCalled();
  });

  it('falls back to the root Feed tab when no navigator can go back', () => {
    const root = createNavigationStub();
    const child = createNavigationStub({
      getParent: jest.fn(() => root),
    });

    navigateBackOrFeed(child);

    expect(root.navigate).toHaveBeenCalledWith('MainTabs', {
      screen: 'Feed',
    });
  });

  it('does not loop forever when a malformed navigator parent cycles', () => {
    const navigation = createNavigationStub();
    navigation.getParent.mockReturnValue(navigation);

    navigateBackOrFeed(navigation);

    expect(navigation.navigate).toHaveBeenCalledWith('MainTabs', {
      screen: 'Feed',
    });
  });
});
