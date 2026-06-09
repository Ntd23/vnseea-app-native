// Description: Shows real WoWonder pages from Settings with website-style filters.
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
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Edit3,
  ExternalLink,
  Flag,
  MapPin,
  Plus,
  RotateCw,
  Search,
  ThumbsUp,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useMyPagesViewModel } from '../../application/view-models/useMyPagesViewModel';
import type { PagesFilter, PagesItem } from '../../domain/types/pages.types';

type PagesNav = NativeStackNavigationProp<RootStackParamList>;

const FILTERS: Array<{
  id: PagesFilter;
  label: string;
  title: string;
  subtitle: string;
}> = [
  {
    id: 'mine',
    label: 'Trang của tôi',
    title: 'Trang của bạn',
    subtitle: 'Quản lý các trang bạn đã tạo hoặc đang là quản trị viên.',
  },
  {
    id: 'suggested',
    label: 'Đề xuất',
    title: 'Trang được đề xuất',
    subtitle: 'Khám phá các trang phù hợp để theo dõi thêm.',
  },
  {
    id: 'liked',
    label: 'Đã yêu thích',
    title: 'Trang đã yêu thích',
    subtitle: 'Những trang bạn đã thích sẽ hiển thị ở đây.',
  },
];

function getFilterCopy(filter: PagesFilter) {
  return FILTERS.find(item => item.id === filter) ?? FILTERS[0];
}

function getEmptyCopy(filter: PagesFilter) {
  if (filter === 'suggested') {
    return {
      title: 'Chưa có trang đề xuất',
      subtitle: 'Hiện chưa có trang phù hợp để đề xuất cho bạn.',
      action: 'Thử lại',
    };
  }

  if (filter === 'liked') {
    return {
      title: 'Chưa có trang đã yêu thích',
      subtitle: 'Các trang bạn đã thích sẽ xuất hiện trong mục này.',
      action: 'Thử lại',
    };
  }

  return {
    title: 'Bạn chưa có trang nào',
    subtitle: 'Những trang bạn tạo hoặc quản lý sẽ hiển thị ở đây.',
    action: 'Tạo trang mới',
  };
}

