// Description: Renders an ecommerce-style product detail page.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  ScrollView,
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
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Package,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  Tag,
  Truck,
  Info,
  Pencil,
  Share2,
} from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import type { ProductImage, ProductItem } from '../../domain/types/product.types';
import { findRequestedProduct } from '../../application/findRequestedProduct';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import { formatProductPrice } from '../components/ProductCurrency';
import { ProductShareBottomSheet } from '../components/ProductShareBottomSheet';
import { getProductSharePostId } from '../../application/sharing/productPostShare';
import { setSyncedCartCount } from '../../../shared-kernel/application/state/cartCountSync';
import { showSnackbar } from '../../../shared-kernel/presentation/components/Snackbar';

type ProductDetailRoute = RouteProp<RootStackParamList, typeof ROUTES.PRODUCT_DETAIL>;
type ProductDetailNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = APP_BRAND_COLOR;
const SCREEN_WIDTH = Dimensions.get('window').width;
const HERO_HEIGHT = Math.min(SCREEN_WIDTH, 430);
const repository = createProductRepository();
const BUY_ACTION_SHADOW_STYLE = {
  shadowColor: APP_BRAND_COLOR,
  shadowOffset: { width: 0, height: 5 },
  shadowOpacity: 0.25,
  shadowRadius: 10,
  elevation: 5,
} as const;

