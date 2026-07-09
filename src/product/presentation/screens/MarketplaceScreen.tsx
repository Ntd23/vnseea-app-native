// Description: Displays Marketplace products with searchable filter controls.
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutAnimation } from 'react-native';
import {
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Image,
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMainTabContentInsets } from '../../../navigation/useMainTabContentInsets';
import { navigationRef } from '../../../navigation/navigationRef';
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
  Compass,
  Video,
  Image as ImageIcon,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import { useMarketplaceViewModel } from '../../application/view-models/useMarketplaceViewModel';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import type { ProductItem } from '../../domain/types/product.types';
import ProductPostCard from '../components/ProductPostCard';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
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

type CartAnimationState = {
  id: number;
  imageUrl?: string;
  productName: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  progress: Animated.Value;
};

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
  const navigation = useContext(NavigationContext);
  const insets = useSafeAreaInsets();
  const {
    bottomContentPadding,
    scrollIndicatorBottomInset,
  } = useMainTabContentInsets();
  const vm = useMarketplaceViewModel();
 // Repository for direct product operations (e.g. quick add-to-cart
 // from the marketplace card).
 const repository = useMemo(() => createProductRepository(), []);
  const nativeTabScrollPublisherStateRef = useRef(
    createNativeTabScrollPublisherState(),
  );
  const cartButtonRef = useRef<View>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(12)).current;
  const cartScale = useRef(new Animated.Value(1)).current;
  const hasActiveFilters = Boolean(vm.categoryId || vm.distance || vm.orderBy);

  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [distanceModalVisible, setDistanceModalVisible] = useState(false);
  const [cartAnimation, setCartAnimation] = useState<CartAnimationState | null>(null);
  const [toastProductName, setToastProductName] = useState<string | null>(null);

 // Collapsible filter panel state. When the user scrolls down past
 // COLLAPSE_THRESHOLD we collapse the filter chip bar (search + sort
 // + category + distance + nearby + reset) and keep only the top app
 // bar plus a compact sticky search/handle bar. Scrolling back up
 // re-expands it.
 const [filtersCollapsed, setFiltersCollapsed] = useState(false);
 const lastScrollYRef = useRef(0);
 const COLLAPSE_THRESHOLD = 120;
  // Collapsible filter panel state. When the user scrolls the product
  // list down we collapse the filter chip bar (search + sort + category
  // + distance + nearby + reset) and keep only the top app bar visible.
  // A small sticky "Search + Bộ lọc" handle stays so the user can
  // either type a query or tap the toggle to expand the panel again.
  

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
  }, [vm]);

  const categoryOptions = useMemo(() => {
    return [
      { label: 'Tất cả thể loại', value: undefined },
      ...vm.categories.map(c => ({ label: c.label, value: c.id })),
    ];
  }, [vm.categories]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
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

  const handleOpenCart = useCallback(() => {
    navigate(ROUTES.CART);
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

  const showCartToast = useCallback(
    (productName: string) => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }

      setToastProductName(productName);
      toastOpacity.setValue(0);
      toastTranslateY.setValue(12);
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(toastTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();

      toastTimeoutRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(toastOpacity, {
            toValue: 0,
            duration: 180,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(toastTranslateY, {
            toValue: 10,
            duration: 180,
            easing: Easing.in(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(() => setToastProductName(null));
      }, 1800);
    },
    [toastOpacity, toastTranslateY],
  );

  const runCartAnimation = useCallback(
    (product: ProductItem, origin?: { x: number; y: number }) => {
      const fallbackStart = origin ?? { x: 96, y: 520 };
      const imageUrl = product.images?.[0]?.image;

      cartButtonRef.current?.measureInWindow((x, y, width, height) => {
        const end = {
          x: x + width / 2,
          y: y + height / 2,
        };
        const progress = new Animated.Value(0);
        setCartAnimation({
          id: Date.now(),
          imageUrl,
          productName: product.name,
          start: fallbackStart,
          end,
          progress,
        });

        Animated.parallel([
          Animated.timing(progress, {
            toValue: 1,
            duration: 680,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(cartScale, {
              toValue: 1.18,
              duration: 120,
              delay: 440,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.spring(cartScale, {
              toValue: 1,
              friction: 4,
              tension: 120,
              useNativeDriver: true,
            }),
          ]),
        ]).start(({ finished }) => {
          if (finished) {
            setCartAnimation(null);
          }
        });
      });
    },
    [cartScale],
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

 // Quick add-to-cart from the marketplace card. It keeps the user on
 // the marketplace, updates the cart badge, then plays a small fly-to-cart
 // animation so the result is visible without breaking shopping flow.
 const handleAddToCart = useCallback(
 async (product: ProductItem, origin?: { x: number; y: number }) => {
 if (!product.can_add_to_cart) return;
 try {
 const result = await repository.addToCart(product.id, 1);
 const nextCount = Number(result.count);
 vm.updateCartCount(Number.isFinite(nextCount) ? nextCount : undefined);
 repository.getCartCount().then(vm.updateCartCount).catch(() => undefined);
 runCartAnimation(product, origin);
 showCartToast(product.name);
 } catch (error) {
 // Silent failure for the marketplace card - the user can
 // always retry from the product detail screen.
 console.warn('[MarketplaceScreen] addToCart failed', error);
 }
 },
 [repository, runCartAnimation, showCartToast, vm],
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


  const renderProduct = useCallback(
    ({ item }: ListRenderItemInfo<ProductItem>) => (
      <View className="w-[48%]">
        <ProductPostCard
          compact
          product={item}
          onPress={handleProductPress}
          onContactSeller={handleContactSeller}

          onAddToCart={handleAddToCart}
        />
      </View>
    ),
    [handleProductPress, handleContactSeller, handleAddToCart],
  );
 
  const handleMarketplaceScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const lastY = lastScrollYRef.current;
      const delta = y - lastY;
      lastScrollYRef.current = y;

      // Collapse the filter chip bar when scrolling DOWN past the
      // threshold; re-expand it when scrolling back UP. We only call
      // LayoutAnimation when the state actually flips so the panel
      // doesn't animate on every frame.
      if (delta > 0 && y > COLLAPSE_THRESHOLD) {
        setFiltersCollapsed(prev => {
          if (prev) return prev;
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          return true;
        });
      } else if (delta < -2 && y < COLLAPSE_THRESHOLD) {
        setFiltersCollapsed(prev => {
          if (!prev) return prev;
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          return false;
        });
      }

      if (Platform.OS === 'ios') {
        publishNativeTabScrollIntent(
          nativeTabScrollPublisherStateRef,
          y,
        );
      }
    },
    [],
  );

  const collapsedBar = (
    <View className="px-4 pb-2 pt-1">
      <View className="surface-panel flex-row items-center gap-2 p-2 rounded-2xl border border-slate-100/80 bg-white shadow-sm shadow-slate-100/40">
        <View className="input-shell flex-1 flex-row items-center px-3 bg-slate-50 border border-slate-100 rounded-2xl">
          <Search size={16} color="#64748B" />
          <TextInput
            className="ml-2 min-h-[38px] flex-1 text-body-primary text-sm font-medium"
            placeholder="Tìm sản phẩm, địa điểm..."
            placeholderTextColor="#94A3B8"
            value={vm.keyword}
            onChangeText={vm.setKeyword}
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
          className="h-10 px-3.5 flex-row items-center justify-center rounded-2xl bg-[#0F56FB] gap-1.5 shadow-sm shadow-blue-200/50"
          activeOpacity={0.85}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setFiltersCollapsed(false);
          }}
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
                ? 'border-blue-200 bg-blue-50/60'
                : 'border-slate-200/50 bg-slate-50/50'
            }`}
            activeOpacity={0.8}
            onPress={() => setSortModalVisible(true)}
          >
            <Text
              className={`text-sm font-semibold flex-1 mr-1 ${
                vm.orderBy !== undefined ? 'text-[#0F56FB]' : 'text-slate-700'
              }`}
              numberOfLines={1}
            >
              {currentSortLabel}
            </Text>
            <ChevronDown size={14} color={vm.orderBy !== undefined ? '#0F56FB' : '#64748B'} />
          </TouchableOpacity>

          <TouchableOpacity
            className={`flex-1 flex-row items-center justify-between rounded-2xl border px-3.5 py-3 ${
              vm.categoryId !== undefined
                ? 'border-blue-200 bg-blue-50/60'
                : 'border-slate-200/50 bg-slate-50/50'
            }`}
            activeOpacity={0.8}
            onPress={() => setCategoryModalVisible(true)}
          >
            <Text
              className={`text-sm font-semibold flex-1 mr-1 ${
                vm.categoryId !== undefined ? 'text-[#0F56FB]' : 'text-slate-700'
              }`}
              numberOfLines={1}
            >
              {currentCategoryLabel}
            </Text>
            <ChevronDown size={14} color={vm.categoryId !== undefined ? '#0F56FB' : '#64748B'} />
          </TouchableOpacity>
        </View>

        {/* Row 3: Distance Dropdown */}
        <TouchableOpacity
          className={`flex-row items-center justify-between rounded-2xl border px-3.5 py-3 ${
            vm.distance !== undefined
              ? 'border-blue-200 bg-blue-50/60'
              : 'border-slate-200/50 bg-slate-50/50'
          }`}
          activeOpacity={0.8}
          onPress={() => setDistanceModalVisible(true)}
        >
          <View className="flex-row items-center gap-2">
            <MapPin size={15} color={vm.distance !== undefined ? '#0F56FB' : '#64748B'} />
            <Text
              className={`text-sm font-semibold ${
                vm.distance !== undefined ? 'text-[#0F56FB]' : 'text-slate-700'
              }`}
            >
              {currentDistanceLabel}
            </Text>
          </View>
          <ChevronDown size={14} color={vm.distance !== undefined ? '#0F56FB' : '#64748B'} />
        </TouchableOpacity>

        {/* Row 4: Nearby stores button and Reset button */}
        <View style={{ display: 'none' }}>
          <TouchableOpacity
            className={`flex-1 h-11 items-center justify-center rounded-2xl flex-row gap-2 shadow-sm ${
              vm.distance === 15
                ? 'bg-[#0F56FB] border border-[#0F56FB] shadow-blue-200/50'
                : 'bg-slate-50 border border-slate-200/50 shadow-slate-100/20'
            }`}
            activeOpacity={0.85}
            onPress={handleNearbyStoresToggle}
          >
            <MapPin size={15} color={vm.distance === 15 ? '#FFFFFF' : '#64748B'} />
            <Text
              className={`font-bold text-sm ${
                vm.distance === 15 ? 'text-white' : 'text-slate-700'
              }`}
            >
              Cửa hàng lân cận (15 km)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={`h-11 w-11 items-center justify-center rounded-2xl border ${
              hasActiveFilters
                ? 'border-red-200 bg-red-50/60'
                : 'border-slate-200/50 bg-slate-50/50 opacity-40'
            }`}
            activeOpacity={0.8}
            disabled={!hasActiveFilters}
            onPress={vm.resetFilters}
          >
            <RotateCcw size={16} color={hasActiveFilters ? '#EF4444' : '#64748B'} />
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
          onPress={() => navigate(ROUTES.REELS)}
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
            color="#0758ff"
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
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          onPress={goBack}
        >
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-heading">Cửa hàng</Text>
        </View>
        <View ref={cartButtonRef} className="mr-2">
          <Animated.View style={{ transform: [{ scale: cartScale }] }}>
            <TouchableOpacity
              className="relative h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white"
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
          </Animated.View>
        </View>
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
      {/* Tạm thời comment thanh tab icons ở trên đầu trang Cửa hàng theo yêu cầu */}
      {/* <View pointerEvents="auto">{marketplaceTopTabs}</View> */}
      <View
        pointerEvents={filtersCollapsed ? 'auto' : 'none'}
        style={filtersCollapsed ? undefined : { display: 'none' }}
      >
        {collapsedBar}
      </View>
      <View
        pointerEvents={filtersCollapsed ? 'none' : 'auto'}
        style={filtersCollapsed ? { display: 'none' } : undefined}
      >
        {fullBar}
      </View>
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
      {cartAnimation ? (
        <Animated.View
          pointerEvents="none"
          className="absolute h-14 w-14 overflow-hidden rounded-2xl border-2 border-white bg-blue-50 shadow-lg"
          style={{
            opacity: cartAnimation.progress.interpolate({
              inputRange: [0, 0.75, 1],
              outputRange: [0.95, 0.9, 0],
            }),
            transform: [
              {
                translateX: cartAnimation.progress.interpolate({
                  inputRange: [0, 0.62, 1],
                  outputRange: [
                    cartAnimation.start.x - 28,
                    (cartAnimation.start.x + cartAnimation.end.x) / 2 - 28,
                    cartAnimation.end.x - 28,
                  ],
                }),
              },
              {
                translateY: cartAnimation.progress.interpolate({
                  inputRange: [0, 0.62, 1],
                  outputRange: [
                    cartAnimation.start.y - 28,
                    Math.min(cartAnimation.start.y, cartAnimation.end.y) - 110,
                    cartAnimation.end.y - 28,
                  ],
                }),
              },
              {
                scale: cartAnimation.progress.interpolate({
                  inputRange: [0, 0.68, 1],
                  outputRange: [1, 0.78, 0.28],
                }),
              },
              {
                rotate: cartAnimation.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '16deg'],
                }),
              },
            ],
          }}
        >
          {cartAnimation.imageUrl ? (
            <Image
              source={{ uri: cartAnimation.imageUrl }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center bg-blue-50">
              <ShoppingBag size={24} color="#0000FF" />
            </View>
          )}
        </Animated.View>
      ) : null}

      {toastProductName ? (
        <Animated.View
          pointerEvents="none"
          className="absolute left-4 right-4 rounded-2xl bg-slate-950/95 px-4 py-3 shadow-lg"
          style={{
            top: Math.max(insets.top, 12) + 74,
            opacity: toastOpacity,
            transform: [{ translateY: toastTranslateY }],
          }}
        >
          <View className="flex-row items-center">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-white/12">
              <ShoppingCart size={18} color="#FFFFFF" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-sm font-extrabold text-white">
                Đã thêm vào giỏ hàng
              </Text>
              <Text
                className="mt-0.5 text-xs font-semibold text-white/75"
                numberOfLines={1}
              >
                {toastProductName}
              </Text>
            </View>
          </View>
        </Animated.View>
      ) : null}

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
