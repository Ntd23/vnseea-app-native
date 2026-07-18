import {
  CONTENT_AUDIENCE_CONTRACT,
  audienceFromWire,
  audienceToWire,
} from '../contentAudience';

describe('content audience contract', () => {
  it('uses the audience_v2 wire values', () => {
    expect(CONTENT_AUDIENCE_CONTRACT).toBe('audience_v2');
    expect(audienceToWire('public')).toBe('0');
    expect(audienceToWire('friends')).toBe('1');
    expect(audienceToWire('followers')).toBe('2');
    expect(audienceToWire('only_me')).toBe('3');
  });

  it('reads legacy anonymous privacy as a public anonymous post', () => {
    expect(audienceFromWire('4', { fallback: 'only_me' })).toEqual({
      audience: 'public',
      isAnonymous: true,
      isValid: true,
    });
  });

  it('distinguishes audience_v2 from the legacy reels contract', () => {
    expect(
      audienceFromWire('2', {
        contract: 'audience_v2',
        fallback: 'only_me',
      }),
    ).toEqual({ audience: 'followers', isAnonymous: false, isValid: true });
    expect(
      audienceFromWire('2', {
        contract: 'legacy_reel',
        fallback: 'public',
      }),
    ).toEqual({ audience: 'only_me', isAnonymous: false, isValid: true });
    expect(
      audienceFromWire('3', {
        contract: 'audience_v2',
        fallback: 'public',
      }),
    ).toEqual({ audience: 'only_me', isAnonymous: false, isValid: true });
  });

  it('uses an explicit fail-closed fallback for missing and malformed values', () => {
    expect(audienceFromWire(undefined, { fallback: 'followers' })).toEqual({
      audience: 'followers',
      isAnonymous: false,
      isValid: false,
    });
    expect(audienceFromWire('not-audience', { fallback: 'only_me' })).toEqual({
      audience: 'only_me',
      isAnonymous: false,
      isValid: false,
    });
  });
});
