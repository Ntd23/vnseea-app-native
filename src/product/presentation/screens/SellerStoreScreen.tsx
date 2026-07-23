// Description: Renders the Seller's store screen showing their active and sold products.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Search,
  Star,
  Store,
  X,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import { useProductsViewModel } from '../../application/view-models/useProductViewModel';
import type { ProductItem } from '../../domain/types/product.types';
import ProductPostCard from '../components/ProductPostCard';

type SellerStoreRoute = RouteProp<RootStackParamList, typeof ROUTES.SELLER_STORE>;
type SellerStoreNav = NativeStackNavigationProp<RootStackParamList>;

export default function SellerStoreScreen() {
  const route = useRoute<SellerStoreRoute>();
  const navigation = useNavigation<SellerStoreNav>();
  const { sellerId, sellerName, sellerUsername, sellerAvatar } = route.params;

  const { products, isLoading, fetchProducts } = useProductsViewModel();
  const [activeTab, setActiveTab] = useState<'selling' | 'sold'>('selling');
  const [keyword, setKeyword] = useState('');

  // Fetch products on focus
  useFocusEffect(
    useCallback(() => {
      fetchProducts({ user_id: sellerId });
    }, [fetchProducts, sellerId])
  );

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
        />
      </View>
    ),
    [handleProductPress, handleContactSeller]
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
            <View className="bg-brand-subtle px-2 py-0.5 rounded-full border border-brand-border">
              <Text className="text-[10px] font-bold text-brand">Người bán uy tín</Text>
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
              activeTab === 'selling' ? 'font-bold text-brand' : 'font-semibold text-slate-500'
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
              activeTab === 'sold' ? 'font-bold text-brand' : 'font-semibold text-slate-500'
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
      <FeedHeader />

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
        <View className="h-10 w-10" />
      </View>

      {/* Product List */}
      {isLoading && products.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={APP_BRAND_COLOR} />
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

    </SafeAreaView>
  );
}
