import {
  getFixedBottomLayout,
  getSafeBottomPadding,
} from '../safeBottomLayout';

describe('safe bottom layout', () => {
  it('raises a fixed footer above a three-button navigation bar', () => {
    expect(
      getFixedBottomLayout({
        bottomInset: 48,
        minimumFooterBottomPadding: 16,
        contentBottomPadding: 120,
      }),
    ).toEqual({
      footerBottomPadding: 48,
      contentBottomPadding: 152,
    });
  });

  it('keeps existing spacing when the system reports no bottom inset', () => {
    expect(
      getFixedBottomLayout({
        bottomInset: 0,
        minimumFooterBottomPadding: 20,
        contentBottomPadding: 112,
      }),
    ).toEqual({
      footerBottomPadding: 20,
      contentBottomPadding: 112,
    });
  });

  it('can preserve a platform layout that intentionally ignores the inset', () => {
    expect(
      getFixedBottomLayout({
        bottomInset: 34,
        minimumFooterBottomPadding: 16,
        contentBottomPadding: 132,
        includeBottomInset: false,
      }),
    ).toEqual({
      footerBottomPadding: 16,
      contentBottomPadding: 132,
    });
  });

  it('normalizes invalid insets and preserves a sheet minimum padding', () => {
    expect(getSafeBottomPadding(Number.NaN, 24)).toBe(24);
    expect(getSafeBottomPadding(-12, 24)).toBe(24);
    expect(getSafeBottomPadding(48, 24)).toBe(48);
  });
});
