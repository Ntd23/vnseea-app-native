// Description: ViewModel for displaying products on the home feed.
// Fetches products from /api/get-products and formats them for feed display.
import { useCallback, useEffect, useState } from 'react';
import { InteractionManager } from 'react-native';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import type { ProductItem } from '../../domain/types/product.types';
import { feedCacheStorage } from '../../../shared-kernel/infrastructure/storage/feedCacheStorage';

const repository = createProductRepository();

export function useProductsOnFeedViewModel() {
  const [products, setProducts] = useState<ProductItem[]>(() => {
    return feedCacheStorage.getCachedProducts();
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAllLoaded, setIsAllLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    setIsAllLoaded(false);
    try {
      const result = await repository.getProducts({ limit: 5 });
      setProducts(result.products);
      feedCacheStorage.setCachedProducts(result.products);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được sản phẩm.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const loadMoreProducts = useCallback(async () => {
    if (isLoading || isLoadingMore || isAllLoaded || products.length === 0) return;

    const lastProduct = products[products.length - 1];
    if (!lastProduct) return;

    setIsLoadingMore(true);
    try {
      const result = await repository.getProducts({
        limit: 5,
        offset: lastProduct.id,
      });
      if (result.products.length === 0) {
        setIsAllLoaded(true);
      } else {
        InteractionManager.runAfterInteractions(() => {
          setProducts(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newProducts = result.products.filter(p => !existingIds.has(p.id));
            if (newProducts.length === 0) {
              setIsAllLoaded(true);
              return prev;
            }
            return [...prev, ...newProducts];
          });
        });
      }
    } catch (err) {
      // Fail silently for background product pagination to prevent crashing feed scroll
      console.warn('Failed to load more products:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, isAllLoaded, products]);

  useEffect(() => {
    void fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    isLoading: isLoading || isRefreshing,
    isRefreshing,
    isLoadingMore,
    isAllLoaded,
    error,
    reloadProducts: fetchProducts,
    loadMoreProducts,
  };
}
