// Description: Dedicated global search screen for users, pages, groups, jobs, and funding.
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  BadgeCheck,
  Briefcase,
  ChevronRight,
  Flag,
  HeartHandshake,
  MapPin,
  Search,
  UserRound,
  Users,
  X,
} from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useSearchViewModel } from '../../application/view-models/useSearchViewModel';
import type {
  GlobalSearchTab,
  SearchResult,
  SearchResponse,
} from '../../domain/types/search.types';
import type { GroupItem } from '../../../community/domain/types/community.types';
import type { FundingItem } from '../../../funding/domain/types/funding.types';
import type { JobsItem } from '../../../jobs/domain/types/jobs.types';
import type { PagesItem } from '../../../pages/domain/types/pages.types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';

type SearchNav = NativeStackNavigationProp<RootStackParamList>;
type SearchRoute = RouteProp<RootStackParamList, typeof ROUTES.SEARCH>;

const BRAND = '#0000ff';
const FALLBACK_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

const COPY = {
  vi: {
    title: 'Tìm kiếm',
    placeholder: 'Tìm người, trang, nhóm, việc làm, gây quỹ...',
    promptTitle: 'Bạn muốn tìm gì?',
    promptBody: 'Nhập từ khóa để tìm người dùng, trang, nhóm, việc làm và chiến dịch gây quỹ.',
    noResults: 'Không tìm thấy kết quả',
    noResultsBody: 'Thử một từ khóa khác hoặc kiểm tra lại chính tả.',
    all: 'Tất cả',
    users: 'Người dùng',
    pages: 'Trang',
    groups: 'Nhóm',
    jobs: 'Việc làm',
    funding: 'Gây quỹ',
    seeAll: 'Xem tất cả',
    follow: 'Theo dõi',
    following: 'Đang theo dõi',
    pageFallback: 'Trang',
    groupFallback: 'Nhóm',
    jobFallback: 'Việc làm',
    fundingFallback: 'Chiến dịch gây quỹ',
    locationFallback: 'Không có địa điểm',
    companyFallback: 'Công ty',
    members: 'thành viên',
    likes: 'lượt thích',
    goal: 'Mục tiêu',
    raised: 'Đã góp',
  },
  en: {
    title: 'Search',
    placeholder: 'Search people, pages, groups, jobs, funding...',
    promptTitle: 'What are you looking for?',
    promptBody: 'Type a keyword to search users, pages, groups, jobs, and funding campaigns.',
    noResults: 'No results found',
    noResultsBody: 'Try another keyword or check your spelling.',
    all: 'All',
    users: 'People',
    pages: 'Pages',
    groups: 'Groups',
    jobs: 'Jobs',
    funding: 'Funding',
    seeAll: 'See all',
    follow: 'Follow',
    following: 'Following',
    pageFallback: 'Page',
    groupFallback: 'Group',
    jobFallback: 'Job',
    fundingFallback: 'Funding campaign',
    locationFallback: 'No location',
    companyFallback: 'Company',
    members: 'members',
    likes: 'likes',
    goal: 'Goal',
    raised: 'Raised',
  },
};

