// Description: Ad Details Screen - Shows detailed information about an ad campaign
import React, { useState, useEffect } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  CalendarDays,
  Edit,
  Eye,
  Globe,
  MousePointerClick,
  Target,
  Users,
  DollarSign,
  BarChart3,
} from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getAdvertisingCopy } from '../../application/i18n/advertisingCopy';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import { Pressable } from 'react-native';
import type { AdDailyStats } from '../../domain/types/ads.types';
import { createAdsRepository } from '../../infrastructure/repositories/ApiAdsRepository';
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';

type AdDetailsNav = NativeStackNavigationProp<RootStackParamList>;
type AdDetailsRoute = RouteProp<RootStackParamList, typeof ROUTES.AD_DETAILS>;

function formatNumber(value: number | string | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return '0';
  }
  return numeric.toLocaleString('vi-VN');
}

function getStatus(status: string, copy: Record<string, string>) {
  if (status === '1') {
    return { label: copy.statusRunning || 'Đang chạy', color: '#16a34a', bg: '#dcfce7' };
  }
  if (status === '2') {
    return { label: copy.statusPaused || 'Tạm dừng', color: '#ca8a04', bg: '#fef9c3' };
  }
  return { label: copy.statusPending || 'Đang chờ', color: '#64748b', bg: '#f1f5f9' };
}

function getAppearsLabel(value: string, copy: Record<string, string>) {
  switch (value) {
    case 'post':
      return copy.positionPost || 'Bài viết';
    case 'sidebar':
      return copy.positionSidebar || 'Thanh bên';
    case 'video':
      return copy.positionVideo || 'Video';
    case 'story':
      return copy.positionStory || 'Story';
    case 'timeline':
      return copy.positionTimeline || 'Timeline';
    case 'groups':
      return copy.positionGroups || 'Nhóm';
    case 'pages':
      return copy.positionPages || 'Trang';
    case 'messages':
      return copy.positionMessages || 'Tin nhắn';
    default:
      return value || (copy.advertisingTitle || 'Quảng cáo');
  }
}

function getBiddingLabel(value: string, copy: Record<string, string>) {
  return value === 'views' ? (copy.biddingViews || 'Theo lượt xem') : (copy.biddingClicks || 'Theo lượt nhấp');
}

function getGenderLabel(value: string, copy: Record<string, string>) {
  switch (value) {
    case 'male':
      return copy.genderMale || 'Nam';
    case 'female':
      return copy.genderFemale || 'Nữ';
    case 'all':
      return copy.genderAll || 'Tất cả';
    default:
      return value;
  }
}

function isVideoMedia(url?: string) {
  return /\.(mp4|mov|m4v|avi|webm)(\?|$)/i.test(url ?? '');
}

function DailyStatsChart({ dailyStats, copy }: { dailyStats: AdDailyStats[]; copy: Record<string, string> }) {
  const maxViews = Math.max(...dailyStats.map(d => d.views), 1);

  return (
    <View className="mb-6 rounded-xl bg-slate-50 p-4">
      <Text className="mb-4 text-heading text-[#1a1c1e]">{copy.monthlyViewsClicks}</Text>
      <Text className="mb-4 text-caption-secondary text-[#64748b]">{copy.last30Days}</Text>

      {dailyStats.length === 0 ? (
        <View className="items-center py-8">
          <BarChart3 size={32} color="#94a3b8" />
          <Text className="mt-2 text-sm font-semibold text-[#64748b]">{copy.noChartData}</Text>
        </View>
      ) : (
        dailyStats.map((day, index) => (
          <View key={day.date} className="mb-4">
            <Text className="mb-2 text-xs font-semibold text-[#64748b]">{day.date}</Text>

            {/* Views bar */}
            <View className="mb-2 flex-row items-center">
              <Text className="w-16 text-xs text-[#64748b]">{copy.viewsLabel}</Text>
              <View className="flex-1 rounded bg-slate-200">
                <View
                  className="rounded bg-brand"
                  style={{ width: `${(day.views / maxViews) * 100}%` }}
                />
              </View>
              <Text className="ml-2 w-12 text-right text-xs text-[#1a1c1e]">{day.views}</Text>
            </View>

            {/* Clicks bar */}
            <View className="mb-2 flex-row items-center">
              <Text className="w-16 text-xs text-[#64748b]">{copy.clicksLabel}</Text>
              <View className="flex-1 rounded bg-slate-200">
                <View
                  className="rounded bg-green-500"
                  style={{ width: `${(day.clicks / maxViews) * 100}%` }}
                />
              </View>
              <Text className="ml-2 w-12 text-right text-xs text-[#1a1c1e]">{day.clicks}</Text>
            </View>

            {/* Spent bar */}
            <View className="flex-row items-center">
              <Text className="w-16 text-xs text-[#64748b]">{copy.spentLabel}</Text>
              <View className="flex-1 rounded bg-slate-200">
                <View
                  className="rounded bg-orange-500"
                  style={{ width: `${(day.spent / maxViews) * 100}%` }}
                />
              </View>
              <Text className="ml-2 w-12 text-right text-xs text-[#1a1c1e]">{day.spent}</Text>
            </View>

            {index < dailyStats.length - 1 && <View className="mt-4 h-px bg-slate-200" />}
          </View>
        ))
      )}
    </View>
  );
}

