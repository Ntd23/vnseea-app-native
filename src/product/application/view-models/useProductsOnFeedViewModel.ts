// Description: ViewModel for displaying products on the home feed.
// Fetches products from /api/get-products and formats them for feed display.
import { useCallback, useEffect, useState } from 'react';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import type { ProductItem } from '../../domain/types/product.types';

const repository = createProductRepository();

export function useProductsOnFeedViewModel() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await repository.getProducts({ limit: 20 });
      setProducts(result.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được sản phẩm.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    isLoading,
    error,
    reloadProducts: fetchProducts,
  };
}
