// Description: Renders the funding detail screen with dynamic localization, 2026 design tokens, and tactile micro-interactions.
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Calendar,
  HeartHandshake,
  ShieldCheck,
  User,
  Users,
  X,
} from 'lucide-react-native';
import { useFundingDetailViewModel } from '../../application/view-models/useFundingDetailViewModel';
import type { RootStackParamList } from '../../../navigation/types';
import type { FundingDonation } from '../../domain/types/funding.types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';

type DetailNav = NativeStackNavigationProp<RootStackParamList>;
type DetailRoute = RouteProp<RootStackParamList, 'FundingDetail'>;

function formatDate(timestamp?: any, fallback?: string) {
  if (!timestamp) return fallback || '';
  const cleanTimestamp = typeof timestamp === 'string' ? timestamp.trim() : timestamp;
  const num = Number(cleanTimestamp);
  let date: Date;
  if (!isNaN(num) && isFinite(num)) {
    const isMilliseconds = num > 1e11;
    date = new Date(isMilliseconds ? num : num * 1000);
  } else {
    date = new Date(cleanTimestamp);
  }
  if (isNaN(date.getTime())) {
    return fallback || String(timestamp);
  }
  try {
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch (err) {
    return fallback || String(timestamp);
  }
}

const BRAND_COLOR = APP_BRAND_COLOR;

const DETAIL_COPY = {
  vi: {
    headerTitle: 'Chi tiết chiến dịch',
    adminLabel: 'Quản trị viên',
    raisedLabel: 'Đã quyên góp',
    goalLabel: 'Mục tiêu',
    completed: 'hoàn thành',
    donationsCount: 'lượt ủng hộ',
    descLabel: 'MÔ TẢ',
    donorsLabel: 'NGƯỜI ỦNG HỘ GẦN ĐÂY',
    noDonors: 'Chưa có lượt ủng hộ nào.',
    askDonate: 'Bạn muốn ủng hộ?',
    btnDonate: 'Ủng hộ',
    modalTitle: 'Ủng hộ chiến dịch',
    modalDesc: 'Nhập số tiền bạn muốn ủng hộ.',
    modalConfirm: 'Xác nhận ủng hộ',
    modalErrorAmount: 'Vui lòng nhập số tiền hợp lệ',
    alertSuccessTitle: 'Cảm ơn',
    alertSuccessMsg: 'Ủng hộ của bạn đã được gửi thành công.',
    loading: 'Đang tải...',
    errorTitle: 'Đã xảy ra lỗi',
    retry: 'Thử lại',
    notFound: 'Không tìm thấy chiến dịch',
    goBack: 'Quay lại',
    creatorFallback: 'Người tạo',
    anonymousDonor: 'Người ủng hộ ẩn danh',
    justNow: 'Vừa xong',
    minutesAgo: (count: number) => `${count} phút trước`,
    hoursAgo: (count: number) => `${count} giờ trước`,
    daysAgo: (count: number) => `${count} ngày trước`,
  },
  en: {
    headerTitle: 'Campaign Details',
    adminLabel: 'Administrator',
    raisedLabel: 'Raised',
    goalLabel: 'Target Goal',
    completed: 'completed',
    donationsCount: 'donations',
    descLabel: 'DESCRIPTION',
    donorsLabel: 'RECENT SUPPORTERS',
    noDonors: 'No supporters yet.',
    askDonate: 'Want to support?',
    btnDonate: 'Donate',
    modalTitle: 'Support Campaign',
    modalDesc: 'Enter the amount you wish to donate.',
    modalConfirm: 'Confirm Donation',
    modalErrorAmount: 'Please enter a valid amount',
    alertSuccessTitle: 'Thank You',
    alertSuccessMsg: 'Your support has been successfully sent.',
    loading: 'Loading...',
    errorTitle: 'An error occurred',
    retry: 'Retry',
    notFound: 'Campaign not found',
    goBack: 'Go Back',
    creatorFallback: 'Creator',
    anonymousDonor: 'Anonymous Supporter',
    justNow: 'Just now',
    minutesAgo: (count: number) => `${count} min ago`,
    hoursAgo: (count: number) => `${count} h ago`,
    daysAgo: (count: number) => `${count} d ago`,
  },
};

function formatMoney(amount: number, symbol: string): string {
  return `${amount.toLocaleString('vi-VN')}${symbol}`;
}

function formatTimeAgo(unixSeconds: number, copy: typeof DETAIL_COPY.vi): string {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return '';
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
  if (diff < 60) return copy.justNow;
  if (diff < 3600) return copy.minutesAgo(Math.floor(diff / 60));
  if (diff < 86400) return copy.hoursAgo(Math.floor(diff / 3600));
  return copy.daysAgo(Math.floor(diff / 86400));
}

interface PaginationControlsProps {
  page: number;
  hasNextPage: boolean;
  onPrev: () => void;
  onNext: () => void;
  language: string;
}

function PaginationControls({
  page,
  hasNextPage,
  onPrev,
  onNext,
  language,
}: PaginationControlsProps) {
  const isVi = language === 'vi';
  return (
    <View className="flex-row items-center justify-center gap-4 py-4 mt-2">
      <TouchableOpacity
        disabled={page === 1}
        onPress={onPrev}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: page === 1 ? '#F1F5F9' : '#FFFFFF',
          borderWidth: 1,
          borderColor: '#E2E8F0',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 16, color: page === 1 ? '#CBD5E1' : '#0F172A', fontWeight: 'bold' }}>‹</Text>
      </TouchableOpacity>
      
      <Text style={{ fontSize: 13, fontWeight: '700', color: '#64748B' }}>
        {isVi ? `Trang ${page}` : `Page ${page}`}
      </Text>

      <TouchableOpacity
        disabled={!hasNextPage}
        onPress={onNext}
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: !hasNextPage ? '#F1F5F9' : '#FFFFFF',
          borderWidth: 1,
          borderColor: '#E2E8F0',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        activeOpacity={0.7}
      >
        <Text style={{ fontSize: 16, color: !hasNextPage ? '#CBD5E1' : '#0F172A', fontWeight: 'bold' }}>›</Text>
      </TouchableOpacity>
    </View>
  );
}

