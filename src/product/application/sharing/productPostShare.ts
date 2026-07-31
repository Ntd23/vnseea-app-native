// Description: Adapts marketplace products to the canonical feed-post share contract.
import type { FeedProductPost } from '../../../feed/domain/types/feed.types';
import type { ProductItem } from '../../domain/types/product.types';

function positiveId(value: unknown) {
  const normalized = String(value ?? '').trim();
  return normalized && Number(normalized) > 0 ? normalized : null;
}

function timestampSeconds(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return parsed > 1_000_000_000_000 ? Math.floor(parsed / 1000) : parsed;
}

export function getProductSharePostId(product: ProductItem) {
  return positiveId(product.post_id);
}

export function buildProductSharePost(
  product: ProductItem,
  sellerFallback = 'Người bán',
): FeedProductPost {
  const postId = getProductSharePostId(product);
  const sellerId = product.seller?.user_id || product.user_id;

  return {
    kind: 'product',
    id: postId ?? `product-${product.id}`,
    product,
    postedAt: timestampSeconds(product.time),
    publisher: {
      id: String(sellerId || ''),
      name: product.seller?.name || sellerFallback,
      username: product.seller?.username || '',
      avatarUrl: product.seller?.avatar || undefined,
    },
    likeCount: 0,
    commentCount: 0,
    isLiked: false,
    myReaction: null,
    topReactions: [],
    permissions: {
      canDelete: Boolean(postId && product.is_owner),
      canShare: Boolean(postId),
    },
  };
}
