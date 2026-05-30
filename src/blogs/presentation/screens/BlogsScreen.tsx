// Description: Renders real WoWonder articles with pagination and detail navigation.
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Clock3,
  Eye,
  FileText,
  RotateCw,
  Search,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useBlogsViewModel } from '../../application/view-models/useBlogsViewModel';
import type { BlogsItem } from '../../domain/types/blogs.types';

type BlogsNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000FF';

function formatCount(value?: number) {
  const safeValue = value ?? 0;
  if (safeValue >= 1000000) return `${(safeValue / 1000000).toFixed(1)}M`;
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(1)}K`;
  return String(safeValue);
}

function ArticlesSkeleton() {
  return (
    <View className="gap-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={index} className="surface-card overflow-hidden">
          <View className="h-44 w-full bg-slate-200" />
          <View className="p-4">
            <View className="h-4 w-24 rounded-full bg-slate-100" />
            <View className="mt-3 h-5 w-full rounded-full bg-slate-200" />
            <View className="mt-2 h-5 w-3/4 rounded-full bg-slate-200" />
            <View className="mt-4 h-4 w-1/2 rounded-full bg-slate-100" />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <View className="items-center px-6 py-16">
      <View className="icon-chip h-20 w-20 items-center justify-center">
        {error ? (
          <RotateCw size={38} color={BRAND} />
        ) : (
          <FileText size={38} color={BRAND} />
        )}
      </View>
      <Text className="mt-5 text-center text-heading">
        {error ? 'Không tải được bài viết' : 'Chưa có bài viết'}
      </Text>
      <Text className="mt-2 text-center text-body-secondary">
        {error ?? 'Các bài viết mới sẽ xuất hiện tại đây.'}
      </Text>
      <TouchableOpacity
        className="btn-primary mt-6 min-h-[46px] rounded-xl px-6"
        activeOpacity={0.85}
        onPress={onRetry}
      >
        <RotateCw size={18} color="#FFFFFF" />
        <Text className="text-title-primary text-inverse">Thử lại</Text>
      </TouchableOpacity>
    </View>
  );
}

function ArticleCard({
  article,
  onOpen,
}: {
  article: BlogsItem;
  onOpen: () => void;
}) {
  return (
    <TouchableOpacity
      className="surface-card mb-4 overflow-hidden"
      activeOpacity={0.88}
      onPress={onOpen}
    >
      {article.thumbnailUrl ? (
        <Image
          source={{ uri: article.thumbnailUrl }}
          className="h-44 w-full bg-slate-200"
          resizeMode="cover"
        />
      ) : (
        <View className="h-44 w-full items-center justify-center bg-[#EEF2FF]">
          <FileText size={48} color="rgba(0,0,255,0.34)" strokeWidth={1.7} />
        </View>
      )}

      <View className="p-4">
        <View className="self-start rounded-full bg-blue-50 px-3 py-1">
          <Text className="text-caption-primary text-brand">
            {article.category || 'Bài viết'}
          </Text>
        </View>

        <Text className="mt-3 text-heading" numberOfLines={2}>
          {article.title}
        </Text>

        {article.description ? (
          <Text className="mt-2 text-body-secondary" numberOfLines={2}>
            {article.description}
          </Text>
        ) : null}

        <Text className="mt-3 text-caption-primary">
          {article.author.name}
        </Text>

        <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3">
          <View className="flex-row items-center">
            <Clock3 size={15} color={BRAND} />
            <Text className="ml-2 text-caption-secondary">
              {article.postedLabel || 'Mới đăng'}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Eye size={15} color={BRAND} />
            <Text className="ml-2 text-caption-secondary">
              {formatCount(article.views)} lượt xem
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function BlogsScreen() {
  const navigation = useNavigation<BlogsNav>();
  const vm = useBlogsViewModel();

  useFocusEffect(
    useCallback(() => {
      void vm.loadFirstPage(false);
    }, [vm.loadFirstPage]),
  );

  const renderArticle = useCallback(
    ({ item }: ListRenderItemInfo<BlogsItem>) => (
      <ArticleCard
        article={item}
        onOpen={() =>
          navigation.navigate(ROUTES.BLOG_DETAIL, { blogId: item.id })
        }
      />
    ),
    [navigation],
  );

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View className="surface-topbar h-16 flex-row items-center justify-between px-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text className="ml-3 text-heading">Bài viết</Text>
        </View>

        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.navigate(ROUTES.SEARCH)}
        >
          <Search size={21} color={BRAND} />
        </TouchableOpacity>
      </View>

      <FlatList
        className="flex-1"
        data={vm.articles}
        keyExtractor={item => item.id}
        renderItem={renderArticle}
        contentContainerClassName="px-4 pb-10 pt-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={vm.isRefreshing}
            onRefresh={vm.refresh}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.45}
        ListHeaderComponent={
          <View className="preview-panel mb-5 flex-row items-center p-4">
            <View className="icon-chip h-14 w-14 items-center justify-center">
              <FileText size={28} color={BRAND} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-heading">Bài viết mới nhất</Text>
              <Text className="mt-1 text-body-secondary">
                Nội dung cộng đồng được tải trực tiếp từ VNSEEA.
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          vm.isLoading ? (
            <ArticlesSkeleton />
          ) : (
            <EmptyState error={vm.error} onRetry={vm.retry} />
          )
        }
        ListFooterComponent={
          vm.isLoadingMore ? (
            <View className="py-4">
              <ActivityIndicator color={BRAND} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

export default BlogsScreen;