interface DonorRowProps {
  donation: FundingDonation;
  currencySymbol: string;
  copy: typeof DETAIL_COPY.vi;
}

function DonorRow({ donation, currencySymbol, copy }: DonorRowProps) {
  const donor = donation.user_data;
  const name =
    donor && (donor.first_name || donor.last_name)
      ? `${donor.first_name ?? ''} ${donor.last_name ?? ''}`.trim()
      : (donor?.username ?? copy.anonymousDonor);
  const amount = parseFloat(donation.amount || '0');

  return (
    <View className="flex-row items-center py-3.5">
      {donor?.avatar ? (
        <Image
          source={{ uri: donor.avatar }}
          className="h-10 w-10 rounded-full"
          resizeMode="cover"
        />
      ) : (
        <View className="h-10 w-10 rounded-full bg-slate-100 items-center justify-center border border-slate-200">
          <User size={18} color="#64748B" />
        </View>
      )}
      <View className="ml-3 flex-1">
        <Text className="text-[14px] font-bold text-[#0F172A]" numberOfLines={1}>
          {name}
        </Text>
        <Text className="mt-0.5 text-[11px] font-semibold text-[#94A3B8]">
          {formatTimeAgo(donation.time, copy)}
        </Text>
      </View>
      <Text className="text-[14px] font-extrabold" style={{ color: BRAND_COLOR }}>
        + {formatMoney(amount, currencySymbol)}
      </Text>
    </View>
  );
}

interface DonateModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => Promise<boolean>;
  isSubmitting: boolean;
  currencySymbol: string;
  copy: typeof DETAIL_COPY.vi;
}

