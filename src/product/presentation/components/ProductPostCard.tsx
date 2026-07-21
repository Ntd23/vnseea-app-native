// Description: Product post card component for the home feed.
// Displays products in Facebook Marketplace-style layout.
import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  ActivityIndicator,
  type GestureResponderEvent,
  Image,
  StyleSheet,
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
  Star,
  Info,
  ThumbsUp,
  MessageSquare,
  Heart,
  Trash2,
} from 'lucide-react-native';
import type { ProductItem } from '../../domain/types/product.types';
import { formatProductPrice } from './ProductCurrency';
import {
  FeedCardContent,
  FeedCardSurface,
  FeedGlassActionBar,
  FeedGlassActionButton,
  FeedMediaFrame,
} from '../../../feed/presentation/components/FeedCardChrome';
import { navigateToPostComments } from '../../../navigation/postNavigation';
import type { FeedPost } from '../../../feed/domain/types/feed.types';

// ── Helpers outside component (avoid recreation on each render) ────

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
function RatingStars({ value, size = 14 }: { value: number; size?: number }) {
  const rounded = Math.round(value);

  return (
    <View className="flex-row items-center gap-0.5" style={{ flexDirection: 'row', alignItems: 'center' }}>
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

// ── Memoized ProductPostCard ────────────────────────────────────────────

interface ProductPostCardProps {
  product: ProductItem;
  onPress?: (product: ProductItem) => void;
  onMorePress?: (product: ProductItem) => void;
  /** Navigate to the seller profile (tapped on avatar/header). */
  onProfilePress?: (userId: string) => void;
  /** Open a chat thread with the seller (tapped on Nhắn tin button). */
  onContactSeller?: (product: ProductItem) => void;
  onShare?: (product: ProductItem) => void;
  onDelete?: (product: ProductItem) => void;
  isDeleting?: boolean;
  compact?: boolean;
  marketplaceFloatingActions?: boolean;

  // New props for post reactions and comments
  postId?: string;
  likeCount?: number;
  commentCount?: number;
  myReaction?: string | null;
  onReact?: (postId: string, reaction: any) => void;
  onCommentTap?: (postId: string) => void;
  commentNavigationMode?: 'detail' | 'callback';
  onOpenReactions?: (postId: string, post: any) => void;
  post?: any;
}

const ProductPostCard = React.memo(function ProductPostCard({
  product,
  onPress,
  onMorePress,
  onProfilePress,
  onContactSeller,
  onShare,
  onDelete,
  isDeleting = false,
  compact,
  marketplaceFloatingActions = false,
  postId,
  likeCount,
  commentCount,
  myReaction,
  onReact,
  onCommentTap,
  commentNavigationMode = 'detail',
  onOpenReactions,
  post,
}: ProductPostCardProps) {
  const navigation = useNavigation<any>();
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

  const handleCommentPress = useCallback(() => {
    if (!postId) return;
    if (commentNavigationMode === 'callback') {
      onCommentTap?.(postId);
      return;
    }
    navigateToPostComments(
      navigation,
      postId,
      post as FeedPost | undefined,
    );
  }, [commentNavigationMode, navigation, onCommentTap, post, postId]);

  const handleContactSeller = useCallback(() => {
    if (!product.can_contact_seller || !product.seller?.user_id) return;
    onContactSeller?.(product);
  }, [onContactSeller, product, product.can_contact_seller, product.seller?.user_id]);

  const handleSharePress = useCallback(() => {
    onShare?.(product);
  }, [onShare, product]);

  const handleDeletePress = useCallback((event: GestureResponderEvent) => {
    event.stopPropagation();
    onDelete?.(product);
  }, [onDelete, product]);

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

        {product.is_owner && onDelete ? (
          <TouchableOpacity
            activeOpacity={0.8}
            disabled={isDeleting}
            onPress={handleDeletePress}
            accessibilityRole="button"
            accessibilityLabel="Xóa sản phẩm"
            className="absolute right-2 top-2 h-9 w-9 items-center justify-center rounded-full bg-[#7765ff]"
            style={{ zIndex: 2 }}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Trash2 size={17} color="#FFFFFF" strokeWidth={2.4} />
            )}
          </TouchableOpacity>
        ) : null}

        {/* Compact Content */}
        <View
          className="p-3"
          style={marketplaceFloatingActions ? styles.marketplaceCompactContent : undefined}
        >
          {marketplaceFloatingActions && !product.is_owner ? (
            <View style={styles.marketplaceFloatingActions}>
              <TouchableOpacity
                style={[
                  styles.marketplaceActionButton,
                  styles.marketplaceMessageButton,
                  !product.can_contact_seller && styles.marketplaceActionDisabled,
                ]}
                activeOpacity={0.75}
                disabled={!product.can_contact_seller}
                onPress={handleContactSeller}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <MessageCircle
                  size={20}
                  color={product.can_contact_seller ? '#475569' : '#cbd5e1'}
                  strokeWidth={2.4}
                />
              </TouchableOpacity>
            </View>
          ) : null}
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
              {formatProductPrice(product)}
            </Text>

            {!product.is_owner && !marketplaceFloatingActions ? (
              <View className="flex-row items-center gap-1.5" style={{ flexShrink: 0 }}>
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

        {/* Product Description */}
        {product.description ? (
          <Text className="text-body-primary mt-2.5 text-[#65676B] text-[13px] leading-relaxed" numberOfLines={2}>
            {product.description}
          </Text>
        ) : null}
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
        {/* Divider */}
        <View className="h-[1px] bg-slate-100 w-full mb-3" style={{ height: 1, backgroundColor: '#f1f5f9', width: '100%', marginBottom: 12 }} />

        {/* Rating Stars & Reviews */}
        <View className="flex-row items-center mb-1.5" style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <RatingStars value={Number(product.rating || 0)} size={15} />
          <Text className="ml-2 text-[13px] font-semibold text-slate-500" style={{ color: '#64748B' }}>
            {Number(product.reviews_count || 0)} Nhận xét
          </Text>
        </View>

        {/* Location */}
        {product.location ? (
          <Text className="text-[13px] text-slate-500 font-semibold leading-5 mb-2.5" numberOfLines={1} style={{ color: '#64748B', marginBottom: 10 }}>
            {product.location}
          </Text>
        ) : null}

        {/* Product Title */}
        <Text className="text-body-primary font-bold text-[18px] text-[#050505] leading-7" numberOfLines={2}>
          {product.name}
        </Text>

        {/* Price in green */}
        <Text className="mt-1.5 text-[18px] font-bold text-green-600" style={{ color: '#16a34a', marginTop: 6 }}>
          {formatProductPrice(product)}
        </Text>

        {/* Info button */}
        <TouchableOpacity
          onPress={handlePress}
          activeOpacity={0.75}
          className="flex-row items-center rounded-full bg-slate-100 px-4 py-2 mt-3.5"
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#f1f5f9',
            borderRadius: 9999,
            paddingHorizontal: 16,
            paddingVertical: 8,
            alignSelf: 'flex-start',
            marginTop: 14,
          }}
        >
          <View
            className="h-5 w-5 rounded-full bg-slate-900 items-center justify-center mr-2"
            style={{
              height: 20,
              width: 20,
              borderRadius: 10,
              backgroundColor: '#0F172A',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 8,
            }}
          >
            <Info size={12} color="#FFFFFF" strokeWidth={3} />
          </View>
          <Text className="text-sm font-bold text-slate-800" style={{ color: '#1E293B' }}>
            Thêm thông tin
          </Text>
        </TouchableOpacity>

        {/* Raw price line with info icon */}
        <View className="flex-row items-center mt-3.5" style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14 }}>
          <Info size={14} color="#64748B" style={{ marginRight: 6 }} />
          <Text className="text-[13px] text-slate-500 font-semibold" style={{ color: '#64748B' }}>
            {formatProductPrice(product)}
          </Text>
        </View>

        {/* Social interactions footer */}
        {postId ? (
          <View className="border-t border-slate-100 mt-4 pt-3.5" style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 16, paddingTop: 14 }}>
            {/* Likes and comments count row */}
            <View className="flex-row items-center justify-between pb-3" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12 }}>
              <View className="flex-row items-center" style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View
                  className="h-4.5 w-4.5 rounded-full items-center justify-center mr-1.5"
                  style={{
                    height: 18,
                    width: 18,
                    borderRadius: 9,
                    backgroundColor: '#ef4444',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 6,
                  }}
                >
                  <Heart size={10} color="#FFFFFF" fill="#FFFFFF" />
                </View>
                <Text className="text-[13px] text-slate-500 font-bold" style={{ color: '#64748B' }}>
                  {likeCount || 0}
                </Text>
              </View>
              <View className="flex-row items-center" style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text className="text-[13px] text-slate-500 font-bold" style={{ color: '#64748B' }}>
                  {commentCount || 0} bình luận
                </Text>
              </View>
            </View>

            {/* Social Buttons */}
            <View className="flex-row items-center justify-between border-t border-slate-100 pt-1" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 4 }}>
              <TouchableOpacity
                onPress={() => onReact?.(postId, 'like')}
                activeOpacity={0.7}
                className="flex-row items-center justify-center flex-1 py-2.5"
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1, paddingVertical: 10 }}
              >
                <ThumbsUp size={18} color={myReaction ? '#0000ff' : '#64748B'} strokeWidth={2.4} />
                <Text className={`ml-2 text-[13px] font-bold ${myReaction ? 'text-[#0000ff]' : 'text-[#64748B]'}`} style={{ marginLeft: 8 }}>
                  Thích
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleCommentPress}
                activeOpacity={0.7}
                className="flex-row items-center justify-center flex-1 py-2.5"
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1, paddingVertical: 10 }}
              >
                <MessageSquare size={18} color="#64748B" strokeWidth={2.4} />
                <Text className="ml-2 text-[13px] font-bold text-slate-500" style={{ color: '#64748B', marginLeft: 8 }}>
                  Bình luận
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleSharePress}
                activeOpacity={0.7}
                className="flex-row items-center justify-center flex-1 py-2.5"
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1, paddingVertical: 10 }}
              >
                <Share2 size={18} color="#64748B" strokeWidth={2.4} />
                <Text className="ml-2 text-[13px] font-bold text-slate-500" style={{ color: '#64748B', marginLeft: 8 }}>
                  Chia sẻ
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </FeedCardContent>
    </FeedCardSurface>
  );
});

export { ProductPostCard };
export default ProductPostCard;

const styles = StyleSheet.create({
  marketplaceCompactContent: {
    position: 'relative',
    paddingTop: 28,
  },
  marketplaceFloatingActions: {
    position: 'absolute',
    right: 8,
    top: -22,
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  marketplaceActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 4,
  },
  marketplaceMessageButton: {
    backgroundColor: '#eef2f7',
  },
  marketplaceActionDisabled: {
    backgroundColor: '#f1f5f9',
  },
});
