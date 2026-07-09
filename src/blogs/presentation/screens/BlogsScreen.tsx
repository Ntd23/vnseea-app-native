// Description: Renders real WoWonder articles with pagination and detail navigation.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
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

function formatDate(timestamp: number | undefined, fallback: string | undefined): string {
  if (!timestamp) return fallback || '';
  const date = new Date(timestamp * 1000);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function ArticleCard({
  article,
  onOpen,
  copy,
  language,
}: {
  article: BlogsItem;
  onOpen: () => void;
  copy: Record<string, string>;
  language: AppLanguage;
}) {
  const categoryKeyMap: Record<string, string> = {
    vehicles: 'categoryVehicles',
    comedy: 'categoryComedy',
    business: 'categoryBusiness',
    education: 'categoryEducation',
    entertainment: 'categoryEntertainment',
    movies: 'categoryMovies',
    gaming: 'categoryGaming',
    history: 'categoryHistory',
    lifestyle: 'categoryLifestyle',
    nature: 'categoryNature',
    news: 'categoryNews',
    people: 'categoryPeople',
    pets: 'categoryPets',
    places: 'categoryPlaces',
    science: 'categoryScience',
    sports: 'categorySports',
    travel: 'categoryTravel',
    other: 'categoryOther',
  };

  const catKey = categoryKeyMap[article.categoryId || ''] || categoryKeyMap[String(article.category || '').toLowerCase()];
  const displayCategory = (catKey ? copy[catKey] : undefined) || article.category || copy.categoryOther || copy.article;

  const displayDate = formatDate(article.postedAt, article.postedLabel);
  const authorName = article.author.name || article.author.username || 'User';

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onOpen}
      style={{
        height: 270,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 16,
      }}
    >
      {article.thumbnailUrl ? (
        <Image
          source={{ uri: article.thumbnailUrl }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1e293b', alignItems: 'center', justifyContent: 'center' }}>
          <FileText size={48} color="rgba(255,255,255,0.2)" strokeWidth={1.5} />
        </View>
      )}

      {/* Dark overlay gradient for beautiful white text readability */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
        <Svg height="100%" width="100%">
          <Defs>
            <LinearGradient id={`cardGrad-${article.id}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#000000" stopOpacity={0.15} />
              <Stop offset="50%" stopColor="#000000" stopOpacity={0.4} />
              <Stop offset="100%" stopColor="#000000" stopOpacity={0.85} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#cardGrad-${article.id})`} />
        </Svg>
      </View>

      {/* Top Left Category Badge Pill */}
      <View
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          borderRadius: 6,
          paddingHorizontal: 10,
          paddingVertical: 5,
        }}
      >
        <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '700' }}>
          {displayCategory}
        </Text>
      </View>

      {/* Bottom info content overlay */}
      <View
        style={{
          position: 'absolute',
          bottom: 18,
          left: 18,
          right: 18,
        }}
      >
        <Text
          style={{
            color: '#ffffff',
            fontSize: 20,
            fontWeight: '800',
            lineHeight: 26,
            marginBottom: 6,
            textShadowColor: 'rgba(0,0,0,0.4)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 3,
          }}
          numberOfLines={3}
        >
          {article.title}
        </Text>

        <Text
          style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: 13,
            fontWeight: '600',
            marginBottom: 12,
          }}
        >
          {`${authorName}  •  ${displayDate}`}
        </Text>

        <View
          style={{
            alignSelf: 'flex-start',
            backgroundColor: '#ffffff',
            borderRadius: 6,
            paddingHorizontal: 16,
            paddingVertical: 8,
            shadowColor: '#000000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <Text style={{ color: '#1e293b', fontSize: 13, fontWeight: '700' }}>
            {copy.readMore || 'Đọc thêm'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function BlogsScreen() {
  const navigation = useNavigation<BlogsNav>();
  const { width: screenWidth } = Dimensions.get('window');
  const route = useRoute();
  const vm = useBlogsViewModel();
  const [searchText, setSearchText] = useState('');
  const [language] = useState<AppLanguage>(languageStorage.getLanguage());
  const copy = getBlogsCopy(language);
  const categoryOptions = [{ id: 'all', label: copy.categoryAll }, ...vm.categories];
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
      
      if (params?.category !== undefined) {
        console.log('[BlogsScreen] Setting category:', params.category === 'all' ? null : params.category);
        handleCategoryChange(params.category === 'all' ? null : params.category);
      }
      if (params?.searchQuery !== undefined) {
        console.log('[BlogsScreen] Setting search query:', params.searchQuery);
        handleViewModelSearchChange(params.searchQuery);
        setSearchText(params.searchQuery);
      }
      if (params?.sortBy) {
        console.log('[BlogsScreen] Setting sort by:', params.sortBy);
        handleSortChange(params.sortBy);
      }
      if (params?.myPostsOnly !== undefined) {
        console.log('[BlogsScreen] Setting my posts only:', params.myPostsOnly);
        handleMyPostsOnlyChange(params.myPostsOnly);
      }
      
    }, [
      route.params,
      handleCategoryChange,
      handleViewModelSearchChange,
      handleSortChange,
      handleMyPostsOnlyChange,
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

  useEffect(() => {
    void loadFirstPage(false);
  }, [loadFirstPage, vm.selectedCategory]);

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
        language={language}
      />
    ),
    [navigation, copy, language],
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
          <View style={{ backgroundColor: '#ffffff' }}>
            {/* 1. Purple-Blue Gradient Header Banner */}
            <View style={{ height: 210, position: 'relative', overflow: 'hidden', justifyContent: 'center' }}>
              <Svg pointerEvents="none" width={screenWidth} height={210} style={{ position: 'absolute', left: 0, top: 0 }}>
                <Defs>
                  <LinearGradient id="blogsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <Stop offset="0%" stopColor="#3b82f6" />
                    <Stop offset="100%" stopColor="#7c3aed" />
                  </LinearGradient>
                </Defs>
                <Rect width={screenWidth} height={210} fill="url(#blogsGrad)" />
              </Svg>

              <View style={{ paddingHorizontal: 20, paddingBottom: 20 }}>
                <Text style={{ fontSize: 32, fontWeight: '800', color: '#ffffff', lineHeight: 40, marginBottom: 16, textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 }}>
                  {`Các bài báo gần\nđây nhất`}
                </Text>

                {/* My articles toggle button */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate(ROUTES.MY_ARTICLES)}
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: vm.myPostsOnly ? '#f59e0b' : '#fde047',
                    borderRadius: 10,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: '700', color: vm.myPostsOnly ? '#ffffff' : '#78350f' }}>
                    {copy.myPosts}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Overlapping white card container */}
            <View style={{ marginTop: -24, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#ffffff', paddingTop: 24 }}>
              {/* 2. Search Input bar */}
              <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, borderRadius: 10, backgroundColor: '#f3f4f6', paddingHorizontal: 14, paddingVertical: 10 }}>
                  <Search size={18} color="#9ca3af" />
                  <TextInput
                    style={{ flex: 1, color: '#1f2937', fontSize: 14, paddingVertical: 2, marginLeft: 8 }}
                    placeholder={copy.searchPlaceholder}
                    placeholderTextColor="#9ca3af"
                    value={searchText}
                    onChangeText={handleSearchChange}
                  />
                  {searchText.length > 0 && (
                    <TouchableOpacity
                      className="h-6 w-6 items-center justify-center rounded-full"
                      activeOpacity={0.7}
                      onPress={clearSearch}
                    >
                      <X size={16} color="#9ca3af" />
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
                  
                  const categoryKeyMap: Record<string, string> = {
                    all: 'categoryAll',
                    vehicles: 'categoryVehicles',
                    comedy: 'categoryComedy',
                    business: 'categoryBusiness',
                    education: 'categoryEducation',
                    entertainment: 'categoryEntertainment',
                    movies: 'categoryMovies',
                    gaming: 'categoryGaming',
                    history: 'categoryHistory',
                    lifestyle: 'categoryLifestyle',
                    nature: 'categoryNature',
                    news: 'categoryNews',
                    people: 'categoryPeople',
                    pets: 'categoryPets',
                    places: 'categoryPlaces',
                    science: 'categoryScience',
                    sports: 'categorySports',
                    travel: 'categoryTravel',
                    other: 'categoryOther',
                  };

                  const displayLabel = copy[categoryKeyMap[cat.id]] || cat.label;

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
                      }}
                      style={{
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 20,
                        backgroundColor: isSelected ? '#3b82f6' : '#eff6ff',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: isSelected ? '#ffffff' : '#3b82f6',
                        }}
                      >
                        {displayLabel}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
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
            <View style={{ paddingVertical: 16 }}>
              <ActivityIndicator color={BRAND} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

export default BlogsScreen;
