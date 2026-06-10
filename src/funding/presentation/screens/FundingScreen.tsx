// Description: Renders the VNSEEA fundraising list screen with premium 2026 designs, micro-interactions, and multi-language support.
import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Code,
  Gift,
  HeartHandshake,
  Image as ImageIcon,
  Plus,
  QrCode,
  Search,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useFundingViewModel } from '../../application/view-models/useFundingViewModel';
import type { FundingItem } from '../../domain/types/funding.types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';

type FundingNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND_COLOR = '#2563FF';

const FUNDING_COPY = {
  vi: {
    title: 'Gây quỹ',
    coFunding: 'Cùng đóng góp',
    createNew: 'Tạo mới',
    loading: 'Đang tải dữ liệu...',
    noCampaigns: 'Chưa có chiến dịch',
    noCampaignsSub: 'Hãy là người đầu tiên tạo chiến dịch gây quỹ để giúp đỡ cộng đồng nhé.',
    reload: 'Tải lại trang',
    errorTitle: 'Đã xảy ra lỗi',
    retry: 'Thử lại',
    by: 'bởi',
    untitled: 'Không có tiêu đề',
  },
  en: {
    title: 'Funding',
    coFunding: 'Co-funding',
    createNew: 'Create new',
    loading: 'Loading data...',
    noCampaigns: 'No campaigns yet',
    noCampaignsSub: 'Be the first to create a fundraising campaign to help the community.',
    reload: 'Reload page',
    errorTitle: 'An error occurred',
    retry: 'Retry',
    by: 'by',
    untitled: 'Untitled',
  },
};

function formatMoney(amount: number, symbol: string): string {
  return `${amount.toLocaleString('vi-VN')}${symbol}`;
}

// Custom Helper to determine category icon based on Title/Description
function getCategoryIcon(title: string = '', desc: string = '') {
  const text = (title + ' ' + desc).toLowerCase();
  if (
    text.includes('qr') ||
    text.includes('bank') ||
    text.includes('momo') ||
    text.includes('quét mã') ||
    text.includes('thanh toán')
  ) {
    return QrCode;
  }
  if (
    text.includes('code') ||
    text.includes('it') ||
    text.includes('lập trình') ||
    text.includes('brackets') ||
    text.includes('coder') ||
    text.includes('{}')
  ) {
    return Code;
  }
  if (
    text.includes('gift') ||
    text.includes('voucher') ||
    text.includes('tặng') ||
    text.includes('quà') ||
    text.includes('tri ân') ||
    text.includes('khuyến mãi') ||
    text.includes('5000000')
  ) {
    return Gift;
  }
  return ImageIcon;
}

interface CampaignCardProps {
  campaign: FundingItem;
  currencySymbol: string;
  onPress: () => void;
  index: number;
  copy: typeof FUNDING_COPY.vi;
}