function formatCount(value?: number) {
  const safeValue = value ?? 0;
  if (safeValue >= 1000000) return `${(safeValue / 1000000).toFixed(1)}M`;
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(1)}K`;
  return String(safeValue);
}

function PagesSkeleton() {
  return (
    <View className="gap-4">
      {Array.from({ length: 5 }).map((_, index) => (
        <View key={index} className="surface-card overflow-hidden">
          <View className="h-28 w-full bg-slate-200" />
          <View className="px-4 pb-4">
            <View className="-mt-8 h-16 w-16 rounded-full border-4 border-white bg-slate-100" />
            <View className="mt-3 h-5 w-2/3 rounded-full bg-slate-200" />
            <View className="mt-2 h-4 w-1/2 rounded-full bg-slate-100" />
            <View className="mt-4 h-10 w-full rounded-xl bg-slate-100" />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyState({
  filter,
  error,
  onCreate,
  onRetry,
}: {
  filter: PagesFilter;
  error: string | null;
  onCreate: () => void;
  onRetry: () => void;
}) {
  const emptyCopy = getEmptyCopy(filter);
  const showCreateAction = !error && filter === 'mine';
  const actionLabel = error ? 'Thử lại' : emptyCopy.action;

  return (
    <View className="items-center px-6 py-16">
      <View className="icon-chip h-20 w-20 items-center justify-center">
        {error ? (
          <RotateCw size={38} color="#0000FF" />
        ) : (
          <Flag size={38} color="#0000FF" />
        )}
      </View>
      <Text className="mt-5 text-center text-heading">
        {error ? 'Không tải được trang' : emptyCopy.title}
      </Text>
      <Text className="mt-2 text-center text-body-secondary">
        {error ?? emptyCopy.subtitle}
      </Text>

      <TouchableOpacity
        className="btn-primary mt-6 min-h-[46px] rounded-xl px-6"
        activeOpacity={0.85}
        onPress={showCreateAction ? onCreate : onRetry}
      >
        {showCreateAction ? (
          <Plus size={18} color="#FFFFFF" />
        ) : (
          <RotateCw size={18} color="#FFFFFF" />
        )}
        <Text className="text-title-primary text-inverse">{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

function FilterTabs({
  activeFilter,
  onChange,
}: {
  activeFilter: PagesFilter;
  onChange: (filter: PagesFilter) => void;
}) {
  return (
    <View className="mb-4 flex-row rounded-2xl bg-slate-100 p-1">
      {FILTERS.map(filter => {
        const isActive = filter.id === activeFilter;

        return (
          <TouchableOpacity
            key={filter.id}
            className="min-h-[40px] flex-1 items-center justify-center rounded-xl px-2"
            style={
              isActive
                ? {
                    backgroundColor: '#FFFFFF',
                    borderColor: '#E2E8F0',
                    borderWidth: 1,
                  }
                : undefined
            }
            activeOpacity={0.82}
            onPress={() => onChange(filter.id)}
          >
            <Text
              className="text-caption-primary"
              style={{ color: isActive ? '#0000FF' : '#64748B' }}
              numberOfLines={1}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function PageAvatar({ page }: { page: PagesItem }) {
  if (page.avatar) {
    return (
      <Image
        source={{ uri: page.avatar }}
        className="h-16 w-16 rounded-full border-4 border-white bg-white"
        resizeMode="cover"
      />
    );
  }

  return (
    <View className="h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#EEF2FF]">
      <Flag size={28} color="#0000FF" />
    </View>
  );
}

function PageCover({ page }: { page: PagesItem }) {
  if (page.cover) {
    return (
      <Image
        source={{ uri: page.cover }}
        className="h-32 w-full bg-slate-200"
        resizeMode="cover"
      />
    );
  }

  return (
    <View className="h-32 w-full items-center justify-center bg-[#EEF2FF]">
      <Flag size={42} color="rgba(0,0,255,0.34)" strokeWidth={1.8} />
    </View>
  );
}

function PageCard({
  page,
  onEdit,
  onOpen,
}: {
  page: PagesItem;
  onEdit?: () => void;
  onOpen: () => void;
}) {
  return (
    <View className="surface-card mb-4 overflow-hidden">
      <PageCover page={page} />

      <View className="px-4 pb-4">
        <View className="-mt-8 flex-row items-end justify-between">
          <PageAvatar page={page} />
          <View className="flex-row items-center gap-2">
            {onEdit ? (
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
                activeOpacity={0.85}
                onPress={onEdit}
              >
                <Edit3 size={17} color="#0F172A" />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              className="rounded-full bg-[#0000FF] px-4 py-2"
              activeOpacity={0.85}
              onPress={onOpen}
            >
              <View className="flex-row items-center">
                <ExternalLink size={16} color="#FFFFFF" />
                <Text className="ml-2 text-caption-primary text-inverse">
                  Xem trang
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <Text className="mt-3 text-title-primary" numberOfLines={2}>
          {page.pageTitle || page.pageName || 'Trang'}
        </Text>
        {page.pageName ? (
          <Text className="mt-1 text-caption-secondary" numberOfLines={1}>
            @{page.pageName}
          </Text>
        ) : null}

        {page.pageDescription ? (
          <Text className="mt-3 text-body-secondary" numberOfLines={3}>
            {page.pageDescription}
          </Text>
        ) : null}

        <View className="mt-4 flex-row flex-wrap gap-3">
          <View className="flex-row items-center rounded-full bg-slate-100 px-3 py-2">
            <ThumbsUp size={15} color="#0000FF" />
            <Text className="ml-2 text-caption-primary">
              {formatCount(page.likes)} lượt thích
            </Text>
          </View>

          {page.isLiked ? (
            <View className="flex-row items-center rounded-full bg-blue-50 px-3 py-2">
              <ThumbsUp size={15} color="#0000FF" />
              <Text className="ml-2 text-caption-primary text-brand">
                Đã thích
              </Text>
            </View>
          ) : null}

          {page.address ? (
            <View className="flex-row items-center rounded-full bg-slate-100 px-3 py-2">
              <MapPin size={15} color="#64748B" />
              <Text className="ml-2 text-caption-secondary" numberOfLines={1}>
                {page.address}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function PagesScreen() {
  const navigation = useNavigation<PagesNav>();
  const vm = useMyPagesViewModel();
  const activeCopy = getFilterCopy(vm.activeFilter);

  useFocusEffect(
    useCallback(() => {
      void vm.loadFirstPage(false);
    }, [vm.loadFirstPage]),
  );

  const handleCreate = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_PAGE);
  }, [navigation]);

  const handleOpenPage = useCallback(
    (page: PagesItem) => {
      navigation.navigate(ROUTES.PAGE_DETAIL, { page });
    },
    [navigation],
  );

  const handleEditPage = useCallback(
    (page: PagesItem) => {
      navigation.navigate(ROUTES.EDIT_PAGE, { page });
    },
    [navigation],
  );

  const renderPage = useCallback(
    ({ item }: ListRenderItemInfo<PagesItem>) => (
      <PageCard
        page={item}
        onEdit={
          vm.activeFilter === 'mine' ? () => handleEditPage(item) : undefined
        }
        onOpen={() => handleOpenPage(item)}
      />
    ),
    [handleEditPage, handleOpenPage, vm.activeFilter],
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
          <Text className="ml-3 text-heading">Trang</Text>
        </View>

        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={() => navigation.navigate(ROUTES.SEARCH)}
          >
            <Search size={21} color="#0000FF" />
          </TouchableOpacity>
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={handleCreate}
          >
            <Plus size={23} color="#0000FF" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        className="flex-1"
        data={vm.pages}
        keyExtractor={item => String(item.id)}
        renderItem={renderPage}
        contentContainerClassName="px-4 pb-10 pt-5"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={vm.isRefreshing}
            onRefresh={vm.refresh}
            tintColor="#0000FF"
            colors={['#0000FF']}
          />
        }
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.45}
        ListHeaderComponent={
          <>
            <View className="preview-panel mb-5 flex-row items-center p-4">
              <View className="icon-chip h-14 w-14 items-center justify-center">
                <Flag size={28} color="#0000FF" />
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-heading">{activeCopy.title}</Text>
                <Text className="mt-1 text-body-secondary">
                  {activeCopy.subtitle}
                </Text>
              </View>
            </View>

            <FilterTabs
              activeFilter={vm.activeFilter}
              onChange={vm.setActiveFilter}
            />
          </>
        }
        ListEmptyComponent={
          vm.isLoading ? (
            <PagesSkeleton />
          ) : (
            <EmptyState
              filter={vm.activeFilter}
              error={vm.error}
              onCreate={handleCreate}
              onRetry={vm.retry}
            />
          )
        }
        ListFooterComponent={
          vm.isLoadingMore ? (
            <View className="py-4">
              <ActivityIndicator color="#0000FF" />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

export default PagesScreen;
