// Description: Dedicated global search screen for users, pages, groups, and hashtags.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronRight,
  Eye,
  FileText,
  Flag,
  Hash,
  Search,
  SlidersHorizontal,
  UserPlus,
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
import type { TrendingHashtag } from '../../../explore/domain/types/explore.types';
import type { PagesItem } from '../../../pages/domain/types/pages.types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import { COUNTRY_OPTIONS, type CountryOption } from '../../../settings/domain/constants/countries';

type SearchNav = NativeStackNavigationProp<RootStackParamList>;
type SearchRoute = RouteProp<RootStackParamList, typeof ROUTES.SEARCH>;

const BRAND = '#0000ff';
const FALLBACK_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

const COPY = {
  vi: {
    title: 'Tìm kiếm',
    placeholder: 'Tìm người, trang, nhóm, hashtag...',
    promptTitle: 'Bạn muốn tìm gì?',
    promptBody: 'Nhập từ khóa để tìm người dùng, trang, nhóm và hashtag.',
    noResults: 'Không tìm thấy kết quả',
    noResultsBody: 'Thử một từ khóa khác hoặc kiểm tra lại chính tả.',
    all: 'Tất cả',
    users: 'Người dùng',
    pages: 'Trang',
    groups: 'Nhóm',
    hashtags: 'Hashtag',
    seeAll: 'Xem tất cả',
    follow: 'Theo dõi',
    following: 'Đang theo dõi',
    pageFallback: 'Trang',
    groupFallback: 'Nhóm',
    hashtagFallback: 'Hashtag',
    members: 'thành viên',
    likes: 'lượt thích',
    posts: 'bài viết',
    
    // Discovery
    discoveryTitle: 'Khám phá',
    keyword: 'Từ khóa',
    allCountries: 'Tất cả các quốc gia',
    filter: 'Lọc',
    search: 'Tìm kiếm',
    noDiscoveryResults: 'Không tìm thấy kết quả',
    noDiscoveryResultsBody: 'Hãy thử thay đổi từ khóa hoặc bộ lọc.',
    followersCountSuffix: 'Người theo dõi',
    lastSeenPrefix: 'Hoạt động lần cuối',
    noLastSeen: 'Không có trạng thái hoạt động',
    privateGroup: 'Nhóm riêng tư',
    publicGroup: 'Nhóm công cộng',
    noDescription: 'Chưa có mô tả',
    liked: 'Đã thích',
    like: 'Thích',
    joined: 'Đã tham gia',
    join: 'Tham gia',
    otherCategory: 'Khác',
    
    // Filter Sheet
    selectCountry: 'Chọn quốc gia',
    close: 'Đóng',
    searchCountry: 'Tìm quốc gia',
    applyFilter: 'Áp dụng bộ lọc',
    ageLabel: 'Tuổi tác',
    yes: 'Đúng',
    no: 'Không',
    verifiedLabel: 'Đã xác minh',
    statusLabel: 'Trạng thái',
    genderLabel: 'Giới tính',
    avatarLabel: 'Ảnh đại diện',
    online: 'Trực tuyến',
    offline: 'Ngoại tuyến',
    female: 'Nữ giới',
    male: 'Nam giới',
    allOption: 'Tất cả các',
    unverified: 'Chưa được xác minh',
    
    // Discovery tabs uppercase
    usersTab: 'NGƯỜI DÙNG',
    groupsTab: 'NHÓM',
    pagesTab: 'TRANG',
  },
  en: {
    title: 'Search',
    placeholder: 'Search people, pages, groups, hashtags...',
    promptTitle: 'What are you looking for?',
    promptBody: 'Type a keyword to search users, pages, groups, and hashtags.',
    noResults: 'No results found',
    noResultsBody: 'Try another keyword or check your spelling.',
    all: 'All',
    users: 'People',
    pages: 'Pages',
    groups: 'Groups',
    hashtags: 'Hashtags',
    seeAll: 'See all',
    follow: 'Follow',
    following: 'Following',
    pageFallback: 'Page',
    groupFallback: 'Group',
    hashtagFallback: 'Hashtag',
    members: 'members',
    likes: 'likes',
    posts: 'posts',

    // Discovery
    discoveryTitle: 'Explore',
    keyword: 'Keyword',
    allCountries: 'All countries',
    filter: 'Filter',
    search: 'Search',
    noDiscoveryResults: 'No results found',
    noDiscoveryResultsBody: 'Try changing your keyword or filters.',
    followersCountSuffix: 'Followers',
    lastSeenPrefix: 'Last active',
    noLastSeen: 'No activity status',
    privateGroup: 'Private group',
    publicGroup: 'Public group',
    noDescription: 'No description',
    liked: 'Liked',
    like: 'Like',
    joined: 'Joined',
    join: 'Join',
    otherCategory: 'Other',
    
    // Filter Sheet
    selectCountry: 'Select country',
    close: 'Close',
    searchCountry: 'Search country',
    applyFilter: 'Apply filters',
    ageLabel: 'Age',
    yes: 'Yes',
    no: 'No',
    verifiedLabel: 'Verified',
    statusLabel: 'Status',
    genderLabel: 'Gender',
    avatarLabel: 'Profile picture',
    online: 'Online',
    offline: 'Offline',
    female: 'Female',
    male: 'Male',
    allOption: 'All',
    unverified: 'Unverified',
    
    // Discovery tabs uppercase
    usersTab: 'PEOPLE',
    groupsTab: 'GROUPS',
    pagesTab: 'PAGES',
  },
};

