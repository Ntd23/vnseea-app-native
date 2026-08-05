const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../ChatScreen.tsx'),
  'utf8',
);

describe('group message mention presentation', () => {
  it('renders mention spans separately from ordinary text', () => {
    expect(source).toContain('buildGroupMentionTextSegments');
    expect(source).toContain('styles.inlineMention');
    expect(source).toContain('mentions={message.mentions}');
  });

  it('uses strong underlined text for sent mentions and brand color for received mentions', () => {
    expect(source).toContain("isSentByMe ? '#FFFFFF' : APP_BRAND_COLOR");
    expect(source).toContain("fontWeight: '800'");
    expect(source).toContain("textDecorationLine: 'underline'");
  });
});
