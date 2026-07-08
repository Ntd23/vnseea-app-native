// Description: Loads real Marketplace products with search, sorting, refresh, and cursor pagination.
//
// Resolves category labels in three tiers so the filter dropdown never
// falls back to "Thể loại <id>":
// 1. product.category_name (populated by the backend — preferred).
// 2. products_categories map from the API response (defensive).
// 3. "Thể loại <id>" placeholder (last resort, should be rare).
import { useCallback, useEffect, useState } from 'react';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import type {
 GetProductsInput,
 ProductItem,
} from '../../domain/types/product.types';
import { useSyncedCartCount } from '../../../shared-kernel/application/state/cartCountSync';

const repository = createProductRepository();
const PAGE_SIZE = 20;

type MarketplaceOrder = GetProductsInput['order_by'];
export type MarketplaceCategoryOption = {
 id: number;
 label: string;
};

/**
 * Normalise the raw `products_categories` payload from the API into a
 * flat id-to-label map. The backend may return either shape:
 *
 * - `Record<string, string>` — current behaviour (preferred).
 * - `Record<string, { lang: string }[]>` — legacy nested shape.
 *
 * This helper flattens both so the marketplace filter can show real
 * category names instead of the `"Thể loại <id>"` placeholder.
 */
function normalizeCategoriesMap(
 raw: unknown,
): Record<string, string> {
 if (!raw || typeof raw !== 'object') return {};
 const out: Record<string, string> = {};
 Object.entries(raw as Record<string, unknown>).forEach(
 ([key, value]) => {
 if (typeof value === 'string') {
 out[key] = value;
 } else if (Array.isArray(value)) {
 const first = value.find(
 entry => entry && typeof entry === 'object',
 );
 if (
 first &&
 typeof (first as { lang?: unknown }).lang === 'string'
 ) {
 out[key] = (first as { lang: string }).lang;
 }
 }
 },
 );
 return out;
}

function buildCategoryOptions(
 products: ProductItem[] | undefined,
 categoriesById: Record<string, string>,
) {
 const categories = new Map<number, string>();

 (Array.isArray(products) ? products : []).forEach(product => {
 if (product.category) {
 const fromApi = categoriesById[String(product.category)];
 const label =
 product.category_name && product.category_name.length > 0
 ? product.category_name
 : fromApi && fromApi.length > 0
 ? fromApi
 : `Thể loại ${product.category}`;
 categories.set(product.category, label);
 }
 });

 return Array.from(categories.entries()).map(([id, label]) => ({
 id,
 label,
 }));
}

function mergeCategoryOptions(
 currentCategories: MarketplaceCategoryOption[],
 products: ProductItem[] | undefined,
 categoriesById: Record<string, string>,
) {
 const categories = new Map<number, string>();

 currentCategories.forEach(category => {
 categories.set(category.id, category.label);
 });
 buildCategoryOptions(products, categoriesById).forEach(category => {
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
 const [categories, setCategories] = useState<MarketplaceCategoryOption[]>(
 [],
 );
 const [keyword, setKeyword] = useState('');
 const [orderBy, setOrderBy] = useState<MarketplaceOrder>();
 const [categoryId, setCategoryId] = useState<number | undefined>();
 const [distance, setDistance] = useState<number | undefined>();
 const [distanceFilterAvailable, setDistanceFilterAvailable] =
 useState(true);
 const [filtersVisible, setFiltersVisible] = useState(false);
 const { cartCount, syncCartCount } = useSyncedCartCount(0);
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

 const responseProducts = Array.isArray(response.products)
 ? response.products
 : [];

 setProducts(responseProducts);
 syncCartCount(nextCartCount);
 setCategories(currentCategories =>
 mergeCategoryOptions(
 currentCategories,
 responseProducts,
 normalizeCategoriesMap(response.products_categories),
 ),
 );
 setDistanceFilterAvailable(
 distance
 ? isDistanceAvailable(response.distance_filter_available)
 : true,
 );
 setIsAllLoaded(responseProducts.length < PAGE_SIZE);
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
 [categoryId, distance, keyword, orderBy, syncCartCount],
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

 const responseProducts = Array.isArray(response.products)
 ? response.products
 : [];

 setProducts(currentProducts => {
 const existingIds = new Set(
 currentProducts.map(product => product.id),
 );
 const nextProducts = responseProducts.filter(
 product => !existingIds.has(product.id),
 );
 return [...currentProducts, ...nextProducts];
 });
 setCategories(currentCategories =>
 mergeCategoryOptions(
 currentCategories,
 responseProducts,
 normalizeCategoriesMap(response.products_categories),
 ),
 );
 setDistanceFilterAvailable(
 distance
 ? isDistanceAvailable(response.distance_filter_available)
 : true,
 );
 setIsAllLoaded(responseProducts.length < PAGE_SIZE);
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

 const updateCartCount = useCallback(
 (nextCount?: number) => {
 syncCartCount(nextCount, 1);
 },
 [syncCartCount],
 );

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
 updateCartCount,
 reload: () => loadFirstPage(true),
 loadMore,
 };
}
