// Description: Renders the VNSEEA article list screen with category filtering and detail navigation.
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
  Filter,
  MessageCircle,
  Search,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';

type BlogsNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

const articles = [
  {
    id: 'article-1',
    title: 'Tối ưu trải nghiệm mobile với design system thống nhất',
    category: 'Thiết kế',
    author: 'VNSEEA Editorial',
    readTime: '6 phút đọc',
    comments: '28',
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 'article-2',
    title: 'Cách xây dựng cộng đồng sản phẩm bền vững',
    category: 'Cộng đồng',
    author: 'Minh Anh',
    readTime: '8 phút đọc',
    comments: '42',
    image:
      'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 'article-3',
    title: 'React Native: những pattern UI nên chuẩn hóa sớm',
    category: 'Công nghệ',
    author: 'Hoàng Long',
    readTime: '5 phút đọc',
    comments: '19',
    image:
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=1200&auto=format&fit=crop',
  },
];

function BlogsScreen() {
  const navigation = useNavigation<BlogsNav>();

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
        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={() => navigation.navigate(ROUTES.BLOG_FILTER_CATEGORY)}
          >
            <Filter size={21} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
          >
            <Search size={21} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-4 flex-row gap-3">
          {['Mới nhất', 'Phổ biến', 'Đã lưu'].map((tab, index) => (
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

        {articles.map(article => (
          <TouchableOpacity
            key={article.id}
            className="surface-card mb-4 overflow-hidden"
            activeOpacity={0.88}
            onPress={() => navigation.navigate(ROUTES.BLOG_DETAIL)}
          >
            <Image
              source={{ uri: article.image }}
              className="h-44 w-full"
              resizeMode="cover"
            />
            <View className="p-4">
              <View className="mb-3 flex-row items-center justify-between">
                <View className="rounded-full bg-[#0000ff]/10 px-3 py-1">
                  <Text className="text-caption-primary text-brand">
                    {article.category}
                  </Text>
                </View>
                <Bookmark size={20} color={BRAND} />
              </View>

              <Text className="text-heading" numberOfLines={2}>
                {article.title}
              </Text>
              <Text className="mt-2 text-caption-secondary">
                {article.author}
              </Text>

              <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3">
                <View className="flex-row items-center">
                  <Clock3 size={16} color={BRAND} />
                  <Text className="ml-2 text-caption-secondary">
                    {article.readTime}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <MessageCircle size={16} color={BRAND} />
                  <Text className="ml-2 text-caption-secondary">
                    {article.comments} bình luận
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default BlogsScreen;
