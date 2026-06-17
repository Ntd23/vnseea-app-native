// Description: Shows real WoWonder groups from Settings with website-style filters.
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  ExternalLink,
  Lock,
  Plus,
  RotateCw,
  Search,
  Users,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useMyGroupsViewModel } from '../../application/view-models/useMyGroupsViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import type {
  GroupItem,
  GroupsFilter,
} from '../../domain/types/community.types';

type ExploreGroupsNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000FF';

const FILTERS: Array<{
  id: GroupsFilter;
  label: string;
  title: string;
  subtitle: string;
}> = [
  {
    id: 'mine',
    label: 'Nhóm của tôi',
    title: 'Nhóm của bạn',
    subtitle: 'Quản lý các nhóm bạn đã tạo hoặc đang là quản trị viên.',
  },
  {
    id: 'suggested',
    label: 'Đề xuất',
    title: 'Nhóm được đề xuất',
    subtitle: 'Khám phá các cộng đồng phù hợp để tham gia.',
  },
  {
    id: 'joined',
    label: 'Đã tham gia',
    title: 'Nhóm đã tham gia',
    subtitle: 'Các cộng đồng bạn đang theo dõi sẽ hiển thị tại đây.',
  },
];

function getFilterCopy(filter: GroupsFilter) {
  return FILTERS.find(item => item.id === filter) ?? FILTERS[0];
}

function getEmptyCopy(filter: GroupsFilter) {
  if (filter === 'suggested') {
    return {
      title: 'Chưa có nhóm đề xuất',
      subtitle: 'Hiện chưa có cộng đồng phù hợp để đề xuất cho bạn.',
      action: 'Thử lại',
    };
  }

  if (filter === 'joined') {
    return {
      title: 'Bạn chưa tham gia nhóm nào',
      subtitle: 'Các nhóm bạn tham gia sẽ xuất hiện trong mục này.',
      action: 'Thử lại',
    };
  }

  return {
    title: 'Bạn chưa có nhóm nào',
    subtitle: 'Những nhóm bạn tạo hoặc quản lý sẽ hiển thị ở đây.',
    action: 'Tạo nhóm mới',
  };
}