function numberValue(value: string | number | undefined | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
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
                  active ? 'border-brand' : 'border-slate-200'
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
      <Text className="mt-2 text-2xl font-extrabold text-brand" style={{ color: APP_BRAND_COLOR, fontSize: 20, marginTop: 8 }}>
        {formatProductPrice(product)}
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
      <View className="h-10 w-10 items-center justify-center rounded-full bg-brand/8">
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
        <Text className="mt-2 text-base font-extrabold text-brand" numberOfLines={1}>
          {formatProductPrice(product)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function RelatedProductsSection({
  products,
  loading,
  onOpen,
}: {
  products: ProductItem[];
  loading: boolean;
  onOpen: (product: ProductItem) => void;
}) {
  if (!loading && products.length === 0) return null;

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
            backgroundColor: APP_BRAND_COLOR,
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
        {products.map((item) => (
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
      <FeedHeader />
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

function ProductDetailContent({
  product,
  navigation,
}: {
  product: ProductItem;
  navigation: ProductDetailNav;
}) {
  const insets = useSafeAreaInsets();
  const [relatedProducts, setRelatedProducts] = useState<ProductItem[]>([]);
  const [isRelatedLoading, setIsRelatedLoading] = useState(false);
  const [shareVisible, setShareVisible] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const canShareProduct = Boolean(getProductSharePostId(product));

  const images = useMemo(() => productImages(product), [product]);
  const postedAgo = useMemo(() => formatRelativeTime(product.time), [product.time]);
  const actionBarStyle = useMemo(
    () => ({
      paddingBottom: Math.max(insets.bottom, 12),
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: -6 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 18,
    }),
    [insets.bottom],
  );

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

  const handleContactSeller = useCallback(() => {
    if (!product.can_contact_seller || !product.seller?.user_id) return;
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

  const canContactSeller = Boolean(
    !product.is_owner &&
      product.can_contact_seller &&
      product.seller?.user_id,
  );
  const canBuyProduct = Boolean(!product.is_owner && product.can_add_to_cart);

  const handleBuyProduct = useCallback(async () => {
    if (!canBuyProduct || isBuying) return;

    setIsBuying(true);
    try {
      const result = await repository.ensureProductInCart(product.id);
      setSyncedCartCount(result.count, result.type === 'added' ? 1 : 0);
      navigation.navigate(ROUTES.CHECKOUT, {
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
      setIsBuying(false);
    }
  }, [canBuyProduct, isBuying, navigation, product.id]);

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
      <FeedHeader />

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
        <TouchableOpacity
          activeOpacity={0.82}
          disabled={!canShareProduct}
          onPress={() => setShareVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Chia sẻ sản phẩm"
          className={`z-10 h-10 w-10 items-center justify-center rounded-full ${
            canShareProduct ? 'bg-brand-subtle' : 'bg-slate-100'
          }`}
        >
          <Share2
            size={20}
            color={canShareProduct ? APP_BRAND_COLOR : '#CBD5E1'}
            strokeWidth={2.4}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: product.is_owner ? 32 : 120 + insets.bottom,
        }}
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
                className="h-12 w-12 items-center justify-center rounded-full bg-brand"
                style={{ height: 48, width: 48, borderRadius: 24, backgroundColor: APP_BRAND_COLOR, alignItems: 'center', justifyContent: 'center' }}
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
            accessibilityRole="button"
            accessibilityLabel="Chỉnh sửa sản phẩm"
            className="mx-4 mt-4 flex-row items-center justify-center rounded-2xl bg-brand px-5 py-4"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 54,
              backgroundColor: APP_BRAND_COLOR,
              borderRadius: 16,
              paddingHorizontal: 20,
              paddingVertical: 14,
              marginTop: 16,
              marginHorizontal: 16,
              shadowColor: APP_BRAND_COLOR,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.24,
              shadowRadius: 8,
              elevation: 5,
            }}
            onPress={() => navigation.navigate(ROUTES.EDIT_PRODUCT, { product })}
          >
            <Pencil size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text
              className="ml-2.5 text-base font-extrabold text-white"
              style={{ color: '#FFFFFF', marginLeft: 10, fontSize: 16 }}
            >
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
                backgroundColor: APP_BRAND_COLOR,
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
        />
      </ScrollView>

      {!product.is_owner ? (
        <View
          className="absolute bottom-0 left-0 right-0 border-t border-slate-100 bg-white px-4 pt-3"
          style={actionBarStyle}
        >
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              activeOpacity={0.8}
              disabled={!canContactSeller}
              onPress={handleContactSeller}
              accessibilityRole="button"
              accessibilityLabel="Nhắn tin cho người bán"
              className={`h-14 w-14 items-center justify-center rounded-2xl border ${
                canContactSeller
                  ? 'border-brand-border bg-brand-subtle'
                  : 'border-slate-200 bg-slate-100'
              }`}
            >
              <MessageCircle
                size={22}
                color={canContactSeller ? APP_BRAND_COLOR : '#94A3B8'}
                strokeWidth={2.5}
              />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.86}
              disabled={!canBuyProduct || isBuying}
              onPress={handleBuyProduct}
              accessibilityRole="button"
              accessibilityLabel="Mua sản phẩm"
              accessibilityState={{ disabled: !canBuyProduct, busy: isBuying }}
              className={`h-14 flex-1 flex-row items-center justify-center rounded-2xl px-4 ${
                canBuyProduct ? 'bg-brand' : 'bg-slate-200'
              }`}
              style={canBuyProduct ? BUY_ACTION_SHADOW_STYLE : undefined}
            >
              {isBuying ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text className="ml-2.5 text-sm font-extrabold text-white">
                    Đang xử lý...
                  </Text>
                </>
              ) : (
                <>
                  <View
                    className={`h-9 w-9 items-center justify-center rounded-full ${
                      canBuyProduct ? 'bg-white/15' : 'bg-slate-300'
                    }`}
                  >
                    <ShoppingCart
                      size={20}
                      color={canBuyProduct ? '#FFFFFF' : '#94A3B8'}
                      strokeWidth={2.5}
                    />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text
                      className={`text-sm font-extrabold ${
                        canBuyProduct ? 'text-white' : 'text-slate-500'
                      }`}
                    >
                      {canBuyProduct ? 'Mua ngay' : 'Chưa thể mua'}
                    </Text>
                    {canBuyProduct ? (
                      <Text className="mt-0.5 text-[11px] font-semibold text-white/75">
                        Đến trang thanh toán
                      </Text>
                    ) : null}
                  </View>
                  {canBuyProduct ? (
                    <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
                  ) : null}
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <ProductShareBottomSheet
        visible={shareVisible}
        product={product}
        onClose={() => setShareVisible(false)}
      />

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
    const routedProduct = findRequestedProduct(
      productFromParams ? [productFromParams] : [],
      productId,
    );

    if (productId) {
      setProduct(routedProduct);
      setLoading(!routedProduct);
      repository
        .getProducts({ product_id: productId })
        .then(response => {
          const requestedProduct = findRequestedProduct(
            response.products,
            productId,
          );
          if (!cancelled && requestedProduct) {
            setProduct(requestedProduct);
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
