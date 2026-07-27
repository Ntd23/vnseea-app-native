// Description: Displays Marketplace products with searchable filter controls.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
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
import { NavigationContext } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMainTabContentInsets } from '../../../navigation/useMainTabContentInsets';
import { navigationRef } from '../../../navigation/navigationRef';
import {
  ArrowLeft,
  RotateCcw,
  RotateCw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  X,
  ChevronDown,
  Check,
  MapPin,
  Compass,
  Video,
  Image as ImageIcon,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigateToReels } from '../../../navigation/reelsNavigation';
import { useMarketplaceViewModel } from '../../application/view-models/useMarketplaceViewModel';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import type { ProductItem } from '../../domain/types/product.types';
import ProductPostCard from '../components/ProductPostCard';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import { showSnackbar } from '../../../shared-kernel/presentation/components/Snackbar';
import { setSyncedCartCount } from '../../../shared-kernel/application/state/cartCountSync';
import {
  createNativeTabScrollPublisherState,
  publishNativeTabScrollBehavior,
  publishNativeTabScrollIntent,
} from '../../../navigation/nativeTabScrollPublisher';

const MARKETPLACE_COLUMN_STYLE = {
  justifyContent: 'space-between',
  paddingHorizontal: 16,
} as const;
const MARKETPLACE_HEADER_ELEVATION_STYLE =
  Platform.OS === 'android'
    ? { zIndex: 30, elevation: 12 }
    : { zIndex: 30 };
