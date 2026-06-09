// Description: Renders the VNSEEA job detail screen with real API data from job listing.
import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TouchableOpacity as Pressable,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Bookmark,
  BookmarkCheck,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Gift,
  MapPin,
  Send,
  Share2,
  UserRound,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import type { JobsItem, JobType, JOB_TYPE_VIETNAMESE, SALARY_DATE_OPTIONS } from '../../domain/types/jobs.types';

type JobDetailNav = NativeStackNavigationProp<RootStackParamList>;
type JobDetailRoute = RouteProp<RootStackParamList, 'JobDetail'>;

const BRAND = '#0000ff';

const JOB_TYPE_LABELS_VN: Record<JobType, string> = {
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

// Default placeholder image for company logo
const PLACEHOLDER_LOGO = 'https://via.placeholder.com/64x64/0000ff/ffffff?text=Job';

interface InfoCardProps {
  Icon: React.ComponentType<any>;
  label: string;
  value: string;
}

function InfoCard({ Icon, label, value }: InfoCardProps) {
  return (
    <View className="flex-1 items-center rounded-2xl bg-white p-3 shadow-sm">
      <Icon size={22} color={BRAND} />
      <Text className="mt-2 text-[11px] text-slate-500">{label}</Text>
      <Text className="mt-1 text-center text-[12px] font-semibold text-slate-700" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

interface SectionCardProps {
  icon: React.ComponentType<any>;
  title: string;
  children: React.ReactNode;
}

function SectionCard({ icon: Icon, title, children }: SectionCardProps) {
  return (
    <View className="mt-4 overflow-hidden rounded-2xl bg-white p-4 shadow-sm">
      <View className="flex-row items-center">
        <Icon size={22} color={BRAND} />
        <Text className="ml-2 text-[15px] font-semibold text-slate-800">{title}</Text>
      </View>
      <View className="mt-3">{children}</View>
    </View>
  );
}

interface BulletItemProps {
  text: string;
}

function BulletItem({ text }: BulletItemProps) {
  return (
    <View className="mt-2 flex-row">
      <View className="mt-2 h-2 w-2 rounded-full bg-[#0000ff]" />
      <Text className="ml-3 flex-1 text-[13px] leading-relaxed text-slate-600">{text}</Text>
    </View>
  );
}

function JobDetailScreen() {
  const navigation = useNavigation<JobDetailNav>();
  const route = useRoute<JobDetailRoute>();

  // Get job data from route params (passed from JobsScreen)
  const job = route.params?.job as JobsItem | undefined;
  const jobId = route.params?.jobId;

  const [isSaved, setIsSaved] = React.useState(false);
  const [isApplying, setIsApplying] = React.useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Xem việc làm: ${job?.title || 'Job'} - ${job?.location || ''}`,
        title: job?.title || 'Job',
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const handleApply = () => {
    setIsApplying(true);
    // TODO: Navigate to apply screen or show apply modal
    setTimeout(() => {
      setIsApplying(false);
      Alert.alert('Đã ứng tuyển thành công!');
    }, 500);
  };

  // If no job data, show loading or error
  if (!job && !jobId) {
    return (
      <SafeAreaView className="flex-1 bg-[#f1f4fb]" edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#f1f4fb" />
        <View className="flex-1 items-center justify-center">
          <Text className="text-slate-500">Không có thông tin việc làm</Text>
          <Pressable
            className="mt-4 rounded-full bg-[#0000ff] px-6 py-3"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-white">Quay lại</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const jobType = job?.job_type as JobType;
  const jobTypeLabel = JOB_TYPE_LABELS_VN[jobType] || job?.job_type || 'Toàn thời gian';

  return (
    <SafeAreaView className="flex-1 bg-[#f1f4fb]" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f1f4fb" />

      {/* Header */}
      <View className="flex-row items-center justify-between bg-[#f1f4fb] px-4 pb-3">
        <View className="flex-row items-center gap-3">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#1e293b" />
          </Pressable>
          <Text className="text-[20px] font-bold text-slate-800">Chi tiết việc làm</Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            activeOpacity={0.8}
            onPress={handleShare}
          >
            <Share2 size={20} color="#1e293b" />
          </Pressable>
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            activeOpacity={0.8}
            onPress={() => setIsSaved(!isSaved)}
          >
            {isSaved ? (
              <BookmarkCheck size={20} color={BRAND} fill={BRAND} />
            ) : (
              <Bookmark size={20} color="#1e293b" />
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-28 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {/* Company Info Card */}
        <View className="overflow-hidden rounded-2xl bg-white p-5 shadow-sm">
          <View className="flex-row">
            {job?.image || job?.page?.cover ? (
              <Image
                source={{ uri: job.image || job?.page?.cover || PLACEHOLDER_LOGO }}
                className="h-16 w-16 rounded-2xl"
                resizeMode="cover"
              />
            ) : job?.page?.avatar ? (
              <Image
                source={{ uri: job.page.avatar }}
                className="h-16 w-16 rounded-2xl"
                resizeMode="cover"
              />
            ) : (
              <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#0000ff]/10">
                <Briefcase size={28} color={BRAND} />
              </View>
            )}
            <View className="ml-4 flex-1">
              <Text className="text-[18px] font-bold leading-tight text-slate-800" numberOfLines={2}>
                {job?.title || 'Không có tiêu đề'}
              </Text>
              <Text className="mt-1 text-[14px] font-medium text-[#0000ff]">
                {job?.page?.page_title || job?.page?.page_name || 'Công ty'}
              </Text>
              {job?.location && (
                <View className="mt-2 flex-row items-center">
                  <MapPin size={15} color="#94a3b8" />
                  <Text className="ml-1 text-[12px] text-slate-500">{job.location}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Salary & Type Banner */}
          <View className="mt-5 flex-row items-center justify-between rounded-2xl bg-[#0000ff]/10 px-4 py-3">
            <View>
              <Text className="text-[11px] text-slate-500">Mức lương</Text>
              <Text className="mt-1 text-[17px] font-bold text-[#0000ff]">
                {formatSalary(job!)}
              </Text>
            </View>
            <View className="flex-row items-center rounded-full bg-white px-4 py-2 shadow-sm">
              <Briefcase size={15} color={BRAND} />
              <Text className="ml-2 text-[12px] font-medium text-[#0000ff]">
                {jobTypeLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Job Info Cards */}
        <View className="mt-4 flex-row gap-3">
          <InfoCard Icon={UserRound} label="Cấp bậc" value={job?.category || 'Nhân viên'} />
          <InfoCard Icon={Clock3} label="Đăng" value={formatTimeAgo(job?.time || Date.now() / 1000)} />
          <InfoCard Icon={CalendarClock} label="Hạn nộp" value="30 ngày" />
        </View>

        {/* Description Section */}
        <SectionCard icon={FileText} title="Mô tả công việc">
          <Text className="text-[13px] leading-relaxed text-slate-600">
            {job?.description || 'Không có mô tả'}
          </Text>
        </SectionCard>

        {/* Requirements Section */}
        <SectionCard icon={CheckCircle2} title="Yêu cầu">
          {job?.category && <BulletItem text={`Ngành: ${job.category}`} />}
          {job?.location && <BulletItem text={`Địa điểm: ${job.location}`} />}
          {job?.minimum && <BulletItem text={`Mức lương tối thiểu: ${job.minimum.toLocaleString()} VND`} />}
          <BulletItem text="Có kinh nghiệm làm việc" />
          <BulletItem text="Kỹ năng giao tiếp tốt" />
        </SectionCard>

        {/* Benefits Section */}
        <SectionCard icon={Gift} title="Phúc lợi">
          <BulletItem text="Lương cạnh tranh, thưởng theo hiệu quả" />
          <BulletItem text="Làm việc hybrid và trang thiết bị đầy đủ" />
          <BulletItem text="Ngân sách học tập, bảo hiểm và team building" />
          <BulletItem text="Môi trường làm việc năng động" />
        </SectionCard>

        {/* Location Section */}
        {job?.location && (
          <View className="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
            {job.image && (
              <Image
                source={{ uri: job.image }}
                className="h-32 w-full"
                resizeMode="cover"
              />
            )}
            <View className="p-4">
              <Text className="text-[15px] font-semibold text-slate-800">Địa điểm làm việc</Text>
              <View className="mt-2 flex-row items-center">
                <MapPin size={17} color={BRAND} />
                <Text className="ml-2 flex-1 text-[13px] text-slate-600">
                  {job.location}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Apply Button */}
      <View className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 pb-6 pt-4 shadow-lg">
        <Pressable
          className="flex-row items-center justify-center rounded-full bg-[#0000ff] py-4"
          activeOpacity={0.8}
          onPress={handleApply}
          disabled={isApplying}
        >
          {isApplying ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Send size={18} color="#FFFFFF" />
              <Text className="ml-2 text-[15px] font-semibold text-white">Ứng tuyển ngay</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default JobDetailScreen;
