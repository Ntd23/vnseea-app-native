import {
  buildPostActivityContext,
  getPostFeelingLabel,
} from '../postActivityContext';
import type {
  PostFeeling,
  PostTaggedUser,
} from '../../../domain/types/feed.types';

const taggedUsers: PostTaggedUser[] = [
  {
    id: '11',
    name: 'Nguyễn Văn A',
    username: 'nguyenvana',
  },
  {
    id: '12',
    name: 'Trần Văn B',
    username: 'tranvanb',
  },
  {
    id: '13',
    name: 'Lê Văn C',
    username: 'levanc',
  },
];

describe('post activity context', () => {
  it('formats feeling, multiple tagged users and location in Vietnamese order', () => {
    const result = buildPostActivityContext({
      language: 'vi',
      feeling: {
        type: 'feelings',
        value: 'happy',
      },
      taggedUsers,
      location: { label: 'Hà Nội' },
    });

    expect(result).toEqual({
      beforeTaggedUsers: 'hiện đang cảm thấy vui vẻ cùng với ',
      taggedUsersLabel: 'Nguyễn Văn A và 2 người khác',
      afterTaggedUsers: ' tại Hà Nội',
      segments: [
        { kind: 'text', text: 'hiện đang cảm thấy ' },
        { kind: 'feeling', text: 'vui vẻ' },
        { kind: 'text', text: ' cùng với ' },
        {
          kind: 'tagged_users',
          text: 'Nguyễn Văn A và 2 người khác',
        },
        { kind: 'text', text: ' tại ' },
        { kind: 'location', text: 'Hà Nội' },
      ],
      fullText:
        'hiện đang cảm thấy vui vẻ cùng với Nguyễn Văn A và 2 người khác tại Hà Nội',
    });
  });

  it('formats only the metadata that exists in English', () => {
    expect(
      buildPostActivityContext({
        language: 'en',
        taggedUsers: taggedUsers.slice(0, 1),
      }).fullText,
    ).toBe('is with Nguyễn Văn A');

    expect(
      buildPostActivityContext({
        language: 'en',
        location: { label: 'Hanoi' },
      }).fullText,
    ).toBe('is in Hanoi');
  });

  it('marks feeling and location as emphasized semantic segments', () => {
    const result = buildPostActivityContext({
      language: 'vi',
      feeling: {
        type: 'feelings',
        value: 'pretty',
      },
      location: { label: 'Hà Nội' },
    });

    expect(result.segments).toEqual([
      { kind: 'text', text: 'hiện đang cảm thấy ' },
      { kind: 'feeling', text: 'thư thái' },
      { kind: 'text', text: ' tại ' },
      { kind: 'location', text: 'Hà Nội' },
    ]);
  });

  it('uses a localized fallback for canonical feelings', () => {
    const feeling: PostFeeling = {
      type: 'feelings',
      value: 'blessed',
    };

    expect(getPostFeelingLabel(feeling, 'vi')).toBe('may mắn');
    expect(getPostFeelingLabel(feeling, 'en')).toBe('blessed');
  });
});
