// Description: Ad Details Screen - Shows detailed information about an ad campaign
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
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
import type { AdItem } from '../../domain/types/ads.types';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getAdvertisingCopy } from '../../application/i18n/advertisingCopy';

type AdDetailsNav = NativeStackNavigationProp<RootStackParamList>;
type AdDetailsRoute = RouteProp<RootStackParamList, typeof ROUTES.AD_DETAILS>;

const BRAND = '#1d4ed8';

function formatNumber(value: number | string | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return '0';
  }
  return numeric.toLocaleString('vi-VN');
}

function getStatus(status: string) {
  if (status === '1') {
    return { label: 'Đang chạy', color: '#16a34a', bg: '#dcfce7' };
  }
  if (status === '2') {
    return { label: 'Tạm dừng', color: '#ca8a04', bg: '#fef9c3' };
  }
  return { label: 'Đang chờ', color: '#64748b', bg: '#f1f5f9' };
}

function getAppearsLabel(value: string) {
  switch (value) {
    case 'post':
      return 'Bài viết';
    case 'sidebar':
      return 'Thanh bên';
    case 'video':
      return 'Video';
    case 'story':
      return 'Story';
    case 'timeline':
      return 'Timeline';
    case 'groups':
      return 'Nhóm';
    case 'pages':
      return 'Trang';
    case 'messages':
      return 'Tin nhắn';
    default:
      return value || 'Quảng cáo';
  }
}

function getBiddingLabel(value: string) {
  return value === 'views' ? 'Theo lượt xem' : 'Theo lượt nhấp';
}

function getGenderLabel(value: string) {
  switch (value) {
    case 'male':
      return 'Nam';
    case 'female':
      return 'Nữ';
    case 'all':
      return 'Tất cả';
    default:
      return value;
  }
}

function isVideoMedia(url?: string) {
  return /\.(mp4|mov|m4v|avi|webm)(\?|$)/i.test(url ?? '');
}

function AdDetailsScreen() {
  const navigation = useNavigation<AdDetailsNav>();
  const route = useRoute<AdDetailsRoute>();
  const ad = route.params?.ad;
  const [language] = useState<AppLanguage>(languageStorage.getLanguage());
  const copy = getAdvertisingCopy(language);

  if (!ad) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <StatusBar barStyle="dark-content" />
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-body-secondary text-center">{copy.notFound}</Text>
          <TouchableOpacity
            className="mt-4 rounded-xl bg-blue-700 px-6 py-3"
            onPress={() => navigation.goBack()}
          >
            <Text className="text-body-primary font-semibold text-white">{copy.goBack}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const status = getStatus(ad.status);
  const hasImage = Boolean(ad.ad_media && !isVideoMedia(ad.ad_media));

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="h-14 flex-row items-center justify-between border-b border-slate-200 px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={22} color="#1a1c1e" />
        </TouchableOpacity>
        <Text className="text-title-primary text-[#1a1c1e]">{copy.adDetailsTitle}</Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          onPress={() => navigation.navigate(ROUTES.CREATE_AD, { ad })}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Edit size={20} color="#1d4ed8" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Ad Media */}
        {hasImage ? (
          <Image source={{ uri: ad.ad_media }} className="h-56 w-full bg-slate-100" resizeMode="cover" />
        ) : ad.ad_media ? (
          <View className="h-56 w-full items-center justify-center bg-slate-900">
            <BarChart3 size={48} color="#ffffff" />
            <Text className="mt-2 text-sm font-semibold text-white">{copy.adVideo}</Text>
          </View>
        ) : null}

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
            <View className="rounded-full bg-[#eef2ff] px-3 py-1">
              <Text className="text-xs font-semibold text-[#3730a3]">{getAppearsLabel(ad.appears)}</Text>
            </View>
            <View className="rounded-full bg-[#f1f5f9] px-3 py-1">
              <Text className="text-xs font-semibold text-[#475569]">{getBiddingLabel(ad.bidding)}</Text>
            </View>
            <View className="rounded-full bg-[#ecfeff] px-3 py-1">
              <Text className="text-xs font-semibold text-[#0891b2]">{getGenderLabel(ad.gender)}</Text>
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
            </View>
          </View>

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
    </SafeAreaView>
  );
}

export default AdDetailsScreen;
