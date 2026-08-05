import {
  buildGroupMentionTextSegments,
  filterSelectedGroupMentions,
  findActiveGroupMention,
  insertGroupMention,
  replaceGroupMentionTokens,
  serializeGroupMentionTokens,
} from '../groupMessageMentions';

const member = {
  id: '42',
  name: 'Nguyễn Văn A',
  username: 'nguyenvana',
  avatar: 'https://media.vnseea.vn/avatar.jpg',
};

describe('group message mentions', () => {
  it('detects the mention token at the active cursor', () => {
    expect(findActiveGroupMention('Chào @nguy', 10)).toEqual({
      start: 5,
      end: 10,
      query: 'nguy',
    });
    expect(findActiveGroupMention('email@example.com', 17)).toBeUndefined();
  });

  it('inserts a selected member and keeps a unique recipient id', () => {
    const result = insertGroupMention(
      'Chào @nguy nhé',
      { start: 5, end: 10, query: 'nguy' },
      member,
      ['42'],
    );

    expect(result.text).toBe('Chào @Nguyễn Văn A  nhé');
    expect(result.mentionedUserIds).toEqual(['42']);
    expect(result.cursor).toBe(19);
  });

  it('serializes display names to stable backend ids', () => {
    expect(
      serializeGroupMentionTokens('Chào @Nguyễn Văn A nhé', [member]),
    ).toBe('Chào @[42] nhé');
  });

  it('keeps a selected mention while its full display name is present', () => {
    expect(
      filterSelectedGroupMentions('Chào @Nguyễn Văn A', [member]),
    ).toEqual([member]);
    expect(filterSelectedGroupMentions('Chào mọi người', [member])).toEqual(
      [],
    );
  });

  it('maps canonical backend tokens to display names', () => {
    expect(
      replaceGroupMentionTokens('Chào @[42] và @[99]', [
        member,
        { id: '99', name: 'Trần B', username: 'tranb', avatar: '' },
      ]),
    ).toBe('Chào @Nguyễn Văn A và @Trần B');
  });

  it('separates mention spans from ordinary message text', () => {
    expect(
      buildGroupMentionTextSegments('Chào @Nguyễn Văn A, hẹn gặp lại', [
        member,
      ]),
    ).toEqual([
      { text: 'Chào ', isMention: false },
      { text: '@Nguyễn Văn A', isMention: true, mentionId: '42' },
      { text: ', hẹn gặp lại', isMention: false },
    ]);
  });
});
