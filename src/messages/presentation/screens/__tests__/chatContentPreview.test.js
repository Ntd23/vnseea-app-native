const fs = require('fs');
const path = require('path');

const chatScreenPath = path.resolve(__dirname, '../ChatScreen.tsx');

describe('ChatScreen canonical content previews', () => {
  const source = fs.readFileSync(chatScreenPath, 'utf8');

  it('renders a map card from the canonical message location descriptor', () => {
    expect(source).toContain('message.location');
    expect(source).toMatch(
      /message\.location\s*\?\s*\{[\s\S]*location:\s*message\.location/,
    );
  });

  it('renders generic links with the shared compact link preview card', () => {
    expect(source).toContain("import { MessageLinkPreviewCard }");
    expect(source).toContain('message.link ? (');
    expect(source).toContain('<MessageLinkPreviewCard');
    expect(source).toContain('reference={message.link}');
  });
});
