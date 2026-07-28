// Description: Shows VNSEEA groups with the same compact mobile layout used by Pages.
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ListRenderItemInfo,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Edit3,
  ExternalLink,
  Globe2,
  Lock,
  Plus,
  RotateCw,
  Tag,
  UserCheck,
  Users,
} from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useMyGroupsViewModel } from '../../application/view-models/useMyGroupsViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import type {
  GroupItem,
  GroupsFilter,
} from '../../domain/types/community.types';

type ExploreGroupsNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = APP_BRAND_COLOR;
const TEXT = '#0F172A';
const MUTED = '#64748B';
const BORDER = '#E2E8F4';
const GREEN_STATUS = '#22C55E';
const FILTERS: GroupsFilter[] = ['mine', 'suggested', 'joined'];

type ExploreGroupsCopy = {
  tabMine: string;
  tabSuggested: string;
  tabJoined: string;
  titleMine: string;
  subtitleMine: string;
  titleSuggested: string;
  subtitleSuggested: string;
  titleJoined: string;
  subtitleJoined: string;
  emptyTitleSuggested: string;
  emptySubtitleSuggested: string;
  emptyActionRetry: string;
  emptyTitleJoined: string;
  emptySubtitleJoined: string;
  emptyTitleMine: string;
  emptySubtitleMine: string;
  emptyActionCreate: string;
  createNewGroup: string;
  editGroup: string;
  viewGroup: string;
  membersSuffix: string;
  publicGroup: string;
  privateGroup: string;
  managedGroup: string;
  joinedGroup: string;
  loadFailed: string;
  categories: Record<string, string>;
};

const EXPLORE_GROUPS_COPY: Record<AppLanguage, ExploreGroupsCopy> = {
  vi: {
    tabMine: 'Của tôi',
    tabSuggested: 'Đề xuất',
    tabJoined: 'Đã tham gia',
    titleMine: 'Nhóm của bạn',
    subtitleMine: 'Quản lý các nhóm bạn đã tạo hoặc đang là quản trị viên.',
    titleSuggested: 'Nhóm được đề xuất',
    subtitleSuggested: 'Khám phá các cộng đồng phù hợp để tham gia.',
    titleJoined: 'Nhóm đã tham gia',
    subtitleJoined: 'Các cộng đồng bạn đang theo dõi sẽ hiển thị tại đây.',
    emptyTitleSuggested: 'Chưa có nhóm đề xuất',
    emptySubtitleSuggested:
      'Hiện chưa có cộng đồng phù hợp để đề xuất cho bạn.',
    emptyActionRetry: 'Thử lại',
    emptyTitleJoined: 'Bạn chưa tham gia nhóm nào',
    emptySubtitleJoined: 'Các nhóm bạn tham gia sẽ xuất hiện trong mục này.',
    emptyTitleMine: 'Bạn chưa có nhóm nào',
    emptySubtitleMine: 'Những nhóm bạn tạo hoặc quản lý sẽ hiển thị ở đây.',
    emptyActionCreate: 'Tạo nhóm mới',
    createNewGroup: 'Tạo nhóm mới',
    editGroup: 'Chỉnh sửa nhóm',
    viewGroup: 'Xem nhóm',
    membersSuffix: 'thành viên',
    publicGroup: 'Công khai',
    privateGroup: 'Riêng tư',
    managedGroup: 'Bạn quản lý',
    joinedGroup: 'Đã tham gia',
    loadFailed: 'Không tải được nhóm',
    categories: {
      '1': 'Hài kịch',
      '2': 'Kinh tế và Thương mại',
      '3': 'Giáo dục',
      '4': 'Giải trí',
      '5': 'Phim & Hoạt hình',
      '6': 'Chơi game',
      '7': 'Lịch sử và sự kiện',
      '8': 'Cách sống',
      '9': 'Thiên nhiên',
      '10': 'Tin tức và Chính trị',
      '11': 'Con người và Quốc gia',
      '12': 'Thú cưng và Động vật',
      '13': 'Địa điểm và Khu vực',
      '14': 'Khoa học và Công nghệ',
      '15': 'Thể thao',
      '16': 'Du lịch và Sự kiện',
      '17': 'Khác',
    },
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
    emptySubtitleSuggested:
      'There are currently no matching communities to suggest to you.',
    emptyActionRetry: 'Retry',
    emptyTitleJoined: "You haven't joined any groups",
    emptySubtitleJoined: 'Groups you join will appear in this section.',
    emptyTitleMine: "You don't have any groups",
    emptySubtitleMine: 'Groups you create or manage will be shown here.',
    emptyActionCreate: 'Create new group',
    createNewGroup: 'Create Group',
    editGroup: 'Edit group',
    viewGroup: 'View Group',
    membersSuffix: 'members',
    publicGroup: 'Public',
    privateGroup: 'Private',
    managedGroup: 'You manage',
    joinedGroup: 'Joined',
    loadFailed: 'Failed to load groups',
    categories: {
      '1': 'Comedy',
      '2': 'Business',
      '3': 'Education',
      '4': 'Entertainment',
      '5': 'Film & Animation',
      '6': 'Gaming',
      '7': 'History & Facts',
      '8': 'Lifestyle',
      '9': 'Natural',
      '10': 'News & Politics',
      '11': 'People & Nations',
      '12': 'Pets & Animals',
      '13': 'Places & Regions',
      '14': 'Science & Technology',
      '15': 'Sport',
      '16': 'Travel & Events',
      '17': 'Other',
    },
  },
};

