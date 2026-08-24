import type { NotificationsItem } from '../../../domain/types/notifications.types';
import { formatNotificationText } from '../notificationCopy';

function notification(
  type: string,
  text = '',
): NotificationsItem {
  return {
    id: '1',
    notification_id: '1',
    recipientId: '10',
    notifierId: '20',
    type,
    text,
    url: '',
    seen: false,
    createdAt: Date.now(),
    timeText: '',
    notifier: {
      id: '20',
      name: 'Nguyễn Văn A',
      username: 'nguyenvana',
      avatarUrl: '',
    },
  };
}

describe('followed content notification copy', () => {
  it('describes a new followed post in Vietnamese and English', () => {
    const item = notification('new_post');

    expect(formatNotificationText(item, 'vi')).toBe(
      'Nguyễn Văn A vừa đăng một bài viết mới',
    );
    expect(formatNotificationText(item, 'en')).toBe(
      'Nguyễn Văn A posted a new post',
    );
  });

  it('describes a new followed story in Vietnamese and English', () => {
    const item = notification('new_story');

    expect(formatNotificationText(item, 'vi')).toBe(
      'Nguyễn Văn A vừa đăng một tin mới',
    );
    expect(formatNotificationText(item, 'en')).toBe(
      'Nguyễn Văn A added a new story',
    );
  });
});
