// Description: Advertising screen showing the current user's real ad campaigns.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
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
  Edit,
  Eye,
  Megaphone,
  MousePointerClick,
  Plus,
  Trash2,
  Video,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import { useAdvertisingViewModel } from '../../application/view-models/useAdvertisingViewModel';
import type { AdItem } from '../../../advertising/domain/types/ads.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getAdvertisingCopy } from '../../../advertising/application/i18n/advertisingCopy';

const BRAND = '#0000ff';

function formatNumber(value: number | string | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) {
    return '0';
  }
  return numeric.toLocaleString('vi-VN');
}

function isVideoMedia(url?: string) {
  return /\.(mp4|mov|m4v|avi|webm)(\?|$)/i.test(url ?? '');
}

function getStatus(ad: AdItem, copy: Record<string, string>) {
  const status = String(ad.status ?? '');
  if (status === '1') {
    return { label: copy.statusRunning, color: '#16a34a', bg: '#dcfce7' };
  }
  if (status === '2') {
    return { label: copy.statusPaused, color: '#ca8a04', bg: '#fef9c3' };
  }
  return { label: copy.statusPending, color: '#64748b', bg: '#f1f5f9' };
}

function getAppearsLabel(value: string, copy: Record<string, string>) {
  switch (value) {
    case 'post':
      return copy.positionLabelPostShort;
    case 'sidebar':
      return copy.positionLabelSidebarShort;
    case 'video':
      return copy.positionLabelVideoShort;
    case 'story':
      return copy.positionLabelStoryShort;
    case 'entire':
      return copy.positionLabelEntire;
    default:
      return value || copy.advertisingTitle;
  }
}

function getBiddingLabel(value: string, copy: Record<string, string>) {
  return value === 'views' ? copy.biddingViews : copy.biddingClicks;
}

function AdCampaignCard({
  ad,
  onEdit,
  onDelete,
  onViewDetails,
  copy,
}: {
  ad: AdItem;
  onEdit: (ad: AdItem) => void;
  onDelete: (ad: AdItem) => void;
  onViewDetails: (ad: AdItem) => void;
  copy: Record<string, string>;
}) {
  const status = getStatus(ad, copy);
  const title = ad.headline || ad.name || copy.advertisingTitle;
  const mediaUrl = ad.ad_media;
  const hasImage = Boolean(mediaUrl && !isVideoMedia(mediaUrl));

  return (
    <View className="surface-card mb-3 overflow-hidden">
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
              {ad.name || copy.advertisingTitle}
            </Text>
            <Text className="mt-1 text-sm text-[#64748b]" numberOfLines={2}>
              {ad.headline || ''}
            </Text>
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
              {getAppearsLabel(ad.appears, copy)}
            </Text>
          </View>
          <View className="rounded-full bg-[#f1f5f9] px-3 py-1">
            <Text className="text-xs font-semibold text-[#475569]">
              {getBiddingLabel(ad.bidding, copy)}
            </Text>
          </View>
          {!!ad.budget && Number(ad.budget) > 0 && (
            <View className="rounded-full bg-[#ecfeff] px-3 py-1">
              <Text className="text-xs font-semibold text-[#0891b2]">
                {copy.budgetTag} {formatNumber(ad.budget)}
              </Text>
            </View>
          )}
        </View>

        <View className="mt-4 h-px bg-[#e2e8f0]" />

        {/* Metrics Section: 3 columns */}
        <View className="mt-4 flex-row items-center">
          <View className="w-1/3 items-center px-1">
            <Eye size={18} color="#64748b" />
            <Text className="mt-1 text-xs text-[#64748b]" numberOfLines={1}>
              {formatNumber(ad.views)} {copy.views}
            </Text>
          </View>
          <View className="w-1/3 items-center px-1">
            <MousePointerClick size={18} color="#64748b" />
            <Text className="mt-1 text-xs text-[#64748b]" numberOfLines={1}>
              {formatNumber(ad.clicks)} {copy.clicks}
            </Text>
          </View>
          <View className="w-1/3 items-center px-1">
            <BarChart3 size={18} color="#64748b" />
            <Text className="mt-1 text-xs text-[#64748b]" numberOfLines={1}>
              {copy.spent} {formatNumber(ad.spent)}đ
            </Text>
          </View>
        </View>

        <View className="mt-4 h-px bg-[#e2e8f0]" />

        {/* Actions Row */}
        <View className="mt-4 flex-row items-center justify-between">
          <View className="flex-row items-center flex-1 pr-2">
            <CalendarDays size={14} color="#64748b" />
            <Text className="ml-1 text-[11px] text-[#64748b]" numberOfLines={1}>
              {ad.start || ad.end ? `${ad.start || '...'} - ${ad.end || '...'}` : copy.unlimited}
            </Text>
          </View>

          <View className="flex-row gap-2">
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onViewDetails(ad)}
              className="flex-row items-center rounded-lg border border-blue-200 px-3 py-1.5 bg-blue-50"
            >
              <BarChart3 size={14} color="#2563eb" />
              <Text className="ml-1.5 text-xs font-semibold text-blue-600">{copy.details}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onEdit(ad)}
              className="flex-row items-center rounded-lg border border-slate-200 px-3 py-1.5 bg-slate-50"
            >
              <Edit size={14} color="#475569" />
              <Text className="ml-1.5 text-xs font-semibold text-slate-700">{copy.edit}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onDelete(ad)}
              className="flex-row items-center rounded-lg border border-red-200 px-3 py-1.5 bg-red-50"
            >
              <Trash2 size={14} color="#ef4444" />
              <Text className="ml-1.5 text-xs font-semibold text-red-600">{copy.delete}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

