import { ROUTES } from '../../../../navigation/constants/routes';
import { navigateToFeedPublisherPage } from '../feedPublisherNavigation';

describe('feed publisher navigation', () => {
  it('opens PageDetail with the public Page identity', () => {
    const navigation = { navigate: jest.fn() };

    const handled = navigateToFeedPublisherPage(navigation, {
      id: '9',
      name: 'Nhà của thắng',
      username: 'nha-cua-thang',
      avatarUrl: 'https://demo.vnseea.vn/page.jpg',
      entityType: 'page',
      pageId: '9',
      ownerId: '77',
    });

    expect(handled).toBe(true);
    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.PAGE_DETAIL, {
      page: {
        id: '9',
        pageId: '9',
        pageName: 'nha-cua-thang',
        pageTitle: 'Nhà của thắng',
        avatar: 'https://demo.vnseea.vn/page.jpg',
        ownerId: '77',
      },
    });
  });

  it('leaves user publishers for the existing profile navigation', () => {
    const navigation = { navigate: jest.fn() };

    expect(
      navigateToFeedPublisherPage(navigation, {
        id: '77',
        name: 'Người dùng',
        username: 'user-77',
      }),
    ).toBe(false);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
