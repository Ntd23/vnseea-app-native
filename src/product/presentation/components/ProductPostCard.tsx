// Description: Product post card component for the home feed.
// Displays products in Facebook Marketplace-style layout.
import React from 'react';
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
} from 'lucide-react-native';
import type { ProductItem } from '../../domain/types/product.types';

interface ProductPostCardProps {
  product: ProductItem;
  onPress?: (product: ProductItem) => void;
  onMorePress?: (product: ProductItem) => void;
  onProfilePress?: (userId: string) => void;
}

function formatPrice(price: string, currency: string): string {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice)) return price;

  const formatted = numPrice.toLocaleString('vi-VN');

  if (currency === 'VND') {
    return `${formatted} đ`;
  }
  return `${formatted} ${currency}`;
}

export function ProductPostCard({
  product,
  onPress,
  onMorePress,
  onProfilePress,
}: ProductPostCardProps) {
  const handlePress = () => {
    onPress?.(product);
  };

  const handleMorePress = () => {
    onMorePress?.(product);
  };

  const handleProfilePress = () => {
    if (product.seller?.user_id) {
      onProfilePress?.(String(product.seller.user_id));
    }
  };

  // Get the first product image
  const imageUrl = product.images?.[0]?.image;

  return (
    <View className="surface-card mx-4 mb-4 overflow-hidden">
      {/* Seller Header */}
      <View className="flex-row items-center justify-between p-4">
        <TouchableOpacity
          className="flex-row items-center"
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
              <ShoppingBag size={18} color="#FFFFFF" />
            </View>
          )}
          <View className="ml-3">
            <Text className="text-title-primary">{product.seller?.name || 'Người bán'}</Text>
            <View className="flex-row items-center">
              {product.time && (
                <>
                  <Text className="text-caption-secondary">
                    {formatTimeAgo(product.time)}
                  </Text>
                  <Text className="text-caption-secondary"> • </Text>
                </>
              )}
              {product.location && (
                <View className="flex-row items-center">
                  <MapPin size={10} color="#64748B" />
                  <Text className="ml-1 text-caption-secondary">
                    {product.location}
                  </Text>
                </View>
              )}
            </View>
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

      {/* Product Image */}
      <TouchableOpacity activeOpacity={0.95} onPress={handlePress}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            className="w-full"
            style={{ aspectRatio: 1 }}
            resizeMode="cover"
          />
        ) : (
          <View
            className="w-full items-center justify-center bg-slate-200"
            style={{ aspectRatio: 1 }}
          >
            <ShoppingBag size={48} color="#94A3B8" />
          </View>
        )}
      </TouchableOpacity>

      {/* Product Info */}
      <TouchableOpacity activeOpacity={0.8} onPress={handlePress} className="p-4">
        <Text className="text-title-primary" numberOfLines={2}>
          {product.name}
        </Text>
        <View className="mt-2 flex-row items-center justify-between">
          <Text className="text-heading text-brand">
            {formatPrice(product.price, product.currency || product.currency_code || 'VND')}
          </Text>
          {product.units !== undefined && product.units > 0 && (
            <Text className="text-caption-secondary">
              Còn {product.units} sản phẩm
            </Text>
          )}
        </View>
        {product.location && (
          <View className="mt-2 flex-row items-center">
            <MapPin size={14} color="#64748B" />
            <Text className="ml-1 text-caption-secondary">
              {product.location}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Helper function to format time ago
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

export default ProductPostCard;
