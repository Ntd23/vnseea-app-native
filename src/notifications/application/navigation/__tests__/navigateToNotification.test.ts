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
jest.mock(
  '../../../../stories/infrastructure/repositories/ApiStoriesRepository',
  () => {
    const getUserStories = jest.fn();
    return {
      __mockGetUserStories: getUserStories,
      createStoriesRepository: () => ({ getUserStories }),
    };
  },
);

const mockGetUserStories = (
  jest.requireMock(
    '../../../../stories/infrastructure/repositories/ApiStoriesRepository',
  ) as { __mockGetUserStories: jest.Mock }
).__mockGetUserStories;

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
  beforeEach(() => {
    mockGetUserStories.mockReset();
  });

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

  it('opens a comment notification in the matching post detail', async () => {
    const navigation = { navigate: jest.fn() };

    await navigateToNotification(
      notification({
        type: 'comment',
        postId: '42',
      }),
      navigation,
    );

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.POST_DETAIL, {
      postId: '42',
      focusComments: true,
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

  it('opens a Story notification at the exact active segment', async () => {
    const navigation = { navigate: jest.fn() };
    const stories = [
      {
        id: 'story-group',
        publisher: {
          userId: '1',
          username: 'owner',
          name: 'Owner',
        },
        postedAt: 1,
        expiresAt: 2,
        media: [
          {
            id: 'media-1',
            type: 'image',
            url: 'https://example.test/story.jpg',
            storyId: '145',
          },
        ],
        isOwner: true,
        isViewed: false,
        hasUnseen: true,
        myReaction: null,
        reactionCount: 0,
      },
    ];
    mockGetUserStories.mockResolvedValue(stories);

    await navigateToNotification(
      notification({
        type: 'reaction',
        text: 'story',
        storyId: '145',
      }),
      navigation,
    );

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.STORY_VIEWER, {
      stories,
      initialUserIndex: 0,
      initialSegmentIndex: 0,
    });
  });

  it('falls back to the Story list when the target is no longer active', async () => {
    const navigation = { navigate: jest.fn() };
    mockGetUserStories.mockResolvedValue([]);

    await navigateToNotification(
      notification({
        type: 'viewed_story',
        storyId: '145',
      }),
      navigation,
    );

    expect(navigation.navigate).toHaveBeenCalledWith(ROUTES.STORIES_LIST);
  });
});
