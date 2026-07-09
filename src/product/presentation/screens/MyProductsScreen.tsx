// Description: Renders the user's marketplace products, purchases, orders, and nearby shortcut.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Eye,
  Plus,
  RotateCw,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  X,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { OrdersItem } from '../../../orders/domain/types/orders.types';
import {
  type MyProductsTab,
  type OrderStatusFilter,
  type ProductSortOption,
  useMyProductsViewModel,
} from '../../application/view-models/useMyProductsViewModel';
import type { ProductItem } from '../../domain/types/product.types';
import ProductPostCard from '../components/ProductPostCard';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import { useSyncedCartCount } from '../../../shared-kernel/application/state/cartCountSync';

type MyProductsNav = NativeStackNavigationProp<RootStackParamList>;
type MyProductsRoute = RouteProp<RootStackParamList, typeof ROUTES.MY_PRODUCTS>;

const PRODUCT_COLUMNS = { justifyContent: 'space-between' } as const;
const ORDER_DETAIL_MAX_HEIGHT = Dimensions.get('window').height * 0.82;
const productRepository = createProductRepository();

const TABS: Array<{ key: MyProductsTab; label: string }> = [
  { key: 'products', label: 'Sản phẩm của tôi' },
  { key: 'purchased', label: 'Đã mua' },
  { key: 'orders', label: 'Đơn hàng' },
];

const PRODUCT_SORT_OPTIONS: Array<{ label: string; value: ProductSortOption }> = [
  { label: 'Mới đăng', value: 'newest' },
  { label: 'Giá tăng dần', value: 'price_asc' },
  { label: 'Giá giảm dần', value: 'price_desc' },
];

const ORDER_STATUS_OPTIONS: Array<{
  label: string;
  value: OrderStatusFilter;
}> = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Chờ xác nhận', value: 'placed' },
  { label: 'Đã xác nhận', value: 'accepted' },
  { label: 'Đã đóng gói', value: 'packed' },
  { label: 'Đang giao', value: 'shipped' },
  { label: 'Đã giao', value: 'delivered' },
  { label: 'Đã hủy', value: 'canceled' },
];

