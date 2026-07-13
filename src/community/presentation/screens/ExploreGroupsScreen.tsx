// Description: Shows real WoWonder groups from Settings with website-style filters.
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
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
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import type {
  GroupItem,
  GroupsFilter,
} from '../../domain/types/community.types';

type ExploreGroupsNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000FF';

const EXPLORE_GROUPS_COPY = {
  vi: {
    tabMine: 'Nhóm của tôi',
    tabSuggested: 'Đề xuất',
    tabJoined: 'Đã tham gia',
    titleMine: 'Nhóm của bạn',
    subtitleMine: 'Quản lý các nhóm bạn đã tạo hoặc đang là quản trị viên.',
    titleSuggested: 'Nhóm được đề xuất',
    subtitleSuggested: 'Khám phá các cộng đồng phù hợp để tham gia.',
    titleJoined: 'Nhóm đã tham gia',
    subtitleJoined: 'Các cộng đồng bạn đang theo dõi sẽ hiển thị tại đây.',
    emptyTitleSuggested: 'Chưa có nhóm đề xuất',
    emptySubtitleSuggested: 'Hiện chưa có cộng đồng phù hợp để đề xuất cho bạn.',
    emptyActionRetry: 'Thử lại',
    emptyTitleJoined: 'Bạn chưa tham gia nhóm nào',
    emptySubtitleJoined: 'Các nhóm bạn tham gia sẽ xuất hiện trong mục này.',
    emptyTitleMine: 'Bạn chưa có nhóm nào',
    emptySubtitleMine: 'Những nhóm bạn tạo hoặc quản lý sẽ hiển thị ở đây.',
    emptyActionCreate: 'Tạo nhóm mới',
    btnCreate: 'Tạo ra',
    btnEdit: 'Chỉnh sửa',
    btnView: 'Xem nhóm',
    membersSuffix: 'Các thành viên',
  },
  en: {
    tabMine: 'My Groups',
    tabSuggested: 'Suggested',
    tabJoined: 'Joined',
    titleMine: 'Your Groups',
    subtitleMine: 'Manage groups you created or admin.',
    titleSuggested: 'Suggested Groups',
    subtitleSuggested: 'Discover communities to join.',
    titleJoined: 'Joined Groups',
    subtitleJoined: 'Communities you follow will display here.',
    emptyTitleSuggested: 'No suggested groups',
    emptySubtitleSuggested: 'There are currently no matching communities to suggest to you.',
    emptyActionRetry: 'Retry',
    emptyTitleJoined: 'You haven\'t joined any groups',
    emptySubtitleJoined: 'Groups you join will appear in this section.',
    emptyTitleMine: 'You don\'t have any groups',
    emptySubtitleMine: 'Groups you create or manage will be shown here.',
    emptyActionCreate: 'Create new group',
    btnCreate: 'Create',
    btnEdit: 'Edit',
    btnView: 'View Group',
    membersSuffix: 'Members',
  }
};

function getFilterCopy(filter: GroupsFilter, copy: any) {
  switch (filter) {
    case 'mine':
      return {
        id: 'mine',
        label: copy.tabMine,
        title: copy.titleMine,
        subtitle: copy.subtitleMine,
      };
    case 'suggested':
      return {
        id: 'suggested',
        label: copy.tabSuggested,
        title: copy.titleSuggested,
        subtitle: copy.subtitleSuggested,
      };
    case 'joined':
      return {
        id: 'joined',
        label: copy.tabJoined,
        title: copy.titleJoined,
        subtitle: copy.subtitleJoined,
      };
  }
}

