// Description: Renders the VNSEEA boosted content dashboard for promoted posts and campaigns.
import React from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  BarChart3,
  Eye,
  Megaphone,
  Plus,
  TrendingUp,
  Wallet,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type BoostedNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

const campaigns = [
  {
    id: 'boost-1',
    title: 'Bài viết ra mắt cộng đồng VNSEEA',
    type: 'Bài viết',
    status: 'Đang chạy',
    reach: '42,8K',
    budget: '1.200.000đ',
    progress: 72,
    image:
      'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'boost-2',
    title: 'Sự kiện Product Meetup tháng 5',
    type: 'Sự kiện',
    status: 'Tạm dừng',
    reach: '18,4K',
    budget: '650.000đ',
    progress: 44,
    image:
      'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'boost-3',
    title: 'Trang VNSEEA Official',
    type: 'Trang',
    status: 'Hoàn tất',
    reach: '96,1K',
    budget: '2.000.000đ',
    progress: 100,
    image:
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1000&auto=format&fit=crop',
  },
];

function BoostedScreen() {
  const navigation = useNavigation<BoostedNav>();

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="light-content" backgroundColor={BRAND} />

      <View className="surface-brand h-14 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-title-primary text-inverse">Boosted</Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
        >
          <Plus size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="surface-card mb-5 p-5">
          <View className="flex-row items-center">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#0000ff]/10">
              <Megaphone size={28} color={BRAND} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-heading">Nội dung đang quảng bá</Text>
              <Text className="mt-1 text-body-secondary">
                Theo dõi hiệu quả bài viết, trang và sự kiện đã boost.
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-[#0000ff]/10 p-4">
              <Eye size={22} color={BRAND} />
              <Text className="mt-2 text-heading text-brand">157K</Text>
              <Text className="text-caption-secondary">Lượt tiếp cận</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-[#0000ff]/10 p-4">
              <Wallet size={22} color={BRAND} />
              <Text className="mt-2 text-heading text-brand">3,85M</Text>
              <Text className="text-caption-secondary">Ngân sách</Text>
            </View>
          </View>
        </View>

        <View className="mb-4 flex-row gap-3">
          {['Tất cả', 'Đang chạy', 'Hoàn tất'].map((tab, index) => (
            <View
              key={tab}
              className={`rounded-full px-4 py-2 ${
                index === 0 ? 'surface-brand' : 'surface-muted'
              }`}
            >
              <Text
                className={
                  index === 0
                    ? 'text-caption-primary text-inverse'
                    : 'text-caption-secondary'
                }
              >
                {tab}
              </Text>
            </View>
          ))}
        </View>

        {campaigns.map(campaign => (
          <View key={campaign.id} className="surface-card mb-4 overflow-hidden">
            <Image
              source={{ uri: campaign.image }}
              className="h-36 w-full"
              resizeMode="cover"
            />
            <View className="p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-title-primary">{campaign.title}</Text>
                  <Text className="mt-1 text-caption-secondary">
                    {campaign.type} · {campaign.status}
                  </Text>
                </View>
                <View className="rounded-full bg-[#0000ff]/10 px-3 py-2">
                  <Text className="text-caption-primary text-brand">
                    {campaign.progress}%
                  </Text>
                </View>
              </View>

              <View className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <View
                  className="h-2 rounded-full bg-[#0000ff]"
                  style={{ width: `${campaign.progress}%` }}
                />
              </View>

              <View className="mt-4 flex-row justify-between">
                <View className="flex-row items-center">
                  <TrendingUp size={16} color={BRAND} />
                  <Text className="ml-2 text-caption-secondary">
                    {campaign.reach} reach
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <BarChart3 size={16} color={BRAND} />
                  <Text className="ml-2 text-caption-secondary">
                    {campaign.budget}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                className="btn-secondary mt-4 min-h-[46px]"
                activeOpacity={0.82}
              >
                <Megaphone size={18} color={BRAND} />
                <Text className="text-title-primary text-brand">
                  Xem hiệu quả
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default BoostedScreen;
