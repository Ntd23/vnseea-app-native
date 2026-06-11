// Description: Product detail screen — shows full info for a single product.
// Receives the product object via route param (so the user lands on the
// detail page instantly without an extra fetch). If the object is missing
// (deep-link scenario), a minimal placeholder is rendered with an error
// state — fetching by id would require a new backend endpoint, which is
// intentionally out of scope for this iteration.
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  ScrollView,
  StatusBar,
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
  X,
} from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { ProductItem } from '../../domain/types/product.types';

type ProductDetailRoute = RouteProp<RootStackParamList, typeof ROUTES.PRODUCT_DETAIL>;
type ProductDetailNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';
const SCREEN_WIDTH = Dimensions.get('window').width;

// ────────────────────────────────────────────────────────────────────────
// Price formatter — mirrors MarketplaceScreen.formatPrice so the two
// surfaces stay visually consistent.
// ────────────────────────────────────────────────────────────────────────
function formatPrice(product: ProductItem) {
  const value = Number(product.price);
  const formattedPrice = Number.isFinite(value)
    ? value.toLocaleString('vi-VN')
    : product.price;
  const currency =
    product.currency_symbol || product.currency_code || product.currency || 'đ';
  return `${formattedPrice} ${currency}`;
}

/**
 * Format the WoWonder `time` (unix seconds) into a relative Vietnamese
 * label. Returns null if the value is missing or unparseable.
 */
function formatRelativeTime(timeValue: string | number | undefined): string | null {
  if (timeValue === undefined || timeValue === null) return null;
  const numeric = typeof timeValue === 'string' ? Number(timeValue) : timeValue;
  if (!Number.isFinite(numeric) || numeric <= 0) return null;

  const timestampMs = numeric * 1000;
  const diffMs = Date.now() - timestampMs;
  if (diffMs < 0) return null;

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.round(diffMs / minute));
    return `${minutes} phút trước`;
  }
  if (diffMs < day) {
    return `${Math.round(diffMs / hour)} giờ trước`;
  }
  if (diffMs < 7 * day) {
    return `${Math.round(diffMs / day)} ngày trước`;
  }
  return `${Math.round(diffMs / (7 * day))} tuần trước`;
}

// ────────────────────────────────────────────────────────────────────────
// Sub-components — kept inline for this single-screen scope. If a third
// caller ever needs them, lift into src/product/presentation/components/.
// ────────────────────────────────────────────────────────────────────────

