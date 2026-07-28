// English description: Displays the user's wallet balance and advertising campaigns.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Edit,
  Eye,
  Megaphone,
  MousePointerClick,
  Plus,
  Trash2,
  Video,
  WalletCards,
  X,
} from 'lucide-react-native';

import { ROUTES } from '../../../navigation/constants/routes';
import { useAdvertisingViewModel } from '../../application/view-models/useAdvertisingViewModel';
import type { AdItem } from '../../../advertising/domain/types/ads.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import { getAdvertisingCopy } from '../../../advertising/application/i18n/advertisingCopy';
import { showSnackbar } from '../../../shared-kernel/presentation/components/Snackbar';

const BRAND = APP_BRAND_COLOR;
const AD_LIST_REFRESH_INTERVAL_MS = 5_000;

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
    return { label: copy.statusRunning, color: '#15803d', bg: '#dcfce7' };
  }
  if (status === '2') {
    return { label: copy.statusPaused, color: '#a16207', bg: '#fef3c7' };
  }
  return { label: copy.statusPending, color: '#475569', bg: '#e2e8f0' };
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
  currencySymbol,
  onEdit,
  onDelete,
  onViewDetails,
  copy,
}: {
  ad: AdItem;
  currencySymbol: string;
  onEdit: (ad: AdItem) => void;
  onDelete: (ad: AdItem) => void;
  onViewDetails: (ad: AdItem) => void;
  copy: Record<string, string>;
}) {
  const status = getStatus(ad, copy);
  const title = ad.headline || ad.name || copy.advertisingTitle;
  const mediaUrl = ad.ad_media;
  const hasImage = Boolean(mediaUrl && !isVideoMedia(mediaUrl));
  const schedule =
    ad.start || ad.end
      ? `${ad.start || '...'} - ${ad.end || '...'}`
      : copy.unlimited;

  return (
    <View className="mb-4 overflow-hidden rounded-[24px] border border-slate-200 bg-white">
      <TouchableOpacity activeOpacity={0.9} onPress={() => onViewDetails(ad)}>
        {hasImage ? (
          <Image
            source={{ uri: mediaUrl }}
            className="h-44 w-full bg-slate-100"
            resizeMode="cover"
          />
        ) : mediaUrl ? (
          <View className="h-44 w-full items-center justify-center bg-slate-900">
            <View className="h-14 w-14 items-center justify-center rounded-full bg-white/15">
              <Video size={28} color="#ffffff" />
            </View>
            <Text className="mt-3 text-sm font-semibold text-white">
              {copy.adVideo || 'Video ad'}
            </Text>
          </View>
        ) : (
          <View className="h-36 w-full items-center justify-center bg-slate-100">
            <Megaphone size={34} color="#94a3b8" />
          </View>
        )}
      </TouchableOpacity>

      <View className="p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
              numberOfLines={1}
            >
              {ad.name || copy.advertisingTitle}
            </Text>
            <Text
              className="mt-1 text-lg font-bold leading-6 text-slate-900"
              numberOfLines={2}
            >
              {title}
            </Text>
          </View>

          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: status.bg }}
          >
            <Text className="text-xs font-semibold" style={{ color: status.color }}>
              {status.label}
            </Text>
          </View>
        </View>

        {!!ad.description && (
          <Text className="mt-2 text-sm leading-5 text-slate-600" numberOfLines={2}>
            {ad.description}
          </Text>
        )}

        <View className="mt-3 flex-row flex-wrap gap-2">
          <View className="rounded-full bg-brand-subtle px-3 py-1.5">
            <Text className="text-xs font-semibold text-brand">
              {getAppearsLabel(ad.appears, copy)}
            </Text>
          </View>
          <View className="rounded-full bg-slate-100 px-3 py-1.5">
            <Text className="text-xs font-semibold text-slate-600">
              {getBiddingLabel(ad.bidding, copy)}
            </Text>
          </View>
          {!!ad.budget && Number(ad.budget) > 0 && (
            <View className="rounded-full bg-blue-50 px-3 py-1.5">
              <Text className="text-xs font-semibold text-blue-700">
                {copy.budgetTag} {formatNumber(ad.budget)} {currencySymbol}
              </Text>
            </View>
          )}
        </View>

        <View className="mt-4 overflow-hidden rounded-2xl bg-slate-50">
          <View className="flex-row items-center justify-between border-b border-slate-200 px-3 py-2.5">
            <Text className="text-xs font-semibold text-slate-600">
              {copy.liveMetrics}
            </Text>
            <View className="flex-row items-center rounded-full bg-emerald-50 px-2 py-1">
              <View className="mr-1.5 h-2 w-2 rounded-full bg-emerald-500" />
              <Text className="text-[11px] font-bold text-emerald-700">
                {copy.live}
              </Text>
            </View>
          </View>
          <View className="flex-row px-2 py-3">
            <View className="flex-1 items-center px-1">
              <Eye size={17} color="#64748b" />
              <Text className="mt-1 text-base font-bold text-slate-900">
                {formatNumber(ad.views)}
              </Text>
              <Text className="text-[11px] text-slate-500">{copy.viewsLabel}</Text>
            </View>
            <View className="my-1 w-px bg-slate-200" />
            <View className="flex-1 items-center px-1">
              <MousePointerClick size={17} color="#64748b" />
              <Text className="mt-1 text-base font-bold text-slate-900">
                {formatNumber(ad.clicks)}
              </Text>
              <Text className="text-[11px] text-slate-500">{copy.clicksLabel}</Text>
            </View>
            <View className="my-1 w-px bg-slate-200" />
            <View className="flex-1 items-center px-1">
              <BarChart3 size={17} color="#64748b" />
              <Text
                className="mt-1 text-base font-bold text-slate-900"
                numberOfLines={1}
              >
                {formatNumber(ad.spent)}
              </Text>
              <Text className="text-[11px] text-slate-500">{copy.spentLabel}</Text>
            </View>
          </View>
        </View>

        <View className="mt-3 flex-row items-center rounded-xl border border-slate-100 px-3 py-2.5">
          <CalendarDays size={16} color="#64748b" />
          <Text className="ml-2 flex-1 text-xs text-slate-600" numberOfLines={1}>
            {schedule}
          </Text>
        </View>

        <View className="mt-4 flex-row gap-2">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onViewDetails(ad)}
            className="min-h-[46px] flex-1 flex-row items-center justify-center rounded-xl bg-brand px-3"
          >
            <BarChart3 size={17} color="#ffffff" />
            <Text className="ml-2 text-sm font-semibold text-white">{copy.details}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onEdit(ad)}
            className="min-h-[46px] flex-row items-center justify-center rounded-xl border border-slate-200 bg-white px-4"
          >
            <Edit size={17} color="#475569" />
            <Text className="ml-2 text-sm font-semibold text-slate-700">{copy.edit}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel={copy.delete}
            activeOpacity={0.8}
            onPress={() => onDelete(ad)}
            className="h-[46px] w-[46px] items-center justify-center rounded-xl border border-red-200 bg-red-50"
          >
            <Trash2 size={18} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function AdvertisingScreen() {
  const navigation = useNavigation<any>();
  const {
    ads,
    options,
    isLoading,
    isRefreshing,
    isDeleting,
    error,
    fetchAds,
    refresh,
    syncAds,
    deleteAd,
  } = useAdvertisingViewModel();
  const language = useAppLanguage();
  const copy = getAdvertisingCopy(language);
  const currencySymbol = options?.currencySymbol || options?.currency || 'VNSEEA';
  const [pendingDeleteAd, setPendingDeleteAd] = useState<AdItem | null>(null);

  useFocusEffect(
    useCallback(() => {
      let appState = AppState.currentState;
      let refreshTimer: ReturnType<typeof setInterval> | null = null;

      const stopRealtimeSync = () => {
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = null;
      };
      const startRealtimeSync = () => {
        if (appState !== 'active' || refreshTimer) return;
        refreshTimer = setInterval(() => {
          syncAds().catch(() => undefined);
        }, AD_LIST_REFRESH_INTERVAL_MS);
      };

      fetchAds();
      startRealtimeSync();

      const appStateSubscription = AppState.addEventListener(
        'change',
        nextState => {
          appState = nextState;
          if (nextState === 'active') {
            syncAds().catch(() => undefined);
            startRealtimeSync();
          } else {
            stopRealtimeSync();
          }
        },
      );

      return () => {
        stopRealtimeSync();
        appStateSubscription.remove();
      };
    }, [fetchAds, syncAds]),
  );

  const handleEdit = useCallback(
    (ad: AdItem) => {
      navigation.navigate(ROUTES.CREATE_AD, { ad });
    },
    [navigation],
  );

  const handleViewDetails = useCallback(
    (ad: AdItem) => {
      navigation.navigate(ROUTES.AD_DETAILS, { ad });
    },
    [navigation],
  );

  const handleDelete = useCallback((ad: AdItem) => {
    setPendingDeleteAd(ad);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (!isDeleting) setPendingDeleteAd(null);
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDeleteAd || isDeleting) return;

    const result = await deleteAd(pendingDeleteAd.id);
    if (result.success) {
      setPendingDeleteAd(null);
      showSnackbar({ message: copy.deleteSuccess, type: 'success' });
      return;
    }

    showSnackbar({
      message: result.error || copy.deleteFailed,
      type: 'error',
    });
  }, [copy.deleteFailed, copy.deleteSuccess, deleteAd, isDeleting, pendingDeleteAd]);

  const isEmpty = !isLoading && ads.length === 0;
  const campaignCountLabel =
    language === 'vi' ? `${ads.length} chiến dịch` : `${ads.length} campaigns`;
  const campaignHelper =
    language === 'vi'
      ? 'Theo dõi hiệu suất và quản lý quảng cáo của bạn.'
      : 'Track performance and manage your advertisements.';
  const manageBalanceLabel =
    language === 'vi' ? 'Quản lý số dư' : 'Manage balance';

  return (
    <View className="flex-1 bg-[#f6f8fc]">
      <FocusAwareStatusBar
        barStyle="light-content"
        backgroundColor={APP_BRAND_COLOR}
      />
      <SafeAreaFeedHeader safeAreaBackgroundColor={APP_BRAND_COLOR} />

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow px-4 pb-10 pt-4"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refresh}
            tintColor={BRAND}
            colors={[BRAND]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="overflow-hidden rounded-[24px] bg-brand p-5">
          <View className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
          <View className="absolute -bottom-16 right-20 h-32 w-32 rounded-full bg-black/5" />

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                <WalletCards size={21} color="#ffffff" />
              </View>
              <Text className="ml-3 text-sm font-semibold text-white/85">
                {copy.walletBalance}
              </Text>
            </View>
            <View className="rounded-full bg-white/15 px-3 py-1.5">
              <Text className="text-xs font-semibold text-white">{currencySymbol}</Text>
            </View>
          </View>

          <Text className="mt-5 text-[34px] font-bold leading-10 text-white">
            {formatNumber(options?.walletBalance)}
          </Text>

          <TouchableOpacity
            activeOpacity={0.85}
            className="mt-5 min-h-[46px] flex-row items-center justify-center rounded-xl bg-white px-4"
            onPress={() => navigation.navigate(ROUTES.MY_BALANCE)}
          >
            <CreditCard size={18} color={BRAND} />
            <Text className="ml-2 flex-1 text-center text-sm font-bold text-brand">
              {manageBalanceLabel}
            </Text>
            <ChevronRight size={18} color={BRAND} />
          </TouchableOpacity>
        </View>

        <View className="mt-3 flex-row gap-3">
          <TouchableOpacity
            activeOpacity={0.82}
            className="min-h-[86px] flex-1 flex-row items-center rounded-2xl border border-brand-border bg-white px-4"
            onPress={() => navigation.navigate(ROUTES.CREATE_AD)}
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand-subtle">
              <Plus size={22} color={BRAND} />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-sm font-bold text-slate-900">{copy.newCampaign}</Text>
              <Text className="mt-1 text-xs text-slate-500">{copy.createAd}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.82}
            className="min-h-[86px] flex-1 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4"
            onPress={() => navigation.navigate(ROUTES.MY_BALANCE)}
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
              <CreditCard size={21} color="#475569" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-sm font-bold text-slate-900">
                {copy.walletTitle}
              </Text>
              <Text className="mt-1 text-xs text-slate-500">{manageBalanceLabel}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View className="mb-3 mt-7 flex-row items-end justify-between gap-3">
          <View className="flex-1">
            <View className="flex-row items-center">
              <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-subtle">
                <Megaphone size={19} color={BRAND} />
              </View>
              <Text className="ml-3 text-xl font-bold text-slate-900">
                {copy.campaigns}
              </Text>
            </View>
            <Text className="mt-2 text-sm leading-5 text-slate-500">
              {campaignHelper}
            </Text>
          </View>
          <View className="rounded-full bg-slate-200 px-3 py-1.5">
            <Text className="text-xs font-semibold text-slate-700">
              {campaignCountLabel}
            </Text>
          </View>
        </View>

        {!!error && (
          <View className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        )}

        {isLoading && ads.length === 0 ? (
          <View className="min-h-[260px] items-center justify-center rounded-[24px] border border-slate-200 bg-white px-8">
            <ActivityIndicator size="large" color={BRAND} />
            <Text className="mt-4 text-sm text-slate-500">{copy.loadingAds}</Text>
          </View>
        ) : isEmpty ? (
          <View className="items-center rounded-[24px] border border-slate-200 bg-white px-7 py-12">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-subtle">
              <Megaphone size={30} color={BRAND} />
            </View>
            <Text className="mt-4 text-lg font-bold text-slate-900">{copy.noAds}</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
              {copy.noAdsDesc}
            </Text>
            <TouchableOpacity
              activeOpacity={0.82}
              className="mt-5 min-h-[46px] flex-row items-center justify-center rounded-xl bg-brand px-5"
              onPress={() => navigation.navigate(ROUTES.CREATE_AD)}
            >
              <Plus size={18} color="#ffffff" />
              <Text className="ml-2 text-sm font-bold text-white">
                {copy.createNewAd}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          ads.map(ad => (
            <AdCampaignCard
              key={String(ad.id)}
              ad={ad}
              currencySymbol={currencySymbol}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
              copy={copy}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={Boolean(pendingDeleteAd)}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={closeDeleteModal}
      >
        <View className="flex-1 items-center justify-center bg-slate-950/55 px-5">
          <Pressable
            accessibilityLabel={copy.cancel}
            className="absolute inset-0"
            disabled={isDeleting}
            onPress={closeDeleteModal}
          />

          <View
            accessibilityRole="alert"
            accessibilityViewIsModal
            className="w-full max-w-[420px] rounded-[28px] bg-white px-5 pb-5 pt-6"
          >
            <TouchableOpacity
              accessibilityLabel={copy.cancel}
              activeOpacity={0.75}
              className="absolute right-4 top-4 z-10 h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              disabled={isDeleting}
              onPress={closeDeleteModal}
            >
              <X size={19} color="#64748b" />
            </TouchableOpacity>

            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-red-50">
              <Trash2 size={27} color="#dc2626" />
            </View>

            <Text className="mt-5 pr-12 text-2xl font-bold leading-8 text-slate-900">
              {copy.deleteConfirmTitle}
            </Text>
            <Text className="mt-2 text-sm leading-5 text-slate-600">
              {copy.deleteCampaignPrompt}
            </Text>

            <View className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <Text className="text-xs font-semibold uppercase tracking-wide text-red-600">
                {language === 'vi' ? 'Chiến dịch' : 'Campaign'}
              </Text>
              <Text className="mt-1 text-base font-bold leading-6 text-slate-900" numberOfLines={2}>
                {pendingDeleteAd?.headline || pendingDeleteAd?.name || copy.advertisingTitle}
              </Text>
            </View>

            <Text className="mt-3 text-xs leading-5 text-slate-500">
              {copy.deleteIrreversible}
            </Text>

            <View className="mt-6 flex-row gap-3">
              <TouchableOpacity
                activeOpacity={0.8}
                className="min-h-[52px] flex-1 items-center justify-center rounded-2xl bg-slate-100 px-4"
                disabled={isDeleting}
                onPress={closeDeleteModal}
              >
                <Text className="text-sm font-bold text-slate-700">{copy.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={copy.delete}
                activeOpacity={0.85}
                className="min-h-[52px] flex-1 flex-row items-center justify-center rounded-2xl bg-red-600 px-4"
                disabled={isDeleting}
                onPress={confirmDelete}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <>
                    <Trash2 size={18} color="#ffffff" />
                    <Text className="ml-2 text-sm font-bold text-white">{copy.delete}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default AdvertisingScreen;
