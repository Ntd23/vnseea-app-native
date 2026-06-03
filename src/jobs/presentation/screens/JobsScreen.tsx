// Description: Renders the VNSEEA jobs listing screen with search, job cards, and detail navigation.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Bookmark,
  Briefcase,
  Filter,
  MapPin,
  Plus,
  Search,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useJobsViewModel } from '../../application/view-models/useJobsViewModel';
import type { JobsItem, JobType, JOB_TYPE_VIETNAMESE } from '../../domain/types/jobs.types';

type JobsNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

const JOB_TYPES: (JobType | 'all')[] = ['all', 'full_time', 'part_time', 'internship', 'volunteer', 'contract'];

const JOB_TYPE_LABELS: Record<JobType | 'all', string> = {
  all: 'Tất cả',
  full_time: 'Toàn thời gian',
  part_time: 'Bán thời gian',
  internship: 'Thực tập',
  volunteer: 'Tình nguyện',
  contract: 'Hợp đồng',
};

function formatSalary(job: JobsItem): string {
  if (!job.minimum && !job.maximum) return 'Thương lượng';

  const formatNum = (n: number) => {
    if (n >= 1000000) return `${(n / 1000000).toFixed(1)} Triệu`;
    if (n >= 1000) return `${(n / 1000).toFixed(0)} K`;
    return String(n);
  };

  const min = job.minimum ? formatNum(job.minimum) : '';
  const max = job.maximum ? formatNum(job.maximum) : '';

  if (min && max) return `${min} - ${max}`;
  if (min) return `Từ ${min}`;
  return max;
}

function formatTimeAgo(timestamp: number): string {
  // Handle both seconds and milliseconds timestamp
  // If timestamp > 10^10, it's milliseconds (JavaScript Date.now() format)
  const timestampInSeconds = timestamp > 10000000000 ? Math.floor(timestamp / 1000) : timestamp;
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestampInSeconds;

  if (diff < 0) return 'Vừa đăng';
  if (diff < 60) return 'Vừa đăng';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)} tuần trước`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} tháng trước`;
  return `${Math.floor(diff / 31536000)} năm trước`;
}