function getEmptyCopy(filter: GroupsFilter, copy: any) {
  if (filter === 'suggested') {
    return {
      title: copy.emptyTitleSuggested,
      subtitle: copy.emptySubtitleSuggested,
      action: copy.emptyActionRetry,
    };
  }

  if (filter === 'joined') {
    return {
      title: copy.emptyTitleJoined,
      subtitle: copy.emptySubtitleJoined,
      action: copy.emptyActionRetry,
    };
  }

  return {
    title: copy.emptyTitleMine,
    subtitle: copy.emptySubtitleMine,
    action: copy.emptyActionCreate,
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
  copy,
}: {
  filter: GroupsFilter;
  error: string | null;
  onCreate: () => void;
  onRetry: () => void;
  copy: any;
}) {
  const emptyCopy = getEmptyCopy(filter, copy);
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
  onCreate,
  copy,
}: {
  activeFilter: GroupsFilter;
  onChange: (filter: GroupsFilter) => void;
  onCreate: () => void;
  copy: any;
}) {
  const [contentWidth, setContentWidth] = React.useState(0);
  const [width, setWidth] = React.useState(0);
  const scrollX = React.useRef(new Animated.Value(0)).current;

  const showIndicator = contentWidth > width && width > 0;
  const thumbWidth = showIndicator ? Math.max(20, (width / contentWidth) * width) : 0;

  return (
    <View style={{ height: 56, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#FFFFFF' }}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, height: '100%', justifyContent: 'center' }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={(w) => setContentWidth(w)}
            onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 4 }}
            style={{ flex: 1 }}
          >
            {/* Tab: Nhóm của tôi */}
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => onChange('mine')}
              style={{
                height: '100%',
                justifyContent: 'center',
                paddingHorizontal: 12,
                borderBottomWidth: 3,
                borderBottomColor: activeFilter === 'mine' ? '#002fff' : 'transparent',
              }}
            >
              <Text
                style={{
                  color: activeFilter === 'mine' ? '#0f172a' : '#64748b',
                  fontSize: 13,
                  fontWeight: activeFilter === 'mine' ? '800' : '700',
                }}
              >
                {copy.tabMine}
              </Text>
            </TouchableOpacity>

            {/* Tab: Các nhóm được đề xuất */}
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => onChange('suggested')}
              style={{
                height: '100%',
                justifyContent: 'center',
                paddingHorizontal: 12,
                borderBottomWidth: 3,
                borderBottomColor: activeFilter === 'suggested' ? '#002fff' : 'transparent',
              }}
            >
              <Text
                style={{
                  color: activeFilter === 'suggested' ? '#0f172a' : '#64748b',
                  fontSize: 13,
                  fontWeight: activeFilter === 'suggested' ? '800' : '700',
                }}
              >
                {copy.titleSuggested}
              </Text>
            </TouchableOpacity>

            {/* Tab: Các nhóm đã tham gia */}
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => onChange('joined')}
              style={{
                height: '100%',
                justifyContent: 'center',
                paddingHorizontal: 12,
                borderBottomWidth: 3,
                borderBottomColor: activeFilter === 'joined' ? '#002fff' : 'transparent',
              }}
            >
              <Text
                style={{
                  color: activeFilter === 'joined' ? '#0f172a' : '#64748b',
                  fontSize: 13,
                  fontWeight: activeFilter === 'joined' ? '800' : '700',
                }}
              >
                {copy.titleJoined}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Custom Scroll Indicator */}
          {showIndicator && (
            <View style={{ position: 'absolute', bottom: 4, left: 0, right: 0, height: 2, backgroundColor: '#F1F5F9', pointerEvents: 'none' }}>
              <Animated.View
                style={{
                  width: thumbWidth,
                  height: '100%',
                  backgroundColor: '#94A3B8',
                  borderRadius: 1,
                  transform: [
                    {
                      translateX: scrollX.interpolate({
                        inputRange: [0, Math.max(1, contentWidth - width)],
                        outputRange: [0, width - thumbWidth],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                }}
              />
            </View>
          )}
        </View>

        {/* Button: + Tạo ra */}
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={onCreate}
          style={{
            marginRight: 16,
            minHeight: 34,
            borderRadius: 6,
            backgroundColor: '#002fff',
            paddingHorizontal: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <Plus size={14} color="#ffffff" />
          <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '900' }}>{copy.btnCreate}</Text>
        </TouchableOpacity>
      </View>
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

function GroupCard({
  group,
  onOpenProfile,
  onAction,
  copy,
}: {
  group: GroupItem;
  onOpenProfile: () => void;
  onAction: () => void;
  copy: any;
}) {
  const handleAction = () => {
    onAction();
  };

  return (
    <View 
      style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 16,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      {/* Cover Image - 1:1 Aspect Ratio (Square) */}
      <TouchableOpacity
        activeOpacity={0.86}
        onPress={onOpenProfile}
        style={{ aspectRatio: 1, backgroundColor: '#ffe4e6' }}
      >
        {group.cover ? (
          <Image
            source={{ uri: group.cover }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : group.avatar ? (
          <Image
            source={{ uri: group.avatar }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffe4e6' }}>
            <Users size={80} color="#f43f5e" strokeWidth={1.5} />
          </View>
        )}
      </TouchableOpacity>

      {/* Info and Full-width Button */}
      <View style={{ padding: 16 }}>
        <TouchableOpacity activeOpacity={0.82} onPress={onOpenProfile}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: '#0f172a' }} numberOfLines={1}>
            {group.groupTitle || group.groupName || 'Nhóm'}
          </Text>
        </TouchableOpacity>
        
        <Text style={{ fontSize: 13, color: '#64748b', marginTop: 4, marginBottom: 12 }}>
          {formatCount(group.members)} {copy.membersSuffix}
        </Text>

        {/* Full-width Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleAction}
          style={{
            backgroundColor: '#e2e8f0',
            borderRadius: 8,
            height: 40,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#0f172a' }}>
            {group.isOwner ? copy.btnEdit : copy.btnView}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ExploreGroupsScreen() {
  const language = useAppLanguage();
  const copy = EXPLORE_GROUPS_COPY[language] ?? EXPLORE_GROUPS_COPY.vi;
  const navigation = useNavigation<ExploreGroupsNav>();
  const vm = useMyGroupsViewModel();
  const activeCopy = getFilterCopy(vm.activeFilter, copy);

  useFocusEffect(
    useCallback(() => {
      void vm.loadFirstPage(false);
    }, [vm.loadFirstPage]),
  );

  const handleCreate = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_GROUP);
  }, [navigation]);

  const handleOpenGroupProfile = useCallback((group: GroupItem) => {
    navigation.navigate(ROUTES.GROUP_DETAIL, { group });
  }, [navigation]);

  const handleGroupAction = useCallback((group: GroupItem) => {
    if (group.isOwner) {
      navigation.navigate(ROUTES.EDIT_GROUP, { group });
      return;
    }

    navigation.navigate(ROUTES.GROUP_DETAIL, { group });
  }, [navigation]);

  const renderGroup = useCallback(
    ({ item }: ListRenderItemInfo<GroupItem>) => (
      <GroupCard
        group={item}
        onOpenProfile={() => handleOpenGroupProfile(item)}
        onAction={() => handleGroupAction(item)}
        copy={copy}
      />
    ),
    [copy, handleGroupAction, handleOpenGroupProfile],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaFeedHeader />

      {/* Sticky Tab Bar Header */}
      <FilterTabs
        activeFilter={vm.activeFilter}
        onChange={vm.setActiveFilter}
        onCreate={handleCreate}
        copy={copy}
      />

      <FlatList
        className="flex-1"
        data={vm.groups}
        keyExtractor={item => String(item.id)}
        renderItem={renderGroup}
        contentContainerClassName="px-4 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={vm.isRefreshing}
            onRefresh={vm.refresh}
            tintColor="#002fff"
            colors={['#002fff']}
          />
        }
        onEndReached={vm.loadMore}
        onEndReachedThreshold={0.45}
        ListEmptyComponent={
          vm.isLoading ? (
            <GroupsSkeleton />
          ) : (
            <EmptyState
              filter={vm.activeFilter}
              error={vm.error}
              onCreate={handleCreate}
              onRetry={vm.retry}
              copy={copy}
            />
          )
        }
        ListFooterComponent={
          vm.isLoadingMore ? (
            <View className="py-4">
              <ActivityIndicator color="#002fff" />
            </View>
          ) : null
        }
      />
    </View>
  );
}

export default ExploreGroupsScreen;
