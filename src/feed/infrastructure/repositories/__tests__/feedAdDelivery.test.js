const fs = require('fs');
const path = require('path');

const read = relativePath =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

describe('feed ad delivery policy', () => {
  it('keeps several sponsored posts per page and spaces them through the feed', () => {
    const source = read('src/feed/infrastructure/repositories/ApiFeedRepository.ts');
    expect(source).toContain('const maxAdsPerPage = 3;');
    expect(source).toContain('pageAdsIncluded >= maxAdsPerPage');
    expect(source).toContain('ads.slice(0, maxAdsPerPage)');
    expect(source).toContain('4 + index * 6');
  });
});
