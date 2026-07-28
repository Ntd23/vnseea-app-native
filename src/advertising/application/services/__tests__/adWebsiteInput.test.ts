import {
  AD_WEBSITE_PREFIX,
  buildAdWebsiteUrl,
  getAdWebsiteHost,
  getAdWebsiteProtocol,
} from '../adWebsiteInput';

describe('ad website input helpers', () => {
  it('prefills and preserves the secure protocol for a new ad', () => {
    expect(buildAdWebsiteUrl('')).toBe(AD_WEBSITE_PREFIX);
    expect(buildAdWebsiteUrl('example.com')).toBe('https://example.com');
  });

  it('accepts a pasted full URL without duplicating its protocol', () => {
    expect(buildAdWebsiteUrl('https://example.com/path')).toBe(
      'https://example.com/path',
    );
    expect(buildAdWebsiteUrl('http://example.com')).toBe(
      'https://example.com',
    );
  });

  it('displays legacy links accurately until the user edits them', () => {
    expect(getAdWebsiteProtocol('http://legacy.example.com')).toBe('http://');
    expect(getAdWebsiteHost('http://legacy.example.com')).toBe(
      'legacy.example.com',
    );
  });
});
