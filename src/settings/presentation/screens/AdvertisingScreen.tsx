// English description: Displays the user's wallet balance and advertising campaigns.
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
  CreditCard,
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
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
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
          <Text className="mt-2 text-sm font-semibold text-white">{copy.adVideo || "Quảng cáo video"}</Text>
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

function CampaignTableRow({
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
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onViewDetails(ad)}
      className="min-h-[54px] flex-row items-center border-b border-[#e5e7eb] bg-white">
      <Text className="w-12 px-2 text-xs text-[#475569]">{ad.id}</Text>
      <Text className="w-40 px-2 text-xs text-[#475569]" numberOfLines={2}>{ad.name}</Text>
      <Text className="w-24 px-2 text-xs text-[#475569]">{getBiddingLabel(ad.bidding, copy)}</Text>
      <Text className="w-20 px-2 text-center text-xs text-[#475569]">{formatNumber(ad.clicks)}</Text>
      <Text className="w-20 px-2 text-center text-xs text-[#475569]">{formatNumber(ad.views)}</Text>
      <Text className="w-24 px-2 text-xs font-semibold" style={{ color: status.color }}>{status.label}</Text>
      <Text className="w-24 px-2 text-xs text-[#475569]">{getAppearsLabel(ad.appears, copy)}</Text>
      <View className="w-28 flex-row justify-center gap-4 px-2">
        <TouchableOpacity onPress={() => onEdit(ad)} hitSlop={8}>
          <Edit size={17} color="#2563eb" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(ad)} hitSlop={8}>
          <Trash2 size={17} color="#ef4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function AdvertisingScreen() {
  const navigation = useNavigation<any>();
  const { ads, options, isLoading, isRefreshing, error, fetchAds, refresh, deleteAd } = useAdvertisingViewModel();
  const language = useAppLanguage();
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
      copy.deleteConfirmTitle || 'Xóa quảng cáo',
      (copy.deleteConfirmMessage || 'Bạn có chắc chắn muốn xóa chiến dịch "{name}" không? Hành động này không thể hoàn tác.').replace('{name}', ad.headline || ad.name || ''),
      [
        { text: copy.cancel || 'Hủy', style: 'cancel' },
        {
          text: copy.delete || 'Xóa',
          style: 'destructive',
          onPress: async () => {
            const res = await deleteAd(ad.id);
            if (res.success) {
              Alert.alert(copy.success || 'Thành công', copy.deleteSuccess);
            } else {
              Alert.alert(copy.failed || 'Thất bại', res.error || copy.deleteFailed);
            }
          },
        },
      ]
    );
  }, [deleteAd, copy]);

  const isEmpty = !isLoading && ads.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <FeedHeader />

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={BRAND} />
        }
        showsVerticalScrollIndicator={false}>
        <View className="bg-[#eef3ff] px-3 pb-4 pt-3">
          <View className="rounded-md bg-[#0000ff] px-4 py-4">
            <Text className="text-sm text-white/80">{copy.walletBalance || "Số Dư VNSEEA"}</Text>
            <Text className="mt-1 text-[27px] font-normal text-white">
              {formatNumber(options?.walletBalance)} {options?.currencySymbol || 'VNSEEA'}
            </Text>
          </View>

          <View className="mt-3 bg-white">
            <TouchableOpacity className="min-h-[52px] flex-row items-center border-l-2 border-[#0000ff] px-4">
              <Megaphone size={18} color="#111827" />
              <Text className="ml-3 text-sm font-semibold text-[#111827]">{copy.campaigns || "Các Chiến Dịch"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="min-h-[52px] flex-row items-center border-t border-[#f1f5f9] px-4"
              onPress={() => navigation.navigate(ROUTES.MY_BALANCE)}>
              <CreditCard size={18} color="#8b8b8b" />
              <Text className="ml-3 text-sm text-[#8b8b8b]">{copy.walletTitle || "VNSEEA"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="min-h-[52px] flex-row items-center border-t border-[#f1f5f9] px-4"
              onPress={() => navigation.navigate(ROUTES.CREATE_AD)}>
              <Plus size={18} color="#8b8b8b" />
              <Text className="ml-3 text-sm text-[#8b8b8b]">{copy.newCampaign || "Chiến Dịch Mới"}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-4 min-h-[52px] flex-row items-center border-b border-[#dbe2ef] bg-white px-4">
          <Megaphone size={18} color="#0000ff" />
          <Text className="ml-2 text-sm font-semibold text-[#111827]">{copy.campaigns || "Các chiến dịch"}</Text>
        </View>
        {isLoading && ads.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8 py-20">
            <ActivityIndicator size="large" color={BRAND} />
            <Text className="mt-4 text-sm text-[#64748b]">{copy.loadingAds}</Text>
          </View>
        ) : isEmpty ? (
          <View className="items-center bg-white px-8 py-16">
            <Megaphone size={38} color="#94a3b8" />
            <Text className="mt-3 text-sm text-[#64748b]">{error || copy.noAdsDesc}</Text>
          </View>
        ) : (
          <View className="pb-8">
            {!!error && (
              <View className="mb-3 rounded-2xl bg-red-50 px-4 py-3">
                <Text className="text-sm text-red-700">{error}</Text>
              </View>
            )}

            <ScrollView horizontal showsHorizontalScrollIndicator>
              <View className="w-[748px]">
                <View className="min-h-[58px] flex-row items-center bg-[#e8efff]">
                  <Text className="w-12 px-2 text-center text-xs font-semibold">{copy.id || "ID"}</Text>
                  <Text className="w-40 px-2 text-center text-xs font-semibold">{copy.companyName || "Công ty"}</Text>
                  <Text className="w-24 px-2 text-center text-xs font-semibold">{copy.bidding || "Đấu thầu"}</Text>
                  <Text className="w-20 px-2 text-center text-xs font-semibold">{copy.clicksCount || "Số lần nhấp"}</Text>
                  <Text className="w-20 px-2 text-center text-xs font-semibold">{copy.viewsLabel || "Lượt xem"}</Text>
                  <Text className="w-24 px-2 text-center text-xs font-semibold">{copy.status || "Trạng thái"}</Text>
                  <Text className="w-24 px-2 text-center text-xs font-semibold">{copy.positionLabel || "Vị trí"}</Text>
                  <Text className="w-28 px-2 text-center text-xs font-semibold">{copy.actions || "Thao tác"}</Text>
                </View>
                {ads.map(ad => (
                  <CampaignTableRow
                    key={String(ad.id)}
                    ad={ad}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onViewDetails={handleViewDetails}
                    copy={copy}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

export default AdvertisingScreen;
