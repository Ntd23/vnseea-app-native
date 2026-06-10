// Description: Renders the VNSEEA fundraising list screen using design tokens.
import React from 'react';
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
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useFundingViewModel } from '../../application/view-models/useFundingViewModel';
import type { FundingItem } from '../../domain/types/funding.types';

type FundingNav = NativeStackNavigationProp<RootStackParamList>;

function formatMoney(amount: number, symbol: string): string {
  return `${amount.toLocaleString('vi-VN')}${symbol}`;
}

interface CampaignCardProps {
  campaign: FundingItem;
  currencySymbol: string;
  onPress: () => void;
}

function CampaignCard({ campaign, currencySymbol, onPress }: CampaignCardProps) {
  const raised = parseFloat(campaign.raised || '0');
  const goal = parseFloat(campaign.amount || '1');
  const percent =
    goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;
  const donorCount = campaign.recent_donations?.length ?? 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      className="surface-card mb-4 overflow-hidden p-0"
    >
      <Image
        source={{ uri: campaign.image }}
        className="h-40 w-full"
        resizeMode="cover"
      />

      <View className="p-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text
              className="text-title-primary"
              numberOfLines={2}
            >
              {campaign.title || 'Không có tiêu đề'}
            </Text>
            {campaign.user_data ? (
              <View className="mt-2 flex-row items-center">
                <ShieldCheck size={14} color="#0000ff" />
                <Text className="ml-2 text-caption-secondary">
                  {campaign.user_data.first_name} {campaign.user_data.last_name}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="rounded-full bg-[#0000ff] px-3 py-1">
            <Text className="text-caption-primary text-inverse">{percent}%</Text>
          </View>
        </View>

        <View className="progress-track mt-4">
          <View
            className="progress-fill"
            style={{ width: `${percent}%` }}
          />
        </View>

        <View className="mt-3 flex-row items-center justify-between">
          <View>
            <Text className="text-title-primary text-brand">
              {formatMoney(raised, currencySymbol)}
            </Text>
            <Text className="text-caption-secondary">
              mục tiêu {formatMoney(goal, currencySymbol)}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Users size={14} color="#0000ff" />
            <Text className="ml-1 text-caption-secondary">
              {donorCount} người ủng hộ
            </Text>
          </View>
        </View>

        <TouchableOpacity
          className="mt-4 flex-row items-center justify-center rounded-full border border-[#0000ff] px-6 py-3"
          activeOpacity={0.8}
          onPress={onPress}
        >
          <HeartHandshake size={16} color="#0000ff" />
          <Text className="ml-2 text-body-primary text-brand font-semibold">
            Ủng hộ ngay
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function HeaderBanner({ onCreatePress }: { onCreatePress: () => void }) {
  return (
    <View className="surface-card mb-5 flex-row items-center p-5">
      <View className="icon-chip mr-4 h-14 w-14 items-center justify-center">
        <HeartHandshake size={28} color="#0000ff" />
      </View>
      <View className="flex-1">
        <Text className="text-title-primary">Cộng đồng cùng đóng góp</Text>
        <Text className="mt-1 text-caption-secondary">
          Theo dõi và ủng hộ các chiến dịch gây quỹ đang hoạt động.
        </Text>
      </View>
      <TouchableOpacity
        className="btn-primary mt-4 flex-row items-center px-5 py-3"
        activeOpacity={0.9}
        onPress={onCreatePress}
      >
        <Plus size={18} color="#ffffff" />
        <Text className="ml-1 text-body-primary text-inverse font-semibold">
          Tạo mới
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function EmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-slate-100">
        <HeartHandshake size={48} color="#94a3b8" />
      </View>
      <Text className="text-title-primary">Chưa có chiến dịch gây quỹ</Text>
      <Text className="mt-2 text-center text-caption-secondary">
        Hãy là người đầu tiên tạo chiến dịch gây quỹ
      </Text>
      <TouchableOpacity
        className="btn-primary mt-6 px-8 py-3"
        activeOpacity={0.9}
        onPress={onRetry}
      >
        <Text className="text-body-primary text-inverse font-semibold">
          Tải lại
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-red-50">
        <Text className="text-4xl">😢</Text>
      </View>
      <Text className="text-title-primary">Đã xảy ra lỗi</Text>
      <Text className="mt-2 text-center text-caption-secondary">{error}</Text>
      <TouchableOpacity
        className="btn-primary mt-6 px-8 py-3"
        activeOpacity={0.9}
        onPress={onRetry}
      >
        <Text className="text-body-primary text-inverse font-semibold">
          Thử lại
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator size="large" color="#0000ff" />
      <Text className="mt-4 text-caption-secondary">
        Đang tải chiến dịch...
      </Text>
    </View>
  );
}

function FundingScreen() {
  const navigation = useNavigation<FundingNav>();
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
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f1f4fb" />

      <View className="surface-topbar flex-row items-center justify-between px-4 pb-3">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full bg-white"
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#1e293b" />
          </TouchableOpacity>
          <View>
            <Text className="text-heading">Gây quỹ</Text>
            <Text className="text-caption-secondary">
              {campaigns.length} chiến dịch
            </Text>
          </View>
        </View>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Search size={22} color="#1e293b" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-2"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={reload}
            colors={['#0000ff']}
            tintColor="#0000ff"
          />
        }
      >
        {canCreate ? (
          <HeaderBanner onCreatePress={handleCreatePress} />
        ) : null}

        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-title-primary">Chiến dịch nổi bật</Text>
          <Text className="text-caption-secondary">
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
