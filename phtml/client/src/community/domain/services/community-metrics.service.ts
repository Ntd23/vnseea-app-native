export const formatCommunityCount = (value: number, locale: string) =>
  new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(value)