function DonateModal({
  visible,
  onClose,
  onConfirm,
  isSubmitting,
  currencySymbol,
  copy,
}: DonateModalProps) {
  const [amount, setAmount] = useState('');

  const handleConfirm = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert(copy.errorTitle, copy.modalErrorAmount);
      return;
    }
    const ok = await onConfirm(value);
    if (ok) {
      setAmount('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 items-center justify-end bg-black/40"
        onPress={onClose}
      >
        <Pressable
          className="w-full rounded-t-[28px] bg-white px-5 pb-8 pt-5"
          onPress={event => event.stopPropagation()}
        >
          <View className="mb-5 flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-[20px] font-extrabold text-[#0F172A]">{copy.modalTitle}</Text>
              <Text className="mt-1 text-[13px] font-semibold text-[#64748B] leading-5">
                {copy.modalDesc}
              </Text>
            </View>
            <TouchableOpacity
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              activeOpacity={0.85}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={onClose}
            >
              <X size={18} color="#334155" />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center px-4 bg-white border border-[#E2E8F0] rounded-2xl min-h-[54px] mb-5">
            <Text className="text-[17px] font-extrabold" style={{ color: BRAND_COLOR }}>+</Text>
            <TextInput
              className="ml-3 flex-1 text-[15px] font-bold text-[#0F172A]"
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={amount}
              onChangeText={text => setAmount(text.replace(/[^0-9]/g, ''))}
            />
            <View className="ml-2 rounded-lg bg-brand-soft px-2.5 py-1">
              <Text className="text-[11px] font-extrabold" style={{ color: BRAND_COLOR }}>
                {currencySymbol}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            className="min-h-[54px] items-center justify-center rounded-full shadow-sm"
            style={{ backgroundColor: BRAND_COLOR }}
            activeOpacity={0.85}
            onPress={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text className="text-[16px] font-bold text-white">
                {copy.modalConfirm}
              </Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FundingDetailScreen() {
  const navigation = useNavigation<DetailNav>();
  const route = useRoute<DetailRoute>();
  const language = useAppLanguage();
  const copy = DETAIL_COPY[language] || DETAIL_COPY.vi;

  const fundId = route.params?.fundId ?? '';
  const [donateModalVisible, setDonateModalVisible] = useState(false);

  const { user } = useCurrentUserViewModel();
  const currentUserId = user?.userId;

  const {
    campaign,
    donations,
    donationsPage,
    isLoading,
    isDonating,
    error,
    currencySymbol,
    reload,
    loadDonations,
    donate,
  } = useFundingDetailViewModel(fundId);

  const hasNextDonations = donations.length === 10;
  const handlePrevDonations = () => {
    if (donationsPage > 1) {
      loadDonations(donationsPage - 1);
    }
  };
  const handleNextDonations = () => {
    if (hasNextDonations) {
      loadDonations(donationsPage + 1);
    }
  };

  const isOwner = React.useMemo(() => {
    if (!campaign || currentUserId === undefined || currentUserId === null) {
      return false;
    }
    const targetIdStr = String(currentUserId).trim();
    if (!targetIdStr) return false;

    // Match direct campaign.user_id
    if (campaign.user_id !== undefined && campaign.user_id !== null) {
      if (String(campaign.user_id).trim() === targetIdStr) {
        return true;
      }
    }

    // Match campaign.user_data.user_id
    if (campaign.user_data && typeof campaign.user_data === 'object') {
      const userDataId = campaign.user_data.user_id;
      if (userDataId !== undefined && userDataId !== null) {
        if (String(userDataId).trim() === targetIdStr) {
          return true;
        }
      }
    }

    return false;
  }, [campaign, currentUserId]);

  // Entrance slide-up and fade-in animations for staggered cover and details card
  const coverOpacity = useRef(new Animated.Value(0)).current;
  const coverTranslateY = useRef(new Animated.Value(25)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(40)).current;
  const ctaScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (campaign) {
      Animated.parallel([
        Animated.timing(coverOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.spring(coverTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 400,
          delay: 100,
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          delay: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [campaign, coverOpacity, coverTranslateY, cardOpacity, cardTranslateY]);

  const handleCtaPressIn = () => {
    Animated.spring(ctaScale, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };

  const handleCtaPressOut = () => {
    Animated.spring(ctaScale, {
      toValue: 1.0,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };

  const handleDonate = useCallback(
    async (amount: number) => {
      const ok = await donate(amount);
      if (ok) {
        Alert.alert(copy.alertSuccessTitle, copy.alertSuccessMsg);
      }
      return ok;
    },
    [donate, copy],
  );

  if (isLoading && !campaign) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
        <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color={BRAND_COLOR} />
          <Text className="mt-3 text-[13px] font-semibold text-[#64748B]">{copy.loading}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !campaign) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
        <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-[18px] font-bold text-[#0F172A]">{copy.errorTitle}</Text>
          <Text className="mt-2 text-center text-[13px] font-semibold text-[#64748B] leading-5">
            {error}
          </Text>
          <TouchableOpacity
            className="mt-6 rounded-full px-8 py-3 shadow-md"
            style={{ backgroundColor: BRAND_COLOR }}
            activeOpacity={0.85}
            onPress={reload}
          >
            <Text className="text-[14px] font-bold text-white">
              {copy.retry}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!campaign) {
    return (
      <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
        <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-[18px] font-bold text-[#0F172A]">{copy.notFound}</Text>
          <TouchableOpacity
            className="mt-6 rounded-full px-8 py-3 shadow-md"
            style={{ backgroundColor: BRAND_COLOR }}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Text className="text-[14px] font-bold text-white">
              {copy.goBack}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const raised = parseFloat(campaign.raised || '0');
  const goal = parseFloat(campaign.amount || '1');
  const percent = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;
  const donor = campaign.user_data;
  const donorName =
    donor && (donor.first_name || donor.last_name)
      ? `${donor.first_name ?? ''} ${donor.last_name ?? ''}`.trim()
      : (donor?.username ?? copy.creatorFallback);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <FeedHeader />

      {/* App Bar Header */}
      <View
        style={{
          height: 64,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          backgroundColor: '#FFFFFF',
          borderBottomWidth: 1,
          borderBottomColor: '#f1f5f9',
          zIndex: 1000,
          elevation: 1000,
        }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#ffffff',
            borderWidth: 1,
            borderColor: '#f1f5f9',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text
          style={{
            fontSize: 18,
            fontWeight: '800',
            color: '#0F172A',
            flex: 1,
          }}
          numberOfLines={1}
        >
          {copy.headerTitle}
        </Text>
      </View>

      <ScrollView
        className="flex-1 bg-[#F8FAFC]"
        contentContainerClassName="px-4 pb-32 pt-3"
        showsVerticalScrollIndicator={false}
      >
        {/* Campaign Cover Image (Styled as a card at the top) */}
        {campaign.image ? (
          <Animated.View
            style={{
              opacity: coverOpacity,
              transform: [{ translateY: coverTranslateY }],
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.02,
              shadowRadius: 8,
              elevation: 2,
            }}
            className="mb-3.5"
          >
            <Image
              source={{ uri: campaign.image }}
              className="h-48 w-full rounded-[24px]"
              resizeMode="cover"
            />
          </Animated.View>
        ) : null}

        {/* Card: Campaign Details Card */}
        <Animated.View
          style={{
            opacity: cardOpacity,
            transform: [{ translateY: cardTranslateY }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.02,
            shadowRadius: 8,
            elevation: 2,
          }}
          className="bg-white p-5 rounded-[24px] border border-[#F1F5F9]"
        >
          {/* Title of Campaign */}
          <Text className="text-[20px] font-extrabold text-[#0F172A] leading-7">
            {campaign.title}
          </Text>

          {/* Creator Details */}
          <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {donor?.avatar ? (
                <Image
                  source={{ uri: donor.avatar }}
                  style={{ width: 36, height: 36, borderRadius: 18 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0' }}>
                  <User size={18} color="#64748B" />
                </View>
              )}
              <View style={{ marginLeft: 10, flexDirection: 'column' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
                  {donorName}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <ShieldCheck size={12} color={BRAND_COLOR} />
                  <Text style={{ marginLeft: 4, fontSize: 11, fontWeight: '600', color: '#64748B' }}>
                    {copy.adminLabel}
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
              <Calendar size={14} color="#64748B" style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748B' }}>
                {formatDate(campaign.time)}
              </Text>
            </View>
          </View>

          {/* Financial Progress Area */}
          <View className="bg-[#F8FAFC] border border-[#F1F5F9] mt-4 p-4 rounded-[20px]">
            <View className="flex-row items-end justify-between">
              <View>
                <Text className="text-[11px] font-extrabold text-[#94A3B8] uppercase tracking-wider">
                  {copy.raisedLabel}
                </Text>
                <Text className="text-[20px] font-extrabold mt-0.5" style={{ color: BRAND_COLOR }}>
                  {formatMoney(raised, currencySymbol)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[11px] font-extrabold text-[#94A3B8] uppercase tracking-wider">
                  {copy.goalLabel}
                </Text>
                <Text className="text-[14px] font-extrabold text-[#0F172A] mt-1">
                  {formatMoney(goal, currencySymbol)}
                </Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View className="h-1.5 w-full bg-[#E2E8F0] rounded-full overflow-hidden mt-3">
              <View
                className="h-full rounded-full"
                style={{ width: `${percent}%`, backgroundColor: BRAND_COLOR }}
              />
            </View>

            {/* Badges footer */}
            <View className="mt-3.5 flex-row items-center justify-between">
              <View className="rounded-full bg-brand-soft px-2.5 py-0.5 border border-brand-border">
                <Text className="text-[11px] font-extrabold" style={{ color: BRAND_COLOR }}>
                  {percent}% {copy.completed}
                </Text>
              </View>
              <View className="flex-row items-center bg-white px-2.5 py-1 rounded-full border border-[#F1F5F9]">
                <Users size={12} color="#64748B" />
                <Text className="ml-1.5 text-[11px] font-bold text-[#64748B]">
                  {donations.length} {copy.donationsCount}
                </Text>
              </View>
            </View>
          </View>

          {/* Description Section */}
          <View className="mt-5">
            <Text className="text-[11px] font-extrabold text-[#64748B] tracking-wider uppercase">
              {copy.descLabel}
            </Text>
            <Text className="mt-1.5 text-[14px] font-semibold text-[#334155] leading-6">
              {campaign.description}
            </Text>
          </View>

          {/* Recent Supporters Section */}
          <View className="mt-6">
            <Text className="text-[11px] font-extrabold text-[#64748B] tracking-wider uppercase">
              {copy.donorsLabel}
            </Text>
            {donations.length === 0 ? (
              <View className="mt-3 items-center bg-[#F8FAFC] border border-dashed border-[#E2E8F0] rounded-2xl p-6">
                <HeartHandshake size={28} color="#94A3B8" />
                <Text className="mt-2 text-[13px] font-semibold text-[#94A3B8]">
                  {copy.noDonors}
                </Text>
              </View>
            ) : (
              <>
                <View className="bg-[#F8FAFC] border border-[#F1F5F9] mt-3 rounded-[20px] px-4">
                  {donations.map((item, index) => (
                    <View key={item.id ?? index}>
                      <DonorRow
                        donation={item}
                        currencySymbol={currencySymbol}
                        copy={copy}
                      />
                      {index < donations.length - 1 ? (
                        <View className="h-px bg-[#F1F5F9]" />
                      ) : null}
                    </View>
                  ))}
                </View>
                <PaginationControls
                  page={donationsPage}
                  hasNextPage={hasNextDonations}
                  onPrev={handlePrevDonations}
                  onNext={handleNextDonations}
                  language={language}
                />
              </>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* Sticky Bottom Actions Banner */}
      <View
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
          elevation: 4,
        }}
        className="bg-white border border-[#F1F5F9] flex-row items-center rounded-3xl p-3"
      >
        {isOwner ? (
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 }}>
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: APP_COLORS.brand.soft, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
              <ShieldCheck size={20} color={BRAND_COLOR} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>
                {language === 'vi' ? 'Chiến dịch của bạn' : 'Your Campaign'}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: '#64748B', marginTop: 1 }}>
                {language === 'vi' 
                  ? 'Bạn không thể tự ủng hộ chiến dịch của chính mình.' 
                  : 'You cannot donate to your own campaign.'}
              </Text>
            </View>
            <View style={{ backgroundColor: APP_COLORS.brand.soft, borderWidth: 1, borderColor: APP_COLORS.brand.border, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '800', color: BRAND_COLOR }}>
                {language === 'vi' ? 'QUẢN TRỊ' : 'OWNER'}
              </Text>
            </View>
          </View>
        ) : (
          <>
            <View className="flex-1 pl-3 justify-center">
              <Text className="text-[11px] font-bold text-[#94A3B8]">{copy.askDonate}</Text>
              <Text className="text-[13px] font-extrabold text-[#0F172A] mt-0.5" numberOfLines={1}>
                {formatMoney(raised, currencySymbol)} / {formatMoney(goal, currencySymbol)}
              </Text>
            </View>
            <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
              <TouchableOpacity
                className="flex-row items-center rounded-full px-7 py-3 shadow-md"
                style={{ backgroundColor: BRAND_COLOR }}
                activeOpacity={0.85}
                onPressIn={handleCtaPressIn}
                onPressOut={handleCtaPressOut}
                onPress={() => setDonateModalVisible(true)}
              >
                <HeartHandshake size={16} color="#ffffff" />
                <Text className="ml-2 text-[14px] font-bold text-white">
                  {copy.btnDonate}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </>
        )}
      </View>

      {/* Donate Modal */}
      <DonateModal
        visible={donateModalVisible}
        onClose={() => setDonateModalVisible(false)}
        onConfirm={handleDonate}
        isSubmitting={isDonating}
        currencySymbol={currencySymbol}
        copy={copy}
      />
    </SafeAreaView>
  );
}

export default FundingDetailScreen;
