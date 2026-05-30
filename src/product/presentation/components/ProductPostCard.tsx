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
} from 'lucide-react-native';
import type { ProductItem } from '../../domain/types/product.types';

// ── Helpers outside component (avoid recreation on each render) ────

function formatPrice(price: string, symbolOrCode: string): string {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return price;
  
  let currency = symbolOrCode;
  if (currency === '0') currency = '$';
  else if (currency === '1') currency = '€';
  else if (currency === 'VND' || currency === 'vnd') currency = 'đ';
  
  const formatted = numPrice.toLocaleString('vi-VN');
  
  if (currency === 'đ' || currency === 'VND') {
    return `${formatted} đ`;
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
  onProfilePress?: (userId: string) => void;
  onShare?: (product: ProductItem) => void;
  compact?: boolean;
}

const ProductPostCard = React.memo(function ProductPostCard({
  product,
  onPress,
  onMorePress,
  onProfilePress,
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

  const handleSharePress = useCallback(() => {
    onShare?.(product);
  }, [onShare, product]);

  const currencySymbol = product.currency_symbol || product.currency_code || product.currency || 'VND';

  // Compact layout (used inside the horizontal carousel)
  if (compact) {
    return (
      <TouchableOpacity
        className="surface-card overflow-hidden w-full"
        activeOpacity={0.9}
        onPress={handlePress}
      >
        {/* Product Image */}
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            className="w-full"
            style={{ aspectRatio: 1.4 }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="w-full items-center justify-center bg-slate-200"
            style={{ aspectRatio: 1.4 }}
          >
            <ShoppingBag size={32} color="#94A3B8" />
          </View>
        )}

        {/* Compact Content */}
        <View className="p-3">
          <Text className="text-body-primary font-bold text-[14px] text-[#050505]" numberOfLines={1}>
            {product.name}
          </Text>
          <Text className="text-[14px] font-bold text-[#1877F2] mt-1">
            {formatPrice(product.price, currencySymbol)}
          </Text>
          {product.location ? (
            <View className="flex-row items-center mt-1">
              <MapPin size={11} color="#65676B" />
              <Text className="ml-1 text-[11px] text-[#65676B]" numberOfLines={1}>
                {product.location}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  // Full Feed layout (matches Facebook Post/Video post card design)
  return (
    <View className="surface-card mx-4 mb-6 overflow-hidden">
      {/* Header & Product Text - same padding block for vertical alignment */}
      <View className="p-5 pb-3">
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
      </View>

      {/* Product Image */}
      <TouchableOpacity activeOpacity={0.95} onPress={handlePress}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            className="w-full"
            style={{ aspectRatio: 1.4 }}
            resizeMode="cover"
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

      {/* Product Footer Actions */}
      <View className="p-5 pt-4">
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
        <View className="flex-row items-center justify-between pt-1">
          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center py-1.5 px-1"
            activeOpacity={0.75}
            onPress={handlePress}
          >
            <ShoppingBag size={18} color="#65676B" />
            <Text className="ml-2 text-[13px] font-semibold text-[#65676B]" numberOfLines={1}>
              Chi tiết
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center py-1.5 px-1"
            activeOpacity={0.75}
            onPress={handleProfilePress}
          >
            <MessageCircle size={18} color="#65676B" />
            <Text className="ml-2 text-[13px] font-semibold text-[#65676B]" numberOfLines={1}>
              Nhắn tin
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 flex-row items-center justify-center py-1.5 px-1"
            activeOpacity={0.75}
            onPress={handleSharePress}
          >
            <Share2 size={18} color="#65676B" />
            <Text className="ml-2 text-[13px] font-semibold text-[#65676B]" numberOfLines={1}>
              Chia sẻ
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
});

export { ProductPostCard };
export default ProductPostCard;
