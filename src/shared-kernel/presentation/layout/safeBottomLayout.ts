type FixedBottomLayoutInput = {
  bottomInset: number;
  minimumFooterBottomPadding: number;
  contentBottomPadding: number;
  includeBottomInset?: boolean;
};

function normalizeSpacing(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function getSafeBottomPadding(
  bottomInset: number,
  minimumPadding = 0,
) {
  return Math.max(
    normalizeSpacing(bottomInset),
    normalizeSpacing(minimumPadding),
  );
}

export function getFixedBottomLayout({
  bottomInset,
  minimumFooterBottomPadding,
  contentBottomPadding,
  includeBottomInset = true,
}: FixedBottomLayoutInput) {
  const minimumPadding = normalizeSpacing(minimumFooterBottomPadding);
  const footerBottomPadding = includeBottomInset
    ? getSafeBottomPadding(bottomInset, minimumPadding)
    : minimumPadding;

  return {
    footerBottomPadding,
    contentBottomPadding:
      normalizeSpacing(contentBottomPadding) +
      footerBottomPadding -
      minimumPadding,
  };
}
