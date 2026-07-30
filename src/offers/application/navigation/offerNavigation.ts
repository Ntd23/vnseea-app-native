export type OfferNavigationInput = {
  productId?: number | string;
  postId?: number | string;
  url?: string;
};

export type OfferNavigationDestination =
  | { kind: 'product'; productId: number }
  | { kind: 'post'; postId: string }
  | { kind: 'external'; url: string }
  | { kind: 'marketplace' };

function toPositiveInteger(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function matchPositiveInteger(
  value: string,
  patterns: RegExp[],
): number | undefined {
  for (const pattern of patterns) {
    const matched = value.match(pattern);
    const parsed = toPositiveInteger(matched?.[1]);
    if (parsed) return parsed;
  }
  return undefined;
}

export function resolveOfferNavigationDestination(
  offer: OfferNavigationInput,
): OfferNavigationDestination {
  const explicitProductId = toPositiveInteger(offer.productId);
  if (explicitProductId) {
    return { kind: 'product', productId: explicitProductId };
  }

  const url = String(offer.url ?? '').trim();
  const linkedProductId = matchPositiveInteger(url, [
    /[?&#](?:product_id|productId)=([0-9]+)/i,
    /\/products?\/([0-9]+)(?:[/?#]|$)/i,
  ]);
  if (linkedProductId) {
    return { kind: 'product', productId: linkedProductId };
  }

  const explicitPostId = toPositiveInteger(offer.postId);
  if (explicitPostId) {
    return { kind: 'post', postId: String(explicitPostId) };
  }

  const linkedPostId = matchPositiveInteger(url, [
    /[?&]link1=post(?:&[^#]*)?&id=([0-9]+)/i,
    /[?&#]post_id=([0-9]+)/i,
    /\/posts?\/([0-9]+)(?:[/?#]|$)/i,
  ]);
  if (linkedPostId) {
    return { kind: 'post', postId: String(linkedPostId) };
  }

  if (/^https?:\/\//i.test(url)) {
    return { kind: 'external', url };
  }

  return { kind: 'marketplace' };
}
