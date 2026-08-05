// Description: Renders the VNSEEA job detail screen with real API data from job listing.
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity as Pressable,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Briefcase,
  ChevronDown,
  CircleDollarSign,
  Clock3,
  MapPin,
  Shapes,
  Trash2,
  Users,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import type { JobsItem } from '../../domain/types/jobs.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { getJobsCopy } from '../../application/i18n/jobsCopy';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import { createJobsRepository } from '../../infrastructure/repositories/ApiJobsRepository';
import { formatJobSalaryAmount } from '../../application/formatters/jobSalary';
import { isJobOwnedByUser } from '../../domain/policies/jobOwnership';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';

type JobDetailNav = NativeStackNavigationProp<RootStackParamList>;
type JobDetailRoute = RouteProp<RootStackParamList, 'JobDetail'>;

const jobsRepository = createJobsRepository();

function formatTimeAgo(timestamp: number, copy: Record<string, string>): string {
  const timestampInSeconds = timestamp > 10000000000 ? Math.floor(timestamp / 1000) : timestamp;
  const now = Math.floor(Date.now() / 1000);
  const diff = now - timestampInSeconds;

  if (diff < 0) return copy.justPosted || 'Vừa đăng';
  if (diff < 60) return copy.justPosted || 'Vừa đăng';
  if (diff < 3600) return `${Math.floor(diff / 60)} ${copy.minutesAgo || 'phút trước'}`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ${copy.hoursAgo || 'giờ trước'}`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ${copy.daysAgo || 'ngày trước'}`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)} ${copy.weeksAgo || 'tuần trước'}`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} ${copy.monthsAgo || 'tháng trước'}`;
  return `${Math.floor(diff / 31536000)} ${copy.yearsAgo || 'năm trước'}`;
}