function formatCompact(value?: number | string | null) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return '0';
  if (numeric >= 1000000) return `${(numeric / 1000000).toFixed(1)}M`;
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(1)}K`;
  return String(Math.round(numeric));
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

function HashtagRow({
  hashtag,
  onPress,
  copy,
}: {
  hashtag: TrendingHashtag;
  onPress: () => void;
  copy: typeof COPY.vi;
}) {
  return (
    <TouchableOpacity
      className="mx-4 mb-2 flex-row items-center rounded-2xl bg-white p-3"
      activeOpacity={0.86}
      onPress={onPress}
    >
      <View className="h-14 w-14 items-center justify-center rounded-full bg-[#EEF2FF]">
        <Hash size={25} color={BRAND} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-[15px] font-extrabold text-slate-950" numberOfLines={1}>
          #{hashtag.tag || copy.hashtagFallback}
        </Text>
        <Text className="mt-0.5 text-[13px] text-slate-500" numberOfLines={1}>
          {hashtag.useCount > 0
            ? `${formatCompact(hashtag.useCount)} ${copy.posts}`
            : copy.hashtagFallback}
        </Text>
      </View>
      <ChevronRight size={18} color="#94a3b8" />
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

type DiscoveryTab = 'users' | 'groups' | 'pages';

function DiscoveryHeroCard({
  cover,
  title,
  stats,
  actionLabel,
  actionActive,
  onPress,
  onAction,
}: {
  cover?: string;
  title: string;
  stats: Array<{ icon: React.ReactNode; text: string }>;
  actionLabel: string;
  actionActive?: boolean;
  onPress: () => void;
  onAction: () => void;
}) {
  return (
    <View className="mb-3 overflow-hidden border-b border-slate-200 bg-slate-200">
      <TouchableOpacity activeOpacity={0.92} onPress={onPress}>
        <View className="relative h-[310px] bg-slate-300">
          {cover ? (
            <Image source={{ uri: cover }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center bg-slate-200">
              <Users size={54} color="#94A3B8" />
            </View>
          )}
          <View className="absolute bottom-0 left-0 right-0 h-36 bg-black/45" />
          <TouchableOpacity
            className={`absolute right-3 top-3 min-h-[38px] flex-row items-center rounded-md px-3 ${actionActive ? 'bg-white/90' : 'bg-[#0000ff]'}`}
            activeOpacity={0.82}
            onPress={event => {
              event.stopPropagation();
              onAction();
            }}
          >
            {actionActive ? <Check size={16} color="#334155" /> : <UserPlus size={16} color="#FFFFFF" />}
            <Text className={`ml-1 text-[13px] font-bold ${actionActive ? 'text-slate-700' : 'text-white'}`}>
              {actionLabel}
            </Text>
          </TouchableOpacity>
          <View className="absolute bottom-3 left-3 right-3">
            <Text className="mb-1 text-[20px] font-bold text-white" numberOfLines={2}>{title}</Text>
            {stats.map((stat, index) => (
              <View key={`${stat.text}-${index}`} className="mt-1 flex-row items-center">
                {stat.icon}
                <Text className="ml-1.5 flex-1 text-[13px] font-medium text-white" numberOfLines={1}>{stat.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

function DiscoveryTabs({
  activeTab,
  onChange,
}: {
  activeTab: DiscoveryTab;
  onChange: (tab: DiscoveryTab) => void;
}) {
  const language = useAppLanguage();
  const copy = COPY[language];
  const tabs: Array<{ id: DiscoveryTab; label: string; icon: React.ReactNode }> = [
    { id: 'users', label: copy.usersTab, icon: <Users size={15} color={activeTab === 'users' ? '#111827' : '#94A3B8'} /> },
    { id: 'groups', label: copy.groupsTab, icon: <Users size={15} color={activeTab === 'groups' ? '#111827' : '#94A3B8'} /> },
    { id: 'pages', label: copy.pagesTab, icon: <Flag size={15} color={activeTab === 'pages' ? '#111827' : '#94A3B8'} /> },
  ];

  return (
    <View className="h-[52px] flex-row border-b border-slate-200 bg-white">
      {tabs.map(tab => {
        const active = tab.id === activeTab;
        return (
          <TouchableOpacity
            key={tab.id}
            className="flex-1 flex-row items-center justify-center border-b-2 px-1"
            style={{ borderBottomColor: active ? '#111827' : 'transparent' }}
            onPress={() => onChange(tab.id)}
          >
            {tab.icon}
            <Text className={`ml-1 text-[12px] ${active ? 'font-bold text-slate-900' : 'text-slate-400'}`} numberOfLines={1}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function CountryPickerSheet({
  visible,
  selectedId,
  onClose,
  onSelect,
}: {
  visible: boolean;
  selectedId: string;
  onClose: () => void;
  onSelect: (country: CountryOption | null) => void;
}) {
  const language = useAppLanguage();
  const copy = COPY[language];
  const [query, setQuery] = useState('');
  const countries = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized
      ? COUNTRY_OPTIONS.filter(country => country.name.toLowerCase().includes(normalized))
      : COUNTRY_OPTIONS;
  }, [query]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[78%] rounded-t-3xl bg-white px-4 pb-6 pt-4">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-900">{copy.selectCountry}</Text>
            <TouchableOpacity className="rounded-full bg-slate-100 px-4 py-2" onPress={onClose}><Text>{copy.close}</Text></TouchableOpacity>
          </View>
          <View className="mb-3 h-11 flex-row items-center rounded-xl border border-slate-200 px-3">
            <Search size={17} color="#64748B" />
            <TextInput value={query} onChangeText={setQuery} placeholder={copy.searchCountry} className="ml-2 flex-1 p-0 text-slate-900" />
          </View>
          <FlatList
            data={[{ id: '', name: copy.allCountries }, ...countries]}
            keyExtractor={item => item.id || 'all'}
            showsVerticalScrollIndicator
            persistentScrollbar
            renderItem={({ item }) => (
              <TouchableOpacity className="min-h-[48px] flex-row items-center border-b border-slate-100" onPress={() => { onSelect(item.id ? item : null); onClose(); }}>
                <Text className="flex-1 text-[15px] text-slate-800">{item.name}</Text>
                {selectedId === item.id ? <Check size={18} color={BRAND} /> : null}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

type DiscoveryFilters = {
  filterByAge: 'yes' | 'no';
  verified: '' | 'on' | 'off';
  status: '' | 'on' | 'off';
  gender: '' | 'female' | 'male';
  image: '' | 'on' | 'off';
};

const DEFAULT_DISCOVERY_FILTERS: DiscoveryFilters = {
  filterByAge: 'no',
  verified: '',
  status: '',
  gender: '',
  image: '',
};

function normalizeDiscoveryFilters(values?: Partial<DiscoveryFilters> | null): DiscoveryFilters {
  if (!values || typeof values !== 'object') {
    return DEFAULT_DISCOVERY_FILTERS;
  }

  return {
    ...DEFAULT_DISCOVERY_FILTERS,
    ...values,
  };
}

function DiscoveryFilterSheet({
  visible,
  values,
  onClose,
  onApply,
}: {
  visible: boolean;
  values?: Partial<DiscoveryFilters>;
  onClose: () => void;
  onApply: (values: DiscoveryFilters) => void;
}) {
  const language = useAppLanguage();
  const copy = COPY[language];
  const [draft, setDraft] = useState<DiscoveryFilters>(() => normalizeDiscoveryFilters(values));

  useEffect(() => {
    if (visible) setDraft(normalizeDiscoveryFilters(values));
  }, [values, visible]);

  const groups: Array<{
    key: keyof DiscoveryFilters;
    label: string;
    options: Array<{ value: string; label: string }>;
  }> = [
    { key: 'filterByAge', label: copy.ageLabel, options: [{ value: 'yes', label: copy.yes }, { value: 'no', label: copy.no }] },
    { key: 'verified', label: copy.verifiedLabel, options: [{ value: '', label: copy.allOption }, { value: 'on', label: copy.verifiedLabel }, { value: 'off', label: copy.unverified }] },
    { key: 'status', label: copy.statusLabel, options: [{ value: '', label: copy.allOption }, { value: 'on', label: copy.online }, { value: 'off', label: copy.offline }] },
    { key: 'gender', label: copy.genderLabel, options: [{ value: '', label: copy.allOption }, { value: 'female', label: copy.female }, { value: 'male', label: copy.male }] },
    { key: 'image', label: copy.avatarLabel, options: [{ value: '', label: copy.allOption }, { value: 'on', label: copy.yes }, { value: 'off', label: copy.no }] },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[86%] rounded-t-3xl bg-white pb-6 pt-4">
          <View className="mb-2 flex-row items-center justify-between px-4">
            <Text className="text-lg font-bold text-slate-900">{copy.filter}</Text>
            <TouchableOpacity className="rounded-full bg-slate-100 px-4 py-2" onPress={onClose}><Text>{copy.close}</Text></TouchableOpacity>
          </View>
          <ScrollView
            className="px-4"
            showsVerticalScrollIndicator
            persistentScrollbar
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            {groups.map(group => (
              <View key={group.key} className="border-b border-slate-100 py-3">
                <Text className="mb-2 text-[13px] font-bold text-slate-700">{group.label}</Text>
                <View className="flex-row flex-wrap gap-2">
                  {group.options.map(option => {
                    const active = String(normalizeDiscoveryFilters(draft)[group.key]) === option.value;
                    return (
                      <TouchableOpacity
                        key={`${group.key}-${option.value || 'all'}`}
                        className={`min-h-[34px] justify-center rounded-full px-3 ${active ? 'bg-[#b794f6]' : 'bg-slate-100'}`}
                        activeOpacity={0.8}
                        onPress={() => setDraft(previous => ({
                          ...normalizeDiscoveryFilters(previous),
                          [group.key]: option.value,
                        } as DiscoveryFilters))}
                      >
                        <Text className={`text-[13px] ${active ? 'font-bold text-white' : 'font-medium text-slate-600'}`}>{option.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity className="mx-4 mt-3 min-h-[48px] items-center justify-center rounded-md bg-[#0000ff]" onPress={() => { onApply(draft); onClose(); }}>
            <Text className="font-bold text-white">{copy.applyFilter}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function getVisibleResults(results: SearchResponse, tab: GlobalSearchTab) {
  if (tab === 'all') return results;
  return {
    users: tab === 'users' ? results.users : [],
    pages: tab === 'pages' ? results.pages : [],
    groups: tab === 'groups' ? results.groups : [],
    hashtags: tab === 'hashtags' ? results.hashtags : [],
  };
}

function SearchScreen() {
  const navigation = useNavigation<SearchNav>();
  const route = useRoute<SearchRoute>();
  const language = useAppLanguage();
  const copy = COPY[language];
  const isDiscovery = route.params?.discovery === true;
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
    discover,
    toggleFollow,
    toggleGroupJoin,
    togglePageLike,
    clearSearch,
  } = useSearchViewModel();
  const [discoveryTab, setDiscoveryTab] = useState<DiscoveryTab>('users');
  const [country, setCountry] = useState<CountryOption | null>(null);
  const [discoveryFilters, setDiscoveryFilters] = useState<DiscoveryFilters>(DEFAULT_DISCOVERY_FILTERS);
  const normalizedDiscoveryFilters = useMemo(
    () => normalizeDiscoveryFilters(discoveryFilters),
    [discoveryFilters],
  );
  const [countrySheetVisible, setCountrySheetVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);

  const runDiscovery = useCallback(() => {
    void discover({
      keyword: searchQuery.trim() || undefined,
      country: country?.id,
      gender: normalizedDiscoveryFilters.gender || undefined,
      verified: normalizedDiscoveryFilters.verified || undefined,
      status: normalizedDiscoveryFilters.status || undefined,
      image: normalizedDiscoveryFilters.image || undefined,
      filterByAge: normalizedDiscoveryFilters.filterByAge,
      ageFrom: normalizedDiscoveryFilters.filterByAge === 'yes' ? 18 : undefined,
      ageTo: normalizedDiscoveryFilters.filterByAge === 'yes' ? 50 : undefined,
    });
  }, [country?.id, discover, normalizedDiscoveryFilters, searchQuery]);

  useEffect(() => {
    if (isDiscovery) {
      void discover({});
    }
  }, [discover, isDiscovery]);

  useEffect(() => {
    const initialQuery = route.params?.q?.trim();
    if (initialQuery) {
      setSearchQuery(initialQuery);
      void searchAll(initialQuery);
    }
  }, [route.params?.q, searchAll, setSearchQuery]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (isDiscovery || !query) return;

    const timer = setTimeout(() => {
      void searchAll(query);
    }, 350);

    return () => clearTimeout(timer);
  }, [isDiscovery, searchAll, searchQuery]);

  const tabs = useMemo(
    () => [
      { id: 'all' as const, label: copy.all, count: totalResults },
      { id: 'users' as const, label: copy.users, count: results.users.length },
      { id: 'pages' as const, label: copy.pages, count: results.pages.length },
      { id: 'groups' as const, label: copy.groups, count: results.groups.length },
      { id: 'hashtags' as const, label: copy.hashtags, count: results.hashtags.length },
    ],
    [copy, results, totalResults],
  );

  const visibleResults = getVisibleResults(results, activeTab);
  const previewLimit = activeTab === 'all' ? 5 : Number.POSITIVE_INFINITY;
  const hasQuery = searchQuery.trim().length > 0;
  const isEmpty = hasQuery && !isLoading && totalResults === 0;

  const handleHashtagPress = useCallback((hashtag: TrendingHashtag) => {
    const nextQuery = `#${hashtag.tag}`;
    setSearchQuery(nextQuery);
    setActiveTab('hashtags');
    void searchAll(nextQuery);
  }, [searchAll, setActiveTab, setSearchQuery]);

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
          onPress={() => navigateToUserProfile(navigation, user.userId)}
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
        title={copy.hashtags}
        count={visibleResults.hashtags.length}
        copy={copy}
        onSeeAll={activeTab === 'all' && results.hashtags.length > previewLimit ? () => setActiveTab('hashtags') : undefined}
      />
      {visibleResults.hashtags.slice(0, previewLimit).map(hashtag => (
        <HashtagRow
          key={`hashtag-${hashtag.id}`}
          hashtag={hashtag}
          copy={copy}
          onPress={() => handleHashtagPress(hashtag)}
        />
      ))}
    </>
  );

  if (isDiscovery) {
    const tabItems = discoveryTab === 'users'
      ? results.users
      : discoveryTab === 'groups'
        ? results.groups
        : results.pages;

    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: '#eef3ff' }}
        edges={['top']}
      >
        <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
        <FeedHeader />

        <View className="bg-white px-3 pb-3 pt-3">
          <View className="h-11 flex-row items-center rounded-md border border-slate-200 px-3">
            <TouchableOpacity onPress={() => navigation.goBack()} className="mr-2">
              <ArrowLeft size={18} color="#64748B" />
            </TouchableOpacity>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={runDiscovery}
              returnKeyType="search"
              placeholder={copy.keyword}
              placeholderTextColor="#94A3B8"
              className="flex-1 p-0 text-[15px] text-slate-900"
            />
            {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><X size={18} color="#64748B" /></TouchableOpacity> : null}
          </View>

          <TouchableOpacity className="mt-3 min-h-[44px] flex-row items-center rounded-md border border-slate-200 px-3" onPress={() => setCountrySheetVisible(true)}>
            <Text className="flex-1 text-[14px] font-semibold text-slate-600">{country?.name ?? copy.allCountries}</Text>
            <ChevronDown size={18} color="#64748B" fill="#64748B" />
          </TouchableOpacity>

          <View className="mt-3 flex-row gap-3">
            <TouchableOpacity className="min-h-[44px] flex-1 flex-row items-center justify-between rounded-md border border-slate-200 px-3" onPress={() => setFilterSheetVisible(true)}>
              <Text className="font-semibold text-slate-600">{copy.filter}</Text>
              <SlidersHorizontal size={17} color="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity className="min-h-[44px] flex-1 items-center justify-center rounded-md bg-[#a78bfa]" onPress={runDiscovery}>
              <Text className="font-bold text-white">{copy.search}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <DiscoveryTabs activeTab={discoveryTab} onChange={setDiscoveryTab} />

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingTop: 14, paddingBottom: 30 }}>
          {isLoading ? (
            <View className="items-center py-20"><ActivityIndicator color={BRAND} /></View>
          ) : tabItems.length === 0 ? (
            <EmptyState title={copy.noDiscoveryResults} body={copy.noDiscoveryResultsBody} />
          ) : discoveryTab === 'users' ? (
            results.users.map(user => (
              <DiscoveryHeroCard
                key={user.userId}
                cover={user.cover || user.avatar}
                title={user.name || user.username}
                actionLabel={user.isFollowing ? copy.following : copy.follow}
                actionActive={user.isFollowing}
                onPress={() => navigateToUserProfile(navigation, user.userId)}
                onAction={() => void toggleFollow(user.userId, user.isFollowing)}
                stats={[
                  { icon: <Users size={16} color="#FFFFFF" />, text: `${formatCompact(user.followersCount)} ${copy.followersCountSuffix}` },
                  { icon: <FileText size={16} color="#FFFFFF" />, text: `${formatCompact(user.postCount)} ${copy.posts}` },
                  { icon: <Eye size={16} color="#FFFFFF" />, text: user.lastSeenText ? `${copy.lastSeenPrefix} ${user.lastSeenText}` : copy.noLastSeen },
                ]}
              />
            ))
          ) : discoveryTab === 'groups' ? (
            results.groups.map(group => (
              <DiscoveryHeroCard
                key={group.groupId}
                cover={group.cover || group.avatar}
                title={group.groupTitle || group.groupName || copy.groupFallback}
                actionLabel={group.isJoined ? copy.joined : copy.join}
                actionActive={group.isJoined}
                onPress={() => navigation.navigate(ROUTES.GROUP_DETAIL, { group })}
                onAction={() => void toggleGroupJoin(group.groupId, Boolean(group.isJoined))}
                stats={[
                  { icon: <Users size={16} color="#FFFFFF" />, text: `${formatCompact(group.members)} ${copy.members}` },
                  { icon: <Eye size={16} color="#FFFFFF" />, text: group.privacy === 'private' ? copy.privateGroup : copy.publicGroup },
                  { icon: <FileText size={16} color="#FFFFFF" />, text: group.about || copy.noDescription },
                ]}
              />
            ))
          ) : (
            results.pages.map(page => (
              <DiscoveryHeroCard
                key={page.pageId}
                cover={page.cover || page.avatar}
                title={page.pageTitle || page.pageName || copy.pageFallback}
                actionLabel={page.isLiked ? copy.liked : copy.like}
                actionActive={page.isLiked}
                onPress={() => navigation.navigate(ROUTES.PAGE_DETAIL, { page })}
                onAction={() => void togglePageLike(page.pageId, Boolean(page.isLiked))}
                stats={[
                  { icon: <Users size={16} color="#FFFFFF" />, text: `${formatCompact(page.likes)} ${copy.likes}` },
                  { icon: <Flag size={16} color="#FFFFFF" />, text: page.pageCategory || copy.otherCategory },
                  { icon: <FileText size={16} color="#FFFFFF" />, text: page.pageDescription || copy.noDescription },
                ]}
              />
            ))
          )}
          {error ? <Text className="mx-4 mt-2 rounded-md bg-red-50 px-3 py-3 text-center text-red-600">{error}</Text> : null}
        </ScrollView>

        <CountryPickerSheet visible={countrySheetVisible} selectedId={country?.id ?? ''} onClose={() => setCountrySheetVisible(false)} onSelect={setCountry} />
        <DiscoveryFilterSheet
          visible={filterSheetVisible}
          values={normalizedDiscoveryFilters}
          onClose={() => setFilterSheetVisible(false)}
          onApply={values => {
            setDiscoveryFilters(values);
            void discover({
              keyword: searchQuery.trim() || undefined,
              country: country?.id,
              gender: values.gender || undefined,
              verified: values.verified || undefined,
              status: values.status || undefined,
              image: values.image || undefined,
              filterByAge: values.filterByAge,
              ageFrom: values.filterByAge === 'yes' ? 18 : undefined,
              ageTo: values.filterByAge === 'yes' ? 50 : undefined,
            });
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#F0F2F5' }}
      edges={['top']}
    >
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <FeedHeader />

      <View className="bg-white px-4 pb-3 pt-2">
        <View className="flex-row items-center rounded-full bg-slate-100 px-4 py-3">
          <TouchableOpacity
            className="mr-2 h-7 w-7 items-center justify-center rounded-full"
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={20} color="#64748b" />
          </TouchableOpacity>
          <TextInput
            className="flex-1 p-0 text-[16px] font-medium text-slate-950"
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
