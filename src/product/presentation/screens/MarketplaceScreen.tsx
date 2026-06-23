// Description: Displays Marketplace products with searchable filter controls.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  ActivityIndicator,
  FlatList,
  PanResponder,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  type ListRenderItemInfo,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  RotateCcw,
  RotateCw,
  Search,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  X,
  ChevronDown,
  Check,
  MapPin,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useMarketplaceViewModel } from '../../application/view-models/useMarketplaceViewModel';
import type { ProductItem } from '../../domain/types/product.types';
import ProductPostCard from '../components/ProductPostCard';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  createNativeTabScrollPublisherState,
  publishNativeTabScrollBehavior,
  publishNativeTabScrollIntent,
} from '../../../navigation/nativeTabScrollPublisher';

type MarketplaceNav = NativeStackNavigationProp<RootStackParamList>;

const MARKETPLACE_COLUMN_STYLE = {
  justifyContent: 'space-between',
} as const;

const SORT_OPTIONS: Array<{
  label: string;
  value: 'price_low' | 'price_high' | undefined;
}> = [
  { label: 'Mới đăng', value: undefined },
  { label: 'Giá tăng dần', value: 'price_low' },
  { label: 'Giá giảm dần', value: 'price_high' },
];

const MIN_DISTANCE = 1;
const MAX_DISTANCE = 100;

