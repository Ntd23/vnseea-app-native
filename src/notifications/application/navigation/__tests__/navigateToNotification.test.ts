import { ROUTES } from '../../../../navigation/constants/routes';
import type { NotificationsItem } from '../../../domain/types/notifications.types';
import { navigateToNotification } from '../navigateToNotification';

jest.mock('react-native', () => ({
  Linking: { openURL: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock(
  '../../../../orders/infrastructure/repositories/ApiOrdersRepository',
  () => ({
    createOrdersRepository: () => ({
      getSellerOrders: jest.fn(),
      getPurchasedOrders: jest.fn(),
    }),
  }),
);
jest.mock(
  '../../../../events/infrastructure/repositories/ApiEventsRepository',
  () => ({
    createEventsRepository: () => ({ getById: jest.fn() }),
  }),
);
jest.mock('../../../../navigation/profileNavigation', () => ({
  navigateToUserProfile: jest.fn(),
}));

function notification(
  overrides: Partial<NotificationsItem>,
): NotificationsItem {
  return {
    id: 'notification-1',
    notification_id: 'notification-1',
    recipientId: '1',
    notifierId: '7',
    type: 'liked_post',
    text: 'đã thích bài viết của bạn',
    url: '',
    seen: false,
    createdAt: 1,
    timeText: '',
    notifier: {
      id: '7',
      name: 'Người gửi',
      avatarUrl: '',
      username: 'sender',
      verified: false,
    },
    ...overrides,
  };
}

describe('navigateToNotification', () => {
  it('opens a reaction notification in the matching post detail', async () => {
    const navigation = { navigate: jest.fn() };

    await navigateToNotification(
      notification({ postId: '42' }),
      navigation,
    );

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.POST_DETAIL, {
      postId: '42',
    });
  });

  it('opens a message push in the exact conversation', async () => {
    const navigation = { navigate: jest.fn() };

    await navigateToNotification(
      notification({
        type: 'message',
        messageConversationType: 'user',
        messageConversationId: '7',
      }),
      navigation,
    );

    expect(navigation.navigate).toHaveBeenCalledWith(
      ROUTES.CHAT,
      expect.objectContaining({
        chat: expect.objectContaining({
          chatType: 'user',
          participantId: '7',
          userId: '7',
        }),
      }),
    );
  });
});
