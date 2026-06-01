// Description: Loads real Marketplace products with search, sorting, refresh, and cursor pagination.
import { useCallback, useEffect, useState } from 'react';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import type {
  GetProductsInput,
  ProductItem,
} from '../../domain/types/product.types';

const repository = createProductRepository();
const PAGE_SIZE = 20;

type MarketplaceOrder = GetProductsInput['order_by'];

export function useMarketplaceViewModel() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [orderBy, setOrderBy] = useState<MarketplaceOrder>();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isAllLoaded, setIsAllLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = useCallback(
    async (refresh = false) => {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await repository.getProducts({
          limit: PAGE_SIZE,
          keyword: keyword.trim() || undefined,
          order_by: orderBy,
        });

        setProducts(response.products);
        setIsAllLoaded(response.products.length < PAGE_SIZE);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Không tải được sản phẩm.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [keyword, orderBy],
  );

  const loadMore = useCallback(async () => {
    if (isLoading || isRefreshing || isLoadingMore || isAllLoaded) return;

    const lastProduct = products[products.length - 1];
    if (!lastProduct) return;

    setIsLoadingMore(true);
    try {
      const response = await repository.getProducts({
        limit: PAGE_SIZE,
        offset: lastProduct.id,
        keyword: keyword.trim() || undefined,
        order_by: orderBy,
      });

      setProducts(currentProducts => {
        const existingIds = new Set(currentProducts.map(product => product.id));
        const nextProducts = response.products.filter(
          product => !existingIds.has(product.id),
        );
        return [...currentProducts, ...nextProducts];
      });
      setIsAllLoaded(response.products.length < PAGE_SIZE);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không tải thêm được sản phẩm.',
      );
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    isAllLoaded,
    isLoading,
    isLoadingMore,
    isRefreshing,
    keyword,
    orderBy,
    products,
  ]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadFirstPage().catch(() => undefined);
    }, keyword.trim() ? 350 : 0);

    return () => clearTimeout(timeoutId);
  }, [loadFirstPage, keyword]);

  return {
    products,
    keyword,
    orderBy,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    setKeyword,
    setOrderBy,
    reload: () => loadFirstPage(true),
    loadMore,
  };
}
