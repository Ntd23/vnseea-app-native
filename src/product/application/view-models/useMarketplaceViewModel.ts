// Description: Loads real Marketplace products with search, sorting, refresh, and cursor pagination.
//
// Resolves category labels in three tiers so the filter dropdown never
// falls back to "Thể loại <id>":
// 1. product.category_name (populated by the backend — preferred).
// 2. products_categories map from the API response (defensive).
// 3. "Thể loại <id>" placeholder (last resort, should be rare).
import { useCallback, useEffect, useRef, useState } from 'react';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import type {
 GetProductsInput,
 ProductItem,
} from '../../domain/types/product.types';
import { getCurrentDeviceLocation } from '../../../shared-kernel/application/utils/currentLocation';
import { saveLastMapLocation } from '../../../shared-kernel/infrastructure/storage/mapLocationStorage';
import { mapDiscoveryDistanceMeters } from '../../../user/application/utils/mapDiscoveryLocation';

const repository = createProductRepository();
const PAGE_SIZE = 20;
const DISTANCE_FALLBACK_PAGE_SIZE = PAGE_SIZE * 5;

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

function validCoordinate(value: unknown, min: number, max: number) {
 const parsed = Number(value);
 return Number.isFinite(parsed) && parsed >= min && parsed <= max
 ? parsed
 : undefined;
}

type MarketplaceDistanceOrigin = {
 latitude: number;
 longitude: number;
 accuracy?: number;
 timestamp?: number;
};

function isValidOrigin(
 origin: MarketplaceDistanceOrigin | null,
): origin is MarketplaceDistanceOrigin {
 return Boolean(
 origin &&
 Number.isFinite(origin.latitude) &&
 Number.isFinite(origin.longitude) &&
 origin.latitude >= -90 &&
 origin.latitude <= 90 &&
 origin.longitude >= -180 &&
 origin.longitude <= 180 &&
 !(origin.latitude === 0 && origin.longitude === 0),
 );
}

function enrichProductDistances(
 products: ProductItem[],
 origin: MarketplaceDistanceOrigin | null,
) {
 if (!origin) return products;

 return products.map(product => {
 const existingDistance = Number(product.distance);
 if (Number.isFinite(existingDistance) && existingDistance >= 0) {
 return { ...product, distance: existingDistance };
 }

 const latitude = validCoordinate(product.lat, -90, 90);
 const longitude = validCoordinate(product.lng, -180, 180);
 if (
 latitude === undefined ||
 longitude === undefined ||
 (latitude === 0 && longitude === 0)
 ) {
 return product;
 }

 return {
 ...product,
 distance:
 mapDiscoveryDistanceMeters(
 { latitude: origin.latitude, longitude: origin.longitude },
 { latitude, longitude },
 ) / 1000,
 };
 });
}

function sortProductsByDistance(products: ProductItem[], enabled: boolean) {
 if (!enabled) return products;
 return [...products].sort((left, right) => {
 const leftDistance = Number(left.distance);
 const rightDistance = Number(right.distance);
 const safeLeft = Number.isFinite(leftDistance)
 ? leftDistance
 : Number.POSITIVE_INFINITY;
 const safeRight = Number.isFinite(rightDistance)
 ? rightDistance
 : Number.POSITIVE_INFINITY;
 return safeLeft - safeRight;
 });
}

function hasComputedDistance(products: ProductItem[]) {
 return products.some(product => {
 const value = Number(product.distance);
 return Number.isFinite(value) && value >= 0;
 });
}

function hasDistanceData(
 products: ProductItem[],
 origin: MarketplaceDistanceOrigin | null,
) {
 return hasComputedDistance(enrichProductDistances(products, origin));
}

function filterProductsByDistance(
 products: ProductItem[],
 distance: number | undefined,
) {
 if (distance === undefined) return products;

 // A product without coordinates cannot be proven to be inside the requested
 // radius. Excluding it is safer than showing a product that violates the
 // nearby-store filter when the server does not support the device origin.
 return products.filter(product => {
 const value = Number(product.distance);
 return Number.isFinite(value) && value >= 0 && value <= distance;
 });
}

