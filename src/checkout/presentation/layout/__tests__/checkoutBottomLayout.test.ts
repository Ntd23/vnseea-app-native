import { getCheckoutBottomLayout } from '../checkoutBottomLayout';

describe('Checkout Android bottom layout', () => {
  it('raises the footer above a three-button navigation bar', () => {
    expect(
      getCheckoutBottomLayout({
        isAndroid: true,
        bottomInset: 48,
      }),
    ).toEqual({
      footerBottomPadding: 48,
      contentBottomPadding: 164,
    });
  });

  it('keeps the existing spacing when Android has no meaningful inset', () => {
    expect(
      getCheckoutBottomLayout({
        isAndroid: true,
        bottomInset: 0,
      }),
    ).toEqual({
      footerBottomPadding: 16,
      contentBottomPadding: 132,
    });
  });

  it('does not change iOS layout', () => {
    expect(
      getCheckoutBottomLayout({
        isAndroid: false,
        bottomInset: 34,
      }),
    ).toEqual({
      footerBottomPadding: 16,
      contentBottomPadding: 132,
    });
  });
});
