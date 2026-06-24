// Description: Product post card component for the home feed.
// Displays products in Facebook Marketplace-style layout.
import React, { useCallback } from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  MapPin,
  MoreHorizontal,
  ShoppingBag,
  MessageCircle,
  Share2,
  ShoppingCart
} from 'lucide-react-native';
import type { ProductItem } from '../../domain/types/product.types';
import {
  FeedCardContent,
  FeedCardSurface,
  FeedGlassActionBar,
  FeedGlassActionButton,
  FeedMediaFrame,
} from '../../../feed/presentation/components/FeedCardChrome';

// ── Helpers outside component (avoid recreation on each render) ────

function formatPrice(price: string, symbolOrCode: string): string {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return price;
  
  let currency = symbolOrCode;
  if (currency === '0') currency = '$';
  else if (currency === '1') currency = '€';
  else if (currency === 'VNSEEA' || currency === 'vnd') currency = 'VNSEEA';

  const formatted = numPrice.toLocaleString('vi-VN');

  if (currency === 'VNSEEA') {
    return `${formatted} VNSEEA`;
  }
  if (currency === '$' || currency === 'USD') {
    return `$${formatted}`;
  }
  if (currency === '€' || currency === 'EUR') {
    return `€${formatted}`;
  }
  return `${formatted} ${currency}`;
}

function formatTimeAgo(timestamp: number | string): string {
  const numTimestamp = typeof timestamp === 'string' ? parseInt(timestamp, 10) : timestamp;
  if (isNaN(numTimestamp)) return '';
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - numTimestamp);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(numTimestamp * 1000).toLocaleDateString('vi-VN');
}

// ── Memoized ProductPostCard ────────────────────────────────────────────

interface ProductPostCardProps {
  product: ProductItem;
  onPress?: (product: ProductItem) => void;
  onMorePress?: (product: ProductItem) => void;
  /** Navigate to the seller profile (tapped on avatar/header). */
  onProfilePress?: (userId: string) => void;
  /** Open a chat thread with the seller (tapped on Nhắn tin button). */
  onContactSeller?: (product: ProductItem) => void;
  /** Add product to cart (tapped on Thêm giỏ button). */
  onAddToCart?: (product: ProductItem) => void;
  onShare?: (product: ProductItem) => void;
  compact?: boolean;
}

