import {
  buildLiveShareMessage,
  buildLiveShareUrl,
  formatLiveElapsedTime,
} from '../liveRoomPresentation';

describe('live room presentation helpers', () => {
  it('formats the live duration without wrapping after one hour', () => {
    const startedAt = '2026-08-04T01:00:00.000Z';

    expect(
      formatLiveElapsedTime(
        startedAt,
        new Date('2026-08-04T01:12:48.000Z').getTime(),
      ),
    ).toBe('12:48');
    expect(
      formatLiveElapsedTime(
        startedAt,
        new Date('2026-08-04T03:03:04.000Z').getTime(),
      ),
    ).toBe('2:03:04');
  });

  it('builds a public HTTPS post URL for native sharing', () => {
    expect(buildLiveShareUrl('https://v2.vnseea.vn/', 123)).toBe(
      'https://v2.vnseea.vn/post/123',
    );
  });

  it('keeps the public URL inside the Android share message', () => {
    const url = 'https://v2.vnseea.vn/post/123';

    expect(
      buildLiveShareMessage({
        publisherName: 'Doraemon',
        title: 'Chào mọi người',
        url,
      }),
    ).toBe(
      `Doraemon đang phát trực tiếp trên VNSEEA.\nChào mọi người\nXem ngay: ${url}`,
    );
  });
});