function getFilterCopy(filter: GroupsFilter, copy: ExploreGroupsCopy) {
  if (filter === 'suggested') {
    return {
      title: copy.titleSuggested,
      subtitle: copy.subtitleSuggested,
    };
  }

  if (filter === 'joined') {
    return {
      title: copy.titleJoined,
      subtitle: copy.subtitleJoined,
    };
  }

  return {
    title: copy.titleMine,
    subtitle: copy.subtitleMine,
  };
}

function getEmptyCopy(filter: GroupsFilter, copy: ExploreGroupsCopy) {
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
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 3 }).map((_, index) => (
        <View key={index} style={styles.skeletonCard}>
          <View style={styles.skeletonCover} />
          <View style={styles.skeletonContent}>
            <View style={styles.skeletonAvatar} />
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonSubtitle} />
            <View style={styles.skeletonMetaRow}>
              <View style={styles.skeletonMetaChip} />
              <View style={styles.skeletonMetaChip} />
            </View>
            <View style={styles.skeletonAction} />
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
  copy: ExploreGroupsCopy;
}) {
  const emptyCopy = getEmptyCopy(filter, copy);
  const showCreateAction = !error && filter === 'mine';

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        {error ? (
          <RotateCw size={36} color={BRAND} />
        ) : (
          <Users size={36} color={BRAND} />
        )}
      </View>
      <Text style={styles.emptyTitle}>
        {error ? copy.loadFailed : emptyCopy.title}
      </Text>
      <Text style={styles.emptySubtitle}>{error ?? emptyCopy.subtitle}</Text>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={showCreateAction ? onCreate : onRetry}
        style={styles.emptyActionButton}
      >
        {showCreateAction ? (
          <Plus size={18} color="#FFFFFF" />
        ) : (
          <RotateCw size={18} color="#FFFFFF" />
        )}
        <Text style={styles.emptyActionButtonText}>
          {error ? copy.emptyActionRetry : emptyCopy.action}
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
  copy: ExploreGroupsCopy;
}) {
  return (
    <View style={styles.filterSection}>
      <View accessibilityRole="tablist" style={styles.filterTabs}>
        {FILTERS.map(filter => {
          const isActive = filter === activeFilter;
          const label =
            filter === 'mine'
              ? copy.tabMine
              : filter === 'suggested'
              ? copy.tabSuggested
              : copy.tabJoined;

          return (
            <TouchableOpacity
              key={filter}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              activeOpacity={0.82}
              onPress={() => onChange(filter)}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
            >
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                numberOfLines={1}
                style={[
                  styles.filterTabText,
                  isActive && styles.filterTabTextActive,
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        accessibilityRole="button"
        activeOpacity={0.86}
        onPress={onCreate}
        style={styles.createGroupButton}
      >
        <View style={styles.createGroupIcon}>
          <Plus size={20} color="#FFFFFF" strokeWidth={2.6} />
        </View>
        <Text style={styles.createGroupButtonText}>{copy.createNewGroup}</Text>
        <Users size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

function GroupAvatar({ group }: { group: GroupItem }) {
  if (group.avatar) {
    return (
      <Image
        source={{ uri: group.avatar }}
        style={styles.avatarImage}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={styles.avatarPlaceholder}>
      <Users size={28} color={BRAND} />
    </View>
  );
}

function GroupCover({ group }: { group: GroupItem }) {
  if (group.cover) {
    return (
      <Image
        source={{ uri: group.cover }}
        style={styles.coverImage}
        resizeMode="cover"
      />
    );
  }

  return (
    <View style={styles.coverPlaceholder}>
      <Users size={38} color={BRAND} opacity={0.28} strokeWidth={1.8} />
    </View>
  );
}

function GroupCard({
  group,
  onOpen,
  onEdit,
  copy,
  index,
}: {
  group: GroupItem;
  onOpen: () => void;
  onEdit?: () => void;
  copy: ExploreGroupsCopy;
  index: number;
}) {
  const title = group.groupTitle || group.groupName || 'Nhóm';
  const handle = group.groupName ? `@${group.groupName}` : '';
  const isManaged = Boolean(
    group.isOwner || group.membershipStatus === 'owner',
  );
  const isJoined = Boolean(
    isManaged || group.isJoined || group.membershipStatus === 'joined',
  );
  const privacyLabel =
    group.privacy === 'private' ? copy.privateGroup : copy.publicGroup;
  const categoryLabel = group.category
    ? copy.categories[group.category] || group.category
    : '';
  const viewGroupAccessibilityLabel = `${copy.viewGroup}: ${title}`;
  const editGroupAccessibilityLabel = `${copy.editGroup}: ${title}`;
  const animationDelay = Math.min(80 + index * 60, 320);

  return (
    <Animated.View
      entering={FadeInDown.delay(animationDelay).duration(420)}
      style={styles.groupCard}
    >
      <View style={styles.groupCardCover}>
        <TouchableOpacity
          accessibilityLabel={viewGroupAccessibilityLabel}
          accessibilityRole="button"
          activeOpacity={0.9}
          onPress={onOpen}
          style={StyleSheet.absoluteFill}
        >
          <GroupCover group={group} />
          <View style={styles.groupCoverShade} />
        </TouchableOpacity>

        {onEdit ? (
          <TouchableOpacity
            accessibilityLabel={editGroupAccessibilityLabel}
            accessibilityRole="button"
            activeOpacity={0.82}
            onPress={onEdit}
            style={styles.groupEditButton}
          >
            <Edit3 size={18} color={TEXT} />
          </TouchableOpacity>
        ) : null}
      </View>

      <TouchableOpacity
        accessibilityLabel={viewGroupAccessibilityLabel}
        accessibilityRole="button"
        activeOpacity={0.78}
        onPress={onOpen}
        style={styles.groupAvatarButton}
      >
        <GroupAvatar group={group} />
        {isJoined ? <View style={styles.activeBadge} /> : null}
      </TouchableOpacity>

      <View style={styles.groupCardBody}>
        <TouchableOpacity
          accessibilityLabel={viewGroupAccessibilityLabel}
          accessibilityRole="button"
          activeOpacity={0.78}
          onPress={onOpen}
          style={styles.groupTitleArea}
        >
          <Text style={styles.groupTitle} numberOfLines={1}>
            {title}
          </Text>
          {handle ? (
            <Text style={styles.groupHandle} numberOfLines={1}>
              {handle}
            </Text>
          ) : null}
        </TouchableOpacity>

        {group.about ? (
          <Text style={styles.groupDescription} numberOfLines={2}>
            {group.about}
          </Text>
        ) : null}

        <View style={styles.groupMetaRow}>
          <View style={styles.groupMetaChip}>
            <Users size={14} color={BRAND} />
            <Text style={styles.groupMetaText} numberOfLines={1}>
              {formatCount(group.members)} {copy.membersSuffix}
            </Text>
          </View>

          <View style={styles.groupMetaChip}>
            {group.privacy === 'private' ? (
              <Lock size={14} color={MUTED} />
            ) : (
              <Globe2 size={14} color={MUTED} />
            )}
            <Text style={styles.groupMetaText} numberOfLines={1}>
              {privacyLabel}
            </Text>
          </View>

          {categoryLabel ? (
            <View style={styles.groupMetaChip}>
              <Tag size={14} color={MUTED} />
              <Text style={styles.groupMetaText} numberOfLines={1}>
                {categoryLabel}
              </Text>
            </View>
          ) : null}

          {isJoined ? (
            <View style={[styles.groupMetaChip, styles.groupStatusChip]}>
              <UserCheck size={14} color={BRAND} />
              <Text style={[styles.groupMetaText, styles.groupStatusText]}>
                {isManaged ? copy.managedGroup : copy.joinedGroup}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.groupPrimaryActions}>
          <TouchableOpacity
            accessibilityLabel={viewGroupAccessibilityLabel}
            accessibilityRole="button"
            activeOpacity={0.84}
            onPress={onOpen}
            style={styles.groupOpenButton}
          >
            <ExternalLink size={18} color="#FFFFFF" />
            <Text style={styles.groupOpenButtonText}>{copy.viewGroup}</Text>
          </TouchableOpacity>

          {onEdit ? (
            <TouchableOpacity
              accessibilityLabel={editGroupAccessibilityLabel}
              accessibilityRole="button"
              activeOpacity={0.82}
              onPress={onEdit}
              style={styles.groupEditAction}
            >
              <Edit3 size={20} color={BRAND} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

function ExploreGroupsScreen() {
  const language = useAppLanguage();
  const copy = EXPLORE_GROUPS_COPY[language] ?? EXPLORE_GROUPS_COPY.vi;
  const navigation = useNavigation<ExploreGroupsNav>();
  const {
    activeFilter,
    groups,
    hasMore,
    isLoading,
    isRefreshing,
    isLoadingMore,
    error,
    setActiveFilter,
    loadFirstPage,
    refresh,
    loadMore,
    retry,
  } = useMyGroupsViewModel();

  const activeCopy = useMemo(
    () => getFilterCopy(activeFilter, copy),
    [activeFilter, copy],
  );

  useFocusEffect(
    useCallback(() => {
      loadFirstPage(false).catch(() => undefined);
    }, [loadFirstPage]),
  );

  const handleCreate = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_GROUP);
  }, [navigation]);

  const handleOpenGroup = useCallback(
    (group: GroupItem) => {
      navigation.navigate(ROUTES.GROUP_DETAIL, { group });
    },
    [navigation],
  );

  const handleEditGroup = useCallback(
    (group: GroupItem) => {
      navigation.navigate(ROUTES.EDIT_GROUP, { group });
    },
    [navigation],
  );

  const renderGroup = useCallback(
    ({ item, index }: ListRenderItemInfo<GroupItem>) => (
      <GroupCard
        group={item}
        index={index}
        onOpen={() => handleOpenGroup(item)}
        onEdit={
          activeFilter === 'mine' && item.isOwner
            ? () => handleEditGroup(item)
            : undefined
        }
        copy={copy}
      />
    ),
    [activeFilter, copy, handleEditGroup, handleOpenGroup],
  );

  const headerBackgroundColor =
    Platform.OS === 'android' ? APP_BRAND_COLOR : '#FFFFFF';

  return (
    <View style={styles.screen}>
      <FocusAwareStatusBar
        barStyle={Platform.OS === 'android' ? 'light-content' : 'dark-content'}
        backgroundColor={headerBackgroundColor}
        translucent={false}
      />
      <SafeAreaFeedHeader safeAreaBackgroundColor={headerBackgroundColor} />

      <FilterTabs
        activeFilter={activeFilter}
        onChange={setActiveFilter}
        onCreate={handleCreate}
        copy={copy}
      />

      <FlatList
        style={styles.list}
        data={groups}
        keyExtractor={item => String(item.groupId || item.id)}
        renderItem={renderGroup}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.45}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderText}>
              <Text style={styles.sectionTitle}>{activeCopy.title}</Text>
              <Text style={styles.sectionSubtitle}>{activeCopy.subtitle}</Text>
            </View>
            <View style={styles.groupCountBadge}>
              <Text style={styles.groupCountText}>
                {groups.length}
                {hasMore && groups.length > 0 ? '+' : ''}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <GroupsSkeleton />
          ) : (
            <EmptyState
              filter={activeFilter}
              error={error}
              onCreate={handleCreate}
              onRetry={retry}
              copy={copy}
            />
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loaderFooter}>
              <ActivityIndicator color={BRAND} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },
  filterSection: {
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  filterTabs: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  filterTab: {
    minHeight: 44,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingHorizontal: 6,
  },
  filterTabActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: APP_COLORS.brand.border,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 7,
    elevation: 2,
  },
  filterTabText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  filterTabTextActive: {
    color: BRAND,
    fontWeight: '900',
  },
  createGroupButton: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: BRAND,
    paddingHorizontal: 14,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 4,
  },
  createGroupIcon: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  createGroupButtonText: {
    flex: 1,
    marginHorizontal: 11,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  list: {
    flex: 1,
    backgroundColor: '#F6F8FC',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  sectionHeader: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    color: TEXT,
    fontSize: 21,
    fontWeight: '900',
  },
  sectionSubtitle: {
    marginTop: 4,
    color: MUTED,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  groupCountBadge: {
    minWidth: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: APP_COLORS.brand.soft,
    paddingHorizontal: 10,
  },
  groupCountText: {
    color: BRAND,
    fontSize: 13,
    fontWeight: '900',
  },
  groupCard: {
    position: 'relative',
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 3,
  },
  groupCardCover: {
    height: 136,
    overflow: 'hidden',
    backgroundColor: APP_COLORS.brand.soft,
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.brand.soft,
  },
  groupCoverShade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15,23,42,0.08)',
  },
  groupEditButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.94)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 4,
  },
  groupAvatarButton: {
    position: 'absolute',
    left: 16,
    top: 98,
    zIndex: 2,
    width: 76,
    height: 76,
  },
  avatarImage: {
    width: 76,
    height: 76,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#F1F5F9',
  },
  avatarPlaceholder: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: APP_COLORS.brand.soft,
  },
  activeBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: GREEN_STATUS,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  groupCardBody: {
    padding: 16,
    paddingTop: 14,
  },
  groupTitleArea: {
    minHeight: 48,
    justifyContent: 'center',
    marginLeft: 88,
  },
  groupTitle: {
    flexShrink: 1,
    color: TEXT,
    fontSize: 19,
    fontWeight: '900',
  },
  groupHandle: {
    marginTop: 2,
    color: MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  groupDescription: {
    marginTop: 13,
    color: '#475569',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  groupMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  groupMetaChip: {
    maxWidth: '100%',
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 11,
  },
  groupMetaText: {
    flexShrink: 1,
    color: MUTED,
    fontSize: 12,
    fontWeight: '700',
  },
  groupStatusChip: {
    backgroundColor: APP_COLORS.brand.soft,
  },
  groupStatusText: {
    color: BRAND,
  },
  groupPrimaryActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  groupOpenButton: {
    minHeight: 52,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    backgroundColor: BRAND,
  },
  groupOpenButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  groupEditAction: {
    width: 52,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.brand.border,
    borderRadius: 16,
    backgroundColor: APP_COLORS.brand.soft,
  },
  skeletonContainer: {
    gap: 16,
  },
  skeletonCard: {
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
  },
  skeletonCover: {
    height: 136,
    backgroundColor: '#E2E8F0',
  },
  skeletonContent: {
    position: 'relative',
    minHeight: 196,
    padding: 16,
    paddingTop: 14,
  },
  skeletonAvatar: {
    position: 'absolute',
    left: 16,
    top: -38,
    width: 76,
    height: 76,
    borderRadius: 22,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    backgroundColor: '#E2E8F0',
  },
  skeletonTitle: {
    width: '48%',
    height: 18,
    marginLeft: 88,
    borderRadius: 9,
    backgroundColor: '#E2E8F0',
  },
  skeletonSubtitle: {
    width: '32%',
    height: 14,
    marginLeft: 88,
    marginTop: 8,
    borderRadius: 7,
    backgroundColor: '#F1F5F9',
  },
  skeletonMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 30,
  },
  skeletonMetaChip: {
    width: 110,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  skeletonAction: {
    height: 52,
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderRadius: 36,
    backgroundColor: APP_COLORS.brand.soft,
  },
  emptyTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  emptySubtitle: {
    marginTop: 6,
    color: MUTED,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyActionButton: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    borderRadius: 16,
    backgroundColor: BRAND,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyActionButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  loaderFooter: {
    alignItems: 'center',
    paddingVertical: 16,
  },
});

export default ExploreGroupsScreen;
