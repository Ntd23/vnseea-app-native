import {
  DEFAULT_STORE_URL,
  normalizeReleaseVersion,
  resolveStoreUrl,
  shouldPromptForUpdate,
} from '../appRelease';

describe('mobile app release contract', () => {
  it('only prompts when both versions are valid and different', () => {
    expect(shouldPromptForUpdate('2.0.3', '2.0.4')).toBe(true);
    expect(shouldPromptForUpdate('2.0.3', '2.0.3')).toBe(false);
    expect(shouldPromptForUpdate('2.0.3', '')).toBe(false);
    expect(shouldPromptForUpdate('', '2.0.4')).toBe(false);
  });

  it('normalizes manually entered release versions', () => {
    expect(normalizeReleaseVersion(' 9.0.18 ')).toBe('9.0.18');
    expect(normalizeReleaseVersion('version 9')).toBe('');
  });

  it('accepts only the expected store host for each platform', () => {
    expect(
      resolveStoreUrl(
        'ios',
        'https://apps.apple.com/vn/app/vnseea/id6767143251?l=vi',
      ),
    ).toContain('apps.apple.com');
    expect(
      resolveStoreUrl('android', 'https://example.com/fake-update'),
    ).toBe(DEFAULT_STORE_URL.android);
  });
});
