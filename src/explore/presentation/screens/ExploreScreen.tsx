// Description: Renders the VNSEEA hashtags tab that replaces the legacy Explore placeholder.
import React from 'react';
import {
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowUpRight,
  Hash,
  MessageCircle,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BRAND = '#0000ff';

const hashtags = [
  {
    id: 'tag-1',
    label: '#VNSEEA',
    posts: '128K bài viết',
    growth: '+24%',
    topic: 'Cộng đồng',
  },
  {
    id: 'tag-2',
    label: '#ReactNative',
    posts: '84K bài viết',
    growth: '+18%',
    topic: 'Công nghệ',
  },
  {
    id: 'tag-3',
    label: '#DesignSystem',
    posts: '52K bài viết',
    growth: '+16%',
    topic: 'Thiết kế',
  },
  {
    id: 'tag-4',
    label: '#StartupVietnam',
    posts: '39K bài viết',
    growth: '+11%',
    topic: 'Kinh doanh',
  },
  {
    id: 'tag-5',
    label: '#MobileUI',
    posts: '27K bài viết',
    growth: '+9%',
    topic: 'Sản phẩm',
  },
];

const relatedPosts = [
  {
    id: 'post-1',
    title: 'Những pattern mobile UI nên chuẩn hóa trong app cộng đồng',
    tag: '#DesignSystem',
    comments: '42 bình luận',
  },
  {
    id: 'post-2',
    title: 'Kinh nghiệm tối ưu hiệu năng React Native cho feed dài',
    tag: '#ReactNative',
    comments: '28 bình luận',
  },
];

function ExploreScreen() {
  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      <View className="surface-brand h-14 flex-row items-center justify-between px-4">
        <View className="h-10 w-10 items-center justify-center rounded-full">
          <Hash size={23} color="#FFFFFF" />
        </View>
        <Text className="text-title-primary text-inverse">Hashtags</Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
        >
          <Search size={21} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-28 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="surface-card mb-5 p-5">
          <View className="flex-row items-center">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#0000ff]/10">
              <TrendingUp size={28} color={BRAND} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-heading">Hashtags thịnh hành</Text>
              <Text className="mt-1 text-body-secondary">
                Theo dõi chủ đề đang được cộng đồng VNSEEA nhắc tới nhiều nhất.
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-[#0000ff]/10 p-4">
              <Hash size={22} color={BRAND} />
              <Text className="mt-2 text-heading text-brand">330K</Text>
              <Text className="text-caption-secondary">Bài viết hôm nay</Text>
            </View>
            <View className="flex-1 rounded-2xl bg-[#0000ff]/10 p-4">
              <Users size={22} color={BRAND} />
              <Text className="mt-2 text-heading text-brand">91K</Text>
              <Text className="text-caption-secondary">Người tham gia</Text>
            </View>
          </View>
        </View>

        <View className="mb-4 flex-row gap-3">
          {['Tất cả', 'Công nghệ', 'Thiết kế', 'Cộng đồng'].map(
            (tab, index) => (
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
            ),
          )}
        </View>

        {hashtags.map(tag => (
          <TouchableOpacity
            key={tag.id}
            className="surface-card mb-3 flex-row items-center p-4"
            activeOpacity={0.84}
          >
            <View className="h-12 w-12 items-center justify-center rounded-full bg-[#0000ff]/10">
              <Hash size={25} color={BRAND} />
            </View>
            <View className="ml-4 flex-1">
              <Text className="text-title-primary text-brand">{tag.label}</Text>
              <Text className="mt-1 text-caption-secondary">
                {tag.posts} · {tag.topic}
              </Text>
            </View>
            <View className="items-end">
              <View className="flex-row items-center rounded-full bg-[#0000ff]/10 px-3 py-1">
                <ArrowUpRight size={15} color={BRAND} />
                <Text className="ml-1 text-caption-primary text-brand">
                  {tag.growth}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <Text className="mb-3 mt-4 text-heading">Bài viết liên quan</Text>
        {relatedPosts.map(post => (
          <TouchableOpacity
            key={post.id}
            className="surface-card mb-3 p-4"
            activeOpacity={0.84}
          >
            <Text className="text-caption-primary text-brand">{post.tag}</Text>
            <Text className="mt-2 text-title-primary">{post.title}</Text>
            <View className="mt-3 flex-row items-center">
              <MessageCircle size={16} color={BRAND} />
              <Text className="ml-2 text-caption-secondary">
                {post.comments}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default ExploreScreen;
