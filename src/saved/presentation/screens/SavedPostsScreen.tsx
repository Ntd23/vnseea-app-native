// Description: Renders the VNSEEA-style saved posts screen for bookmarked social content.
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
  MoreHorizontal,
  Search,
  Share2,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';

type SavedPostsNav = NativeStackNavigationProp<RootStackParamList>;

const savedPosts = [
  {
    id: '1',
    title: 'Hôm nay bầu trời thật đẹp!',
    author: 'Thanh Thảo',
    time: 'Đã lưu hôm qua',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAowyP14vMWb2lmxJ3IviTjBnvm7fYAYbcMD4rDqmPNrlSAU9vJqF5uU92MSxvTUHADVPoQoqdATPchdY19bt09zvrNEG7YFxz5jfTSO4AFtQQHd_s7dLY1ADdrHKwErHhPL1lRrB7v-FWrxBrxQvDvg39mTJGkyrCnwZmPkBRJpy9P4FVyAmup7jC0Wdsk5FzGy8YG1wpW9POpoQjC-Chlnwr1ClKAgx1SDwMSECuZ9s118CleNcRUq4NCkLbsbsYzVullqdTidhs',
  },
  {
    id: '2',
    title: 'Cuối tuần rực rỡ tại Đà Lạt',
    author: 'Hoàng Long',
    time: 'Đã lưu 2 ngày trước',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDdFRXJWZNZM_1MT0ZlnLfsnMoHjpzSc68XAB3euQa75mardov7I40wMT_7osCSBbFH15ZJWSl_kZor-OdyT5Kgupj1yIqQ8R3KAyKBg02ewt5B-taq75pstRGscuEPABajN7FjEK_7CBNQU0KeX2X-iHzn9YBBM8FVmXiZN0Th49InVT7FIH9BEZ1X_7spmzic7QN2A45sPSwLVhvPCX-jXmgukW6qUTWDs26kVpGNk-tPCbpLTP2toQjnSmYdFaIFQa_wpnPVDzA',
  },
  {
    id: '3',
    title: 'Dẫn đầu kỷ nguyên số',
    author: 'SF Corporation',
    time: 'Đã lưu tuần trước',
    image: null,
  },
];

function SavedPostsScreen() {
  const navigation = useNavigation<SavedPostsNav>();

  return (
    <SafeAreaView className="flex-1 surface-base">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <View className="surface-topbar h-16 flex-row items-center justify-between px-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text className="ml-3 text-heading">Bài viết đã lưu</Text>
        </View>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.navigate(ROUTES.SEARCH)}
        >
          <Search size={21} color="#0000FF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-10 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="preview-panel mb-5 flex-row items-center p-4">
          <View className="icon-chip h-14 w-14 items-center justify-center">
            <Bookmark size={28} color="#0000FF" />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-heading">Đã lưu</Text>
            <Text className="mt-1 text-body-secondary">
              Xem lại bài viết, trang và nội dung bạn muốn đọc sau.
            </Text>
          </View>
        </View>

        <View className="mb-4 flex-row gap-3">
          {['Tất cả', 'Bài viết', 'Ảnh', 'Video'].map((filter, index) => (
            <TouchableOpacity
              key={filter}
              className={`rounded-full px-4 py-2 ${
                index === 0 ? 'surface-brand' : 'surface-muted'
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={
                  index === 0
                    ? 'text-caption-primary text-inverse'
                    : 'text-caption-secondary'
                }
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {savedPosts.map(post => (
          <View key={post.id} className="surface-card mb-4 overflow-hidden">
            <View className="flex-row p-4">
              {post.image ? (
                <Image
                  source={{ uri: post.image }}
                  className="h-24 w-24 rounded-2xl"
                  resizeMode="cover"
                />
              ) : (
                <View className="preview-panel h-24 w-24 items-center justify-center">
                  <Text className="text-title-primary text-brand">S&F</Text>
                </View>
              )}
              <View className="ml-4 flex-1">
                <View className="flex-row items-start justify-between">
                  <Text className="flex-1 text-title-primary" numberOfLines={2}>
                    {post.title}
                  </Text>
                  <MoreHorizontal size={20} color="#94A3B8" />
                </View>
                <Text className="mt-1 text-caption-primary">{post.author}</Text>
                <Text className="mt-1 text-caption-secondary">{post.time}</Text>
                <TouchableOpacity
                  className="mt-3 flex-row items-center"
                  activeOpacity={0.8}
                >
                  <Share2 size={17} color="#0000FF" />
                  <Text className="ml-2 text-caption-primary text-brand">
                    Chia sẻ
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default SavedPostsScreen;
