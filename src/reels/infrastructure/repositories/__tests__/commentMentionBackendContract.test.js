const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('comment mention backend contract', () => {
  it.each([
    'phtml/assets/includes/functions_one.php',
    'phtml/assets/includes/functions_two.php',
  ])('exposes structured mention metadata from %s', relativePath => {
    const source = read(relativePath);

    expect(source).toContain('mention_text');
    expect(source).toContain("preg_match_all('/@\\[([0-9]+)\\]/i'");
    expect(source).toContain('mentions');
    expect(source).toContain('user_id');
    expect(source).toContain('username');
    expect(source).toContain('display_name');
  });

  it('maps structured mentions back into native comment models', () => {
    const source = read(
      'src/reels/infrastructure/repositories/ApiReelsRepository.ts',
    );

    expect(source).toContain('mapCommentMentions');
    expect(source).toContain("readString(raw, 'mention_text')");
    expect(source).toContain('hydrateCommentMentionText');
    expect(source).toContain(
      'mentions: mentions.length > 0 ? mentions : undefined',
    );
  });
});
