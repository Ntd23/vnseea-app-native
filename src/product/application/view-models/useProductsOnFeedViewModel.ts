// ViewModel for displaying products on the home feed.
// Product paging keeps one cursor-scoped prefetch that load-more can consume.
import { useCallback, useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import { feedCacheStorage } from '../../../shared-kernel/infrastructure/storage/feedCacheStorage';
import type { ProductItem } from '../../domain/types/product.types';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import {
  canLoadMoreProductFeed,
  createProductFeedPageCoordinator,
} from './productFeedPageCoordinator';

const repository = createProductRepository();
const PRODUCT_PAGE_SIZE = 10;

type InteractionTask = ReturnType<
  typeof InteractionManager.runAfterInteractions
>;

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
  const [products, setProducts] = useState<ProductItem[]>(() =>
    autoLoad ? feedCacheStorage.getCachedProducts() : [],
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAllLoaded, setIsAllLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageCoordinatorRef = useRef(
    createProductFeedPageCoordinator<ProductItem>(),
  );
  const isFirstPageLoadingRef = useRef(false);
  const isLoadingMoreRef = useRef(false);
  const pagingGenerationRef = useRef(0);
  const loadMoreRequestIdRef = useRef(0);
  const nextPagePrefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const prefetchNextPage = useCallback((currentProducts: ProductItem[]) => {
    const lastProduct = currentProducts[currentProducts.length - 1];
    if (!lastProduct) return;

    pageCoordinatorRef.current
      .prefetch(lastProduct.id, async () => {
        const result = await repository.getProducts({
          limit: PRODUCT_PAGE_SIZE,
          offset: lastProduct.id,
        });
        return result.products;
      })
      .catch(err => {
        console.warn('[products] prefetch failed:', err);
      });
  }, []);

  const cancelScheduledNextPagePrefetch = useCallback(() => {
    if (!nextPagePrefetchTimerRef.current) return;
    clearTimeout(nextPagePrefetchTimerRef.current);
    nextPagePrefetchTimerRef.current = null;
  }, []);

  const scheduleNextPagePrefetch = useCallback(
    (currentProducts: ProductItem[]) => {
      cancelScheduledNextPagePrefetch();
      nextPagePrefetchTimerRef.current = setTimeout(() => {
        nextPagePrefetchTimerRef.current = null;
        prefetchNextPage(currentProducts);
      }, 0);
    },
    [cancelScheduledNextPagePrefetch, prefetchNextPage],
  );

  const fetchProducts = useCallback(
    async (isPullToRefresh = false) => {
      isFirstPageLoadingRef.current = true;
      const requestGeneration = ++pagingGenerationRef.current;
      loadMoreRequestIdRef.current += 1;
      cancelScheduledNextPagePrefetch();
      if (isPullToRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);
      setIsAllLoaded(false);
      pageCoordinatorRef.current.reset();
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);

      try {
        const result = await repository.getProducts({
          limit: PRODUCT_PAGE_SIZE,
        });
        if (requestGeneration !== pagingGenerationRef.current) return;
        setProducts(result.products);
        cacheProductsAfterInteractions(result.products);

        if (result.products.length >= PRODUCT_PAGE_SIZE) {
          scheduleNextPagePrefetch(result.products);
        }
      } catch (err) {
        if (requestGeneration !== pagingGenerationRef.current) return;
        setError(
          err instanceof Error ? err.message : 'Không tải được sản phẩm.',
        );
      } finally {
        if (requestGeneration === pagingGenerationRef.current) {
          isFirstPageLoadingRef.current = false;
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [cancelScheduledNextPagePrefetch, scheduleNextPagePrefetch],
  );

  const loadMoreProducts = useCallback(async () => {
    if (
      !canLoadMoreProductFeed({
        isFirstPageLoading: isFirstPageLoadingRef.current,
        isLoadingMore: isLoadingMoreRef.current,
        isAllLoaded,
        hasProducts: products.length > 0,
      })
    ) {
      return;
    }

    const lastProduct = products[products.length - 1];
    if (!lastProduct) return;

    isLoadingMoreRef.current = true;
    const requestGeneration = pagingGenerationRef.current;
    const loadMoreRequestId = ++loadMoreRequestIdRef.current;
    setIsLoadingMore(true);

    try {
      const nextProducts = await pageCoordinatorRef.current.consume(
        lastProduct.id,
        async () => {
          const result = await repository.getProducts({
            limit: PRODUCT_PAGE_SIZE,
            offset: lastProduct.id,
          });
          return result.products;
        },
      );
      if (requestGeneration !== pagingGenerationRef.current) return;

      if (nextProducts.length === 0) {
        setIsAllLoaded(true);
        return;
      }

      const existingIds = new Set(products.map(product => product.id));
      const uniqueProducts = nextProducts.filter(
        product => !existingIds.has(product.id),
      );
      if (uniqueProducts.length === 0) {
        scheduleNextPagePrefetch(products);
        return;
      }

      const mergedProducts = [...products, ...uniqueProducts];
      setProducts(mergedProducts);
      cacheProductsAfterInteractions(mergedProducts);
      scheduleNextPagePrefetch(mergedProducts);
    } catch (err) {
      // Background pagination must not interrupt feed scrolling.
      console.warn('Failed to load more products:', err);
    } finally {
      if (loadMoreRequestIdRef.current === loadMoreRequestId) {
        isLoadingMoreRef.current = false;
        setIsLoadingMore(false);
      }
    }
  }, [isAllLoaded, products, scheduleNextPagePrefetch]);

  useEffect(() => {
    if (!autoLoad) return;
    fetchProducts();
  }, [autoLoad, fetchProducts]);

  useEffect(
    () => () => {
      cancelScheduledNextPagePrefetch();
      pagingGenerationRef.current += 1;
      loadMoreRequestIdRef.current += 1;
      isFirstPageLoadingRef.current = false;
      isLoadingMoreRef.current = false;
      pageCoordinatorRef.current.reset();
    },
    [cancelScheduledNextPagePrefetch],
  );

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
