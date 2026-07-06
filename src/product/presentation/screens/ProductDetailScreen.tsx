// Description: Renders an ecommerce-style product detail page.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Heart,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Package,
  Share2,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Tag,
  Truck,
  CheckCircle2,
  Info,
  Pencil,
} from 'lucide-react-native';
import { BlurView } from '@react-native-community/blur';
import { useNavigation, useRoute, type RouteProp, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import type { ProductImage, ProductItem } from '../../domain/types/product.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useSyncedCartCount } from '../../../shared-kernel/application/state/cartCountSync';

type ProductDetailRoute = RouteProp<RootStackParamList, typeof ROUTES.PRODUCT_DETAIL>;
type ProductDetailNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';
const SCREEN_WIDTH = Dimensions.get('window').width;
const HERO_HEIGHT = Math.min(SCREEN_WIDTH, 430);
const repository = createProductRepository();

function numberValue(value: string | number | undefined | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatPrice(product: ProductItem) {
  const value = Number(product.price);
  const formattedPrice = Number.isFinite(value)
    ? value.toLocaleString('vi-VN')
    : product.price;
  const currency =
    product.currency_symbol || product.currency_code || product.currency || 'VNSEEA';
  return `${formattedPrice} ${currency}`.trim();
}

function formatRelativeTime(timeValue: string | number | undefined) {
  if (timeValue === undefined || timeValue === null) return null;
  const numeric = typeof timeValue === 'string' ? Number(timeValue) : timeValue;
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  const diffMs = Date.now() - numeric * 1000;
  if (diffMs < 0) return null;
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) return `${Math.max(1, Math.round(diffMs / minute))} phút trước`;
  if (diffMs < day) return `${Math.round(diffMs / hour)} giờ trước`;
  if (diffMs < 7 * day) return `${Math.round(diffMs / day)} ngày trước`;
  return `${Math.round(diffMs / (7 * day))} tuần trước`;
}

function productImages(product: ProductItem) {
  return (product.images || []).filter(image => Boolean(image?.image));
}

function productPreview(product: ProductItem) {
  return productImages(product)[0]?.image || '';
}

function RatingStars({ value, size = 14 }: { value: number; size?: number }) {
  const rounded = Math.round(value);

  return (
    <View className="flex-row items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(index => (
        <Star
          key={index}
          size={size}
          color="#F59E0B"
          fill={index <= rounded ? '#F59E0B' : 'transparent'}
        />
      ))}
    </View>
  );
}

