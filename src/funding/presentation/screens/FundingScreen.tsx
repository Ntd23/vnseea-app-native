// Description: Renders the VNSEEA fundraising screen with real API data, campaign cards and progress summaries.
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  HeartHandshake,
  Plus,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { useFundingViewModel } from '../../application/view-models/useFundingViewModel';
import type { FundingItem } from '../../domain/types/funding.types';

type FundingNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

interface CampaignCardProps {
  campaign: FundingItem;
  currencySymbol: string;
  onPress: () => void;
}

function CampaignCard({ campaign, currencySymbol, onPress }: CampaignCardProps) {
  const raised = parseFloat(campaign.raised || '0');
  const goal = parseFloat(campaign.amount || '1');
  const percent = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;

  // Format number with currency
  const formatMoney = (amount: number) => {
    return amount.toLocaleString('vi-VN') + currencySymbol;
  };

  return (
    <Pressable
      onPress={onPress}
      activeOpacity={0.9}
      className="mb-4 overflow-hidden rounded-2xl bg-white shadow-md"
      style={{
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      }}
    >
      {/* Image */}
      <Image
        source={{ uri: campaign.image }}
        className="h-40 w-full"
        resizeMode="cover"
      />

      {/* Content */}
      <View className="p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text
              className="text-[16px] font-semibold leading-tight text-slate-800"
              numberOfLines={2}
            >
              {campaign.title || 'Không có tiêu đề'}
            </Text>
            {campaign.user_data && (
              <View className="mt-2 flex-row items-center">
                <ShieldCheck size={14} color={BRAND} />
                <Text className="ml-2 text-[12px] text-slate-500">
                  {campaign.user_data.first_name} {campaign.user_data.last_name}
                </Text>
              </View>
            )}
          </View>
          <View className="rounded-full bg-[#0000ff] px-3 py-1">
            <Text className="text-[12px] font-bold text-white">{percent}%</Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <View
            className="h-2 rounded-full bg-gradient-to-r from-[#0000ff] to-[#7b73ff]"
            style={{ width: `${percent}%` }}
          />
        </View>

        {/* Stats */}
        <View className="mt-3 flex-row items-center justify-between">
          <View>
            <Text className="text-[16px] font-bold text-[#0000ff]">
              {formatMoney(raised)}
            </Text>
            <Text className="text-[11px] text-slate-400">
              mục tiêu {formatMoney(goal)}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Users size={14} color={BRAND} />
            <Text className="ml-1 text-[12px] text-slate-500">
              {campaign.recent_donations?.length || 0} người ủng hộ
            </Text>
          </View>
        </View>

        {/* CTA Button */}
        <Pressable
          className="mt-4 flex-row items-center justify-center rounded-full border border-[#0000ff] px-6 py-3"
          activeOpacity={0.8}
          onPress={onPress}
        >
          <HeartHandshake size={16} color={BRAND} />
          <Text className="ml-2 text-[14px] font-semibold text-[#0000ff]">
            Ủng hộ ngay
          </Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function HeaderBanner({ onCreatePress }: { onCreatePress: () => void }) {
  return (
    <View className="mb-5 flex-row items-center rounded-2xl bg-white p-5 shadow-sm">
      <View className="mr-4 h-14 w-14 items-center justify-center rounded-2xl bg-[#0000ff]/10">
        <HeartHandshake size={28} color={BRAND} />
      </View>
      <View className="flex-1">
        <Text className="text-[17px] font-bold text-slate-800">
          Cộng đồng cùng đóng góp
        </Text>
        <Text className="mt-1 text-[13px] text-slate-500">
          Theo dõi và ủng hộ các chiến dịch gây quỹ đang hoạt động.
        </Text>
      </View>
      <Pressable
        className="mt-4 flex-row items-center rounded-full bg-[#0000ff] px-5 py-3"
        activeOpacity={0.8}
        onPress={onCreatePress}
      >
        <Plus size={18} color="#FFFFFF" />
        <Text className="ml-1 text-[13px] font-semibold text-white">
          Tạo mới
        </Text>
      </Pressable>
    </View>
  );
}

function EmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-slate-100">
        <HeartHandshake size={48} color="#94a3b8" />
      </View>
      <Text className="text-[18px] font-semibold text-slate-700">
        Chưa có chiến dịch gây quỹ
      </Text>
      <Text className="mt-2 text-center text-[13px] text-slate-500">
        Hãy là người đầu tiên tạo chiến dịch gây quỹ
      </Text>
      <Pressable
        className="mt-6 rounded-full bg-[#0000ff] px-8 py-3"
        activeOpacity={0.8}
        onPress={onRetry}
      >
        <Text className="text-[14px] font-semibold text-white">Tải lại</Text>
      </Pressable>
    </View>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-red-50">
        <Text className="text-4xl">😢</Text>
      </View>
      <Text className="text-[18px] font-semibold text-slate-700">
        Đã xảy ra lỗi
      </Text>
      <Text className="mt-2 text-center text-[13px] text-slate-500">{error}</Text>
      <Pressable
        className="mt-6 rounded-full bg-[#0000ff] px-8 py-3"
        activeOpacity={0.8}
        onPress={onRetry}
      >
        <Text className="text-[14px] font-semibold text-white">Thử lại</Text>
      </Pressable>
    </View>
  );
}

function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator size="large" color={BRAND} />
      <Text className="mt-4 text-[13px] text-slate-500">Đang tải chiến dịch...</Text>
    </View>
  );
}

function FundingScreen() {
  const navigation = useNavigation<FundingNav>();
  const { campaigns, isLoading, error, currencySymbol, canCreate, reload } =
    useFundingViewModel();

  const handleCreatePress = () => {
    // TODO: Navigate to create funding screen
    console.log('Create new funding campaign');
  };

  const handleCampaignPress = (campaign: FundingItem) => {
    // TODO: Navigate to funding detail
    console.log('Campaign pressed:', campaign.hashed_id);
  };

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
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            }}
          >
            <ArrowLeft size={22} color="#1e293b" />
          </Pressable>
          <View>
            <Text className="text-[22px] font-bold text-slate-800">Gây quỹ</Text>
            <Text className="text-[12px] text-slate-500">
              {campaigns.length} chiến dịch
            </Text>
          </View>
        </View>
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
          activeOpacity={0.8}
          activeOpacity={0.8}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
          }}
        >
          <Search size={22} color="#1e293b" />
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-2"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={reload}
            colors={[BRAND]}
            tintColor={BRAND}
          />
        }
      >
        {/* Banner */}
        <HeaderBanner onCreatePress={handleCreatePress} />

        {/* Section Title */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[16px] font-semibold text-slate-800">
            Chiến dịch nổi bật
          </Text>
          <Text className="text-[12px] text-slate-400">
            {campaigns.length} chiến dịch
          </Text>
        </View>

        {isLoading && campaigns.length === 0 ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : campaigns.length === 0 ? (
          <EmptyState onRetry={reload} />
        ) : (
          campaigns.map(campaign => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              currencySymbol={currencySymbol}
              onPress={() => handleCampaignPress(campaign)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default FundingScreen;