// Description: Renders the VNSEEA albums screen with real album data from API.
import React, { useEffect } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { ArrowLeft, Images, Plus, Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useAlbumsViewModel } from '../../application/view-models/useAlbumsViewModel';

type AlbumsNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

function mapPrivacyToText(privacy: string): string {
  switch (privacy) {
    case 'public':
      return 'Công khai';
    case 'friends':
      return 'Bạn bè';
    case 'private':
      return 'Riêng tư';
    default:
      return privacy;
  }
}

function AlbumsScreen() {
  const navigation = useNavigation<AlbumsNav>();
  const {
    albums,
    error,
    isLoading,
    isRefreshing,
    hasMore,
    isLoadingMore,
    loadFirstPage,
    refresh,
    loadMore,
    retry,
  } = useAlbumsViewModel();

  // Load first page on mount
  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  // Handle empty state
  if (!isLoading && !error && albums.length === 0) {
    return (
      <SafeAreaView className="flex-1 surface-base" edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={BRAND} />

        <View className="surface-brand h-14 flex-row items-center justify-between px-4">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="text-title-primary text-inverse">Album</Text>
          <View className="flex-row items-center">
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full"
              activeOpacity={0.8}
            >
              <Search size={21} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              className="h-10 w-10 items-center justify-center rounded-full"
              activeOpacity={0.8}
              onPress={() => navigation.navigate(ROUTES.CREATE_ALBUM)}
            >
              <Plus size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <Images size={64} color="#CBD5E1" />
          <Text className="mt-4 text-center text-[16px] font-medium text-[#64748B]">
            Chưa có album nào
          </Text>
          <Text className="mt-2 text-center text-[13px] text-[#94A3B8]">
            Tạo album đầu tiên để chia sẻ khoảnh khắc với cộng đồng
          </Text>
          <TouchableOpacity
            className="mt-6 min-w-[200px] rounded-lg bg-[#0000ff] py-3"
            activeOpacity={0.85}
            onPress={() => navigation.navigate(ROUTES.CREATE_ALBUM)}
          >
            <Text className="text-center text-[15px] font-semibold text-white">
              Tạo album ngay
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header */}
      <View className="surface-brand h-14 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-title-primary text-inverse">Album</Text>
        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
          >
            <Search size={21} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={() => navigation.navigate(ROUTES.CREATE_ALBUM)}
          >
            <Plus size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            colors={[BRAND]}
          />
        }
      >
        {/* Info Card */}
        <View className="surface-card mb-5 flex-row items-center p-4">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#0000ff]/10">
            <Images size={28} color={BRAND} />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-heading">Album của tôi</Text>
            <Text className="mt-1 text-body-secondary">
              Quản lý các bộ ảnh đã tạo và chia sẻ với cộng đồng.
            </Text>
          </View>
        </View>

        {/* Albums Grid */}
        {isLoading && albums.length === 0 ? (
          /* Skeleton Loading */
          <View className="flex-row flex-wrap justify-between">
            {[...Array(4)].map((_, index) => (
              <View
                key={`skeleton-${index}`}
                className="surface-card mb-4 w-[48%] overflow-hidden"
              >
                <View className="h-36 w-full bg-[#E2E8F0]" />
                <View className="p-3 space-y-2">
                  <View className="h-5 w-3/4 bg-[#E2E8F0] rounded" />
                  <View className="h-4 w-1/2 bg-[#E2E8F0] rounded" />
                  <View className="h-4 w-1/3 bg-[#E2E8F0] rounded" />
                </View>
              </View>
            ))}
          </View>
        ) : error ? (
          /* Error State */
          <View className="items-center justify-center py-10">
            <Images size={48} color="#EF4444" />
            <Text className="mt-4 text-center text-[15px] font-medium text-[#EF4444]">
              Không thể tải albums
            </Text>
            <Text className="mt-2 text-center text-[13px] text-[#64748B]">
              {error}
            </Text>
            <TouchableOpacity
              className="mt-6 min-w-[150px] rounded-lg border border-[#0000ff] bg-transparent py-3"
              activeOpacity={0.85}
              onPress={retry}
            >
              <Text className="text-center text-[14px] font-semibold text-[#0000ff]">
                Thử lại
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Album List */
          <>
            <View className="flex-row flex-wrap justify-between">
              {albums.map(album => (
                <TouchableOpacity
                  key={album.id}
                  className="surface-card mb-4 w-[48%] overflow-hidden"
                  activeOpacity={0.86}
                >
                  <Image
                    source={{ uri: album.coverUrl }}
                    className="h-36 w-full"
                    resizeMode="cover"
                    onError={() => {
                      console.log(
                        '[AlbumsScreen] Image load error:',
                        album.coverUrl,
                      );
                    }}
                  />
                  <View className="p-3">
                    <Text
                      className="text-title-primary"
                      numberOfLines={2}
                      adjustsFontSizeToFit
                    >
                      {album.albumName || 'Album không tên'}
                    </Text>
                    <Text className="mt-1 text-caption-secondary">
                      {album.photoCount} {'ảnh'}
                    </Text>
                    <Text className="mt-1 text-caption-primary text-brand">
                      {mapPrivacyToText(album.privacy)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Loading More Indicator */}
            {isLoadingMore && (
              <View className="my-6 items-center justify-center">
                <ActivityIndicator size="small" color={BRAND} />
                <Text className="mt-2 text-caption-secondary text-[#64748B]">
                  Đang tải thêm...
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default AlbumsScreen;