function formatCompact(value?: number | string | null) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '0';
  if (numeric >= 1000000) return `${(numeric / 1000000).toFixed(1)}M`;
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(1)}K`;
  return String(Math.round(numeric));
}

function formatMoney(value?: number | string | null, symbol = '') {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return `0${symbol}`;
  return `${numeric.toLocaleString('vi-VN')}${symbol}`;
}

function Avatar({
  uri,
  label,
  fallback,
}: {
  uri?: string;
  label: string;
  fallback: React.ReactNode;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        className="h-14 w-14 rounded-full bg-slate-100"
        resizeMode="cover"
        accessibilityLabel={label}
      />
    );
  }

  return (
    <View className="h-14 w-14 items-center justify-center rounded-full bg-[#EEF2FF]">
      {fallback}
    </View>
  );
}

function SectionHeader({
  title,
  count,
  onSeeAll,
  copy,
}: {
  title: string;
  count: number;
  onSeeAll?: () => void;
  copy: typeof COPY.vi;
}) {
  if (count === 0) return null;

  return (
    <View className="mt-5 mb-2 flex-row items-center justify-between px-4">
      <Text className="text-[17px] font-extrabold text-slate-950">
        {title} <Text className="text-slate-400">({count})</Text>
      </Text>
      {onSeeAll ? (
        <TouchableOpacity className="flex-row items-center" onPress={onSeeAll}>
          <Text className="text-[13px] font-bold text-[#0000ff]">{copy.seeAll}</Text>
          <ChevronRight size={16} color={BRAND} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function UserRow({
  user,
  onPress,
  onFollow,
  copy,
}: {
  user: SearchResult;
  onPress: () => void;
  onFollow: () => void;
  copy: typeof COPY.vi;
}) {
  return (
    <TouchableOpacity
      className="mx-4 mb-2 flex-row items-center rounded-2xl bg-white p-3"
      activeOpacity={0.86}
      onPress={onPress}
    >
      <Avatar
        uri={user.avatar || FALLBACK_AVATAR}
        label={user.name}
        fallback={<UserRound size={24} color={BRAND} />}
      />
      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text className="mr-1 flex-1 text-[15px] font-extrabold text-slate-950" numberOfLines={1}>
            {user.name || user.username}
          </Text>
          {user.verified ? <BadgeCheck size={16} color={BRAND} fill={BRAND} /> : null}
        </View>
        <Text className="mt-0.5 text-[13px] text-slate-500" numberOfLines={1}>
          @{user.username}
        </Text>
      </View>
      <TouchableOpacity
        className={`rounded-full px-3 py-2 ${
          user.isFollowing ? 'bg-slate-100' : 'bg-[#0000ff]'
        }`}
        activeOpacity={0.85}
        onPress={event => {
          event.stopPropagation();
          onFollow();
        }}
      >
        <Text
          className={`text-[12px] font-bold ${
            user.isFollowing ? 'text-slate-700' : 'text-white'
          }`}
        >
          {user.isFollowing ? copy.following : copy.follow}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function PageRow({
  page,
  onPress,
  copy,
}: {
  page: PagesItem;
  onPress: () => void;
  copy: typeof COPY.vi;
}) {
  return (
    <TouchableOpacity
      className="mx-4 mb-2 flex-row items-center rounded-2xl bg-white p-3"
      activeOpacity={0.86}
      onPress={onPress}
    >
      <Avatar
        uri={page.avatar}
        label={page.pageTitle || copy.pageFallback}
        fallback={<Flag size={24} color={BRAND} />}
      />
      <View className="ml-3 flex-1">
        <Text className="text-[15px] font-extrabold text-slate-950" numberOfLines={1}>
          {page.pageTitle || page.pageName || copy.pageFallback}
        </Text>
        <Text className="mt-0.5 text-[13px] text-slate-500" numberOfLines={1}>
          {page.pageName ? `@${page.pageName}` : page.pageDescription || copy.pageFallback}
        </Text>
      </View>
      <Text className="text-[12px] font-semibold text-slate-500">
        {page.likes ? `${formatCompact(page.likes)} ${copy.likes}` : ''}
      </Text>
    </TouchableOpacity>
  );
}

function GroupRow({
  group,
  onPress,
  copy,
}: {
  group: GroupItem;
  onPress: () => void;
  copy: typeof COPY.vi;
}) {
  return (
    <TouchableOpacity
      className="mx-4 mb-2 flex-row items-center rounded-2xl bg-white p-3"
      activeOpacity={0.86}
      onPress={onPress}
    >
      <Avatar
        uri={group.avatar}
        label={group.groupTitle || copy.groupFallback}
        fallback={<Users size={24} color={BRAND} />}
      />
      <View className="ml-3 flex-1">
        <Text className="text-[15px] font-extrabold text-slate-950" numberOfLines={1}>
          {group.groupTitle || group.groupName || copy.groupFallback}
        </Text>
        <Text className="mt-0.5 text-[13px] text-slate-500" numberOfLines={1}>
          {group.members ? `${formatCompact(group.members)} ${copy.members}` : group.about || copy.groupFallback}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function JobRow({
  job,
  onPress,
  copy,
}: {
  job: JobsItem;
  onPress: () => void;
  copy: typeof COPY.vi;
}) {
  return (
    <TouchableOpacity
      className="mx-4 mb-2 flex-row items-center rounded-2xl bg-white p-3"
      activeOpacity={0.86}
      onPress={onPress}
    >
      <Avatar
        uri={job.image || job.page?.avatar}
        label={job.title || copy.jobFallback}
        fallback={<Briefcase size={24} color={BRAND} />}
      />
      <View className="ml-3 flex-1">
        <Text className="text-[15px] font-extrabold text-slate-950" numberOfLines={1}>
          {job.title || copy.jobFallback}
        </Text>
        <Text className="mt-0.5 text-[13px] text-slate-500" numberOfLines={1}>
          {job.page?.page_title || copy.companyFallback}
        </Text>
        <View className="mt-1 flex-row items-center">
          <MapPin size={13} color="#64748b" />
          <Text className="ml-1 flex-1 text-[12px] text-slate-500" numberOfLines={1}>
            {job.location || copy.locationFallback}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function FundingRow({
  campaign,
  onPress,
  copy,
}: {
  campaign: FundingItem;
  onPress: () => void;
  copy: typeof COPY.vi;
}) {
  const raised = Number(campaign.raised || 0);
  const goal = Number(campaign.amount || 0);
  const percent = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;

  return (
    <TouchableOpacity
      className="mx-4 mb-2 flex-row items-center rounded-2xl bg-white p-3"
      activeOpacity={0.86}
      onPress={onPress}
    >
      <Avatar
        uri={campaign.image}
        label={campaign.title || copy.fundingFallback}
        fallback={<HeartHandshake size={24} color={BRAND} />}
      />
      <View className="ml-3 flex-1">
        <Text className="text-[15px] font-extrabold text-slate-950" numberOfLines={1}>
          {campaign.title || copy.fundingFallback}
        </Text>
        <Text className="mt-0.5 text-[13px] text-slate-500" numberOfLines={1}>
          {copy.raised} {formatMoney(campaign.raised)} / {copy.goal} {formatMoney(campaign.amount)}
        </Text>
        <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <View className="h-full rounded-full bg-[#0000ff]" style={{ width: `${percent}%` }} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <View className="items-center px-8 py-20">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-[#EEF2FF]">
        <Search size={28} color={BRAND} />
      </View>
      <Text className="mt-4 text-center text-[17px] font-extrabold text-slate-950">
        {title}
      </Text>
      <Text className="mt-2 text-center text-[14px] leading-5 text-slate-500">
        {body}
      </Text>
    </View>
  );
}

function getVisibleResults(results: SearchResponse, tab: GlobalSearchTab) {
  if (tab === 'all') return results;
  return {
    users: tab === 'users' ? results.users : [],
    pages: tab === 'pages' ? results.pages : [],
    groups: tab === 'groups' ? results.groups : [],
    jobs: tab === 'jobs' ? results.jobs : [],
    funding: tab === 'funding' ? results.funding : [],
  };
}

function SearchScreen() {
  const navigation = useNavigation<SearchNav>();
  const route = useRoute<SearchRoute>();
  const language = useAppLanguage();
  const copy = COPY[language];
  const {
    searchQuery,
    setSearchQuery,
    results,
    totalResults,
    activeTab,
    setActiveTab,
    isLoading,
    error,
    searchAll,
    toggleFollow,
    clearSearch,
  } = useSearchViewModel();

  useEffect(() => {
    const initialQuery = route.params?.q?.trim();
    if (initialQuery) {
      setSearchQuery(initialQuery);
      void searchAll(initialQuery);
    }
  }, [route.params?.q, searchAll, setSearchQuery]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) return;

    const timer = setTimeout(() => {
      void searchAll(query);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchAll, searchQuery]);

  const tabs = useMemo(
    () => [
      { id: 'all' as const, label: copy.all, count: totalResults },
      { id: 'users' as const, label: copy.users, count: results.users.length },
      { id: 'pages' as const, label: copy.pages, count: results.pages.length },
      { id: 'groups' as const, label: copy.groups, count: results.groups.length },
      { id: 'jobs' as const, label: copy.jobs, count: results.jobs.length },
      { id: 'funding' as const, label: copy.funding, count: results.funding.length },
    ],
    [copy, results, totalResults],
  );

  const visibleResults = getVisibleResults(results, activeTab);
  const previewLimit = activeTab === 'all' ? 5 : Number.POSITIVE_INFINITY;
  const hasQuery = searchQuery.trim().length > 0;
  const isEmpty = hasQuery && !isLoading && totalResults === 0;

  const renderSections = () => (
    <>
      <SectionHeader
        title={copy.users}
        count={visibleResults.users.length}
        copy={copy}
        onSeeAll={activeTab === 'all' && results.users.length > previewLimit ? () => setActiveTab('users') : undefined}
      />
      {visibleResults.users.slice(0, previewLimit).map(user => (
        <UserRow
          key={`user-${user.userId}`}
          user={user}
          copy={copy}
          onPress={() => navigation.navigate(ROUTES.PROFILE, { userId: user.userId })}
          onFollow={() => toggleFollow(user.userId, user.isFollowing)}
        />
      ))}

      <SectionHeader
        title={copy.pages}
        count={visibleResults.pages.length}
        copy={copy}
        onSeeAll={activeTab === 'all' && results.pages.length > previewLimit ? () => setActiveTab('pages') : undefined}
      />
      {visibleResults.pages.slice(0, previewLimit).map(page => (
        <PageRow
          key={`page-${page.id}`}
          page={page}
          copy={copy}
          onPress={() => navigation.navigate(ROUTES.PAGE_DETAIL, { page })}
        />
      ))}

      <SectionHeader
        title={copy.groups}
        count={visibleResults.groups.length}
        copy={copy}
        onSeeAll={activeTab === 'all' && results.groups.length > previewLimit ? () => setActiveTab('groups') : undefined}
      />
      {visibleResults.groups.slice(0, previewLimit).map(group => (
        <GroupRow
          key={`group-${group.id}`}
          group={group}
          copy={copy}
          onPress={() => navigation.navigate(ROUTES.GROUP_DETAIL, { group })}
        />
      ))}

      <SectionHeader
        title={copy.jobs}
        count={visibleResults.jobs.length}
        copy={copy}
        onSeeAll={activeTab === 'all' && results.jobs.length > previewLimit ? () => setActiveTab('jobs') : undefined}
      />
      {visibleResults.jobs.slice(0, previewLimit).map(job => (
        <JobRow
          key={`job-${job.id}`}
          job={job}
          copy={copy}
          onPress={() => navigation.navigate(ROUTES.JOB_DETAIL, { jobId: String(job.id), job })}
        />
      ))}

      <SectionHeader
        title={copy.funding}
        count={visibleResults.funding.length}
        copy={copy}
        onSeeAll={activeTab === 'all' && results.funding.length > previewLimit ? () => setActiveTab('funding') : undefined}
      />
      {visibleResults.funding.slice(0, previewLimit).map(campaign => (
        <FundingRow
          key={`funding-${campaign.id}`}
          campaign={campaign}
          copy={copy}
          onPress={() => navigation.navigate(ROUTES.FUNDING_DETAIL, { fundId: String(campaign.id) })}
        />
      ))}
    </>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F0F2F5]" edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View className="bg-white px-4 pb-3 pt-2">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="mr-2 h-10 w-10 items-center justify-center rounded-full bg-slate-50"
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={23} color="#0f172a" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-[22px] font-extrabold text-slate-950">
            {copy.title}
          </Text>
          <View className="h-10 w-10" />
        </View>

        <View className="mt-3 flex-row items-center rounded-full bg-slate-100 px-4 py-3">
          <Search size={20} color="#64748b" />
          <TextInput
            className="ml-3 flex-1 p-0 text-[16px] font-medium text-slate-950"
            placeholder={copy.placeholder}
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => searchAll(searchQuery)}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={clearSearch}>
              <X size={19} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View className="bg-white">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
        >
          {tabs.map(tab => {
            const isActive = tab.id === activeTab;
            return (
              <TouchableOpacity
                key={tab.id}
                className={`rounded-full px-4 py-2 ${
                  isActive ? 'bg-[#0000ff]' : 'bg-slate-100'
                }`}
                activeOpacity={0.85}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text
                  className={`text-[13px] font-bold ${
                    isActive ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {tab.label}
                  {hasQuery && tab.count > 0 ? ` ${tab.count}` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 28 }}
        showsVerticalScrollIndicator={false}
      >
        {!hasQuery ? (
          <EmptyState title={copy.promptTitle} body={copy.promptBody} />
        ) : isLoading && totalResults === 0 ? (
          <View className="items-center py-20">
            <ActivityIndicator color={BRAND} />
          </View>
        ) : isEmpty ? (
          <EmptyState title={copy.noResults} body={copy.noResultsBody} />
        ) : (
          renderSections()
        )}

        {error ? (
          <View className="mx-4 mt-4 rounded-2xl border border-red-100 bg-red-50 p-4">
            <Text className="text-[13px] font-semibold text-red-600">{error}</Text>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export default SearchScreen;