function CampaignCard({ campaign, currencySymbol, onPress, index, copy }: CampaignCardProps) {
  const raised = parseFloat(campaign.raised || '0');
  const goal = parseFloat(campaign.amount || '1');
  const percent =
    goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;
  const donorCount = campaign.recent_donations?.length ?? 0;
  const donor = campaign.user_data;
  const donorName = donor
    ? `${donor.first_name ?? ''} ${donor.last_name ?? ''}`.trim() ||
      donor.username
    : null;

  // Tactile Scale Animation
  const scale = useRef(new Animated.Value(1)).current;

  // Fade-in & Slide-up Entry Animation
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: Math.min(index * 80, 600),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        delay: Math.min(index * 80, 600),
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1.0,
      useNativeDriver: true,
      friction: 6,
      tension: 120,
    }).start();
  };

  const CategoryIcon = getCategoryIcon(campaign.title, campaign.description);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }, { scale }],
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.03,
          shadowRadius: 8,
          elevation: 2,
        }}
        className="bg-white mb-3.5 rounded-[24px] border border-[#F1F5F9] flex-row p-3.5"
      >
        {/* Left Thumbnail container */}
        <View className="relative">
          <Image
            source={{ uri: campaign.image }}
            className="h-24 w-24 rounded-2xl"
            resizeMode="cover"
          />
          {/* Floating Category Badge */}
          <View
            style={{
              position: 'absolute',
              bottom: -6,
              left: -6,
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: '#FFFFFF',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: '#F1F5F9',
              shadowColor: '#000000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 3,
              elevation: 3,
            }}
          >
            <CategoryIcon size={14} color={BRAND_COLOR} strokeWidth={2.2} />
          </View>
        </View>

        {/* Right Content */}
        <View className="flex-1 pl-4 justify-between">
          <View className="flex-row items-start justify-between">
            <Text
              className="flex-1 pr-2 text-[15px] font-bold text-[#0F172A] leading-5"
              numberOfLines={2}
            >
              {campaign.title || copy.untitled}
            </Text>
            {/* Percentage Badge */}
            <View className="rounded-full bg-[#EFF6FF] px-2.5 py-0.5 border border-[#DBEAFE]">
              <Text className="text-[11px] font-extrabold" style={{ color: BRAND_COLOR }}>
                {percent}%
              </Text>
            </View>
          </View>

          {donorName ? (
            <Text className="text-[12px] font-semibold text-[#64748B] mt-0.5" numberOfLines={1}>
              {copy.by} {donorName}
            </Text>
          ) : null}

          {/* Progress Bar */}
          <View className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden mt-2">
            <View
              className="h-full rounded-full"
              style={{ width: `${percent}%`, backgroundColor: BRAND_COLOR }}
            />
          </View>

          {/* Lower Row: Money + Donors */}
          <View className="mt-2 flex-row items-center justify-between">
            <Text className="text-[15px] font-extrabold" style={{ color: BRAND_COLOR }}>
              {formatMoney(raised, currencySymbol)}
            </Text>
            <View className="flex-row items-center bg-[#F8FAFC] px-2.5 py-1 rounded-full border border-[#F1F5F9]">
              <Users size={12} color="#64748B" />
              <Text className="ml-1.5 text-[11px] font-bold text-[#64748B]">
                {donorCount}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function CompactHeader({ onCreatePress, copy }: { onCreatePress: () => void; copy: typeof FUNDING_COPY.vi }) {
  return (
    <View className="mb-4 flex-row items-center justify-between px-1">
      <View className="flex-row items-center bg-white rounded-full py-1.5 pl-1.5 pr-4 border border-slate-100 shadow-sm" style={{ elevation: 1 }}>
        <View className="h-8 w-8 items-center justify-center rounded-full" style={{ backgroundColor: BRAND_COLOR }}>
          <HeartHandshake size={16} color="#FFFFFF" />
        </View>
        <Text className="ml-2.5 text-[14px] font-extrabold" style={{ color: BRAND_COLOR }}>
          {copy.coFunding}
        </Text>
      </View>
      <TouchableOpacity
        className="flex-row items-center bg-white rounded-full py-2 px-4 border border-[#E2E8F0] shadow-sm"
        style={{ elevation: 1 }}
        activeOpacity={0.85}
        onPress={onCreatePress}
      >
        <Plus size={14} color={BRAND_COLOR} strokeWidth={2.5} />
        <Text className="ml-1.5 text-[14px] font-extrabold" style={{ color: BRAND_COLOR }}>
          {copy.createNew}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ onRetry, copy }: { onRetry: () => void; copy: typeof FUNDING_COPY.vi }) {
  return (
    <View className="flex-1 items-center justify-center py-20 px-6">
      <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-[#EFF6FF] border border-[#DBEAFE]">
        <HeartHandshake size={28} color={BRAND_COLOR} />
      </View>
      <Text className="text-[18px] font-bold text-[#0F172A]">{copy.noCampaigns}</Text>
      <Text className="mt-2 text-center text-[13px] font-semibold text-[#64748B] leading-5">
        {copy.noCampaignsSub}
      </Text>
      <TouchableOpacity
        className="mt-6 rounded-full px-8 py-3 shadow-md active:opacity-90"
        style={{ backgroundColor: BRAND_COLOR }}
        activeOpacity={0.85}
        onPress={onRetry}
      >
        <Text className="text-[14px] font-bold text-white">
          {copy.reload}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ErrorState({ error, onRetry, copy }: { error: string; onRetry: () => void; copy: typeof FUNDING_COPY.vi }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-red-50 border border-red-100">
        <Text className="text-3xl">😢</Text>
      </View>
      <Text className="text-[18px] font-bold text-[#0F172A]">{copy.errorTitle}</Text>
      <Text className="mt-2 text-center text-[13px] font-semibold text-[#64748B] leading-5">{error}</Text>
      <TouchableOpacity
        className="mt-6 rounded-full px-8 py-3 shadow-md active:opacity-90"
        style={{ backgroundColor: BRAND_COLOR }}
        activeOpacity={0.85}
        onPress={onRetry}
      >
        <Text className="text-[14px] font-bold text-white">
          {copy.retry}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function LoadingState({ copy }: { copy: typeof FUNDING_COPY.vi }) {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator size="small" color={BRAND_COLOR} />
      <Text className="mt-3 text-[13px] font-semibold text-[#64748B]">{copy.loading}</Text>
    </View>
  );
}

function FundingScreen() {
  const navigation = useNavigation<FundingNav>();
  const language = useAppLanguage();
  const copy = FUNDING_COPY[language] || FUNDING_COPY.vi;
  const { campaigns, isLoading, error, currencySymbol, canCreate, reload } =
    useFundingViewModel();

  const handleCreatePress = () => {
    navigation.navigate(ROUTES.CREATE_FUNDING);
  };

  const handleCampaignPress = (campaign: FundingItem) => {
    navigation.navigate(ROUTES.FUNDING_DETAIL, {
      fundId: campaign.hashed_id,
    });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Top App Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-[#F8FAFC]">
        <View className="flex-row items-center gap-2.5">
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-full bg-white border border-slate-100 shadow-sm"
            style={{ elevation: 1 }}
            activeOpacity={0.75}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={18} color="#0F172A" />
          </TouchableOpacity>
          <Text className="text-[20px] font-extrabold text-[#0F172A]">{copy.title}</Text>
        </View>
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full bg-white border border-slate-100 shadow-sm"
          style={{ elevation: 1 }}
          activeOpacity={0.75}
        >
          <Search size={18} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 bg-[#F8FAFC]"
        contentContainerClassName="px-4 pb-6 pt-2"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={reload}
            colors={[BRAND_COLOR]}
            tintColor={BRAND_COLOR}
          />
        }
      >
        {canCreate ? (
          <CompactHeader onCreatePress={handleCreatePress} copy={copy} />
        ) : null}

        {isLoading && campaigns.length === 0 ? (
          <LoadingState copy={copy} />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} copy={copy} />
        ) : campaigns.length === 0 ? (
          <EmptyState onRetry={reload} copy={copy} />
        ) : (
          campaigns.map((campaign, index) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              currencySymbol={currencySymbol}
              index={index}
              onPress={() => handleCampaignPress(campaign)}
              copy={copy}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default FundingScreen;
