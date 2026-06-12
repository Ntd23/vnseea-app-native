// Description: Displays real Marketplace products from WoWonder inside Settings.
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Plus,
  RotateCw,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useMarketplaceViewModel } from '../../application/view-models/useMarketplaceViewModel';
import type { ProductItem } from '../../domain/types/product.types';
import ProductPostCard from '../components/ProductPostCard';

type MarketplaceNav = NativeStackNavigationProp<RootStackParamList>;

const MARKETPLACE_COLUMN_STYLE = {
  justifyContent: 'space-between',
} as const;

function MarketplaceSkeleton() {
  return (
    <View className="flex-row flex-wrap gap-3 px-4 pb-8">
      {Array.from({ length: 6 }).map((_, index) => (
        <View
          key={index}
          className="w-[48%] overflow-hidden rounded-2xl border border-slate-100 bg-white"
        >
          <View className="aspect-square bg-slate-200" />
          <View className="gap-2 p-3">
            <View className="h-4 w-4/5 rounded-full bg-slate-200" />
            <View className="h-4 w-2/3 rounded-full bg-slate-100" />
            <View className="h-3 w-full rounded-full bg-slate-100" />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState({
  error,
  onRetry,
  onCreate,
}: {
  error: string | null;
  onRetry: () => void;
  onCreate: () => void;
}) {
  return (
    <View className="items-center px-8 py-20">
      <View className="icon-chip h-20 w-20 items-center justify-center">
        {error ? (
          <RotateCw size={36} color="#0000FF" />
        ) : (
          <ShoppingBag size={38} color="#0000FF" />
        )}
      </View>
      <Text className="mt-5 text-center text-heading">
        {error ? 'Không tải được cửa hàng' : 'Chưa có sản phẩm phù hợp'}
      </Text>
      <Text className="mt-2 text-center text-body-secondary">
        {error ??
          'Thử từ khóa khác hoặc đăng sản phẩm đầu tiên của bạn lên cửa hàng.'}
      </Text>
      <View className="mt-6 flex-row gap-3">
        {error ? (
          <TouchableOpacity
            className="btn-secondary min-h-[44px] px-5"
            activeOpacity={0.85}
            onPress={onRetry}
          >
            <RotateCw size={17} color="#0000FF" />
            <Text className="text-title-primary text-brand">Thử lại</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity
          className="btn-primary min-h-[44px] px-5"
          activeOpacity={0.9}
          onPress={onCreate}
        >
          <Plus size={17} color="#FFFFFF" />
          <Text className="text-title-primary text-inverse">Đăng sản phẩm</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MarketplaceScreen() {
  const navigation = useNavigation<MarketplaceNav>();
  const vm = useMarketplaceViewModel();

  const handleCreate = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_PRODUCT);
  }, [navigation]);

  // Tap on a product card → push the detail screen. We pass the full
  // object so the detail screen can render instantly with no extra fetch.
  // (id is also passed so deep-link scenarios still have a key.)
  const handleProductPress = useCallback(
    (product: ProductItem) => {
      navigation.navigate(ROUTES.PRODUCT_DETAIL, {
        productId: product.id,
        product,
      });
    },
    [navigation],
  );

  const renderProduct = useCallback(
    ({ item }: ListRenderItemInfo<ProductItem>) => (
      <View className="w-[48%]">
        <ProductPostCard
          compact
          product={item}
          onPress={handleProductPress}
        />
      </View>
    ),
    [handleProductPress],
  );

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View className="surface-topbar flex-row items-center px-4 py-3">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-heading">Cửa hàng</Text>
          <Text className="mt-0.5 text-caption-secondary">
            Marketplace
          </Text>
        </View>
        <TouchableOpacity
          className="btn-primary h-10 px-4"
          activeOpacity={0.9}
          onPress={handleCreate}
        >
          <Plus size={17} color="#FFFFFF" />
          <Text className="text-caption-primary text-inverse">Đăng bán</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 pb-3 pt-4">
        <View className="input-shell flex-row items-center px-4">
          <Search size={19} color="#64748B" />
          <TextInput
            className="ml-3 min-h-[46px] flex-1 text-body-primary"
            placeholder="Tìm sản phẩm, địa điểm..."
            placeholderTextColor="#94A3B8"
            value={vm.keyword}
            onChangeText={vm.setKeyword}
            returnKeyType="search"
          />
          {vm.keyword ? (
            <TouchableOpacity
              className="h-8 w-8 items-center justify-center rounded-full"
              activeOpacity={0.8}
              hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
              onPress={() => vm.setKeyword('')}
            >
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View className="mt-3 flex-row gap-2">
          {[
            { label: 'Mới nhất', value: undefined },
            { label: 'Giá thấp', value: 'price_low' as const },
            { label: 'Giá cao', value: 'price_high' as const },
          ].map(option => {
            const isActive = option.value === vm.orderBy;
            return (
              <TouchableOpacity
                key={option.label}
                className={`rounded-full border px-4 py-2 ${
                  isActive
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-slate-200 bg-white'
                }`}
                activeOpacity={0.8}
                onPress={() => vm.setOrderBy(option.value)}
              >
                <Text
                  className={
                    isActive
                      ? 'text-caption-primary text-brand'
                      : 'text-caption-secondary'
                  }
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <FlatList
        data={vm.products}
        keyExtractor={item => String(item.id)}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={MARKETPLACE_COLUMN_STYLE}
        contentContainerClassName="gap-3 px-4 pb-10 pt-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.35}
        refreshControl={
          <RefreshControl
            refreshing={vm.isRefreshing}
            onRefresh={vm.reload}
            colors={['#0000FF']}
            tintColor="#0000FF"
          />
        }
        ListEmptyComponent={
          vm.isLoading ? (
            <MarketplaceSkeleton />
          ) : (
            <EmptyState
              error={vm.error}
              onRetry={vm.reload}
              onCreate={handleCreate}
            />
          )
        }
        ListFooterComponent={
          vm.isLoadingMore ? (
            <ActivityIndicator
              className="py-6"
              size="small"
              color="#0000FF"
            />
          ) : null
        }
      />

    </SafeAreaView>
  );
}

export default MarketplaceScreen;