function SearchFilterRow({
  value,
  placeholder,
  hasActiveFilters,
  onChangeText,
  onToggleFilters,
}: {
  value: string;
  placeholder: string;
  hasActiveFilters: boolean;
  onChangeText: (value: string) => void;
  onToggleFilters: () => void;
}) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="input-shell flex-1 flex-row items-center px-4">
        <Search size={19} color="#64748B" />
        <TextInput
          className="ml-3 min-h-[46px] flex-1 text-body-primary"
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          returnKeyType="search"
        />
        {value ? (
          <TouchableOpacity
            className="h-8 w-8 items-center justify-center rounded-full"
            activeOpacity={0.8}
            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
            onPress={() => onChangeText('')}
          >
            <X size={16} color="#64748B" />
          </TouchableOpacity>
        ) : null}
      </View>
      <TouchableOpacity
        className={`h-12 w-12 items-center justify-center rounded-2xl border ${
          hasActiveFilters
            ? 'border-blue-600 bg-blue-50'
            : 'border-slate-200 bg-white'
        }`}
        activeOpacity={0.8}
        hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        onPress={onToggleFilters}
      >
        <SlidersHorizontal size={20} color="#0000FF" />
      </TouchableOpacity>
    </View>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className={`rounded-full border px-3 py-2 ${
        active ? 'border-blue-600 bg-blue-50' : 'border-slate-200 bg-white'
      }`}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Text
        className={
          active
            ? 'text-caption-primary text-brand'
            : 'text-caption-secondary'
        }
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function EmptyPanel({
  title,
  description,
  canRetry,
  onRetry,
}: {
  title: string;
  description: string;
  canRetry?: boolean;
  onRetry?: () => void;
}) {
  return (
    <View className="items-center px-8 py-16">
      <View className="icon-chip h-16 w-16 items-center justify-center">
        <ShoppingBag size={30} color="#0000FF" />
      </View>
      <Text className="mt-4 text-center text-title-primary">{title}</Text>
      <Text className="mt-2 text-center text-body-secondary">
        {description}
      </Text>
      {canRetry && onRetry ? (
        <TouchableOpacity
          className="btn-secondary mt-5 min-h-[42px] px-5"
          activeOpacity={0.85}
          onPress={onRetry}
        >
          <RotateCw size={16} color="#0000FF" />
          <Text className="text-title-primary text-brand">Thử lại</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function OrderCard({
  item,
  onViewDetail,
}: {
  item: OrdersItem;
  onViewDetail: (item: OrdersItem) => void;
}) {
  return (
    <View className="surface-card mb-3 px-4 py-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <Text className="text-title-primary">{item.product}</Text>
          <Text className="mt-1 text-caption-secondary">
            {item.code} · {item.shop}
          </Text>
        </View>
        <View className="rounded-full bg-blue-50 px-3 py-1">
          <Text className="text-caption-primary text-brand">
            {item.statusLabel}
          </Text>
        </View>
      </View>
      <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3">
        <Text className="text-caption-secondary">{item.date}</Text>
        <Text className="text-title-primary text-brand">{item.total}</Text>
      </View>
      <TouchableOpacity
        className="btn-secondary mt-4 min-h-[42px]"
        activeOpacity={0.85}
        onPress={() => onViewDetail(item)}
      >
        <Eye size={16} color="#0000FF" />
        <Text className="text-title-primary text-brand">Xem chi tiết</Text>
      </TouchableOpacity>
    </View>
  );
}

function OrderDetailModal({
  order,
  onClose,
}: {
  order: OrdersItem | null;
  onClose: () => void;
}) {
  return (
    <Modal
      transparent
      visible={Boolean(order)}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/35">
        <View
          className="rounded-t-3xl bg-white px-5 pb-6 pt-4"
          style={styles.orderDetailSheet}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-heading">Chi tiết đơn hàng</Text>
              <Text className="mt-1 text-caption-secondary">{order?.code}</Text>
            </View>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              activeOpacity={0.8}
              hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              onPress={onClose}
            >
              <X size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          {order ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="rounded-2xl bg-slate-50 px-4 py-4">
                <View className="flex-row justify-between py-1.5">
                  <Text className="text-body-secondary">Shop</Text>
                  <Text className="ml-4 flex-1 text-right text-title-secondary">
                    {order.shop}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1.5">
                  <Text className="text-body-secondary">Trạng thái</Text>
                  <Text className="ml-4 flex-1 text-right text-title-secondary text-brand">
                    {order.statusLabel}
                  </Text>
                </View>
                <View className="flex-row justify-between py-1.5">
                  <Text className="text-body-secondary">Ngày đặt</Text>
                  <Text className="ml-4 flex-1 text-right text-title-secondary">
                    {order.date || 'Chưa cập nhật'}
                  </Text>
                </View>
                <View className="mt-2 flex-row justify-between border-t border-slate-100 pt-4">
                  <Text className="text-title-primary">Tổng thanh toán</Text>
                  <Text className="text-title-primary text-brand">
                    {order.total}
                  </Text>
                </View>
              </View>

              <Text className="mb-2 mt-5 text-title-primary">Sản phẩm</Text>
              {(order.lines.length ? order.lines : [
                {
                  id: order.id,
                  product: order.product,
                  total: order.total,
                  status: order.status,
                  statusLabel: order.statusLabel,
                },
              ]).map(line => (
                <View
                  key={line.id}
                  className="mb-3 rounded-2xl border border-slate-100 px-4 py-3"
                >
                  <View className="flex-row justify-between gap-3">
                    <Text className="flex-1 text-title-secondary">
                      {line.product}
                    </Text>
                    <Text className="text-title-secondary text-brand">
                      {line.total}
                    </Text>
                  </View>
                  <Text className="mt-2 text-caption-secondary">
                    {line.statusLabel}
                  </Text>
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function MyProductsScreen() {
  const navigation = useNavigation<MyProductsNav>();
  const route = useRoute<MyProductsRoute>();
  const targetUserIdRaw = route.params?.userId;
  const targetUserId = targetUserIdRaw ? Number(targetUserIdRaw) : undefined;
  const vm = useMyProductsViewModel(targetUserId);
  const { setActiveTab } = vm;
  const { cartCount, syncCartCount } = useSyncedCartCount(0);
  const [selectedOrder, setSelectedOrder] = useState<OrdersItem | null>(null);

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
  }, [route.params?.initialTab, setActiveTab]);

  const handleCreate = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_PRODUCT);
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      productRepository
        .getCartCount()
        .then(count => {
          if (!cancelled) {
            syncCartCount(count);
          }
        })
        .catch(error => {
          console.warn('[MyProducts] getCartCount error:', error);
        });

      return () => {
        cancelled = true;
      };
    }, [syncCartCount]),
  );

  const handleTabPress = useCallback(
    (tab: MyProductsTab) => {
      if (tab === 'marketplace') {
        navigation.navigate(ROUTES.MARKETPLACE);
        return;
      }
      setActiveTab(tab);
    },
    [navigation, setActiveTab],
  );

  const handleProductPress = useCallback(
    (product: ProductItem) => {
      navigation.navigate(ROUTES.PRODUCT_DETAIL, {
        productId: product.id,
        product,
      });
    },
    [navigation],
  );

  const renderProduct = useCallback(
    ({ item }: ListRenderItemInfo<ProductItem>) => (
      <View className="w-[48%]">
        <ProductPostCard compact product={item} onPress={handleProductPress} />
      </View>
    ),
    [handleProductPress],
  );

  const renderOrder = useCallback(
    ({ item }: ListRenderItemInfo<OrdersItem>) => (
      <OrderCard item={item} onViewDetail={setSelectedOrder} />
    ),
    [],
  );

  const productFiltersActive = Boolean(
    vm.selectedCategoryId || vm.productSort !== 'newest',
  );
  const purchasedFiltersActive = vm.purchasedStatus !== 'all';
  const orderFiltersActive = vm.ordersStatus !== 'all';

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />
      <FeedHeader />

      {/* Tạm thời comment title Sản phẩm của tôi ở đầu trang theo yêu cầu */}
      {/* 
      <View className="surface-topbar flex-row items-center px-4 py-3">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-heading">
            {targetUserId ? 'Sản phẩm' : 'Sản phẩm của tôi'}
          </Text>
          <Text className="mt-0.5 text-caption-secondary">
            {targetUserId
              ? 'Danh sách sản phẩm của người dùng'
              : 'Quản lý mua bán marketplace'}
          </Text>
        </View>
      </View>
      */}

      {!targetUserId && (
        <View className="mx-4 my-2.5 rounded-2xl bg-white p-3 border border-slate-100 shadow-sm">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center bg-blue-600 rounded-xl py-3 px-3 shadow-sm active:bg-blue-700"
              activeOpacity={0.8}
              onPress={() => navigation.navigate(ROUTES.MARKETPLACE)}
            >
              <Store size={16} color="#FFFFFF" />
              <Text className="ml-2 text-white font-semibold text-caption-primary">
                Chuyển đến thị trường
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="relative flex-1 flex-row items-center justify-center bg-orange-500 rounded-xl py-3 px-3 shadow-sm active:bg-orange-600"
              style={{ backgroundColor: '#F97316' }}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(ROUTES.CART)}
            >
              <ShoppingCart size={16} color="#FFFFFF" />
              {cartCount > 0 ? (
                <View className="absolute right-2 top-1 h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1">
                  <Text className="text-[10px] font-extrabold text-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </Text>
                </View>
              ) : null}
              <Text className="ml-2 text-white font-semibold text-caption-primary">
                Giỏ hàng
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View className="flex-row items-center justify-between border-b border-slate-100 bg-white">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="flex-row items-center gap-6 px-4"
          className="flex-1"
        >
          {TABS.filter(tab => {
            // Khi xem sản phẩm của người khác → chỉ hiện tab 'products'
            if (targetUserId) {
              return tab.key === 'products';
            }
            return true;
          }).map(tab => {
            const isActive = tab.key === vm.activeTab;

            return (
              <TouchableOpacity
                key={tab.key}
                className="py-3.5 relative"
                activeOpacity={0.8}
                onPress={() => handleTabPress(tab.key)}
              >
                <Text
                  className={`text-body-primary font-semibold ${
                    isActive ? 'text-slate-900 font-bold' : 'text-slate-500'
                  }`}
                >
                  {tab.label}
                </Text>
                {isActive && (
                  <View className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {!targetUserId && (
          <TouchableOpacity
            className="mx-4 flex-row items-center bg-blue-600 rounded-full px-3 py-1.5 shadow-sm active:bg-blue-700"
            activeOpacity={0.8}
            onPress={handleCreate}
          >
            <Plus size={14} color="#FFFFFF" />
            <Text className="ml-1 text-white font-semibold text-xs">Tạo ra</Text>
          </TouchableOpacity>
        )}
      </View>

      {vm.activeTab === 'products' ? (
        <>
          {/* Tạm thời comment tìm kiếm và bộ lọc ở tab Sản phẩm của tôi theo yêu cầu */}
          {/*
          <View className="gap-3 px-4 py-4">
            <SearchFilterRow
              value={vm.productSearch}
              placeholder="Tìm sản phẩm của tôi..."
              hasActiveFilters={productFiltersActive}
              onChangeText={vm.setProductSearch}
              onToggleFilters={vm.toggleFilters}
            />
            {vm.filtersVisible ? (
              <View className="surface-panel gap-4 px-4 py-4">
                <View>
                  <Text className="mb-2 text-caption-primary">Sắp xếp</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {PRODUCT_SORT_OPTIONS.map(option => (
                      <FilterChip
                        key={option.value}
                        label={option.label}
                        active={option.value === vm.productSort}
                        onPress={() => vm.setProductSort(option.value)}
                      />
                    ))}
                  </View>
                </View>
                <View>
                  <Text className="mb-2 text-caption-primary">Thể loại</Text>
                  <View className="flex-row flex-wrap gap-2">
                    <FilterChip
                      label="Tất cả"
                      active={!vm.selectedCategoryId}
                      onPress={() => vm.setSelectedCategoryId(undefined)}
                    />
                    {vm.categories.map(category => (
                      <FilterChip
                        key={category.id}
                        label={category.label}
                        active={category.id === vm.selectedCategoryId}
                        onPress={() => vm.setSelectedCategoryId(category.id)}
                      />
                    ))}
                  </View>
                </View>
              </View>
            ) : null}
          </View>
          */}
          <FlatList
            data={vm.filteredProducts}
            keyExtractor={item => String(item.id)}
            renderItem={renderProduct}
            numColumns={2}
            columnWrapperStyle={PRODUCT_COLUMNS}
            contentContainerClassName="gap-3 px-4 pb-10"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              vm.isLoading ? (
                <ActivityIndicator className="py-10" color="#0000FF" />
              ) : (
                <EmptyPanel
                  title={
                    vm.error
                      ? 'Không tải được sản phẩm'
                      : 'Chưa có sản phẩm của tôi'
                  }
                  description={
                    vm.error ??
                    'Đăng bán sản phẩm đầu tiên hoặc thử thay đổi bộ lọc.'
                  }
                  canRetry={Boolean(vm.error)}
                  onRetry={vm.reload}
                />
              )
            }
          />
        </>
      ) : null}

      {vm.activeTab === 'purchased' ? (
        <>
          {/* Tạm thời comment tìm kiếm và bộ lọc ở tab Đã mua theo yêu cầu */}
          {/*
          <View className="gap-3 px-4 py-4">
            <SearchFilterRow
              value={vm.purchasedSearch}
              placeholder="Tìm theo mã đơn hoặc shop..."
              hasActiveFilters={purchasedFiltersActive}
              onChangeText={vm.setPurchasedSearch}
              onToggleFilters={vm.toggleFilters}
            />
            {vm.filtersVisible ? (
              <View className="surface-panel gap-4 px-4 py-4">
                <Text className="text-title-primary">Trạng thái đơn</Text>
                <View className="flex-row flex-wrap gap-2">
                  {ORDER_STATUS_OPTIONS.map(option => (
                    <FilterChip
                      key={option.value}
                      label={option.label}
                      active={option.value === vm.purchasedStatus}
                      onPress={() => vm.setPurchasedStatus(option.value)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
          */}
          <FlatList
            data={vm.purchasedItems}
            keyExtractor={item => item.id}
            renderItem={renderOrder}
            contentContainerClassName="px-4 pb-10"
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              vm.isOrdersLoading ? (
                <ActivityIndicator className="py-10" color="#0000FF" />
              ) : (
                <EmptyPanel
                  title={
                    vm.ordersError
                      ? 'Không tải được đơn đã mua'
                      : 'Chưa có đơn đã mua'
                  }
                  description={
                    vm.ordersError ??
                    'Các sản phẩm bạn mua sẽ hiển thị ở đây.'
                  }
                  canRetry={Boolean(vm.ordersError)}
                  onRetry={vm.reload}
                />
              )
            }
          />
        </>
      ) : null}

      {vm.activeTab === 'orders' ? (
        <>
          {/* Tạm thời comment tìm kiếm và bộ lọc ở tab Đơn hàng theo yêu cầu */}
          {/*
          <View className="gap-3 px-4 py-4">
            <SearchFilterRow
              value={vm.ordersSearch}
              placeholder="Tìm theo mã đơn hoặc shop..."
              hasActiveFilters={orderFiltersActive}
              onChangeText={vm.setOrdersSearch}
              onToggleFilters={vm.toggleFilters}
            />
            {vm.filtersVisible ? (
              <View className="surface-panel gap-4 px-4 py-4">
                <Text className="text-title-primary">Trạng thái đơn</Text>
                <View className="flex-row flex-wrap gap-2">
                  {ORDER_STATUS_OPTIONS.map(option => (
                    <FilterChip
                      key={option.value}
                      label={option.label}
                      active={option.value === vm.ordersStatus}
                      onPress={() => vm.setOrdersStatus(option.value)}
                    />
                  ))}
                </View>
              </View>
            ) : null}
          </View>
          */}
          <FlatList
            data={vm.orderItems}
            keyExtractor={item => item.id}
            renderItem={renderOrder}
            contentContainerClassName="px-4 pb-10"
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              vm.isOrdersLoading ? (
                <ActivityIndicator className="py-10" color="#0000FF" />
              ) : (
                <EmptyPanel
                  title={
                    vm.ordersError
                      ? 'Không tải được đơn hàng'
                      : 'Chưa có đơn hàng'
                  }
                  description={
                    vm.ordersError ??
                    'Đơn từ người mua sản phẩm của bạn sẽ hiển thị ở đây.'
                  }
                  canRetry={Boolean(vm.ordersError)}
                  onRetry={vm.reload}
                />
              )
            }
          />
        </>
      ) : null}
      <OrderDetailModal
        order={selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </SafeAreaView>
  );
}

export default MyProductsScreen;

const styles = StyleSheet.create({
  orderDetailSheet: {
    maxHeight: ORDER_DETAIL_MAX_HEIGHT,
  },
});
