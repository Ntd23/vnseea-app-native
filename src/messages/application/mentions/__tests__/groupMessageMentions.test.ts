import {
  findActiveGroupMention,
  insertGroupMention,
  replaceGroupMentionTokens,
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

    expect(result.text).toBe('Chào @nguyenvana  nhé');
    expect(result.mentionedUserIds).toEqual(['42']);
    expect(result.cursor).toBe(17);
  });

  it('maps canonical backend tokens to display names', () => {
    expect(
      replaceGroupMentionTokens('Chào @[42] và @[99]', [
        member,
        { id: '99', name: 'Trần B', username: 'tranb', avatar: '' },
      ]),
    ).toBe('Chào @Nguyễn Văn A và @Trần B');
  });
});