function MarketplaceSkeleton() {
  return (
    <View className="flex-row flex-wrap gap-3 px-4 pb-8">
      {Array.from({ length: 6 }).map((_, index) => (
        <View
          key={index}
          className="w-[48%] overflow-hidden rounded-2xl border border-slate-100 bg-white"
        >
          <View className="aspect-square bg-slate-200" />
          <View className="gap-2 p-3">
            <View className="h-4 w-4/5 rounded-full bg-slate-200" />
            <View className="h-4 w-2/3 rounded-full bg-slate-100" />
            <View className="h-3 w-full rounded-full bg-slate-100" />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <View className="items-center px-8 py-20">
      <View className="icon-chip h-20 w-20 items-center justify-center">
        {error ? (
          <RotateCw size={36} color="#0000FF" />
        ) : (
          <ShoppingBag size={38} color="#0000FF" />
        )}
      </View>
      <Text className="mt-5 text-center text-heading">
        {error ? 'Không tải được cửa hàng' : 'Chưa có sản phẩm phù hợp'}
      </Text>
      <Text className="mt-2 text-center text-body-secondary">
        {error ??
          'Thử từ khóa hoặc bộ lọc khác để tìm sản phẩm trong cửa hàng.'}
      </Text>
      {error ? (
        <TouchableOpacity
          className="btn-secondary mt-6 min-h-[44px] px-5"
          activeOpacity={0.85}
          onPress={onRetry}
        >
          <RotateCw size={17} color="#0000FF" />
          <Text className="text-title-primary text-brand">Thử lại</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function DistanceSlider({
  value,
  error,
  onChange,
}: {
  value: number | undefined;
  error: string | null;
  onChange: (value: number | undefined) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const activeValue = value ?? 25;
  const percent =
    ((activeValue - MIN_DISTANCE) / (MAX_DISTANCE - MIN_DISTANCE)) * 100;

  const updateValueFromX = useCallback(
    (x: number) => {
      if (!trackWidth) return;
      const ratio = Math.max(0, Math.min(1, x / trackWidth));
      const nextValue = Math.round(
        MIN_DISTANCE + ratio * (MAX_DISTANCE - MIN_DISTANCE),
      );
      onChange(nextValue);
    },
    [onChange, trackWidth],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: event => {
          updateValueFromX(event.nativeEvent.locationX);
        },
        onPanResponderMove: event => {
          updateValueFromX(event.nativeEvent.locationX);
        },
      }),
    [updateValueFromX],
  );

  return (
    <View>
      <View className="mb-2">
        <Text className="text-caption-secondary font-medium">
          Tùy chỉnh khoảng cách: {value ? `${value} km` : '25 km (Mặc định)'}
        </Text>
      </View>

      <View
        className="h-8 justify-center"
        onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
        {...panResponder.panHandlers}
      >
        <View className="h-1.5 rounded-full bg-slate-200">
          <View
            className="h-1.5 rounded-full bg-blue-600"
            style={{ width: `${percent}%` }}
          />
        </View>
        <View
          className="absolute -ml-3 h-6 w-6 rounded-full border-2 border-blue-600 bg-white"
          style={{ left: `${percent}%` }}
        />
      </View>

      <View className="mt-1 flex-row justify-between">
        <Text className="text-caption-secondary">{MIN_DISTANCE} km</Text>
        <Text className="text-caption-secondary">{MAX_DISTANCE} km</Text>
      </View>
      {error ? (
        <Text className="mt-3 text-caption-primary text-red-500">{error}</Text>
      ) : null}
    </View>
  );
}

function FilterPickerModal<T>({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: {
  visible: boolean;
  title: string;
  options: Array<{ label: string; value: T }>;
  selectedValue: T;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        className="flex-1 justify-end bg-black/40"
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="bg-white rounded-t-3xl px-5 pb-8 pt-5"
          style={{ maxHeight: '70%' }}
        >
          <View className="flex-row items-center justify-between pb-4 border-b border-slate-100 mb-2">
            <Text className="text-lg font-bold text-slate-800">{title}</Text>
            <TouchableOpacity
              className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              activeOpacity={0.8}
              onPress={onClose}
            >
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={options}
            keyExtractor={(_, index) => String(index)}
            renderItem={({ item }) => {
              const isSelected = item.value === selectedValue;
              return (
                <TouchableOpacity
                  className="flex-row items-center justify-between py-3.5 border-b border-slate-50"
                  activeOpacity={0.7}
                  onPress={() => {
                    onSelect(item.value);
                    onClose();
                  }}
                >
                  <Text
                    className={`text-body-primary text-base ${
                      isSelected ? 'text-blue-600 font-semibold' : 'text-slate-700'
                    }`}
                  >
                    {item.label}
                  </Text>
                  {isSelected ? <Check size={18} color="#0000FF" /> : null}
                </TouchableOpacity>
              );
            }}
            showsVerticalScrollIndicator={false}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function DistancePickerModal({
  visible,
  value,
  error,
  onChange,
  onClose,
}: {
  visible: boolean;
  value: number | undefined;
  error: string | null;
  onChange: (value: number | undefined) => void;
  onClose: () => void;
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        activeOpacity={1}
        className="flex-1 justify-end bg-black/40"
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="bg-white rounded-t-3xl px-5 pb-8 pt-5"
        >
          <View className="flex-row items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <Text className="text-lg font-bold text-slate-800">Khoảng cách vị trí</Text>
            <TouchableOpacity
              className="h-8 w-8 items-center justify-center rounded-full bg-slate-100"
              activeOpacity={0.8}
              onPress={onClose}
            >
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Select Buttons */}
          <View className="mb-6">
            <Text className="text-caption-primary mb-2.5 font-medium">Chọn nhanh</Text>
            <View className="flex-row flex-wrap gap-2">
              {[
                { label: 'Tắt', value: undefined },
                { label: '5 km', value: 5 },
                { label: '10 km', value: 10 },
                { label: '25 km', value: 25 },
                { label: '50 km', value: 50 },
                { label: '100 km', value: 100 },
              ].map((opt, idx) => {
                const isActive = opt.value === value;
                return (
                  <TouchableOpacity
                    key={idx}
                    className={`rounded-full border px-4 py-2 ${
                      isActive
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 bg-white'
                    }`}
                    activeOpacity={0.8}
                    onPress={() => onChange(opt.value)}
                  >
                    <Text
                      className={
                        isActive
                          ? 'text-caption-primary font-semibold text-blue-600'
                          : 'text-caption-secondary'
                      }
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Custom distance slider */}
          <View className="border-t border-slate-100 pt-5 mb-4">
            <DistanceSlider
              value={value}
              error={error}
              onChange={onChange}
            />
          </View>

          {/* Apply button */}
          <TouchableOpacity
            className="btn-primary h-12 w-full items-center justify-center rounded-xl bg-blue-600 mt-4"
            activeOpacity={0.9}
            onPress={onClose}
          >
            <Text className="text-caption-primary font-bold text-white">
              Áp dụng
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function MarketplaceScreen() {
  const navigation = useNavigation<MarketplaceNav>();
  const insets = useSafeAreaInsets();
  const vm = useMarketplaceViewModel();
  const nativeTabScrollPublisherStateRef = useRef(
    createNativeTabScrollPublisherState(),
  );
  const hasActiveFilters = Boolean(vm.categoryId || vm.distance || vm.orderBy);

  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);

  const currentSortLabel = useMemo(() => {
    const option = SORT_OPTIONS.find(opt => opt.value === vm.orderBy);
    return option ? option.label : 'Mới đăng';
  }, [vm.orderBy]);

  const currentCategoryLabel = useMemo(() => {
    if (vm.categoryId === undefined) return 'Thể loại';
    const category = vm.categories.find(cat => cat.id === vm.categoryId);
    return category ? category.label : 'Thể loại';
  }, [vm.categoryId, vm.categories]);

  const currentDistanceLabel = useMemo(() => {
    if (vm.distance === undefined) return 'Khoảng cách vị trí';
    return `Phạm vi ${vm.distance} km`;
  }, [vm.distance]);

  const handleNearbyStoresToggle = useCallback(() => {
    if (vm.distance === 15) {
      vm.setDistance(undefined);
    } else {
      vm.setDistance(15);
    }
  }, [vm.distance, vm.setDistance]);

  const categoryOptions = useMemo(() => {
    return [
      { label: 'Tất cả thể loại', value: undefined },
      ...vm.categories.map(c => ({ label: c.label, value: c.id })),
    ];
  }, [vm.categories]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;

    return () => {
      publishNativeTabScrollBehavior('onScrollDown');
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'ios') return undefined;

      return () => {
        publishNativeTabScrollBehavior('onScrollDown');
      };
    }, []),
  );

  const handleMyProducts = useCallback(() => {
    navigation.navigate(ROUTES.MY_PRODUCTS);
  }, [navigation]);

  const handleOpenCart = useCallback(() => {
    navigation.navigate(ROUTES.CHECKOUT);
  }, [navigation]);

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

  const handleMarketplaceScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (Platform.OS !== 'ios') return;

      publishNativeTabScrollIntent(
        nativeTabScrollPublisherStateRef,
        event.nativeEvent.contentOffset.y,
      );
    },
    [],
  );

  const marketplaceHeader = (
    <>
      <View
        className="surface-topbar flex-row items-center px-4 py-3"
        style={Platform.OS === 'ios' ? { paddingTop: insets.top + 12 } : undefined}
      >
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-heading">Cửa hàng</Text>
          <Text className="mt-0.5 text-caption-secondary">Marketplace</Text>
        </View>
        <TouchableOpacity
          className="relative mr-2 h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
          activeOpacity={0.8}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          onPress={handleOpenCart}
        >
          <ShoppingCart size={19} color="#0000FF" />
          {vm.cartCount > 0 ? (
            <View className="absolute -right-1 -top-1 h-5 w-5 items-center justify-center rounded-full bg-red-500">
              <Text className="text-caption-primary font-bold text-white">
                {vm.cartCount > 99 ? '99+' : vm.cartCount}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity
          className="btn-primary h-10 px-4"
          activeOpacity={0.9}
          onPress={handleMyProducts}
        >
          <ShoppingBag size={17} color="#FFFFFF" />
          <Text className="text-caption-primary text-inverse">
            Sản phẩm của tôi
          </Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 pb-3 pt-4">
        <View className="surface-panel gap-3 p-4 rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* Row 1: Search Input */}
          <View className="input-shell flex-row items-center px-4 bg-slate-50 border border-slate-200 rounded-xl">
            <Search size={19} color="#64748B" />
            <TextInput
              className="ml-3 min-h-[46px] flex-1 text-body-primary"
              placeholder="Tìm sản phẩm, địa điểm..."
              placeholderTextColor="#94A3B8"
              value={vm.keyword}
              onChangeText={vm.setKeyword}
              returnKeyType="search"
            />
            {vm.keyword ? (
              <TouchableOpacity
                className="h-8 w-8 items-center justify-center rounded-full"
                activeOpacity={0.8}
                hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
                onPress={() => vm.setKeyword('')}
              >
                <X size={16} color="#64748B" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Row 2: Sort and Category Dropdowns */}
          <View className="flex-row gap-2">
            <TouchableOpacity
              className="flex-1 flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3"
              activeOpacity={0.8}
              onPress={() => setSortModalVisible(true)}
            >
              <Text className="text-body-primary text-sm font-semibold" numberOfLines={1}>
                {currentSortLabel}
              </Text>
              <ChevronDown size={15} color="#64748B" />
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3"
              activeOpacity={0.8}
              onPress={() => setCategoryModalVisible(true)}
            >
              <Text className="text-body-primary text-sm font-semibold" numberOfLines={1}>
                {currentCategoryLabel}
              </Text>
              <ChevronDown size={15} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Row 3: Distance Dropdown */}
          <TouchableOpacity
            className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-3"
            activeOpacity={0.8}
            onPress={() => setDistanceModalVisible(true)}
          >
            <View className="flex-row items-center gap-2">
              <MapPin size={16} color="#0000FF" />
              <Text className="text-body-primary text-sm font-semibold">
                {currentDistanceLabel}
              </Text>
            </View>
            <ChevronDown size={15} color="#64748B" />
          </TouchableOpacity>

          {/* Row 4: Nearby stores button and Reset button */}
          <View className="flex-row gap-2 mt-1">
            <TouchableOpacity
              className={`flex-1 h-11 items-center justify-center rounded-xl flex-row gap-2 ${
                vm.distance === 15 ? 'bg-blue-700' : 'bg-blue-600'
              }`}
              activeOpacity={0.9}
              onPress={handleNearbyStoresToggle}
            >
              <MapPin size={16} color="#FFFFFF" />
              <Text className="text-caption-primary font-bold text-white text-sm">
                Cửa hàng lân cận (15 km)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-slate-50"
              activeOpacity={0.8}
              onPress={vm.resetFilters}
            >
              <RotateCcw size={17} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );

  const marketplaceListHeaderComponent =
    Platform.OS === 'ios' ? marketplaceHeader : undefined;

  return (
    <SafeAreaView
      className="flex-1 surface-base"
      edges={Platform.OS === 'ios' ? ['left', 'right'] : ['top']}
    >
      <FocusAwareStatusBar barStyle="dark-content" />
      {Platform.OS === 'ios' ? undefined : marketplaceHeader}

      <FlatList
        data={vm.products}
        keyExtractor={item => String(item.id)}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={MARKETPLACE_COLUMN_STYLE}
        contentContainerClassName="gap-3 px-4 pb-10 pt-1"
        ListHeaderComponent={marketplaceListHeaderComponent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={Platform.OS === 'ios' ? handleMarketplaceScroll : undefined}
        scrollEventThrottle={Platform.OS === 'ios' ? 16 : undefined}
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            refreshing={vm.isRefreshing}
            onRefresh={vm.reload}
            colors={['#0000FF']}
            tintColor="#0000FF"
          />
        }
        ListEmptyComponent={
          vm.isLoading ? (
            <MarketplaceSkeleton />
          ) : (
            <EmptyState error={vm.error} onRetry={vm.reload} />
          )
        }
        ListFooterComponent={
          vm.isLoadingMore ? (
            <ActivityIndicator className="py-6" size="small" color="#0000FF" />
          ) : null
        }
      />
      <FilterPickerModal
        visible={sortModalVisible}
        title="Sắp xếp theo"
        options={SORT_OPTIONS}
        selectedValue={vm.orderBy}
        onSelect={vm.setOrderBy}
        onClose={() => setSortModalVisible(false)}
      />

      <FilterPickerModal
        visible={categoryModalVisible}
        title="Thể loại"
        options={categoryOptions}
        selectedValue={vm.categoryId}
        onSelect={vm.setCategoryId}
        onClose={() => setCategoryModalVisible(false)}
      />

      <DistancePickerModal
        visible={distanceModalVisible}
        value={vm.distance}
        error={vm.distanceFilterError}
        onChange={vm.setDistance}
        onClose={() => setDistanceModalVisible(false)}
      />
    </SafeAreaView>
  );
}

export default MarketplaceScreen;
