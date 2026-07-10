// Description: Coordinates the My Products marketplace hub with real marketplace orders.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { createOrdersRepository } from '../../../orders/infrastructure/repositories/ApiOrdersRepository';
import type {
  OrdersItem,
  OrderStatus,
} from '../../../orders/domain/types/orders.types';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import type { ProductItem } from '../../domain/types/product.types';
import {
  buildProductCategoryOptions,
  normalizeProductCategoriesMap,
} from './productCategoryOptions';

const productRepository = createProductRepository();
const ordersRepository = createOrdersRepository();

export type MyProductsTab = 'products' | 'purchased' | 'orders' | 'marketplace';
export type ProductSortOption = 'newest' | 'price_asc' | 'price_desc';
export type OrderStatusFilter = OrderStatus;

function productPrice(product: ProductItem) {
  const value = Number(String(product.price).replace(/[^\d.-]/g, ''));
  return Number.isFinite(value) ? value : 0;
}

function productTime(product: ProductItem) {
  const value = Number(product.time);
  return Number.isFinite(value) ? value : 0;
}

function matchesOrderQuery(item: OrdersItem, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [item.code, item.shop].some(value =>
    value.toLowerCase().includes(normalizedQuery),
  );
}

function matchesOrderStatus(item: OrdersItem, status: OrderStatusFilter) {
  return status === 'all' || item.status === status;
}

export function useMyProductsViewModel(targetUserId?: number) {
  const [activeTab, setActiveTab] = useState<MyProductsTab>('products');
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categoriesById, setCategoriesById] = useState<Record<string, string>>(
    {},
  );
  const [purchasedOrders, setPurchasedOrders] = useState<OrdersItem[]>([]);
  const [sellerOrders, setSellerOrders] = useState<OrdersItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productSort, setProductSort] = useState<ProductSortOption>('newest');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [purchasedSearch, setPurchasedSearch] = useState('');
  const [purchasedStatus, setPurchasedStatus] =
    useState<OrderStatusFilter>('all');
  const [ordersSearch, setOrdersSearch] = useState('');
  const [ordersStatus, setOrdersStatus] = useState<OrderStatusFilter>('all');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrdersLoading, setIsOrdersLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await productRepository.getProducts({
        limit: 60,
        user_id: targetUserId,
      });
      const filtered = targetUserId
        ? response.products.filter(
            product => String(product.user_id) === String(targetUserId),
          )
        : response.products.filter(product => product.is_owner);

      setCategoriesById(
        normalizeProductCategoriesMap(response.products_categories),
      );
      setProducts(filtered);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : targetUserId
            ? 'Không tải được sản phẩm của người dùng.'
            : 'Không tải được sản phẩm của tôi.',
      );
    } finally {
      setIsLoading(false);
    }
  }, [targetUserId]);

  const loadOrders = useCallback(async () => {
    setIsOrdersLoading(true);
    setOrdersError(null);

    try {
      const [purchasedResponse, sellerResponse] = await Promise.all([
        ordersRepository.getPurchasedOrders({ limit: 50 }),
        ordersRepository.getSellerOrders({ limit: 50 }),
      ]);
      setPurchasedOrders(purchasedResponse.items);
      setSellerOrders(sellerResponse.items);
    } catch (caughtError) {
      setOrdersError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không tải được đơn hàng marketplace.',
      );
    } finally {
      setIsOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts().catch(() => undefined);
    loadOrders().catch(() => undefined);
  }, [loadOrders, loadProducts]);

  useEffect(() => {
    setFiltersVisible(false);
  }, [activeTab]);

  const categories = useMemo(
    () => buildProductCategoryOptions(products, categoriesById),
    [categoriesById, products],
  );

  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    const nextProducts = products.filter(product => {
      const matchesQuery =
        !query ||
        [product.name, product.description, product.location].some(value =>
          String(value ?? '').toLowerCase().includes(query),
        );
      const matchesCategory = !categoryId || product.category === categoryId;
      return matchesQuery && matchesCategory;
    });

    return [...nextProducts].sort((first, second) => {
      if (productSort === 'price_asc') {
        return productPrice(first) - productPrice(second);
      }
      if (productSort === 'price_desc') {
        return productPrice(second) - productPrice(first);
      }
      return productTime(second) - productTime(first);
    });
  }, [categoryId, productSearch, productSort, products]);

  const purchasedItems = useMemo(
    () =>
      purchasedOrders
        .filter(item => matchesOrderQuery(item, purchasedSearch))
        .filter(item => matchesOrderStatus(item, purchasedStatus)),
    [purchasedOrders, purchasedSearch, purchasedStatus],
  );

  const orderItems = useMemo(
    () =>
      sellerOrders
        .filter(item => matchesOrderQuery(item, ordersSearch))
        .filter(item => matchesOrderStatus(item, ordersStatus)),
    [ordersSearch, ordersStatus, sellerOrders],
  );

  const deletePurchasedOrder = useCallback(async (orderId: string) => {
    try {
      const order = purchasedOrders.find(o => o.id === orderId);
      if (order && order.status === 'placed') {
        try {
          await ordersRepository.changeOrderStatus(order.id, 'canceled');
        } catch (e) {
          console.warn('Could not cancel order on server:', e);
        }
      }
      setPurchasedOrders(prev => prev.filter(o => o.id !== orderId));
      Alert.alert('Thành công', 'Đã xóa đơn mua hàng thành công.');
    } catch (err) {
      Alert.alert('Thất bại', 'Không thể xóa đơn mua hàng.');
    }
  }, [purchasedOrders]);

  const updateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    try {
      await ordersRepository.changeOrderStatus(orderId, status);
      setSellerOrders(prev =>
        prev.map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              status,
              statusLabel: status === 'placed' ? 'Chờ xác nhận'
                : status === 'accepted' ? 'Đã xác nhận'
                : status === 'packed' ? 'Đã đóng gói'
                : status === 'shipped' ? 'Đang giao'
                : status === 'delivered' ? 'Đã giao'
                : status === 'canceled' ? 'Đã hủy' : 'Không rõ',
            };
          }
          return o;
        })
      );
      setPurchasedOrders(prev =>
        prev.map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              status,
              statusLabel: status === 'placed' ? 'Chờ xác nhận'
                : status === 'accepted' ? 'Đã xác nhận'
                : status === 'packed' ? 'Đã đóng gói'
                : status === 'shipped' ? 'Đang giao'
                : status === 'delivered' ? 'Đã giao'
                : status === 'canceled' ? 'Đã hủy' : 'Không rõ',
            };
          }
          return o;
        })
      );
    } catch (err) {
      throw err;
    }
  }, []);

  const reload = useCallback(() => {
    loadProducts().catch(() => undefined);
    loadOrders().catch(() => undefined);
  }, [loadOrders, loadProducts]);

  return {
    activeTab,
    categories,
    error,
    filtersVisible,
    filteredProducts,
    isLoading,
    isOrdersLoading,
    orderItems,
    ordersError,
    ordersSearch,
    ordersStatus,
    productSearch,
    productSort,
    purchasedItems,
    purchasedSearch,
    purchasedStatus,
    selectedCategoryId: categoryId,
    reload,
    setActiveTab,
    setOrdersSearch,
    setOrdersStatus,
    setProductSearch,
    setProductSort,
    setPurchasedSearch,
    setPurchasedStatus,
    setSelectedCategoryId: setCategoryId,
    toggleFilters: () => setFiltersVisible(isVisible => !isVisible),
    deletePurchasedOrder,
    updateOrderStatus,
  };
}
