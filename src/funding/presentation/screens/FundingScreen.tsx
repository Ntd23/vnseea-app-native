// Description: Renders the VNSEEA fundraising screen with campaign cards and progress summaries.
import React from 'react';
import {
  Image,
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
import type { RootStackParamList } from '../../../navigation/types';

type FundingNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

const campaigns = [
  {
    id: 'fund-1',
    title: 'Học bổng công nghệ cho sinh viên khó khăn',
    owner: 'VNSEEA Foundation',
    raised: '126.000.000đ',
    goal: '200.000.000đ',
    percent: '63%',
    percentValue: 63,
    donors: '842 người ủng hộ',
    image:
      'https://images.unsplash.com/photo-1497486751825-1233686d5d80?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 'fund-2',
    title: 'Máy tính cho lớp học vùng cao',
    owner: 'Cộng đồng Giáo dục số',
    raised: '88.500.000đ',
    goal: '120.000.000đ',
    percent: '74%',
    percentValue: 74,
    donors: '516 người ủng hộ',
    image:
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 'fund-3',
    title: 'Quỹ hỗ trợ khởi nghiệp trẻ',
    owner: 'Startup & Growth',
    raised: '54.200.000đ',
    goal: '100.000.000đ',
    percent: '54%',
    percentValue: 54,
    donors: '294 người ủng hộ',
    image:
      'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1200&auto=format&fit=crop',
  },
];

function FundingScreen() {
  const navigation = useNavigation<FundingNav>();

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      <View className="surface-brand h-14 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-title-primary text-inverse">Gây quỹ</Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
        >
          <Search size={21} color="#FFFFFF" />
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
              <HeartHandshake size={28} color={BRAND} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-heading">Cộng đồng cùng đóng góp</Text>
              <Text className="mt-1 text-body-secondary">
                Theo dõi và ủng hộ các chiến dịch gây quỹ đang hoạt động.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            className="btn-primary mt-5 min-h-[50px]"
            activeOpacity={0.86}
          >
            <Plus size={20} color="#FFFFFF" />
            <Text className="text-title-primary text-inverse">
              Tạo chiến dịch
            </Text>
          </TouchableOpacity>
        </View>

        {campaigns.map(campaign => (
          <View key={campaign.id} className="surface-card mb-4 overflow-hidden">
            <Image
              source={{ uri: campaign.image }}
              className="h-40 w-full"
              resizeMode="cover"
            />
            <View className="p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="text-title-primary">{campaign.title}</Text>
                  <View className="mt-2 flex-row items-center">
                    <ShieldCheck size={15} color={BRAND} />
                    <Text className="ml-2 text-caption-secondary">
                      {campaign.owner}
                    </Text>
                  </View>
                </View>
                <Text className="text-title-primary text-brand">
                  {campaign.percent}
                </Text>
              </View>

              <View className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <View
                  className="h-2 rounded-full bg-[#0000ff]"
                  style={{ width: `${campaign.percentValue}%` }}
                />
              </View>

              <View className="mt-3 flex-row items-center justify-between">
                <View>
                  <Text className="text-title-primary text-brand">
                    {campaign.raised}
                  </Text>
                  <Text className="text-caption-secondary">
                    mục tiêu {campaign.goal}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Users size={16} color={BRAND} />
                  <Text className="ml-2 text-caption-secondary">
                    {campaign.donors}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                className="btn-secondary mt-4 min-h-[46px]"
                activeOpacity={0.82}
              >
                <HeartHandshake size={18} color={BRAND} />
                <Text className="text-title-primary text-brand">Ủng hộ</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default FundingScreen;
