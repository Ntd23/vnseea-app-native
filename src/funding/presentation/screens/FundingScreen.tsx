// Description: Renders the VNSEEA fundraising list screen with premium 2026 designs, micro-interactions, and multi-language support.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Code,
  Edit,
  Gift,
  HeartHandshake,
  Image as ImageIcon,
  Plus,
  QrCode,
  Search,
  Trash2,
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
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import { createFundingRepository } from '../../infrastructure/repositories/ApiFundingRepository';


type FundingNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND_COLOR = APP_BRAND_COLOR;

const FUNDING_COPY = {
  vi: {
    title: 'Gây quỹ',
    coFunding: 'Cùng đóng góp',
    myRequests: 'Yêu cầu tài trợ của tôi',
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
    myRequests: 'My requests',
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

const FALLBACK_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';

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

interface CampaignCardProps {
  campaign: FundingItem;
  currencySymbol: string;
  onPress: () => void;
  index: number;
  copy: typeof FUNDING_COPY.vi;
  showEditDelete?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

function CampaignCard(props: CampaignCardProps) {
  try {
    return <CampaignCardInner {...props} />;
  } catch (err) {
    console.warn('CampaignCard render error:', err);
    return (
      <View className="p-4 bg-red-50 border border-red-200 rounded-[24px] mb-4">
        <Text className="text-red-600 font-bold text-xs">Lỗi hiển thị gây quỹ ({props.campaign?.title || 'Không rõ'})</Text>
        <Text className="text-red-500 text-[10px] mt-1">
          {err instanceof Error ? err.message : String(err)}
        </Text>
      </View>
    );
  }
}

function CampaignCardInner({
  campaign,
  currencySymbol,
  onPress,
  index,
  copy,
  showEditDelete,
  onEdit,
  onDelete,
}: CampaignCardProps) {
  const raised = parseFloat(campaign.raised || '0') || 0;
  const goal = parseFloat(campaign.amount || '0') || 0;
  const percent =
    goal > 0 && isFinite(raised) && isFinite(goal)
      ? Math.max(0, Math.min(Math.round((raised / goal) * 100), 100))
      : 0;
  const donorCount = campaign.recent_donations?.length ?? 0;
  const donor = campaign.user_data;
  const donorName = donor
    ? `${donor.first_name ?? ''} ${donor.last_name ?? ''}`.trim() ||
      donor.username
    : null;

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

  const CategoryIcon = getCategoryIcon(campaign.title, campaign.description);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
      }}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.9}
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.03,
          shadowRadius: 8,
          elevation: 2,
        }}
        className="bg-white mb-4 rounded-[24px] border border-[#F1F5F9] flex-col overflow-hidden"
      >
        {/* Top Image container */}
        <View className="relative w-full h-48 bg-slate-100">
          {campaign.image ? (
            <Image
              source={{ uri: campaign.image }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center bg-slate-200">
              <ImageIcon size={40} color="#94A3B8" />
            </View>
          )}
        </View>

        {/* Lower Content */}
        <View className="p-4 flex-col">
          {/* Title and percent row */}
          <View className="flex-row items-start justify-between mb-3">
            <Text
              className="flex-1 pr-3 text-[16px] font-bold text-[#0F172A] leading-5"
              numberOfLines={2}
            >
              {campaign.title || copy.untitled}
            </Text>
            <View className="rounded-full bg-brand-soft px-2.5 py-0.5 border border-brand-border self-start">
              <Text className="text-[11px] font-extrabold" style={{ color: BRAND_COLOR }}>
                {percent}%
              </Text>
            </View>
          </View>

          {/* User profile (Avatar & creator info) */}
          {donor ? (
            <View className="flex-row items-center mb-3">
              <Image
                source={{ uri: donor.avatar || FALLBACK_AVATAR }}
                className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200"
              />
              <View className="ml-2.5 flex-col justify-center">
                <Text className="text-[13px] font-bold text-slate-800" numberOfLines={1}>
                  {donorName}
                </Text>
                <Text className="text-[11px] font-medium text-slate-400 mt-0.5">
                  {formatDate(campaign.time)}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Progress Bar */}
          <View className="h-1.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden mb-3">
            <View
              className="h-full rounded-full"
              style={{ width: `${percent}%`, backgroundColor: BRAND_COLOR }}
            />
          </View>

          {/* Lower Row: Money + Donors */}
          <View className="flex-row items-center justify-between mt-1">
            <View>
              <Text className="text-[11px] font-semibold text-slate-400">
                Đã quyên góp
              </Text>
              <Text className="text-[15px] font-extrabold mt-0.5" style={{ color: BRAND_COLOR }}>
                {formatMoney(raised, '')}
                <Text className="text-slate-400 font-semibold text-[13px]"> / </Text>
                <Text className="text-slate-600 text-[14px]">{formatMoney(goal, currencySymbol)}</Text>
              </Text>
            </View>
            <View className="flex-row items-center bg-[#F8FAFC] px-3 py-1.5 rounded-full border border-[#F1F5F9]">
              <Users size={13} color="#64748B" />
              <Text className="ml-1.5 text-[11px] font-bold text-[#64748B]">
                {donorCount}
              </Text>
            </View>
          </View>

          {/* Edit/Delete Actions */}
          {showEditDelete && (
            <View className="flex-row items-center justify-end gap-3 mt-4 pt-3.5 border-t border-[#F1F5F9]">
              <TouchableOpacity
                onPress={onEdit}
                className="flex-row items-center bg-brand-soft px-4 py-2 rounded-full border border-brand-border"
                activeOpacity={0.75}
              >
                <Edit size={13} color={BRAND_COLOR} />
                <Text className="ml-1.5 text-[11px] font-extrabold" style={{ color: BRAND_COLOR }}>
                  Chỉnh sửa
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onDelete}
                className="flex-row items-center bg-red-50 px-4 py-2 rounded-full border border-red-100"
                activeOpacity={0.75}
              >
                <Trash2 size={13} color="#ef4444" />
                <Text className="ml-1.5 text-[11px] font-extrabold text-red-600">
                  Xóa bỏ
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
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

function EmptyState({ onRetry, copy }: { onRetry: () => void; copy: typeof FUNDING_COPY.vi }) {
  return (
    <View className="flex-1 items-center justify-center py-20 px-6">
      <View className="mb-5 h-16 w-16 items-center justify-center rounded-full bg-brand-soft border border-brand-border">
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

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView className="flex-1 bg-[#F8FAFC] items-center justify-center p-6" edges={['top']}>
          <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
          <Text className="text-red-500 font-bold text-lg">Đã xảy ra lỗi giao diện</Text>
          <Text className="text-slate-500 text-xs mt-2 text-center leading-5 px-4">
            {this.state.error?.message}
          </Text>
          <TouchableOpacity
            className="mt-6 rounded-full px-8 py-3 bg-brand shadow-md"
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text className="text-white font-bold text-sm">Thử lại</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

function FundingScreen() {
  return (
    <ErrorBoundary>
      <FundingScreenInner />
    </ErrorBoundary>
  );
}

function FundingScreenInner() {
  const navigation = useNavigation<FundingNav>();
  const language = useAppLanguage();
  const copy = FUNDING_COPY[language] || FUNDING_COPY.vi;
  const {
    coFundingCampaigns,
    myRequestsCampaigns,
    coFundingPage,
    myRequestsPage,
    isLoading,
    error,
    currencySymbol,
    canCreate,
    loadCoFunding,
    loadMyRequests,
    reload,
  } = useFundingViewModel();
  const { user } = useCurrentUserViewModel();

  const [activeTab, setActiveTab] = useState<'coFunding' | 'myRequests'>('coFunding');

  const handleCreatePress = () => {
    navigation.navigate(ROUTES.CREATE_FUNDING);
  };

  const handleCampaignPress = (campaign: FundingItem) => {
    navigation.navigate(ROUTES.FUNDING_DETAIL, {
      fundId: campaign.hashed_id,
    });
  };

  const [deleteTargetCampaign, setDeleteTargetCampaign] = useState<FundingItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  const handleDeleteCampaign = (campaign: FundingItem) => {
    setDeleteErrorMessage(null);
    setDeleteTargetCampaign(campaign);
  };

  const confirmDeleteCampaign = async () => {
    if (!deleteTargetCampaign) return;
    setIsDeleting(true);
    setDeleteErrorMessage(null);
    try {
      const repo = createFundingRepository();
      const response = await repo.deleteFunding(deleteTargetCampaign.id);
      if (response?.api_status === 200 || Number(response?.api_status) === 200) {
        setDeleteTargetCampaign(null);
        setDeleteSuccess(true);
        reload();
      } else {
        setDeleteErrorMessage(response?.message || (language === 'vi' ? 'Xóa thất bại' : 'Delete failed'));
      }
    } catch (err) {
      setDeleteErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const campaignsList = activeTab === 'coFunding' ? coFundingCampaigns : myRequestsCampaigns;
  const currentPage = activeTab === 'coFunding' ? coFundingPage : myRequestsPage;
  const hasNextPage = campaignsList.length === 10;
  const handlePrevPage = () => {
    if (currentPage > 1) {
      if (activeTab === 'coFunding') {
        loadCoFunding(coFundingPage - 1);
      } else {
        loadMyRequests(myRequestsPage - 1);
      }
    }
  };
  const handleNextPage = () => {
    if (hasNextPage) {
      if (activeTab === 'coFunding') {
        loadCoFunding(coFundingPage + 1);
      } else {
        loadMyRequests(myRequestsPage + 1);
      }
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAFC' }} edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <FeedHeader />

      {/* Top App Bar */}
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
          onPress={() => {
            console.log('[FundingScreen] Back button clicked');
            navigation.goBack();
          }}
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
          {copy.title}
        </Text>

        {activeTab === 'myRequests' && canCreate && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              height: 36,
              borderRadius: 18,
              backgroundColor: APP_BRAND_COLOR,
              shadowColor: APP_BRAND_COLOR,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.15,
              shadowRadius: 4,
              elevation: 2,
            }}
            activeOpacity={0.75}
            onPress={() => {
              console.log('[FundingScreen] Plus button clicked');
              handleCreatePress();
            }}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text
              style={{
                marginLeft: 4,
                fontSize: 12,
                fontWeight: 'bold',
                color: '#FFFFFF',
              }}
            >
              {copy.createNew}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs Container */}
      <View 
        style={{ 
          flexDirection: 'row', 
          backgroundColor: '#E2E8F0', 
          borderRadius: 16, 
          padding: 4, 
          marginBottom: 16, 
          marginHorizontal: 16, 
          borderWidth: 1, 
          borderColor: '#F1F5F9',
          zIndex: 999,
          elevation: 999
        }}
      >
        <TouchableOpacity
          onPress={() => {
            console.log('[FundingScreen] Tab clicked: coFunding');
            setActiveTab('coFunding');
          }}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: activeTab === 'coFunding' ? '#FFFFFF' : 'transparent',
            elevation: activeTab === 'coFunding' ? 1 : 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: activeTab === 'coFunding' ? 0.1 : 0,
            shadowRadius: 2,
          }}
          activeOpacity={0.8}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: activeTab === 'coFunding' ? 'bold' : '600',
              color: activeTab === 'coFunding' ? APP_BRAND_COLOR : '#64748B',
            }}
          >
            {copy.coFunding}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            console.log('[FundingScreen] Tab clicked: myRequests');
            setActiveTab('myRequests');
          }}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: activeTab === 'myRequests' ? '#FFFFFF' : 'transparent',
            elevation: activeTab === 'myRequests' ? 1 : 0,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: activeTab === 'myRequests' ? 0.1 : 0,
            shadowRadius: 2,
          }}
          activeOpacity={0.8}
        >
          <Text
            style={{
              fontSize: 13,
              fontWeight: activeTab === 'myRequests' ? 'bold' : '600',
              color: activeTab === 'myRequests' ? APP_BRAND_COLOR : '#64748B',
            }}
          >
            {copy.myRequests}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ScrollView Wrapper */}
      <View style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1, backgroundColor: '#F8FAFC' }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 }}
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
          {isLoading && campaignsList.length === 0 ? (
            <LoadingState copy={copy} />
          ) : error ? (
            <ErrorState error={error} onRetry={reload} copy={copy} />
          ) : campaignsList.length === 0 ? (
            <EmptyState onRetry={reload} copy={copy} />
          ) : (
            <>
              {campaignsList.map((campaign, index) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  currencySymbol={currencySymbol}
                  index={index}
                  onPress={() => {
                    console.log('[FundingScreen] Campaign Card clicked:', campaign.id);
                    handleCampaignPress(campaign);
                  }}
                  copy={copy}
                  showEditDelete={activeTab === 'myRequests'}
                  onEdit={() => {
                    console.log('[FundingScreen] Edit campaign:', campaign.id);
                    navigation.navigate(ROUTES.CREATE_FUNDING, { campaign });
                  }}
                  onDelete={() => {
                    console.log('[FundingScreen] Delete campaign clicked:', campaign.id);
                    handleDeleteCampaign(campaign);
                  }}
                />
              ))}
              <PaginationControls
                page={currentPage}
                hasNextPage={hasNextPage}
                onPrev={handlePrevPage}
                onNext={handleNextPage}
                language={language}
              />
            </>
          )}
        </ScrollView>
      </View>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        visible={!!deleteTargetCampaign}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeleting) setDeleteTargetCampaign(null);
        }}
      >
        <Pressable 
          className="flex-1 items-center justify-center bg-black/50 px-6"
          onPress={() => {
            if (!isDeleting) setDeleteTargetCampaign(null);
          }}
        >
          <Pressable 
            className="w-full max-w-[340px] bg-white rounded-[28px] p-6 items-center shadow-lg"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="h-14 w-14 items-center justify-center rounded-full bg-red-50 border border-red-100 mb-4">
              <AlertTriangle size={28} color="#ef4444" />
            </View>
            <Text className="text-[18px] font-extrabold text-[#0F172A] text-center">
              {language === 'vi' ? 'Xóa chiến dịch?' : 'Delete Campaign?'}
            </Text>
            <Text className="mt-2 text-[13px] font-semibold text-slate-500 text-center leading-5 px-1">
              {language === 'vi' 
                ? 'Bạn có chắc chắn muốn xóa chiến dịch này không? Hành động này không thể hoàn tác.' 
                : 'Are you sure you want to delete this campaign? This action cannot be undone.'}
            </Text>

            {deleteErrorMessage && (
              <View className="mt-3.5 bg-red-50 border border-red-100 rounded-xl p-2.5 w-full">
                <Text className="text-red-600 text-xs font-bold text-center">
                  {deleteErrorMessage}
                </Text>
              </View>
            )}

            <View className="flex-row items-center w-full gap-3 mt-6">
              <TouchableOpacity
                disabled={isDeleting}
                onPress={() => setDeleteTargetCampaign(null)}
                className="flex-1 min-h-[48px] items-center justify-center rounded-full border border-slate-200 bg-white"
                activeOpacity={0.8}
              >
                <Text className="text-slate-500 font-bold text-[14px]">
                  {language === 'vi' ? 'Hủy' : 'Cancel'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={isDeleting}
                onPress={confirmDeleteCampaign}
                className="flex-1 min-h-[48px] items-center justify-center rounded-full bg-red-500 shadow-sm"
                activeOpacity={0.85}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold text-[14px]">
                    {language === 'vi' ? 'Xóa' : 'Delete'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Custom Delete Success Modal */}
      <Modal
        visible={deleteSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteSuccess(false)}
      >
        <Pressable 
          className="flex-1 items-center justify-center bg-black/50 px-6"
          onPress={() => setDeleteSuccess(false)}
        >
          <Pressable 
            className="w-full max-w-[320px] bg-white rounded-[28px] p-6 items-center shadow-lg"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="h-14 w-14 items-center justify-center rounded-full bg-green-50 border border-green-100 mb-4">
              <CheckCircle2 size={28} color="#22c55e" />
            </View>
            <Text className="text-[18px] font-extrabold text-[#0F172A] text-center">
              {language === 'vi' ? 'Thành công!' : 'Success!'}
            </Text>
            <Text className="mt-2 text-[13px] font-semibold text-slate-500 text-center leading-5 px-2">
              {language === 'vi' 
                ? 'Chiến dịch của bạn đã được xóa bỏ hoàn toàn khỏi hệ thống.' 
                : 'Your campaign has been successfully deleted from the system.'}
            </Text>

            <TouchableOpacity
              onPress={() => setDeleteSuccess(false)}
              className="mt-6 w-full min-h-[48px] items-center justify-center rounded-full"
              style={{ backgroundColor: BRAND_COLOR }}
              activeOpacity={0.85}
            >
              <Text className="text-white font-bold text-[14px]">
                {language === 'vi' ? 'Đóng' : 'Close'}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

export default FundingScreen;
