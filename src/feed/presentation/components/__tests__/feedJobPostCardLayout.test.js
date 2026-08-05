const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(
  path.join(
    process.cwd(),
    'src/feed/presentation/components/FeedCommercePostCards.tsx',
  ),
  'utf8',
);
const jobCardSource = source.slice(source.indexOf('export const FeedJobPostCard'));

describe('FeedJobPostCard action layout', () => {
  it('uses a compact icon-only share action without shrinking its touch target', () => {
    expect(jobCardSource).toContain(
      'className="mr-2 h-11 w-11 items-center justify-center rounded-lg',
    );
    expect(jobCardSource).toContain('style={styles.jobShareButton}');
    expect(source).toMatch(
      /jobShareButton:\s*\{\s*flex:\s*0,\s*height:\s*44,\s*width:\s*44,/,
    );
    expect(jobCardSource).not.toContain('>{copy.share}</Text>');
  });

  it('keeps the view-job action compact and inset from the card edge', () => {
    expect(jobCardSource).toContain(
      'className="rounded-lg bg-brand-soft px-3 py-2.5"',
    );
    expect(jobCardSource).toContain(
      'className="border-t border-[#dddfe2] px-4 py-3"',
    );
  });
});
