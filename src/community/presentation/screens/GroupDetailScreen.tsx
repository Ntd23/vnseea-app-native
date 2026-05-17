// Description: Renders the VNSEEA group detail screen with cover, stats, tabs, and sample posts.
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
  Bell,
  ImagePlus,
  MoreHorizontal,
  Send,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';

type GroupDetailNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';
const cover =
  'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1400&auto=format&fit=crop';

function GroupDetailScreen() {
  const navigation = useNavigation<GroupDetailNav>();

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
        <Text className="text-title-primary text-inverse">Chi tiết nhóm</Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
        >
          <MoreHorizontal size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white">
          <Image source={{ uri: cover }} className="h-48 w-full" />
          <View className="px-4 pb-5 pt-4">
            <Text className="text-heading">VNSEEA Design Circle</Text>
            <View className="mt-2 flex-row items-center">
              <Users size={17} color={BRAND} />
              <Text className="ml-2 text-caption-secondary">
                Công khai · 24,8K thành viên · 126 bài viết hôm nay
              </Text>
            </View>
            <Text className="mt-3 text-body-secondary">
              Không gian chia sẻ thiết kế, sản phẩm số và những ý tưởng cộng
              đồng dành cho thành viên VNSEEA.
            </Text>

            <View className="mt-4 flex-row gap-3">
              <TouchableOpacity
                className="btn-primary min-h-[46px] flex-1"
                activeOpacity={0.86}
              >
                <Users size={18} color="#FFFFFF" />
                <Text className="text-title-primary text-inverse">
                  Đã tham gia
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="h-[46px] w-[46px] items-center justify-center rounded-xl bg-[#0000ff]/10"
                activeOpacity={0.8}
              >
                <Bell size={20} color={BRAND} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View className="mt-3 flex-row gap-2 bg-white px-4 py-3">
          {['Bài viết', 'Thành viên', 'Ảnh'].map((tab, index) => (
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

        <View className="surface-card mx-4 mt-4 p-4">
          <View className="flex-row items-center">
            <View className="h-11 w-11 rounded-full bg-[#0000ff]/10" />
            <TouchableOpacity
              className="ml-3 flex-1 rounded-full bg-slate-100 px-4 py-3"
              activeOpacity={0.8}
            >
              <Text className="text-caption-secondary">
                Chia sẻ điều gì đó với nhóm...
              </Text>
            </TouchableOpacity>
            <ImagePlus size={22} color={BRAND} />
          </View>
        </View>

        <View className="surface-card mx-4 mt-4 p-4">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <View className="h-11 w-11 rounded-full bg-[#0000ff]/10" />
              <View className="ml-3">
                <Text className="text-title-primary">Minh Anh</Text>
                <Text className="text-caption-secondary">
                  2 giờ trước · VNSEEA Design Circle
                </Text>
              </View>
            </View>
            <MoreHorizontal size={22} color="#94A3B8" />
          </View>

          <Text className="mt-4 text-body-secondary">
            Mọi người đang dùng flow nào để review design system cho mobile app?
            Mình muốn gom feedback nhanh hơn trước khi handoff.
          </Text>

          <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3">
            <Text className="text-caption-primary text-brand">
              124 lượt thích
            </Text>
            <TouchableOpacity
              className="flex-row items-center"
              activeOpacity={0.8}
            >
              <Send size={17} color={BRAND} />
              <Text className="ml-2 text-caption-primary text-brand">
                Bình luận
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default GroupDetailScreen;
