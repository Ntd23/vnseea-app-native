// Description: Renders the VNSEEA jobs listing screen with search, job cards, and detail navigation.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  PanResponder,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Banknote,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronDown,
  Circle,
  Shapes,
  Users,
  X,
} from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useJobsViewModel } from '../../application/view-models/useJobsViewModel';
import type { JobsItem, JobType } from '../../domain/types/jobs.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { getJobsCopy } from '../../application/i18n/jobsCopy';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import { formatJobSalaryRange } from '../../application/formatters/jobSalary';
import { isJobOwnedByUser } from '../../domain/policies/jobOwnership';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';

type JobsNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = APP_BRAND_COLOR;

type FilterOption = { value: string; label: string };

function FilterSheet({
  title,
  visible,
  value,
  options,
  onClose,
  onSelect,
}: {
  title: string;
  visible: boolean;
  value: string;
  options: FilterOption[];
  onClose: () => void;
  onSelect: (value: string) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[72%] rounded-t-2xl bg-white pb-6 pt-3">
          <View className="mb-2 flex-row items-center border-b border-slate-100 px-4 pb-3">
            <Text className="flex-1 text-[17px] font-bold text-slate-900">{title}</Text>
            <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full bg-slate-100" onPress={onClose}>
              <X size={19} color="#475569" />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator persistentScrollbar>
            {options.map(option => {
              const selected = option.value === value;
              return (
                <TouchableOpacity
                  key={option.value || 'all'}
                  className="min-h-[48px] flex-row items-center border-b border-slate-100 px-5"
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                >
                  {selected ? <CheckCircle2 size={19} color={APP_BRAND_COLOR} /> : <Circle size={19} color="#94A3B8" />}
                  <Text className={`ml-3 text-[14px] ${selected ? 'font-bold text-brand' : 'text-slate-700'}`}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function DistanceFilterSheet({
  visible,
  value,
  onClose,
  onApply,
}: {
  visible: boolean;
  value: number;
  onClose: () => void;
  onApply: (value: number) => void;
}) {
  const language = useAppLanguage();
  const copy = getJobsCopy(language);
  const [draft, setDraft] = useState(value);
  const [trackWidth, setTrackWidth] = useState(0);
  const percent = Math.max(0, Math.min(100, (draft / 300) * 100));

  useEffect(() => {
    if (visible) setDraft(value);
  }, [value, visible]);

  const updateFromX = useCallback((x: number) => {
    if (!trackWidth) return;
    const ratio = Math.max(0, Math.min(1, x / trackWidth));
    setDraft(Math.round(ratio * 300));
  }, [trackWidth]);

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: event => updateFromX(event.nativeEvent.locationX),
      onPanResponderMove: event => updateFromX(event.nativeEvent.locationX),
    }),
    [updateFromX],
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="rounded-t-2xl bg-white px-4 pb-7 pt-3">
          <View className="flex-row items-center border-b border-slate-100 pb-3">
            <Text className="flex-1 text-[17px] font-bold text-slate-900">{copy.locationDistance || "Khoảng cách vị trí"}</Text>
            <TouchableOpacity className="h-9 w-9 items-center justify-center rounded-full bg-slate-100" onPress={onClose}>
              <X size={19} color="#475569" />
            </TouchableOpacity>
          </View>

          <View className="mt-6 flex-row items-center">
            <View
              className="h-10 flex-1 justify-center"
              onLayout={event => setTrackWidth(event.nativeEvent.layout.width)}
              {...panResponder.panHandlers}
            >
              <View className="h-1 rounded-full bg-slate-300">
                <View className="h-1 rounded-full bg-[#5267c9]" style={{ width: `${percent}%` }} />
              </View>
              <View
                className="absolute -ml-2 h-4 w-4 rounded-full bg-[#5267c9]"
                style={{ left: `${percent}%` }}
              />
            </View>
            <Text className="ml-5 min-w-[35px] text-center text-[13px] text-slate-600">{draft}</Text>
            <Text className="ml-1 text-[13px] text-slate-600">km</Text>
          </View>

          <View className="mt-1 flex-row justify-between pr-[67px]">
            <Text className="text-[11px] text-slate-400">0</Text>
            <Text className="text-[11px] text-slate-400">300</Text>
          </View>

          <TouchableOpacity
            className="mt-5 min-h-[46px] items-center justify-center rounded-md bg-brand"
            onPress={() => {
              onApply(draft);
              onClose();
            }}
          >
            <Text className="font-bold text-white">{copy.apply || "Áp dụng"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function JobCard({
  job,
  onPress,
  copy,
  language,
  currentUserId,
}: {
  job: JobsItem;
  onPress: () => void;
  copy: Record<string, string>;
  language: AppLanguage;
  currentUserId?: string;
}) {
  const jobTypeLabel = job.job_type_label || job.job_type;

  const image = job.image || job.page?.cover || job.page?.avatar;
  const categoryLabel = job.category_label || job.category || (copy.other || 'Khác');
  const isManaged = isJobOwnedByUser(job, currentUserId);
  const salaryText = formatJobSalaryRange(job, language);

  return (
    <View className="mb-4 overflow-hidden border border-slate-200 bg-white">
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View className="h-[300px] w-full bg-slate-100">
          {image ? (
            <Image source={{ uri: image }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Briefcase size={54} color="#94A3B8" />
            </View>
          )}
        </View>
        <View className="px-3 pb-3 pt-4">
          <Text className="text-[20px] font-bold text-slate-900" numberOfLines={2}>{job.title}</Text>
          <View className="mt-2 flex-row items-center">
            <Banknote size={15} color="#E91E63" />
            <Text className="ml-1 text-[13px] text-slate-500">
              {salaryText}
            </Text>
          </View>
          <View className="mt-2 flex-row items-center">
            <Shapes size={15} color="#673AB7" />
            <Text className="ml-1 text-[13px] text-slate-500">{categoryLabel}</Text>
            <Text className="mx-2 text-slate-300">•</Text>
            <Briefcase size={14} color="#2196F3" />
            <Text className="ml-1 text-[13px] text-slate-500">{jobTypeLabel}</Text>
          </View>
          {isManaged ? (
            <View className="mt-2 flex-row items-center">
              <Building2 size={15} color="#673AB7" />
              <Text className="ml-1 text-[13px] text-slate-500">{copy.managedByYou || 'Bạn quản lý'}</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        className={`mx-1 mb-3 min-h-[42px] flex-row items-center justify-center rounded-md ${
          !isManaged && job.apply ? 'bg-slate-300' : 'bg-brand'
        }`}
        onPress={onPress}
      >
        {isManaged ? <Users size={16} color="#FFFFFF" /> : <CheckCircle2 size={16} color="#FFFFFF" />}
        <Text className="ml-2 text-[13px] font-bold text-white">
          {isManaged
            ? (copy.applicantsCount || '{count} ứng viên').replace('{count}', String(job.apply_count ?? 0))
            : job.apply
              ? (copy.alreadyApplied || 'Đã ứng tuyển')
              : (copy.applyNow || 'Ứng tuyển ngay')}
        </Text>
      </TouchableOpacity>
    </View>
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

function EmptyState({ copy }: { copy: Record<string, string> }) {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <Briefcase size={48} color="#94A3B8" />
      <Text className="mt-4 text-center text-base font-semibold text-slate-800">
        {copy.noJobs || 'Không có việc làm nào'}
      </Text>
      <Text className="mt-2 text-center text-sm text-slate-500">
        {copy.tryAnotherKeyword || 'Hãy thử tìm kiếm với từ khóa khác'}
      </Text>
    </View>
  );
}

function JobsScreen() {
  const navigation = useNavigation<JobsNav>();
  const language = useAppLanguage();
  const copy = getJobsCopy(language);
  const { jobs, metadata, isLoading, isLoadingMore, error, hasMore, searchJobs, refresh, loadMore } = useJobsViewModel();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedJobType, setSelectedJobType] = useState<JobType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDistance, setSelectedDistance] = useState(0);
  const [activeSheet, setActiveSheet] = useState<'type' | 'category' | 'distance' | null>(null);
  const hasFocusedOnce = useRef(false);
  const typeOptions = useMemo(
    () => [{ value: 'all', label: copy.all || 'Tất cả' }, ...metadata.types],
    [copy.all, metadata.types],
  );
  const typeLabels = useMemo(
    () => Object.fromEntries(typeOptions.map(option => [option.value, option.label])),
    [typeOptions],
  );
  const categoryLabels = useMemo(
    () => Object.fromEntries(metadata.categories.map(option => [option.value, option.label])),
    [metadata.categories],
  );

  useFocusEffect(useCallback(() => {
    if (hasFocusedOnce.current) {
      void refresh();
    } else {
      hasFocusedOnce.current = true;
    }
  }, [refresh]));

  const handleSearch = useCallback(() => {
    const jobType = selectedJobType === 'all' ? undefined : selectedJobType;
    searchJobs(searchKeyword, jobType, selectedCategory || undefined, selectedDistance || undefined);
  }, [searchKeyword, selectedCategory, selectedDistance, selectedJobType, searchJobs]);

  const searchNearbyBusinesses = useCallback(() => {
    const distance = selectedDistance || 25;
    setSelectedDistance(distance);
    const jobType = selectedJobType === 'all' ? undefined : selectedJobType;
    searchJobs(searchKeyword, jobType, selectedCategory || undefined, distance);
  }, [searchKeyword, selectedCategory, selectedDistance, selectedJobType, searchJobs]);

  const handleJobPress = useCallback((job: JobsItem) => {
    navigation.navigate(ROUTES.JOB_DETAIL, { jobId: String(job.id), job });
  }, [navigation]);

  const renderJob = useCallback(({ item }: { item: JobsItem }) => (
    <JobCard
      job={item}
      onPress={() => handleJobPress(item)}
      copy={copy}
      language={language}
      currentUserId={sessionStorage.getSession()?.userId}
    />
  ), [copy, handleJobPress, language]);

  const handleEndReached = useCallback(() => {
    if (!isLoading && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [isLoading, hasMore, isLoadingMore, loadMore]);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaFeedHeader />

      <View className="border-b border-slate-200 bg-[#eef3ff] px-3 pb-4 pt-3">
        <View className="rounded-md bg-white p-3 shadow-sm">
          <TextInput
            className="h-11 rounded-md bg-slate-100 px-3 text-[14px] text-slate-900"
            placeholder={copy.searchPlaceholder || "Tìm kiếm công việc"}
            placeholderTextColor="#94A3B8"
            value={searchKeyword}
            onChangeText={setSearchKeyword}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />

          <View className="mt-3 flex-row gap-3">
            <TouchableOpacity className="min-h-[44px] flex-1 flex-row items-center rounded-md border border-slate-200 px-3" onPress={() => setActiveSheet('type')}>
              <Text className="flex-1 text-[13px] font-bold text-slate-600" numberOfLines={1}>
                {selectedJobType === 'all' ? (copy.jobType || 'Loại công việc') : typeLabels[selectedJobType] || selectedJobType}
              </Text>
              <ChevronDown size={18} color="#64748B" fill="#64748B" />
            </TouchableOpacity>
            <TouchableOpacity className="min-h-[44px] flex-1 flex-row items-center rounded-md border border-slate-200 px-3" onPress={() => setActiveSheet('category')}>
              <Text className="flex-1 text-[13px] font-bold text-slate-600" numberOfLines={1}>
                {selectedCategory ? categoryLabels[selectedCategory] || selectedCategory : (copy.category || 'Thể loại')}
              </Text>
              <ChevronDown size={18} color="#64748B" fill="#64748B" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity className="mt-3 min-h-[44px] flex-row items-center rounded-md border border-slate-200 px-3" onPress={() => setActiveSheet('distance')}>
            <Text className="flex-1 text-[13px] font-bold text-slate-600">
              {selectedDistance ? (copy.withinDistance || 'Trong vòng {distance} km').replace('{distance}', String(selectedDistance)) : (copy.locationDistance || 'Khoảng cách vị trí')}
            </Text>
            <ChevronDown size={18} color="#64748B" fill="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity className="mt-3 min-h-[44px] items-center justify-center rounded-md bg-[#39afe0]" onPress={searchNearbyBusinesses}>
            <Text className="text-[14px] font-semibold text-white">{copy.nearbyBusinesses || "Doanh nghiệp lân cận"}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Jobs List */}
      <FlatList
        className="flex-1 px-2 pt-4"
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
                className="mt-4 rounded-full bg-brand px-6 py-2"
                onPress={refresh}
              >
                <Text className="font-semibold text-white">{copy.retry || "Thử lại"}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <EmptyState copy={copy} />
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

      <FilterSheet
        title={copy.jobType || "Loại công việc"}
        visible={activeSheet === 'type'}
        value={selectedJobType}
        options={typeOptions}
        onClose={() => setActiveSheet(null)}
        onSelect={value => {
          const nextType = value as JobType | 'all';
          setSelectedJobType(nextType);
          searchJobs(searchKeyword, nextType === 'all' ? undefined : nextType, selectedCategory || undefined, selectedDistance || undefined);
        }}
      />
      <FilterSheet
        title={copy.category || "Thể loại"}
        visible={activeSheet === 'category'}
        value={selectedCategory}
        options={[{ value: '', label: copy.allCategories || 'Tất cả thể loại' }, ...metadata.categories]}
        onClose={() => setActiveSheet(null)}
        onSelect={value => {
          setSelectedCategory(value);
          searchJobs(searchKeyword, selectedJobType === 'all' ? undefined : selectedJobType, value || undefined, selectedDistance || undefined);
        }}
      />
      <DistanceFilterSheet
        visible={activeSheet === 'distance'}
        value={selectedDistance}
        onClose={() => setActiveSheet(null)}
        onApply={distance => {
          setSelectedDistance(distance);
          searchJobs(searchKeyword, selectedJobType === 'all' ? undefined : selectedJobType, selectedCategory || undefined, distance || undefined);
        }}
      />
    </View>
  );
}

export default JobsScreen;
