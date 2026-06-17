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
export type MarketplaceCategoryOption = {
  id: number;
  label: string;
};

function buildCategoryOptions(products: ProductItem[]) {
  const categories = new Map<number, string>();

  products.forEach(product => {
    if (product.category) {
      categories.set(
        product.category,
        product.category_name || `Thể loại ${product.category}`,
      );
    }
  });

  return Array.from(categories.entries()).map(([id, label]) => ({
    id,
    label,
  }));
}

function mergeCategoryOptions(
  currentCategories: MarketplaceCategoryOption[],
  products: ProductItem[],
) {
  const categories = new Map<number, string>();

  currentCategories.forEach(category => {
    categories.set(category.id, category.label);
  });
  buildCategoryOptions(products).forEach(category => {
    categories.set(category.id, category.label);
  });

  return Array.from(categories.entries()).map(([id, label]) => ({
    id,
    label,
  }));
}

function isDistanceAvailable(value: unknown) {
  return value === true || value === 1 || value === '1';
}

export function useMarketplaceViewModel() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategoryOption[]>([]);
  const [keyword, setKeyword] = useState('');
  const [orderBy, setOrderBy] = useState<MarketplaceOrder>();
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [distance, setDistance] = useState<number | undefined>();
  const [distanceFilterAvailable, setDistanceFilterAvailable] = useState(true);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [cartCount, setCartCount] = useState(0);
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
        const [response, nextCartCount] = await Promise.all([
          repository.getProducts({
            limit: PAGE_SIZE,
            keyword: keyword.trim() || undefined,
            order_by: orderBy,
            category_id: categoryId,
            distance,
          }),
          repository.getCartCount().catch(() => 0),
        ]);

        setProducts(response.products);
        setCartCount(nextCartCount);
        setCategories(currentCategories =>
          mergeCategoryOptions(currentCategories, response.products),
        );
        setDistanceFilterAvailable(
          distance ? isDistanceAvailable(response.distance_filter_available) : true,
        );
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
    [categoryId, distance, keyword, orderBy],
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
        category_id: categoryId,
        distance,
      });

      setProducts(currentProducts => {
        const existingIds = new Set(currentProducts.map(product => product.id));
        const nextProducts = response.products.filter(
          product => !existingIds.has(product.id),
        );
        return [...currentProducts, ...nextProducts];
      });
      setCategories(currentCategories =>
        mergeCategoryOptions(currentCategories, response.products),
      );
      setDistanceFilterAvailable(
        distance ? isDistanceAvailable(response.distance_filter_available) : true,
      );
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
    categoryId,
    distance,
    products,
  ]);

  const resetFilters = useCallback(() => {
    setOrderBy(undefined);
    setCategoryId(undefined);
    setDistance(undefined);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadFirstPage().catch(() => undefined);
    }, keyword.trim() ? 350 : 0);

    return () => clearTimeout(timeoutId);
  }, [loadFirstPage, keyword]);

  return {
    products,
    categories,
    keyword,
    orderBy,
    categoryId,
    cartCount,
    distance,
    filtersVisible,
    distanceFilterError:
      distance && !distanceFilterAvailable
        ? 'Không thể lọc theo khoảng cách vì tài khoản của bạn chưa có thông tin vị trí. Hãy cập nhật vị trí trong hồ sơ rồi thử lại.'
        : null,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    setKeyword,
    setOrderBy,
    setCategoryId,
    setDistance,
    toggleFilters: () => setFiltersVisible(isVisible => !isVisible),
    resetFilters,
    reload: () => loadFirstPage(true),
    loadMore,
  };
}