function ImageCarousel({ images, productName }: { images: ProductItem['images']; productName: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  // Defensive: backend may have given us zero or one image. Use a
  // consistent placeholder instead of an empty carousel.
  const items = useMemo(() => {
    if (images && images.length > 0) return images;
    return [];
  }, [images]);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(prev => (prev === next ? prev : next));
  }, []);

  if (items.length === 0) {
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
                index === activeIndex
                  ? 'w-5 bg-white'
                  : 'w-1.5 bg-white/55'
              }`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function SellerCard({ product, onPress }: { product: ProductItem; onPress?: () => void }) {
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

function ActionBar({
  product,
  onContact,
  onAddToCart,
  onShare,
  onFavorite,
}: {
  product: ProductItem;
  onContact: () => void;
  onAddToCart?: () => void;
  onShare?: () => void;
  onFavorite?: () => void;
}) {
  const showContact = product.can_contact_seller;
  const showCart = product.can_add_to_cart;

  return (
    <View className="flex-row items-center gap-2">
      {onShare ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onShare}
          className="h-12 w-12 items-center justify-center rounded-full bg-white shadow"
          accessibilityLabel="Chia sẻ sản phẩm"
        >
          <Share2 size={20} color="#475569" />
        </TouchableOpacity>
      ) : null}
      {onFavorite ? (
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onFavorite}
          className="h-12 w-12 items-center justify-center rounded-full bg-white shadow"
          accessibilityLabel="Yêu thích"
        >
          <Heart size={20} color="#475569" />
        </TouchableOpacity>
      ) : null}
      {showContact ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onContact}
          className="btn-secondary h-12 flex-1 flex-row items-center justify-center"
        >
          <MessageCircle size={18} color={BRAND} />
          <Text className="ml-2 text-title-secondary text-brand">
            Liên hệ người bán
          </Text>
        </TouchableOpacity>
      ) : null}
      {showCart ? (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onAddToCart}
          className="btn-primary h-12 flex-1 flex-row items-center justify-center"
        >
          <ShoppingCart size={18} color="#FFFFFF" />
          <Text className="ml-2 text-title-primary text-inverse">
            Thêm vào giỏ
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Main screen
// ────────────────────────────────────────────────────────────────────────

/**
 * Renders when the route param is missing the product object. The detail
 * screen depends on the parent (Marketplace) having already fetched the
 * list — if the user landed here via deep link, there's no way to fetch
 * by id yet (no backend endpoint). Show a clear "not found" state and
 * a back button so the user isn't stuck.
 */
function MissingProductFallback({
  productId,
  onBack,
}: {
  productId: number;
  onBack: () => void;
}) {
  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View className="surface-topbar flex-row items-center px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-full"
          accessibilityLabel="Quay lại"
        >
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text className="ml-2 flex-1 text-heading">Chi tiết sản phẩm</Text>
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <View className="h-20 w-20 items-center justify-center rounded-full bg-[#0000ff]/8">
          <Package size={36} color={BRAND} />
        </View>
        <Text className="mt-5 text-center text-title-primary">
          Không tìm thấy sản phẩm
        </Text>
        <Text className="mt-2 text-center text-body-secondary">
          Sản phẩm này đã bị gỡ hoặc bạn cần mở từ danh sách cửa hàng.
        </Text>
        <Text className="mt-3 text-caption-secondary">ID: {productId}</Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onBack}
          className="btn-primary mt-6 min-h-[44px] px-6"
        >
          <Text className="text-caption-primary text-inverse">Quay lại</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function ProductDetailScreen() {
  const navigation = useNavigation<ProductDetailNav>();
  const route = useRoute<ProductDetailRoute>();
  const { productId, product: productFromParams } = route.params;

  // If the parent passed the full object, use it directly. Otherwise we
  // don't have a way to fetch by id (no backend endpoint for it yet) —
  // render a minimal fallback so the screen never crashes.
  const product: ProductItem | undefined = productFromParams;

  // Early return BEFORE any hooks reference `product` so TS can narrow.
  if (!product) {
    return <MissingProductFallback productId={productId} onBack={() => navigation.goBack()} />;
  }

  const postedAgo = useMemo(
    () => formatRelativeTime(product.time),
    [product.time],
  );

  const handleContactSeller = useCallback(() => {
    if (!product.seller) return;
    // Build a minimal ChatItem and open the existing chat screen. We
    // intentionally reuse the existing messages flow rather than
    // introducing a "contact seller" dedicated screen. The chat screen
    // will load the real conversation on mount.
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

  const handleAddToCart = useCallback(() => {
    // Cart action is not yet wired on this screen. A follow-up will
    // call `market.php` (type=add_cart) via the product repository.
    // For now this is a no-op so the button doesn't crash.
  }, []);

  const handleShare = useCallback(() => {
    // Native share sheet would go here. Out of scope for this iteration.
  }, []);

  const handleFavorite = useCallback(() => {
    // Favorite/like is owned by the social domain; for now we just
    // surface the action without persisting.
  }, []);

  const handleSellerPress = useCallback(() => {
    if (!product.seller?.user_id) return;
    navigation.navigate(ROUTES.PROFILE, {
      userId: String(product.seller.user_id),
    });
  }, [navigation, product]);

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="surface-topbar flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.goBack()}
          className="h-10 w-10 items-center justify-center rounded-full"
          accessibilityLabel="Quay lại"
        >
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-heading">Chi tiết sản phẩm</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={handleShare}
          className="h-10 w-10 items-center justify-center rounded-full"
          accessibilityLabel="Chia sẻ"
        >
          <Share2 size={20} color="#1E293B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-32"
        showsVerticalScrollIndicator={false}
      >
        {/* Image gallery */}
        <ImageCarousel
          images={product.images}
          productName={product.name}
        />

        {/* Title + price block */}
        <View className="surface-card mt-4 px-5 py-5">
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
                  {product.product_sub_category
                    ? ` · ${product.product_sub_category}`
                    : ''}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Description */}
        <View className="surface-card mt-4 px-5 py-5">
          <Text className="text-title-primary">Mô tả sản phẩm</Text>
          <Text className="mt-3 text-body-secondary">
            {product.description && product.description.trim().length > 0
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
                  Số lượng có hạn — đặt sớm để giữ chỗ
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Specs */}
        <View className="surface-card mt-4 px-5 py-2">
          <Text className="mb-2 text-title-primary">Thông tin chi tiết</Text>
          <InfoRow Icon={Tag} label="Danh mục" value={product.category_name || '—'} />
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
          {postedAgo ? (
            <InfoRow Icon={Clock} label="Đăng lúc" value={postedAgo} />
          ) : null}
        </View>

        {/* Seller */}
        <View className="px-1">
          <SellerCard product={product} onPress={handleSellerPress} />
        </View>

        {/* Bottom spacer so the sticky bar doesn't cover content */}
        <View className="h-4" />
      </ScrollView>

      {/* Sticky action bar */}
      <View className="surface-card border-t border-slate-200 px-4 pb-4 pt-3">
        <ActionBar
          product={product}
          onContact={handleContactSeller}
          onAddToCart={product.can_add_to_cart ? handleAddToCart : undefined}
          onShare={handleShare}
          onFavorite={handleFavorite}
        />
      </View>
    </SafeAreaView>
  );
}

export default ProductDetailScreen;
