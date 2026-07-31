// Description: Verifies that native blog actions use the canonical extensionless website URL.
import { normalizeBlogWebUrl } from '../normalizeBlogWebUrl';

describe('normalizeBlogWebUrl', () => {
  it('removes a trailing .html extension', () => {
    expect(
      normalizeBlogWebUrl('https://vnseea.vn/read-blog/42_bai-viet.html'),
    ).toBe('https://vnseea.vn/read-blog/42_bai-viet');
  });

  it('preserves query parameters and hashes', () => {
    expect(
      normalizeBlogWebUrl(
        'https://vnseea.vn/read-blog/42_bai-viet.html?source=app#comments',
      ),
    ).toBe(
      'https://vnseea.vn/read-blog/42_bai-viet?source=app#comments',
    );
  });

  it('does not alter .html when it is not the path suffix', () => {
    expect(
      normalizeBlogWebUrl(
        'https://vnseea.vn/read-blog/42_bai-viet?redirect=page.html',
      ),
    ).toBe(
      'https://vnseea.vn/read-blog/42_bai-viet?redirect=page.html',
    );
  });

  it('returns an empty string for a missing URL', () => {
    expect(normalizeBlogWebUrl()).toBe('');
  });
});
