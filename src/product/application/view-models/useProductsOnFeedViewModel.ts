// Description: ViewModel for displaying products on the home feed.
// Fetches products from /api/get-products and formats them for feed display.
//
// PREFETCH BUFFER — same strategy as useFeedViewModel:
// After every page load we immediately background-fetch the next page
// into `prefetchBufferRef`. When the FlatList's `onEndReached` triggers
// `loadMoreProducts`, we merge the buffer instantly (zero wait) and
// kick off the next prefetch.
import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import type { ProductItem } from '../../domain/types/product.types';
import { feedCacheStorage } from '../../../shared-kernel/infrastructure/storage/feedCacheStorage';

const repository = createProductRepository();

// Bumped from 5 → 10 so each fetch fills more screen real-estate.
const PRODUCT_PAGE_SIZE = 10;

type InteractionTask = ReturnType<typeof InteractionManager.runAfterInteractions>;

let pendingProductsCacheTask: InteractionTask | null = null;

function cacheProductsAfterInteractions(products: ProductItem[]) {
  const snapshot = products.slice(0, 25);
  pendingProductsCacheTask?.cancel();
  pendingProductsCacheTask = InteractionManager.runAfterInteractions(() => {
    feedCacheStorage.setCachedProducts(snapshot);
    pendingProductsCacheTask = null;
  });
}

type UseProductsOnFeedViewModelOptions = {
  autoLoad?: boolean;
};

export function useProductsOnFeedViewModel(
  options: UseProductsOnFeedViewModelOptions = {},
) {
  const { autoLoad = true } = options;
  const [products, setProducts] = useState<ProductItem[]>(() => {
    return feedCacheStorage.getCachedProducts();
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAllLoaded, setIsAllLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Prefetch buffer ────────────────────────────────────────────────
  const prefetchBufferRef = useRef<ProductItem[] | null>(null);
  const isPrefetchingRef = useRef(false);

  const prefetchNextPage = useCallback((currentProducts: ProductItem[]) => {
    if (isPrefetchingRef.current) return;
    const lastProduct = currentProducts[currentProducts.length - 1];
    if (!lastProduct) return;

    isPrefetchingRef.current = true;

    repository
      .getProducts({ limit: PRODUCT_PAGE_SIZE, offset: lastProduct.id })
      .then(result => {
        if (result.products.length === 0) {
          prefetchBufferRef.current = null;
        } else {
          prefetchBufferRef.current = result.products;
        }
      })
      .catch(err => {
        console.warn('[products] prefetch failed:', err);
        prefetchBufferRef.current = null;
      })
      .finally(() => {
        isPrefetchingRef.current = false;
      });
  }, []);

  const fetchProducts = useCallback(async (isPullToRefresh = false) => {
    if (isPullToRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);
    setIsAllLoaded(false);
    prefetchBufferRef.current = null;
    try {
      const result = await repository.getProducts({ limit: PRODUCT_PAGE_SIZE });
      setProducts(result.products);
      cacheProductsAfterInteractions(result.products);

      // Immediately prefetch page 2
      if (result.products.length >= PRODUCT_PAGE_SIZE) {
        prefetchNextPage(result.products);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tải được sản phẩm.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [prefetchNextPage]);

  const loadMoreProducts = useCallback(async () => {
    if (isLoading || isLoadingMore || isAllLoaded || products.length === 0) return;

    setIsLoadingMore(true);

    try {
      // ── Fast path: use prefetch buffer ──────────────────────────
      const buffered = prefetchBufferRef.current;
      if (buffered && buffered.length > 0) {
        prefetchBufferRef.current = null;

        // Merge synchronously (same fix as feed posts — no InteractionManager
        // to avoid the race where isLoadingMore resets before merge).
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newProducts = buffered.filter(p => !existingIds.has(p.id));
          if (newProducts.length === 0) {
            // Buffer had no new products. Keep pagination unlocked and queue next prefetch.
            setTimeout(() => prefetchNextPage(prev), 0);
            return prev;
          }
          const merged = [...prev, ...newProducts];
          cacheProductsAfterInteractions(merged);
          setTimeout(() => prefetchNextPage(merged), 0);
          return merged;
        });

        setIsLoadingMore(false);
        return;
      }

      // ── Slow path: fetch from network ───────────────────────────
      const lastProduct = products[products.length - 1];
      if (!lastProduct) {
        setIsLoadingMore(false);
        return;
      }

      const result = await repository.getProducts({
        limit: PRODUCT_PAGE_SIZE,
        offset: lastProduct.id,
      });
      if (result.products.length === 0) {
        setIsAllLoaded(true);
      } else {
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const newProducts = result.products.filter(p => !existingIds.has(p.id));
          if (newProducts.length === 0) {
            // No new products, but server returned data. Keep paging unlocked and queue next prefetch.
            setTimeout(() => prefetchNextPage(prev), 0);
            return prev;
          }
          const merged = [...prev, ...newProducts];
          cacheProductsAfterInteractions(merged);
          setTimeout(() => prefetchNextPage(merged), 0);
          return merged;
        });
      }
    } catch (err) {
      // Fail silently for background product pagination to prevent crashing feed scroll
      console.warn('Failed to load more products:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoading, isLoadingMore, isAllLoaded, products, prefetchNextPage]);

  useEffect(() => {
    if (!autoLoad) return;
    fetchProducts();
  }, [autoLoad, fetchProducts]);

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