function JobDetailScreen() {
  const navigation = useNavigation<JobDetailNav>();
  const route = useRoute<JobDetailRoute>();
  const language = useAppLanguage();
  const copy = getJobsCopy(language);
  const job = route.params?.job as JobsItem | undefined;
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleApply = () => {
    if (!job || job.apply) return;
    navigation.navigate(ROUTES.JOB_APPLY, { job });
  };

  const handleApplicants = () => {
    if (!job) return;
    navigation.navigate(ROUTES.JOB_APPLICANTS, { job });
  };

  const handleDelete = () => {
    if (!job?.post_id || isDeleting) return;

    Alert.alert(
      copy.deleteJob || 'Xóa việc làm',
      (copy.confirmDeleteJob || 'Bạn có chắc muốn xóa “{title}”?').replace('{title}', job.title),
      [
        { text: copy.cancel || 'Hủy', style: 'cancel' },
        {
          text: copy.delete || 'Xóa bỏ',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const deleted = await jobsRepository.deleteJob(job.post_id!);
              if (!deleted) throw new Error(copy.cannotDelete || 'Không thể xóa việc làm.');
              navigation.goBack();
            } catch (caughtError) {
              Alert.alert(
                copy.cannotDelete || 'Không thể xóa',
                caughtError instanceof Error ? caughtError.message : (copy.tryAgain || 'Vui lòng thử lại.'),
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (!job) {
    return (
      <SafeAreaView className="flex-1 bg-[#f1f4fb]" edges={['top']}>
        <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#f1f4fb" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-500">{language === 'vi' ? 'Không có thông tin việc làm' : 'Job information not found'}</Text>
          <Pressable
            className="mt-4 rounded-full bg-brand px-6 py-3"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-white">{language === 'vi' ? 'Quay lại' : 'Back'}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const jobTypeLabel = job.job_type_label || job.job_type;
  const categoryLabel = job.category_label || job.category || (copy.other || 'Khác');
  const companyName = job.page?.page_title || job.page?.page_name || (copy.company || 'Công ty');
  const isOwner = isJobOwnedByUser(
    job,
    sessionStorage.getSession()?.userId,
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#eef3ff' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaFeedHeader />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="bg-white px-4 pb-5 pt-10" style={{ position: 'relative' }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              position: 'absolute',
              left: 12,
              top: 12,
              zIndex: 10,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(0,0,0,0.06)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={20} color="#64748B" />
          </Pressable>
          <View className="absolute right-3 top-5">
            <ChevronDown size={20} color="#64748B" />
          </View>
          <View className="items-center">
            {job.page?.avatar ? (
              <Image source={{ uri: job.page.avatar }} className="h-24 w-24 rounded-full border-2 border-white" resizeMode="cover" />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-full bg-[#fff4e6]">
                <Briefcase size={38} color="#FF8A3D" />
              </View>
            )}
            <Text className="mt-4 text-center text-[23px] font-bold text-slate-900">{job.title}</Text>
            <Text className="mt-1 text-[14px] text-slate-500">{companyName}</Text>
          </View>

          <View className="mt-5 flex-row flex-wrap items-center justify-center gap-x-2 gap-y-2">
            <View className="flex-row items-center">
              <MapPin size={14} color="#FF5722" />
              <Text className="ml-1 text-[12px] text-slate-600">{job.location || (language === 'vi' ? 'Không có địa điểm' : 'No location')}</Text>
            </View>
            <Text className="text-slate-300">•</Text>
            <View className="flex-row items-center">
              <Clock3 size={14} color="#4CAF50" />
              <Text className="ml-1 text-[12px] text-slate-600">{formatTimeAgo(job.time, copy)}</Text>
            </View>
            <Text className="text-slate-300">•</Text>
            <View className="flex-row items-center">
              <Briefcase size={14} color="#2196F3" />
              <Text className="ml-1 text-[12px] text-slate-600">{jobTypeLabel}</Text>
            </View>
            <Text className="text-slate-300">•</Text>
            <View className="flex-row items-center">
              <Shapes size={14} color="#795548" />
              <Text className="ml-1 text-[12px] text-slate-600">{categoryLabel}</Text>
            </View>
          </View>

          {isOwner ? (
            <View className="mt-7 flex-row gap-2">
              <Pressable
                className="min-h-[44px] flex-1 flex-row items-center justify-center rounded-md bg-brand"
                onPress={handleApplicants}
              >
                <Users size={17} color="#FFFFFF" />
                <Text className="ml-2 text-[13px] font-bold text-white">
                  {copy.applicantsCount.replace('{count}', String(job.apply_count ?? 0))}
                </Text>
              </Pressable>
              <Pressable
                className="h-11 w-11 items-center justify-center rounded-md border border-red-200 bg-red-50"
                onPress={handleDelete}
                disabled={isDeleting}
                accessibilityLabel={copy.deleteJob}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#DC2626" />
                ) : (
                  <Trash2 size={18} color="#DC2626" />
                )}
              </Pressable>
            </View>
          ) : (
            <Pressable
              className={`mt-7 min-h-[44px] flex-row items-center justify-center rounded-md ${job.apply ? 'bg-slate-300' : 'bg-brand'}`}
              onPress={handleApply}
              disabled={job.apply}
            >
              <Users size={16} color="#FFFFFF" />
              <Text className="ml-2 text-[13px] font-bold text-white">
                {job.apply ? copy.alreadyApplied : copy.applyNow}
              </Text>
            </Pressable>
          )}

          <View className="mt-4 rounded-md bg-slate-100 p-4">
            <View className="flex-row items-center">
              <CircleDollarSign size={18} color="#64748B" />
              <View className="ml-2">
                <Text className="text-[13px] font-bold text-slate-700">{language === 'vi' ? 'Tối thiểu' : 'Minimum'}</Text>
                <Text className="mt-1 text-[13px] text-slate-600">
                  {job.minimum
                    ? formatJobSalaryAmount(job, job.minimum, language)
                    : (copy.negotiable || 'Thương lượng')}
                </Text>
              </View>
            </View>
            <View className="mt-4 flex-row items-center">
              <CircleDollarSign size={18} color="#64748B" />
              <View className="ml-2">
                <Text className="text-[13px] font-bold text-slate-700">{language === 'vi' ? 'Tối đa' : 'Maximum'}</Text>
                <Text className="mt-1 text-[13px] text-slate-600">
                  {job.maximum
                    ? formatJobSalaryAmount(job, job.maximum, language)
                    : (copy.negotiable || 'Thương lượng')}
                </Text>
              </View>
            </View>
            <Text className="mt-5 text-[14px] leading-5 text-slate-500">{job.description || (language === 'vi' ? 'Không có mô tả' : 'No description')}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default JobDetailScreen;
