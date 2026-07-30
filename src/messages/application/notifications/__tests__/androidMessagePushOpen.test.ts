import { parseAndroidMessagePushOpen } from '../androidMessagePushOpen';

describe('androidMessagePushOpen', () => {
  it('restores a sanitized message route captured by the native notification', () => {
    const payload = parseAndroidMessagePushOpen(
      JSON.stringify({
        notificationId: 'message:42',
        title: 'Người gửi',
        body: 'Tin nhắn mới',
        openedAt: 1_721_000_000_000,
        additionalData: {
          push_kind: 'message',
          notification_type: 'message',
          type: 'group',
          group_id: '73',
          message_id: '42',
          recipient_id: '9',
        },
      }),
    );

    expect(payload).toEqual({
      notificationId: 'message:42',
      title: 'Người gửi',
      body: 'Tin nhắn mới',
      openedAt: 1_721_000_000_000,
      additionalData: {
        push_kind: 'message',
        notification_type: 'message',
        type: 'group',
        group_id: '73',
        message_id: '42',
        recipient_id: '9',
      },
    });
  });

  it('rejects malformed or targetless native message routes', () => {
    expect(parseAndroidMessagePushOpen('not-json')).toBeNull();
    expect(
      parseAndroidMessagePushOpen(
        JSON.stringify({
          notificationId: 'message:42',
          additionalData: {
            push_kind: 'message',
            type: 'group',
          },
        }),
      ),
    ).toBeNull();
  });
});