function AdDetailsScreen() {
  const navigation = useNavigation<AdDetailsNav>();
  const route = useRoute<AdDetailsRoute>();
  const ad = route.params?.ad;
  const language = useAppLanguage();
  const copy = getAdvertisingCopy(language);
  const [dailyStats, setDailyStats] = useState<AdDailyStats[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  const repository = createAdsRepository();

  useEffect(() => {
    const fetchDailyStats = async () => {
      if (!ad?.id) return;
      setIsLoadingStats(true);
      try {
        const stats = await repository.getAdDailyStats(ad.id);
        setDailyStats(stats);
      } catch (error) {
        console.error('Failed to fetch daily stats:', error);
        setDailyStats([]);
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchDailyStats();
  }, [ad?.id, repository]);

  if (!ad) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <FocusAwareStatusBar barStyle="dark-content" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-body-secondary text-center">{copy.notFound}</Text>
          <TouchableOpacity
            className="mt-4 rounded-xl bg-brand-pressed px-6 py-3"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-body-primary font-semibold text-white">{copy.goBack}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status = getStatus(ad.status, copy);
  const hasImage = Boolean(ad.ad_media && !isVideoMedia(ad.ad_media));

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaFeedHeader />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View style={{ position: 'relative' }}>
          {/* Ad Media */}
          {hasImage ? (
            <Image source={{ uri: ad.ad_media }} className="h-56 w-full bg-slate-100" resizeMode="cover" />
          ) : ad.ad_media ? (
            <View className="h-56 w-full items-center justify-center bg-slate-900">
              <BarChart3 size={48} color="#ffffff" />
              <Text className="mt-2 text-sm font-semibold text-white">{copy.adVideo}</Text>
            </View>
          ) : (
            <View style={{ height: 20 }} />
          )}

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
              backgroundColor: 'rgba(255,255,255,0.85)',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 1.41,
              elevation: 2,
            }}
          >
            <ArrowLeft size={20} color="#1a1c1e" />
          </Pressable>

          <Pressable
            onPress={() => navigation.navigate(ROUTES.CREATE_AD, { ad })}
            style={{
              position: 'absolute',
              right: 12,
              top: 12,
              zIndex: 10,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.85)',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.2,
              shadowRadius: 1.41,
              elevation: 2,
            }}
          >
            <Edit size={18} color={APP_BRAND_COLOR} />
          </Pressable>
        </View>

        {/* Basic Info */}
        <View className="px-5 py-6">
          <View className="mb-4 flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-display mb-2 text-[#1a1c1e]">{ad.headline || ad.name || copy.advertisingTitle}</Text>
              {ad.description && (
                <Text className="text-body-secondary text-[#64748b]">{ad.description}</Text>
              )}
            </View>
            <View className="rounded-full px-3 py-1" style={{ backgroundColor: status.bg }}>
              <Text className="text-xs font-semibold" style={{ color: status.color }}>
                {status.label}
              </Text>
            </View>
          </View>

          {/* Tags */}
          <View className="mb-6 flex-row flex-wrap gap-2">
            <View className="rounded-full bg-brand-soft px-3 py-1">
              <Text className="text-xs font-semibold text-[#3730a3]">{getAppearsLabel(ad.appears, copy)}</Text>
            </View>
            <View className="rounded-full bg-[#f1f5f9] px-3 py-1">
              <Text className="text-xs font-semibold text-[#475569]">{getBiddingLabel(ad.bidding, copy)}</Text>
            </View>
            <View className="rounded-full bg-[#ecfeff] px-3 py-1">
              <Text className="text-xs font-semibold text-[#0891b2]">{getGenderLabel(ad.gender, copy)}</Text>
            </View>
          </View>

          {/* Metrics */}
          <View className="mb-6 rounded-xl bg-slate-50 p-4">
            <Text className="mb-4 text-heading text-[#1a1c1e]">{copy.performance}</Text>
            <View className="flex-row items-center justify-between">
              <View className="items-center">
                <Eye size={24} color="#64748b" />
                <Text className="mt-2 text-2xl font-bold text-[#1a1c1e]">{formatNumber(ad.views)}</Text>
                <Text className="mt-1 text-caption-secondary text-[#64748b]">{copy.views}</Text>
              </View>
              <View className="items-center">
                <MousePointerClick size={24} color="#64748b" />
                <Text className="mt-2 text-2xl font-bold text-[#1a1c1e]">{formatNumber(ad.clicks)}</Text>
                <Text className="mt-1 text-caption-secondary text-[#64748b]">{copy.clicks}</Text>
              </View>
              <View className="items-center">
                <DollarSign size={24} color="#64748b" />
                <Text className="mt-2 text-2xl font-bold text-[#1a1c1e]">{formatNumber(ad.spent)}đ</Text>
                <Text className="mt-1 text-caption-secondary text-[#64748b]">{copy.spent}</Text>
              </View>
              <View className="items-center">
                <BarChart3 size={24} color="#64748b" />
                <Text className="mt-2 text-2xl font-bold text-[#1a1c1e]">{formatNumber(ad.posted)}</Text>
                <Text className="mt-1 text-caption-secondary text-[#64748b]">{copy.postedLabel || 'Đã đăng'}</Text>
              </View>
            </View>
          </View>

          {/* Monthly Views/Clicks Chart */}
          <DailyStatsChart dailyStats={dailyStats} copy={copy} />

          {/* Details */}
          <View className="space-y-4">
            <View className="flex-row items-center">
              <Globe size={20} color="#64748b" />
              <Text className="ml-3 flex-1 text-body-secondary text-[#64748b]">{copy.websiteLabel}</Text>
              <Text className="text-body-primary text-[#1a1c1e]">{ad.url || 'N/A'}</Text>
            </View>

            <View className="flex-row items-center">
              <Target size={20} color="#64748b" />
              <Text className="ml-3 flex-1 text-body-secondary text-[#64748b]">{copy.countryLabel}</Text>
              <Text className="text-body-primary text-[#1a1c1e]">{ad.audience || 'N/A'}</Text>
            </View>

            <View className="flex-row items-center">
              <Users size={20} color="#64748b" />
              <Text className="ml-3 flex-1 text-body-secondary text-[#64748b]">{copy.locationLabel}</Text>
              <Text className="text-body-primary text-[#1a1c1e]">{ad.location || 'N/A'}</Text>
            </View>

            <View className="flex-row items-center">
              <DollarSign size={20} color="#64748b" />
              <Text className="ml-3 flex-1 text-body-secondary text-[#64748b]">{copy.budgetLabelDetails}</Text>
              <Text className="text-body-primary text-[#1a1c1e]">
                {ad.budget && Number(ad.budget) > 0 ? `${formatNumber(ad.budget)} VNĐ` : copy.unlimited}
              </Text>
            </View>

            <View className="flex-row items-center">
              <CalendarDays size={20} color="#64748b" />
              <Text className="ml-3 flex-1 text-body-secondary text-[#64748b]">{copy.timeLabel}</Text>
              <Text className="text-body-primary text-[#1a1c1e]">
                {ad.start || ad.end ? `${ad.start || '...'} - ${ad.end || '...'}` : copy.unlimited}
              </Text>
            </View>

            <View className="flex-row items-center">
              <BarChart3 size={20} color="#64748b" />
              <Text className="ml-3 flex-1 text-body-secondary text-[#64748b]">{copy.postedLabel}</Text>
              <Text className="text-body-primary text-[#1a1c1e]">{formatNumber(ad.posted)}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

export default AdDetailsScreen;