const FILTER_PANEL_FULL_HEIGHT = 232;
const FILTER_PANEL_COLLAPSED_HEIGHT = 72;
const FILTER_COLLAPSE_THRESHOLD = 132;
const FILTER_EXPAND_THRESHOLD = 72;
const FILTER_PANEL_CHILD_STYLE = {
  left: 0,
  position: 'absolute',
  right: 0,
  top: 0,
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
const marketplaceOrderRepository = createProductRepository();

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
          <RotateCw size={36} color={APP_BRAND_COLOR} />
        ) : (
          <ShoppingBag size={38} color={APP_BRAND_COLOR} />
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
          <RotateCw size={17} color={APP_BRAND_COLOR} />
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
            className="h-1.5 rounded-full bg-brand"
            style={{ width: `${percent}%` }}
          />
        </View>
        <View
          className="absolute -ml-3 h-6 w-6 rounded-full border-2 border-brand bg-white"
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
                      isSelected ? 'text-brand font-semibold' : 'text-slate-700'
                    }`}
                  >
                    {item.label}
                  </Text>
                  {isSelected ? <Check size={18} color={APP_BRAND_COLOR} /> : null}
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
                        ? 'border-brand bg-brand-subtle'
                        : 'border-slate-200 bg-white'
                    }`}
                    activeOpacity={0.8}
                    onPress={() => onChange(opt.value)}
                  >
                    <Text
                      className={
                        isActive
                          ? 'text-caption-primary font-semibold text-brand'
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
            className="btn-primary h-12 w-full items-center justify-center rounded-xl bg-brand mt-4"
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
  const navigation = useContext(NavigationContext);
  const {
    bottomContentPadding,
    scrollIndicatorBottomInset,
  } = useMainTabContentInsets();
  const vm = useMarketplaceViewModel();
  const setMarketplaceDistance = vm.setDistance;
  const nativeTabScrollPublisherStateRef = useRef(
    createNativeTabScrollPublisherState(),
  );
  const filterPanelProgress = useRef(new Animated.Value(0)).current;
  const filterAnimationRef = useRef<ReturnType<typeof Animated.timing> | null>(null);
  const filterTransitionLockRef = useRef(false);
  const filterAnimationIdRef = useRef(0);
  const latestScrollYRef = useRef(0);
  const hasActiveFilters = Boolean(vm.categoryId || vm.distance || vm.orderBy);
  const nearbyProductsActive = vm.distance === 15 && !vm.distanceFilterError;

  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);
  const [orderingProductId, setOrderingProductId] = useState<number | null>(null);
 // Collapsible filter panel state. When the user scrolls down past
 // COLLAPSE_THRESHOLD we collapse the filter chip bar (search + sort
 // + category + distance + nearby + reset) and keep only the top app
 // bar plus a compact sticky search/handle bar. Scrolling back up
 // re-expands it.
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const filtersCollapsedRef = useRef(false);
  const lastScrollYRef = useRef(0);
  // Collapsible filter panel state. When the user scrolls the product
  // list down we collapse the filter chip bar (search + sort + category
  // + distance + nearby + reset) and keep only the top app bar visible.
  // A small sticky "Search + Bộ lọc" handle stays so the user can
  // either type a query or tap the toggle to expand the panel again.
  

  const filterPanelAnimatedStyle = useMemo(
    () => ({
      height: filterPanelProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [FILTER_PANEL_FULL_HEIGHT, FILTER_PANEL_COLLAPSED_HEIGHT],
      }),
      overflow: 'hidden' as const,
    }),
    [filterPanelProgress],
  );

  const fullBarAnimatedStyle = useMemo(
    () => ({
      opacity: filterPanelProgress.interpolate({
        inputRange: [0, 0.45, 1],
        outputRange: [1, 0, 0],
      }),
      transform: [
        {
          translateY: filterPanelProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -10],
          }),
        },
        {
          scale: filterPanelProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.985],
          }),
        },
      ],
    }),
    [filterPanelProgress],
  );

  const collapsedBarAnimatedStyle = useMemo(
    () => ({
      opacity: filterPanelProgress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0, 1],
      }),
      transform: [
        {
          translateY: filterPanelProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [8, 0],
          }),
        },
        {
          scale: filterPanelProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [0.98, 1],
          }),
        },
      ],
    }),
    [filterPanelProgress],
  );

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
    if (nearbyProductsActive) {
      setMarketplaceDistance(undefined);
    } else {
      setMarketplaceDistance(15);
    }
  }, [nearbyProductsActive, setMarketplaceDistance]);

  const categoryOptions = useMemo(() => {
    return [
      { label: 'Tất cả thể loại', value: undefined },
      ...vm.categories.map(c => ({ label: c.label, value: c.id })),
    ];
  }, [vm.categories]);

  useEffect(() => {
    return () => {
      filterAnimationIdRef.current += 1;
      filterAnimationRef.current?.stop();
      filterAnimationRef.current = null;
      filterTransitionLockRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;

    return () => {
      publishNativeTabScrollBehavior('onScrollDown');
    };
  }, []);

  const navigate = useCallback(
    (routeName: string, params?: object) => {
      if (navigation) {
        const screenNavigation = navigation as unknown as {
          navigate: (name: string, params?: object) => void;
        };
        screenNavigation.navigate(routeName, params);
        return;
      }
      if (!navigationRef.isReady()) return;
      const rootNavigation = navigationRef as unknown as {
        navigate: (name: string, params?: object) => void;
      };
      rootNavigation.navigate(routeName, params);
    },
    [navigation],
  );

  const openReelsOverlay = useCallback(() => {
    if (navigation) {
      navigateToReels(navigation as any, { source: 'home' });
      return;
    }
    if (!navigationRef.isReady()) return;
    navigateToReels(navigationRef as any, { source: 'home' });
  }, [navigation]);

  const goBack = useCallback(() => {
    if (navigation) {
      const screenNavigation = navigation as unknown as {
        goBack: () => void;
      };
      screenNavigation.goBack();
      return;
    }
    if (!navigationRef.isReady()) return;
    if (navigationRef.canGoBack()) {
      navigationRef.goBack();
      return;
    }
    const rootNavigation = navigationRef as unknown as {
      navigate: (name: string) => void;
    };
    rootNavigation.navigate(ROUTES.MAIN_TABS);
  }, [navigation]);

  const handleMyProducts = useCallback(() => {
    navigate(ROUTES.MY_PRODUCTS);
  }, [navigate]);

  const handleOpenFeed = useCallback(
    (params?: { filter?: 'photos' }) => {
      navigate(ROUTES.MAIN_TABS, {
        screen: ROUTES.FEED,
        params,
      });
    },
    [navigate],
  );

  const animateFiltersCollapsed = useCallback(
    (collapsed: boolean) => {
      // The panel changes the list's viewport height. Ignore a second toggle
      // while that layout transition is still settling; otherwise the
      // resulting contentOffset correction can look like a reverse swipe and
      // make the search/filter bar oscillate when the user scrolls slowly.
      if (
        filtersCollapsedRef.current === collapsed ||
        filterTransitionLockRef.current
      ) {
        return;
      }

      filterTransitionLockRef.current = true;
      const animationId = ++filterAnimationIdRef.current;
      filtersCollapsedRef.current = collapsed;
      setFiltersCollapsed(collapsed);
      filterAnimationRef.current?.stop();
      filterAnimationRef.current = Animated.timing(filterPanelProgress, {
        toValue: collapsed ? 1 : 0,
        duration: collapsed ? 150 : 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      });
      filterAnimationRef.current.start(() => {
        if (filterAnimationIdRef.current !== animationId) return;
        filterAnimationRef.current = null;
        // Let the final native layout/contentOffset correction settle before
        // accepting another scroll-driven transition.
        requestAnimationFrame(() => {
          if (filterAnimationIdRef.current !== animationId) return;
          lastScrollYRef.current = latestScrollYRef.current;
          filterTransitionLockRef.current = false;
        });
      });
    },
    [filterPanelProgress],
  );

  const handleProductPress = useCallback(
    (product: ProductItem) => {
      navigate(ROUTES.PRODUCT_DETAIL, {
        productId: product.id,
        product,
      });
    },
    [navigate],
  );

 // Open a chat thread with the product seller. Mirrors the handler
  // in ProductDetailScreen so behaviour stays consistent across the
  // marketplace list and the detail screen.
  const handleContactSeller = useCallback(
    (product: ProductItem) => {
    const seller = product.seller;
    if (!seller?.user_id) return;
    navigate(ROUTES.CHAT, {
    chat: {
    id: String(seller.user_id),
    chatId: String(seller.user_id),
    chatType: 'user',
    participantId: String(seller.user_id),
    userId: String(seller.user_id),
    username: seller.username || "",
    name: seller.name || "",
    avatar: seller.avatar || "",
    lastMessage: "",
    lastMessageTime: 0,
    unreadCount: 0,
    isOnline: false,
    isVerified: false,
    },
    product,
    });
    },
    [navigate],
  );

  const ensureProductInCart = useCallback(
    async (product: ProductItem) => {
      if (!product.can_add_to_cart || orderingProductId !== null) return;
      setOrderingProductId(product.id);
      try {
        const result = await marketplaceOrderRepository.ensureProductInCart(
          product.id,
        );
        setSyncedCartCount(result.count, result.type === 'added' ? 1 : 0);
        navigate(ROUTES.CHECKOUT, {
          selectedProductIds: [product.id],
        });
      } catch (error) {
        showSnackbar({
          type: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Không thể mở màn đặt hàng cho sản phẩm này.',
        });
      } finally {
        setOrderingProductId(null);
      }
    },
    [navigate, orderingProductId],
  );


  const renderProduct = useCallback(
    ({ item }: ListRenderItemInfo<ProductItem>) => (
      <View className="w-[48%]">
        <ProductPostCard
          compact
          marketplaceFloatingActions
          product={item}
          distanceLimitKm={vm.distanceFilterError ? undefined : vm.distance}
          onPress={handleProductPress}
          onContactSeller={handleContactSeller}
          onOrderRequest={ensureProductInCart}
          isOrderRequesting={orderingProductId === item.id}
        />
      </View>
    ),
    [
      ensureProductInCart,
      handleProductPress,
      handleContactSeller,
      orderingProductId,
      vm.distance,
      vm.distanceFilterError,
    ],
  );
 
  const handleMarketplaceScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const lastY = lastScrollYRef.current;
      const delta = y - lastY;
      lastScrollYRef.current = y;
      latestScrollYRef.current = y;

      // Header height animation can produce synthetic offset corrections.
      // Keep tracking the offset, but do not interpret those corrections as
      // an opposite user swipe until the transition has settled.
      if (filterTransitionLockRef.current) return;

      if (
        !filtersCollapsedRef.current &&
        delta > 4 &&
        y > FILTER_COLLAPSE_THRESHOLD
      ) {
        animateFiltersCollapsed(true);
      } else if (
        filtersCollapsedRef.current &&
        delta < -6 &&
        y < FILTER_EXPAND_THRESHOLD
      ) {
        animateFiltersCollapsed(false);
      }

      if (Platform.OS === 'ios') {
        publishNativeTabScrollIntent(
          nativeTabScrollPublisherStateRef,
          y,
        );
      }
    },
    [animateFiltersCollapsed],
  );

  const collapsedBar = (
    <View className="px-4 pb-2 pt-1">
      <View className="surface-panel flex-row items-center gap-2 p-2 rounded-2xl border border-slate-100/80 bg-white shadow-sm shadow-slate-100/40">
        <View className="input-shell flex-1 flex-row items-center px-3 bg-slate-50 border border-slate-100 rounded-2xl">
          <Search size={16} color="#64748B" />
          <TextInput
            className="ml-2 min-h-[38px] flex-1 text-body-primary text-sm font-medium"
            placeholder="Tìm sản phẩm ..."
            placeholderTextColor="#94A3B8"
            value={vm.keyword}
            onChangeText={vm.setKeyword}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {vm.keyword ? (
            <TouchableOpacity
              className="h-6 w-6 items-center justify-center rounded-full bg-slate-200/50"
              activeOpacity={0.8}
              onPress={() => vm.setKeyword('')}
            >
              <X size={12} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          className={`h-10 w-10 items-center justify-center rounded-2xl border ${
            hasActiveFilters
              ? 'border-red-200 bg-red-50/60'
              : 'border-slate-200/50 bg-slate-50/50 opacity-40'
          }`}
          activeOpacity={0.8}
          disabled={!hasActiveFilters}
          onPress={vm.resetFilters}
          hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
        >
          <RotateCcw size={16} color={hasActiveFilters ? '#EF4444' : '#64748B'} />
        </TouchableOpacity>
        <TouchableOpacity
          className="h-10 px-3.5 flex-row items-center justify-center rounded-2xl bg-brand gap-1.5 shadow-sm shadow-brand-border"
          activeOpacity={0.85}
          onPress={() => animateFiltersCollapsed(false)}
          hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
        >
          <SlidersHorizontal size={15} color="#FFFFFF" />
          <Text className="text-caption-primary font-bold text-white text-xs">Bộ lọc</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const fullBar = (
    <View className="px-4 pb-2 pt-2">
      <View className="surface-panel gap-2.5 p-3.5 rounded-2xl border border-slate-100/80 bg-white shadow-sm shadow-slate-100/40">
        {/* Row 1: Search Input */}
        <View className="input-shell flex-row items-center px-4 bg-slate-50 border border-slate-100 rounded-2xl">
          <Search size={18} color="#64748B" />
          <TextInput
            className="ml-2.5 min-h-[46px] flex-1 text-body-primary text-sm font-medium"
            placeholder="Tìm sản phẩm, địa điểm..."
            placeholderTextColor="#94A3B8"
            value={vm.keyword}
            onChangeText={vm.setKeyword}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {vm.keyword ? (
            <TouchableOpacity
              className="h-7 w-7 items-center justify-center rounded-full bg-slate-200/50"
              activeOpacity={0.8}
              hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
              onPress={() => vm.setKeyword('')}
            >
              <X size={14} color="#64748B" />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            className={`ml-2 h-8 w-8 items-center justify-center rounded-full ${
              hasActiveFilters ? 'bg-red-50' : 'bg-slate-200/40 opacity-40'
            }`}
            activeOpacity={0.8}
            disabled={!hasActiveFilters}
            hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
            onPress={vm.resetFilters}
          >
            <RotateCcw size={15} color={hasActiveFilters ? '#EF4444' : '#64748B'} />
          </TouchableOpacity>
        </View>

        {/* Row 2: Sort and Category Dropdowns */}
        <View className="flex-row gap-2.5">
          <TouchableOpacity
            className={`flex-1 flex-row items-center justify-between rounded-2xl border px-3.5 py-3 ${
              vm.orderBy !== undefined
                ? 'border-brand-border bg-brand-subtle'
                : 'border-slate-200/50 bg-slate-50/50'
            }`}
            activeOpacity={0.8}
            onPress={() => setSortModalVisible(true)}
          >
            <Text
              className={`text-sm font-semibold flex-1 mr-1 ${
                vm.orderBy !== undefined ? 'text-brand' : 'text-slate-700'
              }`}
              numberOfLines={1}
            >
              {currentSortLabel}
            </Text>
            <ChevronDown size={14} color={vm.orderBy !== undefined ? APP_BRAND_COLOR : '#64748B'} />
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 flex-row items-center justify-between rounded-2xl border px-3.5 py-3 ${
              vm.categoryId !== undefined
                ? 'border-brand-border bg-brand-subtle'
                : 'border-slate-200/50 bg-slate-50/50'
            }`}
            activeOpacity={0.8}
            onPress={() => setCategoryModalVisible(true)}
          >
            <Text
              className={`text-sm font-semibold flex-1 mr-1 ${
                vm.categoryId !== undefined ? 'text-brand' : 'text-slate-700'
              }`}
              numberOfLines={1}
            >
              {currentCategoryLabel}
            </Text>
            <ChevronDown size={14} color={vm.categoryId !== undefined ? APP_BRAND_COLOR : '#64748B'} />
          </TouchableOpacity>
        </View>

        {/* Row 3: Distance and nearby products in one line. */}
        <View className="flex-row gap-2.5">
          <TouchableOpacity
            className={`min-h-[62px] flex-1 flex-row items-center justify-between rounded-2xl border px-3 py-2.5 ${
              vm.distance !== undefined
                ? 'border-brand-border bg-brand-subtle'
                : 'border-slate-200/50 bg-slate-50/50'
            }`}
            activeOpacity={0.8}
            onPress={() => setDistanceModalVisible(true)}
          >
            <View className="mr-1 flex-1 flex-row items-center gap-2">
              <MapPin size={15} color={vm.distance !== undefined ? APP_BRAND_COLOR : '#64748B'} />
              <Text
                className={`flex-1 text-[13px] font-semibold ${
                  vm.distance !== undefined ? 'text-brand' : 'text-slate-700'
                }`}
                numberOfLines={2}
              >
                {currentDistanceLabel}
              </Text>
            </View>
            <ChevronDown size={14} color={vm.distance !== undefined ? APP_BRAND_COLOR : '#64748B'} />
          </TouchableOpacity>

          <TouchableOpacity
            className={`min-h-[62px] flex-1 flex-row items-center rounded-2xl border px-3 py-2.5 ${
              nearbyProductsActive
                ? 'border-brand bg-brand-subtle'
                : 'border-brand/20 bg-brand/5'
            }`}
            activeOpacity={0.8}
            onPress={handleNearbyStoresToggle}
            accessibilityRole="button"
            accessibilityState={{ selected: nearbyProductsActive }}
          >
            <Compass size={16} color={nearbyProductsActive ? APP_BRAND_COLOR : APP_BRAND_COLOR} />
            <View className="ml-2 flex-1">
              <Text className="text-[13px] font-bold text-brand" numberOfLines={1}>
                Cửa hàng lân cận
              </Text>
              <Text
                className={`mt-0.5 text-[10px] font-semibold ${
                  vm.distanceFilterError ? 'text-red-500' : 'text-slate-500'
                }`}
                numberOfLines={1}
              >
                {vm.distanceFilterError ?? vm.distanceFilterStatus ?? (nearbyProductsActive ? 'Đang hiển thị' : 'Xem sản phẩm')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const marketplaceTopTabs = (
    <View className="bg-white px-4 pb-2 pt-1">
      <View className="min-h-[50px] flex-row items-center justify-around rounded-[16px] border border-[#e3e8f2] bg-white px-4 shadow-sm">
        {/* Tất cả */}
        <TouchableOpacity
          className="h-10 flex-1 items-center justify-center"
          activeOpacity={0.75}
          onPress={() => handleOpenFeed()}
        >
          <Compass
            size={24}
            color="#9ca3af"
            strokeWidth={2.0}
          />
        </TouchableOpacity>

        <View className="h-7 w-px bg-[#dfe4ef]" />

        {/* Bản đồ địa chỉ */}
        <TouchableOpacity
          className="h-10 flex-1 items-center justify-center"
          activeOpacity={0.75}
          onPress={() => navigate(ROUTES.NEARBY_USERS)}
        >
          <MapPin
            size={24}
            color="#9ca3af"
            strokeWidth={2.0}
          />
        </TouchableOpacity>

        <View className="h-7 w-px bg-[#dfe4ef]" />

        {/* Ảnh */}
        <TouchableOpacity
          className="h-10 flex-1 items-center justify-center"
          activeOpacity={0.75}
          onPress={() => {
            handleOpenFeed({ filter: 'photos' });
          }}
        >
          <ImageIcon
            size={24}
            color="#9ca3af"
            strokeWidth={2.0}
          />
        </TouchableOpacity>

        <View className="h-7 w-px bg-[#dfe4ef]" />

        {/* Video */}
        <TouchableOpacity
          className="h-10 flex-1 items-center justify-center"
          activeOpacity={0.75}
          onPress={openReelsOverlay}
        >
          <Video
            size={24}
            color="#9ca3af"
            strokeWidth={2.0}
          />
        </TouchableOpacity>

        <View className="h-7 w-px bg-[#dfe4ef]" />

        {/* Thị trường */}
        <View className="h-10 flex-1 items-center justify-center">
          <ShoppingBag
            size={24}
            color={APP_BRAND_COLOR}
            strokeWidth={2.5}
          />
        </View>
      </View>
    </View>
  );

  const marketplaceHeader = (
    <View
      className="bg-white border-b border-slate-100"
      pointerEvents="box-none"
      style={MARKETPLACE_HEADER_ELEVATION_STYLE}
    >
      <View
        className="surface-topbar flex-row items-center px-4 pt-3 pb-2"
        pointerEvents="box-none"
      >
      
        <TouchableOpacity
          className="btn-primary h-10 px-4 items-center justify-center rounded-full"
          activeOpacity={0.9}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 15 }}
          onPress={handleMyProducts}
        >
          <ShoppingBag size={17} color="#FFFFFF" />
          <Text className="text-caption-primary text-inverse">
            Sản phẩm của tôi
          </Text>
        </TouchableOpacity>
      </View>
      {/* Tạm thời comment thanh tab icons ở trên đầu trang Cửa hàng theo yêu cầu */}
      {/* <View pointerEvents="auto">{marketplaceTopTabs}</View> */}
      <Animated.View pointerEvents="box-none" style={filterPanelAnimatedStyle}>
        <Animated.View
          pointerEvents={filtersCollapsed ? 'none' : 'auto'}
          style={[FILTER_PANEL_CHILD_STYLE, fullBarAnimatedStyle]}
        >
          {fullBar}
        </Animated.View>
        <Animated.View
          pointerEvents={filtersCollapsed ? 'auto' : 'none'}
          style={[FILTER_PANEL_CHILD_STYLE, collapsedBarAnimatedStyle]}
        >
          {collapsedBar}
        </Animated.View>
      </Animated.View>
    </View>
  );

  const renderHeaderOutsideList = Platform.OS === 'android';
  const marketplaceListHeaderComponent = renderHeaderOutsideList
    ? null
    : marketplaceHeader;
  const marketplaceStickyHeaderIndices = renderHeaderOutsideList ? undefined : [0];
  const marketplaceListContentStyle = useMemo(
    () =>
      Platform.OS === 'ios'
        ? { paddingBottom: bottomContentPadding }
        : undefined,
    [bottomContentPadding],
  );

  return (
    <SafeAreaView
      className="flex-1 surface-base"
      edges={Platform.OS === 'ios' ? ['top', 'left', 'right'] : ['top']}
    >
      <FocusAwareStatusBar barStyle="dark-content" />
      <FeedHeader />
      {renderHeaderOutsideList ? marketplaceHeader : null}

      <FlatList
        data={vm.products}
        keyExtractor={item => String(item.id)}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={MARKETPLACE_COLUMN_STYLE}
        contentContainerClassName={
          Platform.OS === 'ios' ? 'gap-3 pt-1' : 'gap-3 pb-10 pt-1'
        }
        contentContainerStyle={marketplaceListContentStyle}
        scrollIndicatorInsets={
          Platform.OS === 'ios'
            ? { bottom: scrollIndicatorBottomInset }
            : undefined
        }
        ListHeaderComponent={marketplaceListHeaderComponent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        stickyHeaderIndices={marketplaceStickyHeaderIndices}
        onScroll={handleMarketplaceScroll}
        scrollEventThrottle={16}
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.35}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        updateCellsBatchingPeriod={32}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={vm.isRefreshing}
            onRefresh={vm.reload}
            colors={[APP_BRAND_COLOR]}
            tintColor={APP_BRAND_COLOR}
          />
        }
        ListEmptyComponent={
          vm.isLoading ? (
            <MarketplaceSkeleton />
          ) : (
            <EmptyState
              error={vm.error ?? vm.distanceFilterError ?? vm.distanceFilterStatus}
              onRetry={vm.reload}
            />
          )
        }
        ListFooterComponent={
          vm.isLoadingMore ? (
            <ActivityIndicator className="py-6" size="small" color={APP_BRAND_COLOR} />
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
        error={vm.distanceFilterError ?? vm.distanceFilterStatus}
        onChange={vm.setDistance}
        onClose={() => setDistanceModalVisible(false)}
      />
    </SafeAreaView>
  );
}

export default MarketplaceScreen;
