// Description: Reuses the feed share destinations for marketplace products.
import React, { useMemo } from 'react';
import { FeedShareBottomSheet } from '../../../feed/presentation/components/FeedShareBottomSheet';
import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import { buildProductSharePost } from '../../application/sharing/productPostShare';
import type { ProductItem } from '../../domain/types/product.types';

const feedRepository = createFeedRepository();

export function ProductShareBottomSheet({
  visible,
  product,
  onClose,
}: {
  visible: boolean;
  product?: ProductItem;
  onClose: () => void;
}) {
  const post = useMemo(
    () => (product ? buildProductSharePost(product) : undefined),
    [product],
  );

  return (
    <FeedShareBottomSheet
      visible={visible}
      post={post}
      onClose={onClose}
      onInternalShare={input => feedRepository.sharePost(input)}
    />
  );
}

export default ProductShareBottomSheet;
