// Description: Renders the VNSEEA blog detail article screen with header image and article actions.
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
  Bookmark,
  Clock3,
  Heart,
  MessageCircle,
  Share2,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';

type BlogDetailNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';
const hero =
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1400&auto=format&fit=crop';

function BlogDetailScreen() {
  const navigation = useNavigation<BlogDetailNav>();

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
        <Text className="text-title-primary text-inverse">Article</Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
        >
          <Bookmark size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={{ uri: hero }}
          className="h-64 w-full"
          resizeMode="cover"
        />

        <View className="bg-white px-5 py-5">
          <View className="self-start rounded-full bg-[#0000ff]/10 px-3 py-1">
            <Text className="text-caption-primary text-brand">Thiết kế</Text>
          </View>
          <Text className="mt-4 text-display">
            Tối ưu trải nghiệm mobile với design system thống nhất
          </Text>
          <Text className="mt-3 text-body-secondary">
            VNSEEA Editorial · Cập nhật hôm nay
          </Text>

          <View className="mt-4 flex-row items-center gap-5">
            <View className="flex-row items-center">
              <Clock3 size={16} color={BRAND} />
              <Text className="ml-2 text-caption-secondary">6 phút đọc</Text>
            </View>
            <View className="flex-row items-center">
              <MessageCircle size={16} color={BRAND} />
              <Text className="ml-2 text-caption-secondary">28 bình luận</Text>
            </View>
          </View>
        </View>

        <View className="mt-3 bg-white px-5 py-5">
          <Text className="text-body-secondary">
            Một design system tốt không chỉ là bộ màu, kiểu chữ hay component.
            Nó là cách đội ngũ sản phẩm thống nhất quyết định giao diện, giảm
            chi phí lặp lại và giữ trải nghiệm người dùng ổn định qua nhiều màn
            hình.
          </Text>
          <Text className="mt-4 text-body-secondary">
            Với mobile app, sự nhất quán càng quan trọng vì không gian hiển thị
            nhỏ, thao tác ngắn và người dùng kỳ vọng mọi thứ phản hồi nhanh. Các
            token về màu, spacing, typography và trạng thái nên được dùng như
            nguồn sự thật chung cho toàn bộ màn hình.
          </Text>
          <Text className="mt-4 text-body-secondary">
            VNSEEA ưu tiên các pattern đơn giản: header rõ ràng, icon màu brand,
            card có nhịp spacing đều và hành động chính luôn dễ nhận diện.
          </Text>
        </View>

        <View className="mx-5 mt-4 flex-row gap-3">
          <TouchableOpacity className="btn-secondary flex-1 min-h-[46px]">
            <Heart size={18} color={BRAND} />
            <Text className="text-title-primary text-brand">Thích</Text>
          </TouchableOpacity>
          <TouchableOpacity className="btn-secondary flex-1 min-h-[46px]">
            <Share2 size={18} color={BRAND} />
            <Text className="text-title-primary text-brand">Chia sẻ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default BlogDetailScreen;
