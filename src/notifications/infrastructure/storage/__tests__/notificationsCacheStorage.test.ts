const mockValues = new Map<string, string>();

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => mockValues.get(key),
    set: (key: string, value: string) => mockValues.set(key, value),
    remove: (key: string) => mockValues.delete(key),
  }),
}));

import type { NotificationsItem } from '../../../domain/types/notifications.types';
import {
  getLocallySeenSyntheticNotificationIds,
  notificationsCacheStorage,
} from '../notificationsCacheStorage';

function createNotification(id: string): NotificationsItem {
  return {
    id,
    notification_id: id,
    recipientId: 'recipient-1',
    notifierId: 'notifier-1',
    type: 'comment',
    text: `Notification ${id}`,
    url: '',
    seen: false,
    createdAt: 1,
    timeText: 'now',
    notifier: {
      userId: 'notifier-1',
      name: 'Notifier',
      username: 'notifier',
      avatar: '',
    } as NotificationsItem['notifier'],
  };
}

describe('notificationsCacheStorage', () => {
  beforeEach(() => {
    mockValues.clear();
  });

  it('restores the notification page for the active user', () => {
    notificationsCacheStorage.setSnapshot(
      {
        items: [createNotification('n-1')],
        nextOffset: 'next',
        hasMore: true,
        unreadCount: 1,
      },
      'user-1',
    );

    expect(notificationsCacheStorage.getSnapshot('user-1')).toMatchObject({
      nextOffset: 'next',
      unreadCount: 1,
      items: [{ id: 'n-1' }],
    });
    expect(notificationsCacheStorage.getSnapshot('user-2')).toBeNull();
  });

  it('clears only the selected user cache', () => {
    notificationsCacheStorage.setSnapshot(
      { items: [createNotification('n-1')], nextOffset: null, hasMore: false, unreadCount: 0 },
      'user-1',
    );
    notificationsCacheStorage.setSnapshot(
      { items: [createNotification('n-2')], nextOffset: null, hasMore: false, unreadCount: 0 },
      'user-2',
    );

    notificationsCacheStorage.clear('user-1');

    expect(notificationsCacheStorage.getSnapshot('user-1')).toBeNull();
    expect(notificationsCacheStorage.getSnapshot('user-2')?.items[0].id).toBe(
      'n-2',
    );
  });

  it('remembers locally read synthetic group invitations for badge refreshes', () => {
    const readInvite = {
      ...createNotification('group-chat-request:91'),
      seen: true,
    };
    const unreadInvite = createNotification('group-chat-request:92');

    notificationsCacheStorage.setSnapshot(
      {
        items: [readInvite, unreadInvite],
        nextOffset: null,
        hasMore: false,
        unreadCount: 1,
      },
      'user-1',
    );

    expect([
      ...getLocallySeenSyntheticNotificationIds('user-1'),
    ]).toEqual(['group-chat-request:91']);
    expect(getLocallySeenSyntheticNotificationIds('user-2').size).toBe(0);
  });
});