function AdvertisingScreen() {
  const navigation = useNavigation<any>();
  const { ads, isLoading, isRefreshing, error, fetchAds, refresh, deleteAd } = useAdvertisingViewModel();
  const [language] = useState<AppLanguage>(languageStorage.getLanguage());
  const copy = getAdvertisingCopy(language);

  useFocusEffect(
    useCallback(() => {
      fetchAds();
    }, [fetchAds]),
  );

  const handleEdit = useCallback((ad: AdItem) => {
    navigation.navigate(ROUTES.CREATE_AD, { ad });
  }, [navigation]);

  const handleViewDetails = useCallback((ad: AdItem) => {
    navigation.navigate(ROUTES.AD_DETAILS, { ad });
  }, [navigation]);

  const handleDelete = useCallback((ad: AdItem) => {
    Alert.alert(
      'Xóa quảng cáo',
      `Bạn có chắc chắn muốn xóa chiến dịch "${ad.headline || ad.name}" không? Hành động này không thể hoàn tác.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteAd(ad.id);
            if (res.success) {
              Alert.alert('Thành công', copy.deleteSuccess);
            } else {
              Alert.alert('Thất bại', res.error || copy.deleteFailed);
            }
          },
        },
      ]
    );
  }, [deleteAd, copy.deleteFailed, copy.deleteSuccess]);

  const isEmpty = !isLoading && ads.length === 0;

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      <View className="surface-topbar flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color={BRAND} />
        </TouchableOpacity>

        <Text className="text-title-primary text-[#1a1c1e]">{copy.advertisingTitle}</Text>

        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.navigate(ROUTES.CREATE_AD)}>
          <Text className="text-body-primary font-semibold text-[#0000e6]">{copy.createAd}</Text>
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
            <Text className="mt-4 text-sm text-[#64748b]">{copy.loadingAds}</Text>
          </View>
        ) : isEmpty ? (
          <View className="flex-1 items-center justify-center px-8 py-20">
            <View className="mb-6 h-28 w-28 items-center justify-center rounded-full bg-[#f1f5f9]">
              <Megaphone size={48} color="#94a3b8" />
            </View>

            <Text className="text-heading mb-3 text-center text-[#1a1c1e]">
              {copy.noAds}
            </Text>

            <Text className="text-body-secondary mb-8 text-center leading-6 text-[#64748b]">
              {error || copy.noAdsDesc}
            </Text>

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate(ROUTES.CREATE_AD)}
              className="btn-primary flex-row items-center gap-2 px-8 py-4">
              <Plus size={18} color="#ffffff" />
              <Text className="text-body-primary font-semibold text-white">
                {copy.createNewAd}
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
              <AdCampaignCard
                key={String(ad.id)}
                ad={ad}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewDetails={handleViewDetails}
                copy={copy}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default AdvertisingScreen;