const ProductPostCard = React.memo(function ProductPostCard({
  product,
  onPress,
  onMorePress,
  onProfilePress,
  onContactSeller,
  onAddToCart,
  onShare,
  compact,
}: ProductPostCardProps) {
  const imageUrl = product.images?.[0]?.image;

  const handlePress = useCallback(() => {
    onPress?.(product);
  }, [onPress, product]);

  const handleMorePress = useCallback(() => {
    onMorePress?.(product);
  }, [onMorePress, product]);

  const handleProfilePress = useCallback(() => {
    if (product.seller?.user_id) {
      onProfilePress?.(String(product.seller.user_id));
    }
  }, [onProfilePress, product.seller?.user_id]);

  const handleContactSeller = useCallback(() => {
    if (!product.can_contact_seller || !product.seller?.user_id) return;
    onContactSeller?.(product);
  }, [onContactSeller, product, product.can_contact_seller, product.seller?.user_id]);

  const handleAddToCart = useCallback(() => {
    if (!product.can_add_to_cart) return;
    onAddToCart?.(product);
  }, [onAddToCart, product, product.can_add_to_cart]);

  const handleSharePress = useCallback(() => {
    onShare?.(product);
  }, [onShare, product]);

  const currencySymbol = product.currency_symbol || product.currency_code || product.currency || 'VNSEEA';

  // Compact layout (used inside the horizontal carousel and marketplace grids)
  if (compact) {
    return (
      <TouchableOpacity
        className="surface-card overflow-hidden w-full rounded-2xl border border-slate-100/80 bg-white shadow-sm shadow-slate-100/40"
        activeOpacity={0.9}
        onPress={handlePress}
      >
        {/* Product Image */}
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            className="w-full"
            style={{ aspectRatio: 1.15 }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="w-full items-center justify-center bg-slate-200"
            style={{ aspectRatio: 1.15 }}
          >
            <ShoppingBag size={32} color="#94A3B8" />
          </View>
        )}

        {/* Compact Content */}
        <View className="p-3">
          <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
            {product.name}
          </Text>
          {product.location ? (
            <View className="flex-row items-center mt-1">
              <MapPin size={10.5} color="#94A3B8" />
              <Text className="ml-1 text-[11px] text-slate-400 font-medium" numberOfLines={1}>
                {product.location}
              </Text>
            </View>
          ) : null}

          {/* Price & Action Row */}
          <View className="flex-row items-center justify-between mt-2.5">
            <Text className="text-[15px] font-extrabold text-[#0F56FB] flex-1 mr-1.5" numberOfLines={1}>
              {formatPrice(product.price, currencySymbol)}
            </Text>

            {!product.is_owner ? (
              <View className="flex-row items-center gap-1.5" style={{ flexShrink: 0 }}>
                {/* Cart Action */}
                <TouchableOpacity
                  className={`h-8 w-8 items-center justify-center rounded-full ${
                    product.can_add_to_cart ? 'bg-blue-50/80 active:bg-blue-100/80' : 'bg-slate-50'
                  }`}
                  activeOpacity={0.7}
                  disabled={!product.can_add_to_cart}
                  onPress={handleAddToCart}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <ShoppingCart size={15} color={product.can_add_to_cart ? "#0F56FB" : "#CBD5E1"} />
                </TouchableOpacity>

                {/* Contact Action */}
                <TouchableOpacity
                  className={`h-8 w-8 items-center justify-center rounded-full ${
                    product.can_contact_seller ? 'bg-blue-50/80 active:bg-blue-100/80' : 'bg-slate-50'
                  }`}
                  activeOpacity={0.7}
                  disabled={!product.can_contact_seller}
                  onPress={handleContactSeller}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <MessageCircle size={15} color={product.can_contact_seller ? "#0F56FB" : "#CBD5E1"} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  // Full Feed layout (matches Facebook Post/Video post card design)
  return (
    <FeedCardSurface>
      {/* Header & Product Text - same padding block for vertical alignment */}
      <FeedCardContent className="pb-2">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            className="flex-row items-center flex-1 mr-2"
            activeOpacity={0.8}
            onPress={handleProfilePress}
          >
            {product.seller?.avatar ? (
              <Image
                source={{ uri: product.seller.avatar }}
                className="h-10 w-10 rounded-full"
                resizeMode="cover"
              />
            ) : (
              <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                <ShoppingBag size={20} color="#FFFFFF" />
              </View>
            )}
            <View className="ml-3 flex-1">
              <View className="flex-row items-center flex-wrap">
                <Text className="text-title-primary font-bold text-[#050505] flex-shrink mr-2" numberOfLines={1}>
                  {product.seller?.name || 'Người bán'}
                </Text>
                <View className="bg-blue-50 rounded px-1.5 py-0.5" style={{ flexShrink: 0 }}>
                  <Text className="text-[10px] font-bold uppercase text-[#0866FF]">
                    Sản phẩm
                  </Text>
                </View>
              </View>
              <Text className="text-caption-secondary text-[12px] text-[#65676B] mt-0.5" numberOfLines={1}>
                {product.time ? `${formatTimeAgo(product.time)} • ` : ''}Công khai
              </Text>
            </View>
          </TouchableOpacity>
          {onMorePress && (
            <TouchableOpacity
              onPress={handleMorePress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MoreHorizontal size={22} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {/* Product Title / Description */}
        <View className="mt-3">
          <Text className="text-body-primary font-bold text-[16px] text-[#050505]" numberOfLines={2}>{product.name}</Text>
          {product.description ? (
            <Text className="text-body-primary mt-1 text-[#65676B] text-[13px] leading-relaxed" numberOfLines={3}>
              {product.description}
            </Text>
          ) : null}
        </View>
      </FeedCardContent>

      {/* Product Image */}
      <FeedMediaFrame>
        <TouchableOpacity activeOpacity={0.95} onPress={handlePress}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              className="w-full"
              style={{ aspectRatio: 1.4 }}
              resizeMode="cover"
              fadeDuration={0}
            />
          ) : (
            <View
              className="w-full items-center justify-center bg-slate-200"
              style={{ aspectRatio: 1.4 }}
            >
              <ShoppingBag size={48} color="#94A3B8" />
            </View>
          )}
        </TouchableOpacity>
      </FeedMediaFrame>

      {/* Product Footer Actions */}
      <FeedCardContent className="pt-3">
        {/* Price & Location Summary */}
        <View className="flex-row items-center justify-between border-b border-[#F0F2F5] pb-3.5 mb-3">
          <Text className="text-heading text-[18px] font-bold text-[#1877F2] flex-shrink mr-4" numberOfLines={1}>
            {formatPrice(product.price, currencySymbol)}
          </Text>
          {product.location ? (
            <View className="flex-row items-center flex-1 justify-end ml-2">
              <MapPin size={14} color="#65676B" style={{ flexShrink: 0 }} />
              <Text className="ml-1 text-[13px] text-[#65676B] flex-shrink" numberOfLines={1}>
                {product.location}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Facebook-style Action Buttons (prevent overlapping/wrapping issues) */}
        <FeedGlassActionBar className="border-t-0 pt-1">
          <FeedGlassActionButton
            className="flex-1 flex-row items-center justify-center py-1.5 px-1"
            activeOpacity={0.75}
            onPress={handlePress}
          >
            <ShoppingBag size={18} color="#65676B" />
            <Text className="ml-2 text-[13px] font-semibold text-[#65676B]" numberOfLines={1}>
              Chi tiết
            </Text>
          </FeedGlassActionButton>

          {!product.is_owner ? (
            <>
              <FeedGlassActionButton
                className="flex-1 flex-row items-center justify-center py-1.5 px-1"
                activeOpacity={0.75}
                onPress={handleAddToCart}
              >
                <ShoppingCart size={18} color={product.can_add_to_cart ? "#0866FF" : "#9CA3AF"} />
                <Text
                  className={`ml-2 text-[13px] font-semibold ${product.can_add_to_cart ? "text-brand" : "text-[#9CA3AF]"}`}
                  numberOfLines={1}
                >
                  Thêm giỏ
                </Text>
              </FeedGlassActionButton>

              <FeedGlassActionButton
                className="flex-1 flex-row items-center justify-center py-1.5 px-1"
                activeOpacity={0.75}
                onPress={handleContactSeller}
              >
                <MessageCircle size={18} color="#65676B" />
                <Text className="ml-2 text-[13px] font-semibold text-[#65676B]" numberOfLines={1}>
                  Nhắn tin
                </Text>
              </FeedGlassActionButton>
            </>
          ) : null}

          <FeedGlassActionButton
            className="flex-1 flex-row items-center justify-center py-1.5 px-1"
            activeOpacity={0.75}
            onPress={handleSharePress}
          >
            <Share2 size={18} color="#65676B" />
            <Text className="ml-2 text-[13px] font-semibold text-[#65676B]" numberOfLines={1}>
              Chia sẻ
            </Text>
          </FeedGlassActionButton>
        </FeedGlassActionBar>
      </FeedCardContent>
    </FeedCardSurface>
  );
});

export { ProductPostCard };
export default ProductPostCard;
