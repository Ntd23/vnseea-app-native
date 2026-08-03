const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('message multiline layout contract', () => {
  it('keeps newlines in normal bubbles and link captions', () => {
    const repository = read(
      'src/messages/infrastructure/repositories/ApiMessagesRepository.ts',
    );
    const chatScreen = read(
      'src/messages/presentation/screens/ChatScreen.tsx',
    );

    expect(repository).toContain(".replace(/<br\\s*\\/?>/gi, '\\n')");
    expect(repository).toContain(".replace(/\\[nl\\]/gi, '\\n')");
    expect(repository).toContain(".replace(/\\n/g, '\\\\n')");
    expect(chatScreen).toContain(".join('')");
    expect(chatScreen).toContain(".replace(/[ \\t]+\\n/g, '\\n')");
    expect(chatScreen).toContain('multiline');
  });
});