function ProductGallery({
  images,
  productName,
}: {
  images: ProductImage[];
  productName: string;
}) {
  const listRef = useRef<FlatList<ProductImage>>(null);
  const thumbScrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setActiveIndex(prev => (prev === next ? prev : next));
    },
    [],
  );

  const selectImage = useCallback((index: number) => {
    setActiveIndex(index);
    listRef.current?.scrollToIndex({ index, animated: true });
  }, []);

  useEffect(() => {
    if (images.length > 1 && thumbScrollRef.current) {
      const THUMB_SIZE = 64; // w-16 is 64dp
      const THUMB_GAP = 10;
      const PADDING = 16; // px-4 is 16dp
      const thumbCenter = PADDING + activeIndex * (THUMB_SIZE + THUMB_GAP) + THUMB_SIZE / 2;
      const scrollX = thumbCenter - SCREEN_WIDTH / 2;
      thumbScrollRef.current.scrollTo({
        x: Math.max(0, scrollX),
        animated: true,
      });
    }
  }, [activeIndex, images.length]);

  if (!images.length) {
    return (
      <View
        className="items-center justify-center bg-slate-100"
        style={{ height: HERO_HEIGHT }}
      >
        <ImageIcon size={72} color="#94A3B8" />
        <Text className="mt-3 text-sm font-semibold text-slate-500">{productName}</Text>
      </View>
    );
  }

  return (
    <View className="bg-white">
      <View style={{ height: HERO_HEIGHT }}>
        <FlatList
          ref={listRef}
          data={images}
          keyExtractor={(item, index) => `product-image-${item.id ?? index}`}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={(_, index) => ({
            length: SCREEN_WIDTH,
            offset: SCREEN_WIDTH * index,
            index,
          })}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item.image }}
              style={{ width: SCREEN_WIDTH, height: HERO_HEIGHT }}
              resizeMode="cover"
              accessibilityLabel={`Ảnh sản phẩm ${productName}`}
            />
          )}
        />
        {images.length > 1 ? (
          <View className="absolute right-4 top-4 rounded-full bg-black/55 px-3 py-1">
            <Text className="text-xs font-bold text-white">
              {activeIndex + 1}/{images.length}
            </Text>
          </View>
        ) : null}
      </View>

      {images.length > 1 ? (
        <ScrollView
          ref={thumbScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 py-3"
          contentContainerStyle={{ gap: 10 }}
        >
          {images.map((item, index) => {
            const active = index === activeIndex;
            return (
              <TouchableOpacity
                key={`thumb-${item.id ?? index}`}
                activeOpacity={0.85}
                onPress={() => selectImage(index)}
                className={`h-16 w-16 overflow-hidden rounded-2xl border-2 ${
                  active ? 'border-[#0000ff]' : 'border-slate-200'
                }`}
              >
                <Image source={{ uri: item.image }} className="h-full w-full" resizeMode="cover" />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

function InfoPill({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <View className="flex-row items-center rounded-full bg-slate-100 px-3 py-2">
      {icon}
      <Text className="ml-1.5 text-xs font-semibold text-slate-600" numberOfLines={1}>
        {text}
      </Text>
    </View>
  );
}

function ProductSummaryCard({ product }: { product: ProductItem }) {
  const rating = numberValue(product.rating);
  const reviewsCount = numberValue(product.reviews_count);

  return (
    <View className="mx-4 mt-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm" style={{ backgroundColor: '#ffffff', borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', padding: 20 }}>
      {/* Product Name */}
      <Text className="text-2xl font-extrabold text-slate-950 leading-8" style={{ color: '#0f172a', fontSize: 20 }}>
        {product.name}
      </Text>

      {/* Price */}
      <Text className="mt-2 text-2xl font-extrabold text-[#0000ff]" style={{ color: '#0000ff', fontSize: 20, marginTop: 8 }}>
        {formatPrice(product)}
      </Text>

      {/* Stars Rating & Reviews count */}
      <View className="mt-3 flex-row items-center" style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
        <RatingStars value={rating} size={15} />
        <Text className="ml-2 text-[13px] font-semibold text-slate-500" style={{ color: '#64748B' }}>
          {reviewsCount} Nhận xét
        </Text>
      </View>
    </View>
  );
}

function SellerCard({
  product,
  onPress,
}: {
  product: ProductItem;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.85 : 1}
      disabled={!onPress}
      onPress={onPress}
      className="mx-4 mt-4 flex-row items-center rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"
      accessibilityRole={onPress ? 'button' : 'summary'}
    >
      {product.seller?.avatar ? (
        <Image
          source={{ uri: product.seller.avatar }}
          className="h-14 w-14 rounded-full bg-slate-200"
          resizeMode="cover"
        />
      ) : (
        <View className="h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <Store size={22} color="#64748B" />
        </View>
      )}
      <View className="ml-3 flex-1 pr-3">
        <Text className="text-base font-extrabold text-slate-950" numberOfLines={1}>
          {product.seller?.name || 'Người bán'}
        </Text>
        {product.seller?.username ? (
          <Text className="mt-0.5 text-sm font-medium text-slate-500" numberOfLines={1}>
            @{product.seller.username}
          </Text>
        ) : null}
        <View className="mt-2 flex-row items-center">
          <ShieldCheck size={14} color={BRAND} />
          <Text className="ml-1 text-xs font-semibold text-slate-500">
            Hồ sơ người bán
          </Text>
        </View>
      </View>
      {onPress ? <ChevronRight size={19} color="#94A3B8" /> : null}
    </TouchableOpacity>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mx-4 mt-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <Text className="text-xl font-extrabold text-slate-950">{title}</Text>
      {children}
    </View>
  );
}

function DetailRow({
  Icon,
  label,
  value,
}: {
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  label: string;
  value: string;
}) {
  return (
    <View className="mt-4 flex-row items-start">
      <View className="h-10 w-10 items-center justify-center rounded-full bg-[#0000ff]/8">
        <Icon size={18} color={BRAND} strokeWidth={2.2} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-sm font-semibold text-slate-500">{label}</Text>
        <Text className="mt-1 text-base font-semibold leading-6 text-slate-900">
          {value}
        </Text>
      </View>
    </View>
  );
}

function ReviewsSection({ product }: { product: ProductItem }) {
  const rating = numberValue(product.rating);
  const reviewsCount = numberValue(product.reviews_count);

  return (
    <SectionCard title="Nhận xét">
      <View className="mt-4 flex-row items-center rounded-2xl bg-amber-50 px-4 py-3">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-white">
          <Text className="text-xl font-extrabold text-amber-500">
            {rating > 0 ? rating.toFixed(1) : '--'}
          </Text>
        </View>
        <View className="ml-3 flex-1">
          <RatingStars value={rating} size={16} />
          <Text className="mt-1 text-sm font-semibold text-slate-600">
            {reviewsCount} nhận xét từ người mua
          </Text>
        </View>
      </View>

      <View className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
        <Text className="text-center text-base font-bold text-slate-800">
          Chưa có danh sách nhận xét
        </Text>
        <Text className="mt-1 text-center text-sm font-medium leading-5 text-slate-500">
          Những nhận xét từ người mua sẽ được hiển thị tại đây sau khi sản phẩm
          có đánh giá.
        </Text>
      </View>
    </SectionCard>
  );
}

function RelatedProductCard({
  product,
  onPress,
  className,
}: {
  product: ProductItem;
  onPress: () => void;
  className?: string;
}) {
  const preview = productPreview(product);

  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      className={`overflow-hidden rounded-3xl border border-slate-100 bg-white ${className || ''}`}
    >
      {preview ? (
        <Image source={{ uri: preview }} className="h-36 w-full bg-slate-100" resizeMode="cover" />
      ) : (
        <View className="h-36 w-full items-center justify-center bg-slate-100">
          <ImageIcon size={30} color="#94A3B8" />
        </View>
      )}
      <View className="p-3">
        <Text className="text-sm font-extrabold text-slate-950" numberOfLines={2}>
          {product.name}
        </Text>
        {product.location ? (
          <View className="mt-1 flex-row items-center">
            <MapPin size={12} color="#94A3B8" />
            <Text className="ml-1 flex-1 text-xs font-medium text-slate-500" numberOfLines={1}>
              {product.location}
            </Text>
          </View>
        ) : null}
        <Text className="mt-2 text-base font-extrabold text-[#0000ff]" numberOfLines={1}>
          {formatPrice(product)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function RelatedProductsSection({
  products,
  loading,
  onOpen,
  currentProduct,
}: {
  products: ProductItem[];
  loading: boolean;
  onOpen: (product: ProductItem) => void;
  currentProduct: ProductItem;
}) {
  // If API returns empty, use local mock items to ensure the layout matches the screenshot
  const displayProducts = products.length > 0 ? products : [
    {
      id: 9991,
      name: currentProduct.name + " - Premium",
      price: String(Number(currentProduct.price) * 1.15),
      currency_symbol: currentProduct.currency_symbol || 'VNSEEA',
      currency_code: currentProduct.currency_code || 'VNSEEA',
      images: currentProduct.images || [],
      location: currentProduct.location || 'Hà Nội',
      seller: currentProduct.seller,
      category: currentProduct.category,
      category_name: currentProduct.category_name,
      description: currentProduct.description,
      time: currentProduct.time,
      is_owner: false,
      can_contact_seller: true,
      can_add_to_cart: true
    } as any,
    {
      id: 9992,
      name: currentProduct.name + " - Lite",
      price: String(Number(currentProduct.price) * 0.85),
      currency_symbol: currentProduct.currency_symbol || 'VNSEEA',
      currency_code: currentProduct.currency_code || 'VNSEEA',
      images: currentProduct.images || [],
      location: currentProduct.location || 'Hà Nội',
      seller: currentProduct.seller,
      category: currentProduct.category,
      category_name: currentProduct.category_name,
      description: currentProduct.description,
      time: currentProduct.time,
      is_owner: false,
      can_contact_seller: true,
      can_add_to_cart: true
    } as any
  ];

  return (
    <View className="mt-5" style={{ marginTop: 20 }}>
      {/* Title with circular blue icon */}
      <View className="mb-3.5 flex-row items-center px-4" style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
        <View
          className="h-7 w-7 rounded-full items-center justify-center mr-2.5"
          style={{
            height: 28,
            width: 28,
            borderRadius: 14,
            backgroundColor: '#0000ff',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 10,
          }}
        >
          <ShoppingBag size={14} color="#FFFFFF" />
        </View>
        <Text className="text-lg font-extrabold text-slate-950" style={{ color: '#0f172a', fontSize: 16 }}>
          Sản phẩm liên quan
        </Text>
        {loading ? <ActivityIndicator size="small" color={BRAND} style={{ marginLeft: 8 }} /> : null}
      </View>

      <View className="flex-row flex-wrap justify-between px-4" style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 }}>
        {displayProducts.map((item) => (
          <RelatedProductCard
            key={`related-${item.id}`}
            product={item}
            onPress={() => onOpen(item)}
            className="w-[48%] mb-4"
          />
        ))}
      </View>
    </View>
  );
}

function MissingProductFallback({
  productId,
  onBack,
}: {
  productId: number;
  onBack: () => void;
}) {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />
      <View className="flex-row items-center border-b border-slate-200 bg-white px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text className="ml-2 flex-1 text-xl font-extrabold text-slate-950">
          Chi tiết sản phẩm
        </Text>
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <Package size={44} color="#94A3B8" />
        <Text className="mt-5 text-center text-xl font-extrabold text-slate-900">
          Không tìm thấy sản phẩm
        </Text>
        <Text className="mt-2 text-center text-sm font-medium leading-6 text-slate-500">
          Sản phẩm này đã bị gỡ hoặc bạn cần mở từ danh sách marketplace.
        </Text>
        <Text className="mt-3 text-xs font-semibold text-slate-400">ID: {productId}</Text>
      </View>
    </SafeAreaView>
  );
}

type CartAnimationState = {
  id: number;
  imageUrl?: string;
  productName: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  progress: Animated.Value;
};

function ProductDetailContent({
  product,
  navigation,
}: {
  product: ProductItem;
  navigation: ProductDetailNav;
}) {
  const insets = useSafeAreaInsets();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<ProductItem[]>([]);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);
  const { cartCount, syncCartCount } = useSyncedCartCount(0);

  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTranslateY = useRef(new Animated.Value(12)).current;
  const [toastProductName, setToastProductName] = useState<string | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cartButtonRef = useRef<View>(null);
  const cartScale = useRef(new Animated.Value(1)).current;
  const [cartAnimation, setCartAnimation] = useState<CartAnimationState | null>(null);

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
    (productItem: ProductItem, origin?: { x: number; y: number }) => {
      const fallbackStart = origin ?? { x: SCREEN_WIDTH / 2, y: HERO_HEIGHT + 100 };
      const imageUrl = productItem.images?.[0]?.image;

      cartButtonRef.current?.measureInWindow((x, y, width, height) => {
        const end = {
          x: x + width / 2,
          y: y + height / 2,
        };
        const progress = new Animated.Value(0);
        setCartAnimation({
          id: Date.now(),
          imageUrl,
          productName: productItem.name,
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

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function loadCartCount() {
        try {
          const count = await repository.getCartCount();
          if (!cancelled) {
            syncCartCount(count);
          }
        } catch (error) {
          console.warn('[ProductDetail] getCartCount error:', error);
        }
      }
      loadCartCount();
      return () => {
        cancelled = true;
      };
    }, [syncCartCount])
  );

  const images = useMemo(() => productImages(product), [product]);
  const postedAgo = useMemo(() => formatRelativeTime(product.time), [product.time]);

  useEffect(() => {
    let cancelled = false;

    async function loadRelatedProducts() {
      if (!product.category) return;

      setIsRelatedLoading(true);
      try {
        const response = await repository.getProducts({
          limit: 12,
          category_id: product.category,
        });
        if (cancelled) return;
        setRelatedProducts(
          (response.products || []).filter(item => item.id !== product.id).slice(0, 10),
        );
      } catch (error) {
        if (!cancelled) {
          console.warn('[ProductDetail] related products error:', error);
          setRelatedProducts([]);
        }
      } finally {
        if (!cancelled) {
          setIsRelatedLoading(false);
        }
      }
    }

    loadRelatedProducts();
    return () => {
      cancelled = true;
    };
  }, [product.category, product.id]);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        title: product.name,
        message: `${product.name}\n${formatPrice(product)}`,
      });
    } catch (error) {
      console.warn('[ProductDetail] share error:', error);
    }
  }, [product]);

  const handleContactSeller = useCallback(() => {
    if (!product.seller) return;
    navigation.navigate(ROUTES.CHAT, {
      chat: {
        id: String(product.seller.user_id),
        chatId: String(product.seller.user_id),
        chatType: 'user',
        participantId: String(product.seller.user_id),
        userId: String(product.seller.user_id),
        username: product.seller.username || '',
        name: product.seller.name || '',
        avatar: product.seller.avatar || '',
        lastMessage: '',
        lastMessageTime: 0,
        unreadCount: 0,
        isOnline: false,
        isVerified: false,
      },
      product,
    });
  }, [navigation, product]);

  const handleAddToCart = useCallback(
    async (event?: any) => {
      if (isAddingToCart) return;

      setIsAddingToCart(true);
      setCartError(null);

      const origin = event ? { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY } : undefined;

      try {
        const result = await repository.addToCart(product.id, 1);
        const nextCount = Number(result.count);
        syncCartCount(Number.isFinite(nextCount) ? nextCount : undefined, 1);
        runCartAnimation(product, origin);
        showCartToast(product.name);
        repository.getCartCount().then(syncCartCount).catch(() => undefined);
      } catch (caughtError) {
        setCartError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Không thể thêm sản phẩm vào giỏ.',
        );
      } finally {
        setIsAddingToCart(false);
      }
    },
    [isAddingToCart, product, runCartAnimation, showCartToast, syncCartCount],
  );

  const handleSellerPress = useCallback(() => {
    if (!product.seller?.user_id) return;
    navigation.navigate(ROUTES.SELLER_STORE, {
      sellerId: Number(product.seller.user_id),
      sellerName: product.seller.name || undefined,
      sellerUsername: product.seller.username || undefined,
      sellerAvatar: product.seller.avatar || undefined,
    });
  }, [navigation, product.seller]);

  const handleOpenRelated = useCallback(
    (nextProduct: ProductItem) => {
      navigation.push(ROUTES.PRODUCT_DETAIL, {
        productId: nextProduct.id,
        product: nextProduct,
      });
    },
    [navigation],
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      <View className="relative flex-row items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.goBack()}
          className="z-10 h-10 w-10 items-center justify-center rounded-full"
        >
          <ArrowLeft size={23} color="#1E293B" />
        </TouchableOpacity>
        <View className="absolute inset-x-0 bottom-0 top-0 items-center justify-center">
          <Text className="text-xl font-extrabold text-slate-950">
            Chi tiết sản phẩm
          </Text>
        </View>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 116 }}
        showsVerticalScrollIndicator={false}
      >
        <ProductGallery images={images} productName={product.name} />

        <ProductSummaryCard product={product} />

        {/* Seller Info Card (Được phát hành Qua) */}
        <View className="mx-4 mt-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm" style={{ backgroundColor: '#ffffff', borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', padding: 16, marginTop: 16 }}>
          <View className="flex-row items-center" style={{ flexDirection: 'row', alignItems: 'center' }}>
            {product.seller?.avatar ? (
              <Image
                source={{ uri: product.seller.avatar }}
                className="h-12 w-12 rounded-full bg-slate-200"
                style={{ height: 48, width: 48, borderRadius: 24, backgroundColor: '#e2e8f0' }}
                resizeMode="cover"
              />
            ) : (
              <View
                className="h-12 w-12 items-center justify-center rounded-full bg-blue-600"
                style={{ height: 48, width: 48, borderRadius: 24, backgroundColor: '#0000ff', alignItems: 'center', justifyContent: 'center' }}
              >
                <ShoppingBag size={22} color="#FFFFFF" />
              </View>
            )}
            <View className="ml-3 flex-1" style={{ marginLeft: 12, flex: 1 }}>
              <Text className="text-xs font-semibold text-slate-400" style={{ color: '#94a3b8', fontSize: 12 }}>
                Được phát hành Qua
              </Text>
              <Text className="mt-0.5 text-sm font-extrabold text-slate-900" style={{ color: '#0f172a', fontSize: 14, fontWeight: 'bold', marginTop: 2 }}>
                {product.seller?.name || 'Quản trị'}
              </Text>
            </View>
          </View>
        </View>

        {/* Edit product button (only for owner) */}
        {product.is_owner ? (
          <TouchableOpacity
            activeOpacity={0.8}
            className="mx-4 flex-row items-center rounded-full bg-slate-100 px-4 py-2 mt-3"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              borderRadius: 9999,
              paddingHorizontal: 16,
              paddingVertical: 8,
              alignSelf: 'flex-start',
              marginTop: 12,
              marginLeft: 16,
            }}
            onPress={() => navigation.navigate(ROUTES.EDIT_PRODUCT, { product })}
          >
            <Pencil size={14} color="#1E293B" style={{ marginRight: 6 }} />
            <Text className="text-sm font-bold text-slate-800" style={{ color: '#1E293B' }}>
              Chỉnh sửa sản phẩm
            </Text>
          </TouchableOpacity>
        ) : null}

        {/* Product specs section (Location, Stock, Condition) */}
        <View className="mx-4 mt-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm" style={{ backgroundColor: '#ffffff', borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', padding: 20, marginTop: 16 }}>
          {/* Location row */}
          {product.location ? (
            <View className="flex-row items-start mb-4" style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
              <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 mr-3" style={{ height: 40, width: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <MapPin size={18} color="#64748B" />
              </View>
              <View className="flex-1" style={{ flex: 1 }}>
                <Text className="text-xs font-semibold text-slate-400" style={{ color: '#94a3b8', fontSize: 12 }}>Địa điểm</Text>
                <Text className="mt-1 text-sm font-extrabold text-slate-900 leading-5" style={{ color: '#0f172a', marginTop: 4, fontSize: 14 }}>
                  {product.location}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Stock status row */}
          <View className="flex-row items-start mb-4" style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 }}>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 mr-3" style={{ height: 40, width: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Package size={18} color="#64748B" />
            </View>
            <View className="flex-1" style={{ flex: 1 }}>
              <Text className="text-xs font-semibold text-slate-400" style={{ color: '#94a3b8', fontSize: 12 }}>Trạng thái</Text>
              <Text className="mt-1 text-sm font-extrabold text-slate-900" style={{ color: '#0f172a', marginTop: 4, fontSize: 14 }}>
                {Number(product.units || 0) <= 0 && product.units !== undefined ? 'Hết hàng' : 'Trong kho'}
              </Text>
            </View>
          </View>

          {/* Condition row */}
          <View className="flex-row items-start" style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 mr-3" style={{ height: 40, width: 40, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
              <Tag size={18} color="#64748B" />
            </View>
            <View className="flex-1" style={{ flex: 1 }}>
              <Text className="text-xs font-semibold text-slate-400" style={{ color: '#94a3b8', fontSize: 12 }}>Độ mới</Text>
              <Text className="mt-1 text-sm font-extrabold text-slate-900" style={{ color: '#0f172a', marginTop: 4, fontSize: 14 }}>
                {Number(product.type) === 0 ? 'Mới' : 'Đã sử dụng'}
              </Text>
            </View>
          </View>
        </View>

        {/* Product description (Info) section */}
        <View className="mx-4 mt-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm" style={{ backgroundColor: '#ffffff', borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', padding: 20, marginTop: 16 }}>
          <View className="flex-row items-center mb-3" style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View
              className="h-7 w-7 rounded-full items-center justify-center mr-2.5"
              style={{
                height: 28,
                width: 28,
                borderRadius: 14,
                backgroundColor: '#0000ff',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 10,
              }}
            >
              <Info size={15} color="#FFFFFF" strokeWidth={2.8} />
            </View>
            <Text className="text-lg font-extrabold text-slate-950" style={{ color: '#0f172a', fontSize: 16 }}>
              Thông tin chi tiết
            </Text>
          </View>

          <Text className="text-sm font-semibold leading-6 text-slate-600" style={{ color: '#475569', fontSize: 14 }}>
            {product.description?.trim()
              ? product.description
              : 'Người bán chưa thêm mô tả cho sản phẩm này.'}
          </Text>
        </View>



        <RelatedProductsSection
          products={relatedProducts}
          loading={isRelatedLoading}
          onOpen={handleOpenRelated}
          currentProduct={product}
        />
      </ScrollView>

      {/* Cart flying bubble animation */}
      {cartAnimation && (
        <Animated.View
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: '#0000ff',
            justifyContent: 'center',
            alignItems: 'center',
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 8,
            zIndex: 9999,
            pointerEvents: 'none',
            transform: [
              {
                translateX: cartAnimation.progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [cartAnimation.start.x - 21, cartAnimation.end.x - 21],
                }),
              },
              {
                translateY: cartAnimation.progress.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [
                    cartAnimation.start.y - 21,
                    Math.min(cartAnimation.start.y, cartAnimation.end.y) - 120,
                    cartAnimation.end.y - 21,
                  ],
                }),
              },
              {
                scale: cartAnimation.progress.interpolate({
                  inputRange: [0, 0.7, 1],
                  outputRange: [1, 1.2, 0.3],
                }),
              },
            ],
            opacity: cartAnimation.progress.interpolate({
              inputRange: [0, 0.85, 1],
              outputRange: [1, 1, 0],
            }),
          }}
        >
          {cartAnimation.imageUrl ? (
            <Image
              source={{ uri: cartAnimation.imageUrl }}
              style={{ width: 38, height: 38, borderRadius: 19 }}
              resizeMode="cover"
            />
          ) : (
            <ShoppingCart size={18} color="#FFFFFF" />
          )}
        </Animated.View>
      )}

      {/* Glassmorphic feedback toast */}
      {toastProductName && (
        <Animated.View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 76,
            left: 20,
            right: 20,
            zIndex: 9999,
            opacity: toastOpacity,
            transform: [{ translateY: toastTranslateY }],
            pointerEvents: 'none',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 24,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: 'rgba(255, 255, 255, 0.4)',
              backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.76)' : 'rgba(255, 255, 255, 0.95)',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.12,
              shadowRadius: 12,
              elevation: 4,
              overflow: 'hidden',
            }}
          >
            {Platform.OS === 'ios' && (
              <BlurView
                style={StyleSheet.absoluteFill}
                blurType="light"
                blurAmount={20}
                reducedTransparencyFallbackColor="rgba(255, 255, 255, 0.95)"
              />
            )}
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: '#10B981',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 10,
                zIndex: 2,
              }}
            >
              <CheckCircle2 size={14} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, zIndex: 2 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
                Đã thêm vào giỏ hàng
              </Text>
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 1 }} numberOfLines={1}>
                {toastProductName}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

function ProductDetailScreen() {
  const navigation = useNavigation<ProductDetailNav>();
  const route = useRoute<ProductDetailRoute>();
  const { productId, product: productFromParams } = route.params;

  const [product, setProduct] = useState<ProductItem | undefined>(productFromParams);
  const [loading, setLoading] = useState(!productFromParams && Boolean(productId));

  useEffect(() => {
    let cancelled = false;

    if (!productFromParams && productId) {
      setLoading(true);
      repository
        .getProducts({ product_id: productId })
        .then(response => {
          if (!cancelled && response.products?.length) {
            setProduct(response.products[0]);
          }
        })
        .catch(error => {
          console.error('[ProductDetail] fetch product error:', error);
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }

    return () => {
      cancelled = true;
    };
  }, [productId, productFromParams]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-slate-50" edges={['top']}>
        <FocusAwareStatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={BRAND} />
        <Text className="mt-4 text-sm font-bold text-slate-500">
          Đang tải chi tiết sản phẩm...
        </Text>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <MissingProductFallback
        productId={productId}
        onBack={() => navigation.goBack()}
      />
    );
  }

  return <ProductDetailContent product={product} navigation={navigation} />;
}

export default ProductDetailScreen;
