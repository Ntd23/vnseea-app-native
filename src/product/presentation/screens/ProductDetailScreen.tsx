// Description: Renders product detail and starts marketplace cart checkout.
import React, { useCallback, useMemo, useState } from 'react';
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
  Heart,
  MapPin,
  MessageCircle,
  Package,
  Share2,
  ShoppingCart,
  Star,
  Tag,
  Truck,
} from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import type { ProductItem } from '../../domain/types/product.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type ProductDetailRoute = RouteProp<RootStackParamList, typeof ROUTES.PRODUCT_DETAIL>;
type ProductDetailNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';
const SCREEN_WIDTH = Dimensions.get('window').width;
const repository = createProductRepository();

function formatPrice(product: ProductItem) {
  const value = Number(product.price);
  const formattedPrice = Number.isFinite(value)
    ? value.toLocaleString('vi-VN')
    : product.price;
  const currency =
    product.currency_symbol || product.currency_code || product.currency || 'VNSEEA';
  return `${formattedPrice} ${currency}`;
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

function firstImage(product: ProductItem) {
  return product.images?.[0]?.image || '';
}

function ImageCarousel({
  images,
  productName,
}: {
  images: ProductItem['images'];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const items = useMemo(() => (images?.length ? images : []), [images]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setActiveIndex(prev => (prev === next ? prev : next));
    },
    [],
  );

  if (!items.length) {
    return (
      <View className="aspect-square w-full items-center justify-center bg-slate-200">
        <Package size={80} color="#94a3b8" />
        <Text className="mt-3 text-caption-secondary">{productName}</Text>
      </View>
    );
  }

  return (
    <View>
      <FlatList
        data={items}
        keyExtractor={(item, index) => `image-${item.id ?? index}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item.image }}
            className="aspect-square w-full bg-slate-200"
            resizeMode="cover"
            accessibilityLabel={`Ảnh sản phẩm ${productName}`}
          />
        )}
      />
      {items.length > 1 ? (
        <View
          className="absolute bottom-3 left-0 right-0 flex-row justify-center gap-1.5"
          pointerEvents="none"
        >
          {items.map((item, index) => (
            <View
              key={`dot-${item.id ?? index}`}
              className={`h-1.5 rounded-full ${
                index === activeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/55'
              }`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ProductHeaderCard({ product }: { product: ProductItem }) {
  const preview = firstImage(product);
  const postedAgo = formatRelativeTime(product.time);

  return (
    <View className="surface-card mt-4 px-5 py-5">
      {preview ? (
        <Image
          source={{ uri: preview }}
          className="mb-4 h-20 w-20 rounded-2xl bg-slate-100"
          resizeMode="cover"
        />
      ) : null}
      <Text className="text-display" numberOfLines={3}>
        {product.name}
      </Text>
      <Text className="mt-2 text-display text-brand" numberOfLines={1}>
        {formatPrice(product)}
      </Text>
      <View className="mt-4 flex-row flex-wrap items-center gap-x-3 gap-y-1.5">
        {product.location ? (
          <View className="flex-row items-center">
            <MapPin size={14} color="#64748B" />
            <Text className="ml-1 text-caption-secondary" numberOfLines={1}>
              {product.location}
            </Text>
          </View>
        ) : null}
        {postedAgo ? (
          <View className="flex-row items-center">
            <Clock size={14} color="#64748B" />
            <Text className="ml-1 text-caption-secondary">{postedAgo}</Text>
          </View>
        ) : null}
        {product.category_name ? (
          <View className="flex-row items-center">
            <Tag size={14} color="#64748B" />
            <Text className="ml-1 text-caption-secondary" numberOfLines={1}>
              {product.category_name}
            </Text>
          </View>
        ) : null}
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
      className="surface-card mt-5 flex-row items-center px-4 py-4"
      accessibilityRole={onPress ? 'button' : 'summary'}
    >
      {product.seller?.avatar ? (
        <Image
          source={{ uri: product.seller.avatar }}
          className="avatar-lg bg-slate-200"
          resizeMode="cover"
        />
      ) : (
        <View className="avatar-lg items-center justify-center bg-slate-100">
          <Text className="text-title-primary text-slate-500">
            {(product.seller?.name?.[0] ?? '?').toUpperCase()}
          </Text>
        </View>
      )}
      <View className="ml-3 flex-1 pr-3">
        <Text className="text-title-primary" numberOfLines={1}>
          {product.seller?.name || 'Người bán'}
        </Text>
        {product.seller?.username ? (
          <Text className="mt-0.5 text-caption-secondary" numberOfLines={1}>
            @{product.seller.username}
          </Text>
        ) : null}
        <View className="mt-1.5 flex-row items-center">
          <View className="flex-row items-center rounded-full bg-[#0000ff]/8 px-2 py-0.5">
            <Star size={11} color={BRAND} fill={BRAND} />
            <Text className="ml-1 text-caption-secondary">4.8</Text>
          </View>
          <Text className="ml-2 text-caption-secondary">· Đã bán uy tín</Text>
        </View>
      </View>
      {onPress ? <ChevronRight size={18} color="#94a3b8" /> : null}
    </TouchableOpacity>
  );
}

function InfoRow({
  Icon,
  label,
  value,
}: {
  Icon: React.ComponentType<{ size: number; color: string; strokeWidth?: number }>;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center py-2.5">
      <View className="h-9 w-9 items-center justify-center rounded-full bg-[#0000ff]/8">
        <Icon size={17} color={BRAND} strokeWidth={2.2} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-caption-secondary">{label}</Text>
        <Text className="mt-0.5 text-body-primary" numberOfLines={2}>
          {value}
        </Text>
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
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />
      <View className="surface-topbar flex-row items-center px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text className="ml-2 flex-1 text-heading">Chi tiết sản phẩm</Text>
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <Package size={42} color="#94A3B8" />
        <Text className="mt-5 text-center text-title-primary">
          Không tìm thấy sản phẩm
        </Text>
        <Text className="mt-2 text-center text-body-secondary">
          Sản phẩm này đã bị gỡ hoặc bạn cần mở từ danh sách cửa hàng.
        </Text>
        <Text className="mt-3 text-caption-secondary">ID: {productId}</Text>
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
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  const postedAgo = useMemo(
    () => formatRelativeTime(product.time),
    [product.time],
  );

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
    });
  }, [navigation, product]);

  const handleAddToCart = useCallback(async () => {
    if (isAddingToCart) return;

    setIsAddingToCart(true);
    setCartError(null);
    try {
      await repository.addToCart(product.id, 1);
      navigation.navigate(ROUTES.CHECKOUT);
    } catch (caughtError) {
      setCartError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Không thể thêm sản phẩm vào giỏ.',
      );
    } finally {
      setIsAddingToCart(false);
    }
  }, [isAddingToCart, navigation, product.id]);

  const handleSellerPress = useCallback(() => {
    if (!product.seller?.user_id) return;
    navigation.navigate(ROUTES.PROFILE, {
      userId: String(product.seller.user_id),
    });
  }, [navigation, product]);

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      <View className="surface-topbar flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.goBack()}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-heading">Chi tiết sản phẩm</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <Share2 size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-32"
        showsVerticalScrollIndicator={false}
      >
        <ImageCarousel images={product.images} productName={product.name} />

        <ProductHeaderCard product={product} />

        <View className="surface-card mt-4 px-5 py-5">
          <Text className="text-title-primary">Mô tả sản phẩm</Text>
          <Text className="mt-3 text-body-secondary">
            {product.description?.trim()
              ? product.description
              : 'Người bán chưa thêm mô tả cho sản phẩm này.'}
          </Text>

          {product.units !== undefined && product.units > 0 ? (
            <View className="mt-4 flex-row items-center rounded-2xl border border-[#0000ff]/15 bg-[#0000ff]/5 px-3 py-2.5">
              <View className="h-9 w-9 items-center justify-center rounded-full bg-white">
                <Truck size={17} color={BRAND} strokeWidth={2.2} />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-caption-primary text-brand">
                  Còn {product.units} sản phẩm
                </Text>
                <Text className="mt-0.5 text-caption-secondary">
                  Số lượng có hạn, hãy đặt sớm để giữ chỗ.
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        <View className="surface-card mt-4 px-5 py-2">
          <Text className="mb-2 text-title-primary">Thông tin chi tiết</Text>
          <InfoRow Icon={Tag} label="Danh mục" value={product.category_name || 'Chưa cập nhật'} />
          {product.product_sub_category ? (
            <InfoRow
              Icon={Package}
              label="Danh mục phụ"
              value={product.product_sub_category}
            />
          ) : null}
          <InfoRow
            Icon={MapPin}
            label="Khu vực"
            value={product.location || 'Chưa cập nhật'}
          />
          {postedAgo ? <InfoRow Icon={Clock} label="Đăng lúc" value={postedAgo} /> : null}
        </View>

        <View className="px-1">
          <SellerCard product={product} onPress={handleSellerPress} />
        </View>
      </ScrollView>

      <View className="border-t border-slate-200 bg-white px-3 pb-4 pt-3 shadow">
        {cartError ? (
          <Text className="mb-2 px-1 text-caption-primary text-red-500">
            {cartError}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            activeOpacity={0.85}
            className="h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white"
          >
            <Share2 size={18} color="#475569" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.85}
            className="h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white"
          >
            <Heart size={18} color="#475569" />
          </TouchableOpacity>
          {product.can_contact_seller ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleContactSeller}
              className="btn-secondary h-11 flex-1 flex-row items-center justify-center px-2"
            >
              <MessageCircle size={17} color={BRAND} />
              <Text className="ml-1 text-caption-primary text-brand" numberOfLines={1}>
                Liên hệ
              </Text>
            </TouchableOpacity>
          ) : null}
          {product.can_add_to_cart ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleAddToCart}
              disabled={isAddingToCart}
              className={`btn-primary h-11 flex-1 flex-row items-center justify-center px-3 ${
                isAddingToCart ? 'opacity-70' : ''
              }`}
            >
              {isAddingToCart ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <ShoppingCart size={17} color="#FFFFFF" />
                  <Text
                    className="ml-1.5 text-caption-primary text-inverse"
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.86}
                  >
                    Thêm vào giỏ
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

function ProductDetailScreen() {
  const navigation = useNavigation<ProductDetailNav>();
  const route = useRoute<ProductDetailRoute>();
  const { productId, product: productFromParams } = route.params;

  const product: ProductItem | undefined = productFromParams;

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
