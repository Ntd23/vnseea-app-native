const {
  applyCommentMentionSuggestion,
  getActiveCommentMentionToken,
  hydrateCommentMentionText,
  pruneCommentMentions,
  serializeCommentMentions,
  splitCommentMentionSegments,
} = require('../commentMentions');

const suggestion = {
  id: '42',
  kind: 'mention',
  label: 'Nguyễn Văn An',
  value: '@Nguyễn Văn An',
  backendValue: '@nguyenvanan',
  subtitle: '@nguyenvanan',
  avatarUrl: 'https://example.com/avatar.jpg',
};

const mention = {
  userId: '42',
  username: 'nguyenvanan',
  displayName: 'Nguyễn Văn An',
};

describe('comment mentions', () => {
  it('detects the active trailing @ token, including Vietnamese search text', () => {
    expect(getActiveCommentMentionToken('Chào @Nguyễn')).toEqual({
      query: 'Nguyễn',
      start: 5,
      end: 12,
    });
    expect(getActiveCommentMentionToken('mail@test.com')).toBeNull();
    expect(getActiveCommentMentionToken('Chào @Nguyễn ')).toBeNull();
  });

  it('replaces the active token with a friendly display name', () => {
    expect(applyCommentMentionSuggestion('Chào @ngu', suggestion)).toEqual({
      text: 'Chào @Nguyễn Văn An ',
      mention,
    });
  });

  it('sends @username to the backend and restores the display name', () => {
    const displayText = 'Chào @Nguyễn Văn An nhé';
    const backendText = serializeCommentMentions(displayText, [mention]);

    expect(backendText).toBe('Chào @nguyenvanan nhé');
    expect(hydrateCommentMentionText(backendText, [mention])).toBe(displayText);
    expect(hydrateCommentMentionText('Chào @[42] nhé', [mention])).toBe(
      displayText,
    );
  });

  it('removes metadata when the user deletes the selected display mention', () => {
    expect(pruneCommentMentions('Không còn tag', [mention])).toEqual([]);
    expect(pruneCommentMentions('Vẫn còn @Nguyễn Văn An', [mention])).toEqual([
      mention,
    ]);
  });

  it('splits known mentions into Facebook-style tappable segments', () => {
    expect(
      splitCommentMentionSegments('Chào @Nguyễn Văn An!', [mention]),
    ).toEqual([
      { text: 'Chào ' },
      { text: '@Nguyễn Văn An', mention, isMention: true },
      { text: '!' },
    ]);
  });

  it('styles unknown Unicode mentions without requiring backend metadata', () => {
    expect(
      splitCommentMentionSegments('Chào @Đặng_Thị_Thu, hẹn gặp @ミカ!'),
    ).toEqual([
      { text: 'Chào ' },
      { text: '@Đặng_Thị_Thu', isMention: true },
      { text: ', hẹn gặp ' },
      { text: '@ミカ', isMention: true },
      { text: '!' },
    ]);
  });

  it('does not treat the @ inside an email address as a mention', () => {
    expect(
      splitCommentMentionSegments(
        'Gửi mail tới support@vnseea.vn hoặc tag @vnseea.',
      ),
    ).toEqual([
      { text: 'Gửi mail tới support@vnseea.vn hoặc tag ' },
      { text: '@vnseea', isMention: true },
      { text: '.' },
    ]);
  });

  it('requires sensible boundaries for known mentions too', () => {
    expect(
      splitCommentMentionSegments(
        'mail@Nguyễn Văn An và @Nguyễn Văn An2, rồi @Nguyễn Văn An.',
        [mention],
      ),
    ).toEqual([
      { text: 'mail@Nguyễn Văn An và ' },
      { text: '@Nguyễn', isMention: true },
      { text: ' Văn An2, rồi ' },
      { text: '@Nguyễn Văn An', mention, isMention: true },
      { text: '.' },
    ]);
  });
});
