type ResolveFeedChromeTopInset = (
  safeAreaTop: number,
  initialSafeAreaTop?: number | null,
) => number;

function loadResolver(
  platform: 'android' | 'ios',
  statusBarHeight?: number,
): ResolveFeedChromeTopInset {
  jest.resetModules();
  jest.doMock('react-native', () => ({
    Platform: { OS: platform },
    StatusBar: { currentHeight: statusBarHeight },
  }));

  return (
    require('../feedHeaderInsets') as {
      resolveFeedChromeTopInset: ResolveFeedChromeTopInset;
    }
  ).resolveFeedChromeTopInset;
}

describe('resolveFeedChromeTopInset', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('react-native');
  });

  it('uses the Android safe-area inset when available', () => {
    const resolveFeedChromeTopInset = loadResolver('android', 24);

    expect(resolveFeedChromeTopInset(36, 30)).toBe(36);
  });

  it('does not reuse stale initial Android metrics when runtime inset is zero', () => {
    const resolveFeedChromeTopInset = loadResolver('android', 24);

    expect(resolveFeedChromeTopInset(0, 30)).toBe(0);
  });

  it('respects an explicit zero Android inset on non-edge-to-edge windows', () => {
    const resolveFeedChromeTopInset = loadResolver('android', 24);

    expect(resolveFeedChromeTopInset(0, 0)).toBe(0);
  });

  it('does not synthesize Android inset from StatusBar.currentHeight', () => {
    const resolveFeedChromeTopInset = loadResolver('android', 24);

    expect(resolveFeedChromeTopInset(0, undefined)).toBe(0);
  });

  it('preserves the existing iOS fallback', () => {
    const resolveFeedChromeTopInset = loadResolver('ios');

    expect(resolveFeedChromeTopInset(0, 0)).toBe(47);
  });
});
