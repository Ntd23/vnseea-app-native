import { getFixedBottomLayout } from '../../../shared-kernel/presentation/layout/safeBottomLayout';

const DEFAULT_FOOTER_BOTTOM_PADDING = 16;
const DEFAULT_CONTENT_BOTTOM_PADDING = 132;

type CheckoutBottomLayoutInput = {
  isAndroid: boolean;
  bottomInset: number;
};

export function getCheckoutBottomLayout({
  isAndroid,
  bottomInset,
}: CheckoutBottomLayoutInput) {
  return getFixedBottomLayout({
    bottomInset,
    minimumFooterBottomPadding: DEFAULT_FOOTER_BOTTOM_PADDING,
    contentBottomPadding: DEFAULT_CONTENT_BOTTOM_PADDING,
    includeBottomInset: isAndroid,
  });
}
