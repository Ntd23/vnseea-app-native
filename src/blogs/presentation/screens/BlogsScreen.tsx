// Description: Renders real WoWonder articles with pagination and detail navigation.
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Clock3,
  Eye,
  FileText,
  Filter,
  Plus,
  RotateCw,
  Search,
  X,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useBlogsViewModel } from '../../application/view-models/useBlogsViewModel';
import type { BlogsItem } from '../../domain/types/blogs.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getBlogsCopy } from '../../application/i18n/blogsCopy';

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
  onCreate,
  copy,
}: {
  error: string | null;
  onRetry: () => void;
  onCreate: () => void;
  copy: Record<string, string>;
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
        {error ? copy.error : copy.noBlogs}
      </Text>
      <Text className="mt-2 text-center text-body-secondary">
        {error ?? copy.noBlogsDesc}
      </Text>
      <TouchableOpacity
        className="btn-primary mt-6 min-h-[46px] rounded-xl px-6"
        activeOpacity={0.85}
        onPress={error ? onRetry : onCreate}
      >
        {error ? (
          <RotateCw size={18} color="#FFFFFF" />
        ) : (
          <Plus size={18} color="#FFFFFF" />
        )}
        <Text className="text-title-primary text-inverse">
          {error ? copy.retry : copy.createBlog}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ArticleCard({
  article,
  onOpen,
  copy,
}: {
  article: BlogsItem;
  onOpen: () => void;
  copy: Record<string, string>;
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
            {article.category || copy.article}
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
              {article.postedLabel || copy.date}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Eye size={15} color={BRAND} />
            <Text className="ml-2 text-caption-secondary">
              {formatCount(article.views)} {copy.views}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function BlogsScreen() {
  const navigation = useNavigation<BlogsNav>();
  const route = useRoute();
  const vm = useBlogsViewModel();
  const [searchText, setSearchText] = useState('');
  const [language] = useState<AppLanguage>(languageStorage.getLanguage());
  const copy = getBlogsCopy(language);
  const categoryOptions = [{ id: 'all', label: copy.categoryAll }, ...vm.categories];
  const previousParams = useRef<{ category?: string; searchQuery?: string; sortBy?: string; myPostsOnly?: boolean } | undefined>(undefined);
  const {
    handleCategoryChange,
    handleSearchChange: handleViewModelSearchChange,
    handleSortChange,
    handleMyPostsOnlyChange,
    loadFirstPage,
  } = vm;

  useFocusEffect(
    useCallback(() => {
      const params = route.params as { category?: string; searchQuery?: string; sortBy?: string; myPostsOnly?: boolean } | undefined;
      console.log('[BlogsScreen] Route params:', params);
      
      // Kiểm tra xem params có thực sự thay đổi không
      const paramsChanged = 
        params?.category !== previousParams.current?.category ||
        params?.searchQuery !== previousParams.current?.searchQuery ||
        params?.sortBy !== previousParams.current?.sortBy ||
        params?.myPostsOnly !== previousParams.current?.myPostsOnly;
      
      // Chỉ gọi loadFirstPage khi có params thay đổi hoặc lần đầu tiên load
      let shouldLoad = false;
      
      if (params?.category !== undefined) {
        console.log('[BlogsScreen] Setting category:', params.category === 'all' ? null : params.category);
        handleCategoryChange(params.category === 'all' ? null : params.category);
        shouldLoad = true;
      }
      if (params?.searchQuery !== undefined) {
        console.log('[BlogsScreen] Setting search query:', params.searchQuery);
        handleViewModelSearchChange(params.searchQuery);
        setSearchText(params.searchQuery);
        shouldLoad = true;
      }
      if (params?.sortBy) {
        console.log('[BlogsScreen] Setting sort by:', params.sortBy);
        handleSortChange(params.sortBy);
        shouldLoad = true;
      }
      if (params?.myPostsOnly !== undefined) {
        console.log('[BlogsScreen] Setting my posts only:', params.myPostsOnly);
        handleMyPostsOnlyChange(params.myPostsOnly);
        shouldLoad = true;
      }
      
      // Load data on first focus or when params change
      if (shouldLoad && paramsChanged) {
        console.log('[BlogsScreen] Loading first page due to params change');
        void loadFirstPage(false);
      } else if (previousParams.current === undefined) {
        // Initial load when no params exist
        console.log('[BlogsScreen] Initial load - loading first page');
        void loadFirstPage(false);
      }
      
      previousParams.current = params;
    }, [
      route.params,
      handleCategoryChange,
      handleViewModelSearchChange,
      handleSortChange,
      handleMyPostsOnlyChange,
      loadFirstPage,
    ]),
  );

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    vm.handleSearchChange(text);
  }, [vm]);

  const clearSearch = useCallback(() => {
    setSearchText('');
    vm.handleSearchChange('');
  }, [vm]);

  const openFilter = useCallback(() => {
    navigation.navigate(ROUTES.BLOG_FILTER_CATEGORY, {
      currentCategory: vm.selectedCategory || undefined,
      searchQuery: vm.searchQuery || undefined,
      sortBy: vm.sortBy,
      myPostsOnly: vm.myPostsOnly,
    });
  }, [navigation, vm.selectedCategory, vm.searchQuery, vm.sortBy, vm.myPostsOnly]);

  const openCreateBlog = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_BLOG);
  }, [navigation]);

  const renderArticle = useCallback(
    ({ item }: ListRenderItemInfo<BlogsItem>) => (
      <ArticleCard
        article={item}
        onOpen={() => {
          console.log('[BlogsScreen] Opening blog detail:', { blogId: item.id, id: item.id });
          navigation.navigate(ROUTES.BLOG_DETAIL, { blogId: item.id });
        }}
        copy={copy}
      />
    ),
    [navigation, copy],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* ── Feed Header ────────────────────────────────────────── */}
      <View style={{ zIndex: 10, elevation: 5, backgroundColor: '#ffffff' }}>
        <FeedHeader />
      </View>

      <FlatList
        className="flex-1"
        data={vm.articles}
        keyExtractor={item => item.id}
        renderItem={renderArticle}
        contentContainerStyle={{ paddingBottom: 40 }}
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
          <View>
            {/* 1. Purple-Blue Gradient Header Banner */}
            <View style={{ height: 160, position: 'relative', overflow: 'hidden', justifyContent: 'center', paddingHorizontal: 20 }}>
              <Svg pointerEvents="none" height="100%" width="100%" style={{ position: 'absolute', left: 0, top: 0 }}>
                <Defs>
                  <LinearGradient id="blogsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#1e3a8a" />
                    <Stop offset="50%" stopColor="#3b82f6" />
                    <Stop offset="100%" stopColor="#7c3aed" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#blogsGrad)" />
              </Svg>

              <Text style={{ fontSize: 28, fontWeight: '800', color: '#ffffff', lineHeight: 36, marginBottom: 12 }}>
                {`Các bài báo gần\nđây nhất`}
              </Text>

              {/* My articles toggle button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  handleMyPostsOnlyChange(!vm.myPostsOnly);
                  loadFirstPage(false);
                }}
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: vm.myPostsOnly ? '#f59e0b' : '#fef3c7',
                  borderRadius: 12,
                  paddingHorizontal: 20,
                  paddingVertical: 8,
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: '700', color: vm.myPostsOnly ? '#ffffff' : '#78350f' }}>
                  {copy.myPosts}
                </Text>
              </TouchableOpacity>
            </View>

            {/* White spacer under gradient banner */}
            <View style={{ height: 16 }} />

            {/* 2. Search Input bar */}
            <View style={{ paddingHorizontal: 16, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, rounded: 12, borderRadius: 12, backgroundColor: '#f1f5f9', px: 3, paddingHorizontal: 12, py: 2, paddingVertical: 8 }}>
                <Search size={18} color="#64748B" />
                <TextInput
                  style={{ flex: 1, color: '#0f172a', fontSize: 15, paddingVertical: 2, marginLeft: 6 }}
                  placeholder={copy.searchPlaceholder}
                  placeholderTextColor="#94A3B8"
                  value={searchText}
                  onChangeText={handleSearchChange}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity
                    className="h-6 w-6 items-center justify-center rounded-full"
                    activeOpacity={0.7}
                    onPress={clearSearch}
                  >
                    <X size={16} color="#64748B" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* 3. Category pills grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 20 }}>
              {categoryOptions.map((cat) => {
                const isSelected = cat.id === 'all'
                  ? !vm.selectedCategory
                  : vm.selectedCategory === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (cat.id === 'all' || isSelected) {
                        handleCategoryChange(null);
                      } else {
                        handleCategoryChange(cat.id);
                      }
                      loadFirstPage(false);
                    }}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 16,
                      backgroundColor: isSelected ? '#0052ff' : '#eff4fc',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: isSelected ? '#ffffff' : '#1e3a8a',
                      }}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        }
        ListEmptyComponent={
          vm.isLoading ? (
            <ArticlesSkeleton />
          ) : vm.articles.length === 0 ? (
            <EmptyState
              error={vm.error}
              onRetry={vm.retry}
              onCreate={openCreateBlog}
              copy={copy}
            />
          ) : null
        }
        ListFooterComponent={
          vm.isLoadingMore ? (
            <View style={{ py: 16, paddingVertical: 16 }}>
              <ActivityIndicator color={BRAND} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

export default BlogsScreen;
