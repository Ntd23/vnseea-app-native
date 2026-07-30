import { pushNavigationStorage } from '../pushNavigationStorage';

describe('pushNavigationStorage', () => {
  beforeEach(() => {
    pushNavigationStorage.clear();
  });

  it('persists only allowlisted primitive routing data', () => {
    pushNavigationStorage.saveOpen({
      notificationId: 'notification-1',
      title: 'Title',
      body: 'Body',
      launchUrl: 'https://vnseea.vn/post/42',
      openedAt: 1_000,
      additionalData: {
        type: 'liked_post',
        post_id: 42,
        private_payload: { secret: true },
        arbitrary_secret: 'must-not-survive',
      },
    });

    expect(pushNavigationStorage.getOpen(2_000)).toEqual(
      expect.objectContaining({
        notificationId: 'notification-1',
        additionalData: {
          type: 'liked_post',
          post_id: 42,
        },
      }),
    );
  });

  it('preserves allowlisted routing fields inside legacy nested payloads', () => {
    pushNavigationStorage.saveOpen({
      notificationId: 'notification-2',
      openedAt: 1_000,
      additionalData: {
        notification_data: {
          type: 'comment',
          post_id: '51',
          notification_id: '91',
          secret: 'drop-me',
        },
      },
    });

    expect(pushNavigationStorage.getOpen(2_000)?.additionalData).toEqual({
      notification_data: {
        type: 'comment',
        post_id: '51',
        notification_id: '91',
      },
    });
  });

  it('drops pending navigation after 24 hours', () => {
    pushNavigationStorage.saveOpen({
      notificationId: 'notification-1',
      openedAt: 1_000,
      additionalData: { type: 'liked_post' },
    });

    expect(
      pushNavigationStorage.getOpen(1_000 + 24 * 60 * 60 * 1_000 + 1),
    ).toBeNull();
  });

  it('deduplicates read receipts until the backend acknowledges them', () => {
    pushNavigationStorage.addReadReceipt('12', '42');
    pushNavigationStorage.addReadReceipt('12', '42');
    pushNavigationStorage.addReadReceipt('13', '42');
    pushNavigationStorage.addReadReceipt('14', '99');

    expect(pushNavigationStorage.getReadReceipts('42')).toEqual(['12', '13']);
    expect(pushNavigationStorage.getReadReceipts('99')).toEqual(['14']);

    pushNavigationStorage.completeReadReceipt('12', '42');
    expect(pushNavigationStorage.getReadReceipts('42')).toEqual(['13']);
    expect(pushNavigationStorage.getReadReceipts('99')).toEqual(['14']);
  });
});