function JobCard({ job, onPress }: { job: JobsItem; onPress: () => void }) {
  const jobType = job.job_type as JobType;
  const jobTypeLabel = JOB_TYPE_LABELS[jobType] || jobType;

  return (
    <TouchableOpacity
      className="surface-card mt-4 p-4"
      activeOpacity={0.88}
      onPress={onPress}
    >
      <View className="flex-row">
        {job.image ? (
          <Image
            source={{ uri: job.image }}
            className="h-14 w-14 rounded-2xl"
            resizeMode="cover"
          />
        ) : job.page?.avatar ? (
          <Image
            source={{ uri: job.page.avatar }}
            className="h-14 w-14 rounded-2xl"
            resizeMode="cover"
          />
        ) : (
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-slate-200">
            <Briefcase size={24} color="#94A3B8" />
          </View>
        )}
        <View className="ml-3 flex-1">
          <View className="flex-row items-start justify-between">
            <Text className="flex-1 text-title-primary" numberOfLines={2}>
              {job.title}
            </Text>
            <Bookmark size={20} color={BRAND} />
          </View>
          <Text className="mt-1 text-caption-primary">
            {job.page?.page_title || 'Công ty'}
          </Text>
          <View className="mt-2 flex-row items-center">
            <MapPin size={15} color={BRAND} />
            <Text className="ml-1 flex-1 text-caption-secondary" numberOfLines={1}>
              {job.location || 'Không có địa điểm'}
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between">
        <View>
          <Text className="text-title-primary text-brand">
            {formatSalary(job)}
          </Text>
          <Text className="mt-1 text-caption-secondary">
            {formatTimeAgo(job.time)}
          </Text>
        </View>
        <View className="flex-row items-center rounded-full bg-[#0000ff]/10 px-3 py-2">
          <Briefcase size={15} color={BRAND} />
          <Text className="ml-1 text-caption-primary text-brand">
            {jobTypeLabel}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function JobCardSkeleton() {
  return (
    <View className="surface-card mt-4 p-4">
      <View className="flex-row">
        <View className="h-14 w-14 rounded-2xl bg-slate-200" />
        <View className="ml-3 flex-1">
          <View className="h-5 w-3/4 rounded bg-slate-200" />
          <View className="mt-2 h-4 w-1/2 rounded bg-slate-200" />
          <View className="mt-2 h-4 w-2/3 rounded bg-slate-200" />
        </View>
      </View>
      <View className="mt-4 flex-row items-center justify-between">
        <View className="h-5 w-24 rounded bg-slate-200" />
        <View className="h-8 w-20 rounded-full bg-slate-200" />
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <Briefcase size={48} color="#94A3B8" />
      <Text className="mt-4 text-center text-base font-semibold text-slate-800">
        Không có việc làm nào
      </Text>
      <Text className="mt-2 text-center text-sm text-slate-500">
        Hãy thử tìm kiếm với từ khóa khác
      </Text>
    </View>
  );
}

function JobsScreen() {
  const navigation = useNavigation<JobsNav>();
  const { jobs, isLoading, isLoadingMore, error, hasMore, searchJobs, refresh, loadMore } = useJobsViewModel();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedJobType, setSelectedJobType] = useState<JobType | 'all'>('all');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const handleSearch = useCallback(() => {
    const jobType = selectedJobType === 'all' ? undefined : selectedJobType;
    searchJobs(searchKeyword, jobType);
  }, [searchKeyword, selectedJobType, searchJobs]);

  const handleJobTypePress = useCallback((type: JobType | 'all') => {
    setSelectedJobType(type);
    const jobType = type === 'all' ? undefined : type;
    searchJobs(searchKeyword, jobType);
  }, [searchKeyword, searchJobs]);

  const handleJobPress = useCallback((job: JobsItem) => {
    navigation.navigate(ROUTES.JOB_DETAIL, { jobId: String(job.id) });
  }, [navigation]);

  const renderJob = useCallback(({ item }: { item: JobsItem }) => (
    <JobCard job={item} onPress={() => handleJobPress(item)} />
  ), [handleJobPress]);

  const handleEndReached = useCallback(() => {
    if (!isLoading && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [isLoading, hasMore, isLoadingMore, loadMore]);

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0000FF" />

      {/* Header */}
      <View className="surface-brand h-14 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-title-primary text-inverse">Việc làm</Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full bg-white/20"
          activeOpacity={0.8}
          onPress={() => navigation.navigate(ROUTES.CREATE_JOB)}
        >
          <Plus size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View className="surface-card flex-row items-center px-4 py-3">
        <Search size={20} color={BRAND} />
        <TextInput
          className="ml-3 flex-1 text-body-primary"
          placeholder="Tìm kiếm việc làm..."
          placeholderTextColor="#94A3B8"
          value={searchKeyword}
          onChangeText={setSearchKeyword}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full bg-[#0000ff]/10"
          activeOpacity={0.8}
          onPress={handleSearch}
        >
          <Filter size={18} color={BRAND} />
        </TouchableOpacity>
      </View>

      {/* Job Type Filters */}
      <View className="mt-3 px-4">
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={JOB_TYPES}
          keyExtractor={(item) => item}
          renderItem={({ item, index }) => (
            <TouchableOpacity
              className={`mr-2 rounded-full px-4 py-2 ${
                selectedJobType === item ? 'surface-brand' : 'surface-muted'
              }`}
              activeOpacity={0.8}
              onPress={() => handleJobTypePress(item)}
            >
              <Text
                className={
                  selectedJobType === item
                    ? 'text-caption-primary text-inverse'
                    : 'text-caption-secondary'
                }
              >
                {JOB_TYPE_LABELS[item]}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* Jobs List */}
      <FlatList
        className="flex-1 px-4 pt-4"
        contentContainerClassName="pb-24"
        data={jobs}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderJob}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading && jobs.length > 0}
            onRefresh={refresh}
            colors={[BRAND]}
            tintColor={BRAND}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          isLoading ? (
            <View>
              <JobCardSkeleton />
              <JobCardSkeleton />
              <JobCardSkeleton />
            </View>
          ) : error ? (
            <View className="flex-1 items-center py-16">
              <Text className="text-center text-red-500">{error}</Text>
              <TouchableOpacity
                className="mt-4 rounded-full bg-blue-600 px-6 py-2"
                onPress={refresh}
              >
                <Text className="font-semibold text-white">Thử lại</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EmptyState />
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color={BRAND} />
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

export default JobsScreen;