function prepareProducts(
 products: ProductItem[],
 origin: MarketplaceDistanceOrigin | null,
 distance?: number,
) {
 const enrichedProducts = enrichProductDistances(products, origin);
 return sortProductsByDistance(
 filterProductsByDistance(enrichedProducts, distance),
 distance !== undefined,
 );
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
 const [distanceOrigin, setDistanceOrigin] =
 useState<MarketplaceDistanceOrigin | null>(null);
 const [distanceFilterAvailable, setDistanceFilterAvailable] =
 useState(true);
 const [distanceLocationError, setDistanceLocationError] =
 useState<string | null>(null);
 const [isResolvingDistanceOrigin, setIsResolvingDistanceOrigin] =
 useState(false);
 const [filtersVisible, setFiltersVisible] = useState(false);
 const [isLoading, setIsLoading] = useState(true);
 const [isRefreshing, setIsRefreshing] = useState(false);
 const [isLoadingMore, setIsLoadingMore] = useState(false);
 const [isAllLoaded, setIsAllLoaded] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const loadRequestIdRef = useRef(0);

 const resolveDistanceOrigin = useCallback(async () => {
 setIsResolvingDistanceOrigin(true);
 try {
 const currentLocation = await getCurrentDeviceLocation(8000);
 const origin = {
 latitude: currentLocation.latitude,
 longitude: currentLocation.longitude,
 accuracy: currentLocation.accuracy,
 timestamp: currentLocation.timestamp ?? Date.now(),
 };
 if (!isValidOrigin(origin)) {
 throw new Error('Không đọc được tọa độ hiện tại.');
 }
 saveLastMapLocation(origin);
 setDistanceOrigin(origin);
 setDistanceLocationError(null);
 return origin;
 } catch (caughtError) {
 const rawMessage =
 caughtError instanceof Error
 ? caughtError.message
 : 'Không lấy được vị trí hiện tại của bạn.';
 const message =
 rawMessage.includes('chia sẻ vị trí') || rawMessage.includes('trong chat')
 ? 'Bạn cần cấp quyền vị trí/GPS để lọc cửa hàng lân cận.'
 : rawMessage;
 setDistanceOrigin(null);
 setDistanceLocationError(message);
 return null;
 } finally {
 setIsResolvingDistanceOrigin(false);
 }
 }, []);

 const applyDistance = useCallback(
 (nextDistance: number | undefined) => {
 setDistance(nextDistance);
 setDistanceFilterAvailable(true);
 setDistanceLocationError(null);
 if (nextDistance === undefined) {
 setDistanceOrigin(null);
 setDistanceLocationError(null);
 return;
 }
 resolveDistanceOrigin().catch(() => undefined);
 },
 [resolveDistanceOrigin],
 );

 const getProductsForDistance = useCallback(
 async (input: GetProductsInput, origin: MarketplaceDistanceOrigin | null) => {
 const response = await repository.getProducts(input);
 const serverSupportsDistance =
 input.distance === undefined || isDistanceAvailable(response.distance_filter_available);

 if (
 input.distance !== undefined &&
 !serverSupportsDistance &&
 isValidOrigin(origin)
 ) {
 // Older deployments may silently ignore lat/lng and report that distance
 // filtering is unavailable. Fetch a wider unfiltered page and apply the
 // current device origin on the client so the feature still works safely.
 const fallbackResponse = await repository.getProducts({
 ...input,
 limit: Math.max(input.limit ?? PAGE_SIZE, DISTANCE_FALLBACK_PAGE_SIZE),
 distance: undefined,
 lat: origin.latitude,
 lng: origin.longitude,
 });
 return {
 response: fallbackResponse,
 serverSupportsDistance: false,
 usedClientFallback: true,
 };
 }

 return {
 response,
 serverSupportsDistance,
 usedClientFallback: false,
 };
 },
 [],
 );

 const loadFirstPage = useCallback(
 async (refresh = false) => {
 const requestId = ++loadRequestIdRef.current;
 if (refresh) {
 setIsRefreshing(true);
 } else {
 setIsLoading(true);
 setProducts([]);
 }
 setIsAllLoaded(false);
 setIsLoadingMore(false);
 setError(null);

 try {
 let currentDistanceOrigin = distanceOrigin;
 if (distance !== undefined && !isValidOrigin(currentDistanceOrigin)) {
 currentDistanceOrigin = await resolveDistanceOrigin();
 if (!currentDistanceOrigin) {
 setProducts([]);
 setDistanceFilterAvailable(false);
 setIsAllLoaded(true);
 return;
 }
 }
 const requestInput: GetProductsInput = {
 limit: PAGE_SIZE,
 keyword: keyword.trim() || undefined,
 order_by: orderBy,
 category_id: categoryId,
 distance,
 lat: currentDistanceOrigin?.latitude,
 lng: currentDistanceOrigin?.longitude,
 };
 const {
 response,
 serverSupportsDistance,
 usedClientFallback,
 } = await getProductsForDistance(requestInput, currentDistanceOrigin);
 if (requestId !== loadRequestIdRef.current) return;

 const rawProducts = Array.isArray(response.products) ? response.products : [];
 const responseProducts = prepareProducts(
 rawProducts,
 currentDistanceOrigin,
 distance,
 );
 const canApplyDistance =
 distance === undefined ||
 serverSupportsDistance ||
 (usedClientFallback && hasDistanceData(rawProducts, currentDistanceOrigin));

 setProducts(canApplyDistance ? responseProducts : []);
 setCategories(currentCategories =>
 mergeCategoryOptions(
 currentCategories,
 responseProducts,
 normalizeCategoriesMap(response.products_categories),
 ),
 );
 setDistanceFilterAvailable(canApplyDistance);
 setIsAllLoaded(!canApplyDistance || responseProducts.length < PAGE_SIZE);
 } catch (caughtError) {
 if (requestId !== loadRequestIdRef.current) return;
 setError(
 caughtError instanceof Error
 ? caughtError.message
 : 'Không tải được sản phẩm.',
 );
 } finally {
 if (requestId === loadRequestIdRef.current) {
 setIsLoading(false);
 setIsRefreshing(false);
 }
 }
 },
 [
 categoryId,
 distance,
 distanceOrigin,
 getProductsForDistance,
 keyword,
 orderBy,
 resolveDistanceOrigin,
 ],
 );

 const loadMore = useCallback(async () => {
 if (isLoading || isRefreshing || isLoadingMore || isAllLoaded) return;

 const lastProduct = products[products.length - 1];
 if (!lastProduct) return;

 setIsLoadingMore(true);
 const requestId = loadRequestIdRef.current;
 try {
 let currentDistanceOrigin = distanceOrigin;
 if (distance !== undefined && !isValidOrigin(currentDistanceOrigin)) {
 currentDistanceOrigin = await resolveDistanceOrigin();
 if (!currentDistanceOrigin) {
 setDistanceFilterAvailable(false);
 setIsAllLoaded(true);
 return;
 }
 }
 const requestInput: GetProductsInput = {
 limit: PAGE_SIZE,
 offset: lastProduct.id,
 keyword: keyword.trim() || undefined,
 order_by: orderBy,
 category_id: categoryId,
 distance,
 lat: currentDistanceOrigin?.latitude,
 lng: currentDistanceOrigin?.longitude,
 };
 const {
 response,
 serverSupportsDistance,
 usedClientFallback,
 } = await getProductsForDistance(requestInput, currentDistanceOrigin);
 if (requestId !== loadRequestIdRef.current) return;

 const rawProducts = Array.isArray(response.products) ? response.products : [];
 const responseProducts = prepareProducts(
 rawProducts,
 currentDistanceOrigin,
 distance,
 );
 const canApplyDistance =
 distance === undefined ||
 serverSupportsDistance ||
 (usedClientFallback && hasDistanceData(rawProducts, currentDistanceOrigin));

 if (!canApplyDistance) {
 setDistanceFilterAvailable(false);
 setIsAllLoaded(true);
 return;
 }

 setProducts(currentProducts => {
 const existingIds = new Set(
 currentProducts.map(product => product.id),
 );
 const nextProducts = responseProducts.filter(
 product => !existingIds.has(product.id),
 );
 return sortProductsByDistance(
 [...currentProducts, ...nextProducts],
 distance !== undefined,
 );
 });
 setCategories(currentCategories =>
 mergeCategoryOptions(
 currentCategories,
 responseProducts,
 normalizeCategoriesMap(response.products_categories),
 ),
 );
 setDistanceFilterAvailable(true);
 setIsAllLoaded(responseProducts.length < PAGE_SIZE);
 } catch (caughtError) {
 if (requestId !== loadRequestIdRef.current) return;
 setError(
 caughtError instanceof Error
 ? caughtError.message
 : 'Không tải thêm được sản phẩm.',
 );
 } finally {
 if (requestId === loadRequestIdRef.current) {
 setIsLoadingMore(false);
 }
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
 distanceOrigin,
 products,
 getProductsForDistance,
 resolveDistanceOrigin,
 ]);

 const resetFilters = useCallback(() => {
 setOrderBy(undefined);
 setCategoryId(undefined);
 applyDistance(undefined);
 }, [applyDistance]);

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
 distance,
 filtersVisible,
 distanceFilterError:
 distance && distanceLocationError
 ? distanceLocationError
 : distance && !distanceFilterAvailable
 ? 'Không thể lọc theo khoảng cách với vị trí hiện tại của bạn. Hãy bật GPS/quyền vị trí rồi thử lại.'
 : null,
 distanceFilterStatus:
 distance && isResolvingDistanceOrigin
 ? 'Đang lấy vị trí hiện tại...'
 : null,
 isLoading,
 isRefreshing,
 isLoadingMore,
 error,
 setKeyword,
 setOrderBy,
 setCategoryId,
 setDistance: applyDistance,
 toggleFilters: () => setFiltersVisible(isVisible => !isVisible),
 resetFilters,
 reload: () => loadFirstPage(true),
 loadMore,
 };
}
