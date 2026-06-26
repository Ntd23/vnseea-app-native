// Description: Renders the Seller's store screen showing their active and sold products.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BlurView } from '@react-native-community/blur';
import {
  ArrowLeft,
  CheckCircle2,
  Search,
  ShoppingCart,
  Star,
  Store,
  X,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useProductsViewModel } from '../../application/view-models/useProductViewModel';
import { createProductRepository } from '../../infrastructure/repositories/ApiProductRepository';
import type { ProductItem } from '../../domain/types/product.types';
import ProductPostCard from '../components/ProductPostCard';
import { useSyncedCartCount } from '../../../shared-kernel/application/state/cartCountSync';

type SellerStoreRoute = RouteProp<RootStackParamList, typeof ROUTES.SELLER_STORE>;
type SellerStoreNav = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type CartAnimationState = {
  id: number;
  imageUrl?: string;
  productName: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  progress: Animated.Value;
};

const repository = createProductRepository();

export default function SellerStoreScreen() {
  const route = useRoute<SellerStoreRoute>();
  const navigation = useNavigation<SellerStoreNav>();
  const { sellerId, sellerName, sellerUsername, sellerAvatar } = route.params;

  const insets = useSafeAreaInsets();
  const { products, isLoading, fetchProducts } = useProductsViewModel();
  const { cartCount, syncCartCount } = useSyncedCartCount(0);
  const [activeTab, setActiveTab] = useState<'selling' | 'sold'>('selling');
  const [keyword, setKeyword] = useState('');

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
      const fallbackStart = origin ?? { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };
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

  // Fetch products on focus
  useFocusEffect(
    useCallback(() => {
      fetchProducts({ user_id: sellerId });
    }, [fetchProducts, sellerId])
  );

  // Fetch cart count on focus
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      async function loadCartCount() {
        try {
          const count = await repository.getCartCount();
          if (!cancelled) {
            syncCartCount(count);
          }
        } catch (err) {
          console.warn('[SellerStore] getCartCount error:', err);
        }
      }
      loadCartCount();
      return () => {
        cancelled = true;
      };
    }, [syncCartCount])
  );

  // Handle Add to Cart
  const handleAddToCart = useCallback(async (product: ProductItem, origin?: { x: number; y: number }) => {
    try {
      runCartAnimation(product, origin);
      showCartToast(product.name);
      const result = await repository.addToCart(product.id, 1);
      const nextCount = Number(result.count);
      syncCartCount(Number.isFinite(nextCount) ? nextCount : undefined, 1);
      repository.getCartCount().then(syncCartCount).catch(() => undefined);
    } catch (err) {
      console.warn('[SellerStore] addToCart error:', err);
    }
  }, [runCartAnimation, showCartToast, syncCartCount]);

  // Handle Product Press
  const handleProductPress = useCallback((product: ProductItem) => {
    navigation.navigate(ROUTES.PRODUCT_DETAIL, {
      productId: product.id,
      product,
    });
  }, [navigation]);

  // Handle Contact Seller
  const handleContactSeller = useCallback((product: ProductItem) => {
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
  }, [navigation]);

  // Client-side filtering
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    const tabFiltered = products.filter(p => {
      if (activeTab === 'selling') {
        // active products (typically active !== 0 and units > 0)
        return p.active !== 0 && (p.units === undefined || p.units > 0);
      } else {
        // sold out or inactive products
        return p.active === 0 || p.units === 0;
      }
    });

    if (!keyword.trim()) return tabFiltered;
    const cleanKw = keyword.toLowerCase().trim();
    return tabFiltered.filter(
      p =>
        p.name?.toLowerCase().includes(cleanKw) ||
        p.description?.toLowerCase().includes(cleanKw) ||
        p.location?.toLowerCase().includes(cleanKw)
    );
  }, [products, activeTab, keyword]);

  const renderProduct = useCallback(
    ({ item }: { item: ProductItem }) => (
      <View className="w-[48%] mb-3">
        <ProductPostCard
          compact
          product={item}
          onPress={handleProductPress}
          onContactSeller={handleContactSeller}
          onAddToCart={handleAddToCart}
        />
      </View>
    ),
    [handleProductPress, handleContactSeller, handleAddToCart]
  );

  const renderHeader = () => (
    <View className="px-4 pt-4 pb-2">
      {/* Seller Glassmorphic Profile Card */}
      <View className="bg-white rounded-3xl border border-slate-100 p-4 shadow-sm shadow-slate-100/60 flex-row items-center mb-4">
        <View className="relative">
          {sellerAvatar ? (
            <Image
              source={{ uri: sellerAvatar }}
              className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200"
            />
          ) : (
            <View className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 items-center justify-center">
              <Store size={28} color="#64748B" />
            </View>
          )}
          <View className="absolute right-0 bottom-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
        </View>

        <View className="flex-1 ml-4 justify-center">
          <Text className="text-lg font-extrabold text-slate-900" numberOfLines={1}>
            {sellerName || sellerUsername || 'Người bán'}
          </Text>
          {sellerUsername && (
            <Text className="text-xs font-semibold text-slate-400 mt-0.5">
              @{sellerUsername}
            </Text>
          )}
          <View className="flex-row items-center mt-1.5">
            <View className="bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100/50">
              <Text className="text-[10px] font-bold text-blue-600">Người bán uy tín</Text>
            </View>
            <View className="flex-row items-center ml-2.5">
              <Star size={11} color="#EAB308" fill="#EAB308" />
              <Text className="text-[11px] font-bold text-slate-600 ml-1">4.8</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs Container */}
      <View className="bg-slate-100 rounded-2xl p-1 flex-row mb-4">
        <TouchableOpacity
          onPress={() => {
            setActiveTab('selling');
            setKeyword('');
          }}
          className={`flex-1 py-3.5 rounded-xl items-center justify-center ${
            activeTab === 'selling' ? 'bg-white shadow-sm shadow-slate-200/80' : ''
          }`}
          activeOpacity={0.8}
        >
          <Text
            className={`text-sm ${
              activeTab === 'selling' ? 'font-bold text-blue-600' : 'font-semibold text-slate-500'
            }`}
          >
            Sản phẩm đang bán
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setActiveTab('sold');
            setKeyword('');
          }}
          className={`flex-1 py-3.5 rounded-xl items-center justify-center ${
            activeTab === 'sold' ? 'bg-white shadow-sm shadow-slate-200/80' : ''
          }`}
          activeOpacity={0.8}
        >
          <Text
            className={`text-sm ${
              activeTab === 'sold' ? 'font-bold text-blue-600' : 'font-semibold text-slate-500'
            }`}
          >
            Đã bán
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modern Search Bar */}
      <View className="flex-row items-center px-4 bg-slate-50 border border-slate-100 rounded-2xl mb-2">
        <Search size={16} color="#64748B" />
        <TextInput
          className="ml-2 min-h-[44px] flex-1 text-slate-800 text-sm font-medium"
          placeholder="Tìm sản phẩm tại cửa hàng..."
          placeholderTextColor="#94A3B8"
          value={keyword}
          onChangeText={setKeyword}
          returnKeyType="search"
        />
        {keyword ? (
          <TouchableOpacity
            className="h-6 w-6 items-center justify-center rounded-full bg-slate-200/50"
            activeOpacity={0.8}
            onPress={() => setKeyword('')}
          >
            <X size={12} color="#64748B" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-20 px-8">
      <View className="w-16 h-16 bg-slate-100 rounded-full items-center justify-center mb-4">
        <Store size={28} color="#94A3B8" />
      </View>
      <Text className="text-base font-extrabold text-slate-900 text-center">
        {keyword
          ? 'Không tìm thấy kết quả phù hợp'
          : activeTab === 'selling'
          ? 'Cửa hàng chưa đăng sản phẩm nào'
          : 'Chưa có sản phẩm nào đã bán'}
      </Text>
      <Text className="text-xs font-semibold text-slate-400 text-center mt-1.5 leading-5 max-w-[240px]">
        {keyword
          ? 'Vui lòng kiểm tra lại từ khóa hoặc thay đổi bộ lọc tìm kiếm.'
          : activeTab === 'selling'
          ? 'Theo dõi cửa hàng để nhận thông báo khi có sản phẩm mới nhất.'
          : 'Thông tin sản phẩm đã bán sẽ được cập nhật tại đây.'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      {/* Header Bar */}
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
            Cửa hàng
          </Text>
        </View>
        <View className="z-10 flex-row items-center">
          <Animated.View
            ref={cartButtonRef}
            collapsable={false}
            style={{ transform: [{ scale: cartScale }] }}
          >
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate(ROUTES.CART)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="relative h-10 w-10 items-center justify-center rounded-full"
            >
              <ShoppingCart size={22} color="#1E293B" />
              {cartCount > 0 ? (
                <View className="absolute right-0 top-0 h-4 w-4 items-center justify-center rounded-full bg-red-500">
                  <Text className="text-[9px] font-bold text-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* Product List */}
      {isLoading && products.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0000ff" />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => String(item.id)}
          renderItem={renderProduct}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
          contentContainerClassName="pb-10"
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      )}

      {/* Cart Flying Bubble Animation */}
      {cartAnimation && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              zIndex: 9999,
              backgroundColor: 'transparent',
            },
          ]}
        >
          <Animated.View
            style={{
              position: 'absolute',
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#3B82F6',
              borderWidth: 2,
              borderColor: '#FFFFFF',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '#3B82F6',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 6,
              elevation: 8,
              transform: [
                {
                  translateX: cartAnimation.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [cartAnimation.start.x - 20, cartAnimation.end.x - 20],
                  }),
                },
                {
                  translateY: cartAnimation.progress.interpolate({
                    inputRange: [0, 0.4, 1],
                    outputRange: [
                      cartAnimation.start.y - 20,
                      Math.min(cartAnimation.start.y, cartAnimation.end.y) - 120,
                      cartAnimation.end.y - 20,
                    ],
                  }),
                },
                {
                  scale: cartAnimation.progress.interpolate({
                    inputRange: [0, 0.2, 0.8, 1],
                    outputRange: [0.2, 1.2, 1, 0.3],
                  }),
                },
              ],
              opacity: cartAnimation.progress.interpolate({
                inputRange: [0, 0.15, 0.85, 1],
                outputRange: [0.4, 1, 1, 0],
              }),
            }}
          >
            {cartAnimation.imageUrl ? (
              <Image
                source={{ uri: cartAnimation.imageUrl }}
                style={{ width: 36, height: 36, borderRadius: 18 }}
              />
            ) : (
              <ShoppingCart size={18} color="#FFFFFF" />
            )}
          </Animated.View>
        </Animated.View>
      )}

      {/* Glassmorphic Toast Notification */}
      {toastProductName && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              bottom: insets.bottom + 16,
              opacity: toastOpacity,
              transform: [{ translateY: toastTranslateY }],
            },
          ]}
        >
          <View className="flex-row items-center justify-between px-4 py-3">
            <View className="flex-row items-center flex-1 mr-3">
              <View className="bg-green-500/10 p-1.5 rounded-full mr-3">
                <CheckCircle2 size={18} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Thành công
                </Text>
                <Text className="text-[13px] font-bold text-slate-800" numberOfLines={1}>
                  Đã thêm {toastProductName}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate(ROUTES.CART)}
              className="bg-slate-900 px-3.5 py-1.5 rounded-xl"
            >
              <Text className="text-xs font-bold text-white">Xem giỏ</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
});
