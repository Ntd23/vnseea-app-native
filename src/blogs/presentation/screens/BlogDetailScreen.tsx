// Description: Renders one real WoWonder article loaded by blog id.
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  Share,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Clock3,
  ExternalLink,
  Eye,
  FileText,
  RotateCw,
  Share2,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useBlogDetailViewModel } from '../../application/view-models/useBlogDetailViewModel';

type BlogDetailNav = NativeStackNavigationProp<RootStackParamList>;
type BlogDetailRoute = RouteProp<RootStackParamList, typeof ROUTES.BLOG_DETAIL>;

const BRAND = '#0000FF';

function BlogDetailScreen() {
  const navigation = useNavigation<BlogDetailNav>();
  const route = useRoute<BlogDetailRoute>();
  console.log('[BlogDetailScreen] Route params:', route.params);
  const vm = useBlogDetailViewModel(route.params.blogId);

  const handleShare = useCallback(async () => {
    if (!vm.article?.url) return;
    await Share.share({
      title: vm.article.title,
      message: vm.article.url,
      url: vm.article.url,
    });
  }, [vm.article]);

  if (vm.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center surface-base">
        <ActivityIndicator color={BRAND} size="large" />
        <Text className="mt-4 text-body-secondary">Đang tải bài viết...</Text>
      </SafeAreaView>
    );
  }

  if (!vm.article) {
    return (
      <SafeAreaView className="flex-1 surface-base" edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
        <View className="surface-topbar h-16 flex-row items-center px-4">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text className="ml-3 text-heading">Bài viết</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <FileText size={56} color="rgba(0,0,255,0.32)" />
          <Text className="mt-5 text-center text-heading">
            Không tải được bài viết
          </Text>
          <Text className="mt-2 text-center text-body-secondary">
            {vm.error}
          </Text>
          <TouchableOpacity
            className="btn-primary mt-6 min-h-[46px] rounded-xl px-6"
            activeOpacity={0.85}
            onPress={() => void vm.retry()}
          >
            <RotateCw size={18} color="#FFFFFF" />
            <Text className="text-title-primary text-inverse">Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const article = vm.article;

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
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
          <Text className="ml-3 text-heading">Bài viết</Text>
        </View>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={handleShare}
        >
          <Share2 size={20} color={BRAND} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
      >
        {article.thumbnailUrl ? (
          <Image
            source={{ uri: article.thumbnailUrl }}
            className="h-64 w-full bg-slate-200"
            resizeMode="cover"
          />
        ) : (
          <View className="h-52 w-full items-center justify-center bg-[#EEF2FF]">
            <FileText size={56} color="rgba(0,0,255,0.34)" />
          </View>
        )}

        <View className="bg-white px-5 py-5">
          <View className="self-start rounded-full bg-blue-50 px-3 py-1">
            <Text className="text-caption-primary text-brand">
              {article.category || 'Bài viết'}
            </Text>
          </View>
          <Text className="mt-4 text-display">{article.title}</Text>
          <Text className="mt-3 text-body-secondary">
            {article.author.name}
          </Text>

          <View className="mt-4 flex-row flex-wrap gap-5">
            <View className="flex-row items-center">
              <Clock3 size={16} color={BRAND} />
              <Text className="ml-2 text-caption-secondary">
                {article.postedLabel || 'Mới đăng'}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Eye size={16} color={BRAND} />
              <Text className="ml-2 text-caption-secondary">
                {article.views ?? 0} lượt xem
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-3 bg-white px-5 py-5">
          <Text className="text-body-secondary">
            {article.content || article.description || 'Bài viết chưa có nội dung.'}
          </Text>
        </View>

        {article.url ? (
          <View className="mx-5 mt-4">
            <TouchableOpacity
              className="btn-secondary min-h-[46px]"
              activeOpacity={0.85}
              onPress={() => void Linking.openURL(article.url!)}
            >
              <ExternalLink size={18} color={BRAND} />
              <Text className="text-title-primary text-brand">
                Xem trên website
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export default BlogDetailScreen;
