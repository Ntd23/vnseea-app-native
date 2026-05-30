// Description: Advertising screen showing the current user's real ad campaigns.
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  Eye,
  Megaphone,
  MousePointerClick,
  Plus,
  Video,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import { useAdvertisingViewModel } from '../../application/view-models/useAdvertisingViewModel';
import type { AdItem } from '../../../advertising/domain/types/ads.types';

const BRAND = '#0000ff';

function formatNumber(value: number | string | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return '0';
  }
  return numeric.toLocaleString('vi-VN');
}

function getStatus(ad: AdItem) {
  const status = String(ad.status ?? '');
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
      return 'Tin';
    case 'entire':
      return 'Toàn trang';
    default:
      return value || 'Quảng cáo';
  }
}

function getBiddingLabel(value: string) {
  return value === 'views' ? 'Lượt xem' : 'Lượt nhấp';
}

function isVideoMedia(url?: string) {
  return /\.(mp4|mov|m4v|avi|webm)(\?|$)/i.test(url ?? '');
}

function AdCampaignCard({ ad }: { ad: AdItem }) {
  const status = getStatus(ad);
  const title = ad.headline || ad.name || 'Quảng cáo';
  const mediaUrl = ad.ad_media;
  const hasImage = Boolean(mediaUrl && !isVideoMedia(mediaUrl));

  return (
    <TouchableOpacity activeOpacity={0.86} className="surface-card mb-3 overflow-hidden">
      {hasImage ? (
        <Image source={{ uri: mediaUrl }} className="h-40 w-full bg-slate-100" resizeMode="cover" />
      ) : mediaUrl ? (
        <View className="h-40 w-full items-center justify-center bg-slate-900">
          <Video size={38} color="#ffffff" />
          <Text className="mt-2 text-sm font-semibold text-white">Quảng cáo video</Text>
        </View>
      ) : null}

      <View className="px-4 py-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="text-title-primary text-[#1a1c1e]" numberOfLines={2}>
              {title}
            </Text>
            {!!ad.description && (
              <Text className="mt-1 text-sm text-[#64748b]" numberOfLines={2}>
                {ad.description}
              </Text>
            )}
          </View>

          <View className="rounded-full px-3 py-1" style={{ backgroundColor: status.bg }}>
            <Text className="text-xs font-semibold" style={{ color: status.color }}>
              {status.label}
            </Text>
          </View>
        </View>

        <View className="mt-4 flex-row flex-wrap gap-2">
          <View className="rounded-full bg-[#eef2ff] px-3 py-1">
            <Text className="text-xs font-semibold text-[#3730a3]">
              {getAppearsLabel(ad.appears)}
            </Text>
          </View>
          <View className="rounded-full bg-[#f1f5f9] px-3 py-1">
            <Text className="text-xs font-semibold text-[#475569]">
              {getBiddingLabel(ad.bidding)}
            </Text>
          </View>
          {!!ad.budget && Number(ad.budget) > 0 && (
            <View className="rounded-full bg-[#ecfeff] px-3 py-1">
              <Text className="text-xs font-semibold text-[#0891b2]">
                Ngân sách {formatNumber(ad.budget)}
              </Text>
            </View>
          )}
        </View>

        <View className="mt-4 h-px bg-[#e2e8f0]" />

        <View className="mt-4 flex-row items-center">
          <View className="w-1/4 items-center px-1">
            <Eye size={18} color="#64748b" />
            <Text className="mt-1 text-xs text-[#64748b]" numberOfLines={1}>
              {formatNumber(ad.views)} xem
            </Text>
          </View>
          <View className="w-1/4 items-center px-1">
            <MousePointerClick size={18} color="#64748b" />
            <Text className="mt-1 text-xs text-[#64748b]" numberOfLines={1}>
              {formatNumber(ad.clicks)} nhấp
            </Text>
          </View>
          <View className="w-1/4 items-center px-1">
            <BarChart3 size={18} color="#64748b" />
            <Text className="mt-1 text-xs text-[#64748b]" numberOfLines={1}>
              Đã chi {formatNumber(ad.spent)}
            </Text>
          </View>
          <View className="w-1/4 items-center px-1">
            <CalendarDays size={18} color="#64748b" />
            <Text className="mt-1 text-xs text-[#64748b]" numberOfLines={1}>
              {ad.start || ad.end ? `${ad.start || '...'} - ${ad.end || '...'}` : 'Không giới hạn'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function AdvertisingScreen() {
  const navigation = useNavigation<any>();
  const { ads, isLoading, isRefreshing, error, fetchAds, refresh } = useAdvertisingViewModel();

  useFocusEffect(
    useCallback(() => {
      fetchAds();
    }, [fetchAds]),
  );

  const isEmpty = !isLoading && ads.length === 0;

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View className="surface-topbar flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={BRAND} />
        </TouchableOpacity>

        <Text className="text-title-primary text-[#1a1c1e]">Quảng cáo</Text>

        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.navigate(ROUTES.CREATE_AD)}>
          <Text className="text-body-primary font-semibold text-[#0000e6]">Tạo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={BRAND} />
        }
        showsVerticalScrollIndicator={false}>
        {isLoading && ads.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8 py-20">
            <ActivityIndicator size="large" color={BRAND} />
            <Text className="mt-4 text-sm text-[#64748b]">Đang tải quảng cáo...</Text>
          </View>
        ) : isEmpty ? (
          <View className="flex-1 items-center justify-center px-8 py-20">
            <View className="mb-6 h-28 w-28 items-center justify-center rounded-full bg-[#f1f5f9]">
              <Megaphone size={48} color="#94a3b8" />
            </View>

            <Text className="text-heading mb-3 text-center text-[#1a1c1e]">
              Chưa có quảng cáo
            </Text>

            <Text className="text-body-secondary mb-8 text-center leading-6 text-[#64748b]">
              {error ||
                'Bạn chưa tạo chiến dịch quảng cáo nào. Bắt đầu tạo quảng cáo để tiếp cận thêm khách hàng.'}
            </Text>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate(ROUTES.CREATE_AD)}
              className="btn-primary flex-row items-center gap-2 px-8 py-4">
              <Plus size={18} color="#ffffff" />
              <Text className="text-body-primary font-semibold text-white">
                Tạo quảng cáo mới
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="px-5 pb-8 pt-4">
            {!!error && (
              <View className="mb-3 rounded-2xl bg-red-50 px-4 py-3">
                <Text className="text-sm text-red-700">{error}</Text>
              </View>
            )}

            {ads.map(ad => (
              <AdCampaignCard key={String(ad.id)} ad={ad} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default AdvertisingScreen;
