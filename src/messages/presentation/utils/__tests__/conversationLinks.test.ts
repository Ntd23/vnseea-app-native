import { extractConversationLink } from '../conversationLinks';

describe('conversation shared links', () => {
  it('decodes WoWonder encoded link markup', () => {
    expect(
      extractConversationLink(
        '[a]https%3A%2F%2Fvnseea.vn%2Ftin%3Fid%3D12%26from%3Dchat[/a]',
      ),
    ).toBe('https://vnseea.vn/tin?id=12&from=chat');
  });

  it('extracts an href from rendered anchor markup', () => {
    expect(
      extractConversationLink(
        '<a href="https://vnseea.vn/bai-viet">Xem bài viết</a>',
      ),
    ).toBe('https://vnseea.vn/bai-viet');
  });

  it('adds a scheme to legacy encoded links that omit one', () => {
    expect(extractConversationLink('[a]www.vnseea.vn/trang-ca-nhan[/a]')).toBe(
      'http://www.vnseea.vn/trang-ca-nhan',
    );
  });

  it('returns a normal URL without trailing punctuation', () => {
    expect(extractConversationLink('Xem tại https://vnseea.vn/news/42.')).toBe(
      'https://vnseea.vn/news/42',
    );
  });
});
