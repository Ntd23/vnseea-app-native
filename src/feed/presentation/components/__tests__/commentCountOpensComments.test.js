const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

describe('Feed post comment count interaction', () => {
  it('opens the existing comments sheet from text and video post comment counts', () => {
    const source = read('src/feed/presentation/components/PostCards.tsx');
    const summarySource = source.slice(
      source.indexOf('const VideoReactionSummary'),
      source.indexOf('const VideoPostActions'),
    );
    const summaryUsages = source.match(
      /<VideoReactionSummary[\s\S]*?\/>/g,
    );

    expect(summarySource).toContain('onCommentTap,');
    expect(summarySource).toContain('onCommentTap: () => void;');
    expect(summarySource).toMatch(
      /<TouchableOpacity[\s\S]*?onPress=\{onCommentTap\}[\s\S]*?\{copy\.commentsCount\(commentCount\)\}[\s\S]*?<\/TouchableOpacity>/,
    );
    expect(summaryUsages).toHaveLength(2);
    summaryUsages.forEach(usage => {
      expect(usage).toContain('onCommentTap={handleCommentTap}');
    });
  });

  it('opens the existing comments sheet from a poll post comment count', () => {
    const source = read('src/feed/presentation/components/PollPostCard.tsx');
    const commentSummarySource = source.slice(
      source.indexOf('{/* Comment Count Bubble */}'),
      source.indexOf('{showInlineReactionPicker ?'),
    );

    expect(commentSummarySource).toMatch(
      /<TouchableOpacity[\s\S]*?onPress=\{\(\) => onCommentTap\(post\.id\)\}[\s\S]*?\{post\.commentCount\}[\s\S]*?<\/TouchableOpacity>/,
    );
  });
});