function formatCount(value?: number) {
  const safeValue = value ?? 0;
  if (safeValue >= 1000000) return `${(safeValue / 1000000).toFixed(1)}M`;
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(1)}K`;
  return String(safeValue);
}

function GroupsSkeleton() {
  return (
    <View className="gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <View key={index} className="surface-card overflow-hidden">
          <View className="h-32 w-full bg-slate-200" />
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
  filter: GroupsFilter;
  error: string | null;
  onCreate: () => void;
  onRetry: () => void;
}) {
  const emptyCopy = getEmptyCopy(filter);
  const showCreateAction = !error && filter === 'mine';

  return (
    <View className="items-center px-6 py-16">
      <View className="icon-chip h-20 w-20 items-center justify-center">
        {error ? (
          <RotateCw size={38} color={BRAND} />
        ) : (
          <Users size={38} color={BRAND} />
        )}
      </View>
      <Text className="mt-5 text-center text-heading">
        {error ? 'Không tải được nhóm' : emptyCopy.title}
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
        <Text className="text-title-primary text-inverse">
          {error ? 'Thử lại' : emptyCopy.action}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function FilterTabs({
  activeFilter,
  onChange,
}: {
  activeFilter: GroupsFilter;
  onChange: (filter: GroupsFilter) => void;
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
              style={{ color: isActive ? BRAND : '#64748B' }}
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

function GroupAvatar({ group }: { group: GroupItem }) {
  if (group.avatar) {
    return (
      <Image
        source={{ uri: group.avatar }}
        className="h-16 w-16 rounded-full border-4 border-white bg-white"
        resizeMode="cover"
      />
    );
  }

  return (
    <View className="h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#EEF2FF]">
      <Users size={28} color={BRAND} />
    </View>
  );
}

function GroupCover({ group }: { group: GroupItem }) {
  if (group.cover) {
    return (
      <Image
        source={{ uri: group.cover }}
        className="h-32 w-full bg-slate-200"
        resizeMode="cover"
      />
    );
  }

  return (
    <View className="h-32 w-full items-center justify-center bg-[#EEF2FF]">
      <Users size={42} color="rgba(0,0,255,0.34)" strokeWidth={1.8} />
    </View>
  );
}

function GroupCard({ group, onOpen }: { group: GroupItem; onOpen: () => void }) {
  const privacyLabel = group.privacy === 'private' ? 'Riêng tư' : 'Công khai';

  return (
    <View className="surface-card mb-4 overflow-hidden">
      <GroupCover group={group} />

      <View className="px-4 pb-4">
        <View className="-mt-8 flex-row items-end justify-between">
          <GroupAvatar group={group} />
          <TouchableOpacity
            className="rounded-full bg-[#0000FF] px-4 py-2"
            activeOpacity={0.85}
            onPress={onOpen}
          >
            <View className="flex-row items-center">
              <ExternalLink size={16} color="#FFFFFF" />
              <Text className="ml-2 text-caption-primary text-inverse">
                Xem nhóm
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text className="mt-3 text-title-primary" numberOfLines={2}>
          {group.groupTitle || group.groupName || 'Nhóm'}
        </Text>

        {group.groupName ? (
          <Text className="mt-1 text-caption-secondary" numberOfLines={1}>
            @{group.groupName}
          </Text>
        ) : null}

        {group.about ? (
          <Text className="mt-3 text-body-secondary" numberOfLines={3}>
            {group.about}
          </Text>
        ) : null}

        <View className="mt-4 flex-row flex-wrap gap-3">
          <View className="flex-row items-center rounded-full bg-slate-100 px-3 py-2">
            {group.privacy === 'private' ? (
              <Lock size={15} color="#64748B" />
            ) : (
              <Users size={15} color="#64748B" />
            )}
            <Text className="ml-2 text-caption-secondary">{privacyLabel}</Text>
          </View>

          <View className="flex-row items-center rounded-full bg-slate-100 px-3 py-2">
            <Users size={15} color={BRAND} />
            <Text className="ml-2 text-caption-primary">
              {formatCount(group.members)} thành viên
            </Text>
          </View>

          {group.isOwner ? (
            <View className="flex-row items-center rounded-full bg-blue-50 px-3 py-2">
              <Text className="text-caption-primary text-brand">
                Bạn quản lý
              </Text>
            </View>
          ) : group.isJoined ? (
            <View className="flex-row items-center rounded-full bg-blue-50 px-3 py-2">
              <Text className="text-caption-primary text-brand">
                Đã tham gia
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function ExploreGroupsScreen() {
  const navigation = useNavigation<ExploreGroupsNav>();
  const vm = useMyGroupsViewModel();
  const activeCopy = getFilterCopy(vm.activeFilter);

  useFocusEffect(
    useCallback(() => {
      void vm.loadFirstPage(false);
    }, [vm.loadFirstPage]),
  );

  const handleCreate = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_GROUP);
  }, [navigation]);

  const handleOpenGroup = useCallback((group: GroupItem) => {
    if (!group.url) return;
    void Linking.openURL(group.url);
  }, []);

  const renderGroup = useCallback(
    ({ item }: ListRenderItemInfo<GroupItem>) => (
      <GroupCard group={item} onOpen={() => handleOpenGroup(item)} />
    ),
    [handleOpenGroup],
  );

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View className="surface-topbar h-16 flex-row items-center justify-between px-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text className="ml-3 text-heading">Nhóm</Text>
        </View>

        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={() => navigation.navigate(ROUTES.SEARCH)}
          >
            <Search size={21} color={BRAND} />
          </TouchableOpacity>
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={handleCreate}
          >
            <Plus size={23} color={BRAND} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        className="flex-1"
        data={vm.groups}
        keyExtractor={item => String(item.id)}
        renderItem={renderGroup}
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
          <>
            <View className="preview-panel mb-5 flex-row items-center p-4">
              <View className="icon-chip h-14 w-14 items-center justify-center">
                <Users size={28} color={BRAND} />
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
            <GroupsSkeleton />
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
              <ActivityIndicator color={BRAND} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

export default ExploreGroupsScreen;
