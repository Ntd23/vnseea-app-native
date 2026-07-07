// Description: Renders the member points balance screen displaying point rules, balance card, and wallet link, matching the user's mockup.
import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  BookOpen,
  Info,
  MessageSquare,
  PlusCircle,
  Smile,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { useMyPointsViewModel } from '../../application/view-models/useMyPointsViewModel';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { ROUTES } from '../../../navigation/constants/routes';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type MyPointsNav = NativeStackNavigationProp<RootStackParamList>;

function formatNumber(value: number) {
  return Math.round(value).toLocaleString('vi-VN');
}

const POINTS_COPY = {
  vi: {
    header: 'Điểm của tôi',
    rules: {
      comment: 'Kiếm %d điểm bằng cách bình luận bất kỳ bài đăng nào',
      post: 'Kiếm %d điểm bằng cách tạo một bài đăng mới',
      react: 'Kiếm %d điểm bằng cách phản hồi trên bất kỳ bài đăng nào',
      blog: 'Kiếm %d điểm bằng cách tạo blog mới',
    },
    pointsTitle: 'ĐIỂM',
    transferNotePrefix: 'Điểm kiếm được của bạn sẽ tự động chuyển đến ',
    walletLink: 'Cái ví',
    loading: 'Đang tải dữ liệu điểm...',
    retry: 'Chạm để thử lại',
  },
  en: {
    header: 'My Points',
    rules: {
      comment: 'Earn %d points by commenting on any post',
      post: 'Earn %d points by creating a new post',
      react: 'Earn %d points by reacting on any post',
      blog: 'Earn %d points by creating a new blog',
    },
    pointsTitle: 'POINTS',
    transferNotePrefix: 'Your earned points will be automatically transferred to ',
    walletLink: 'Wallet',
    loading: 'Loading points data...',
    retry: 'Tap to retry',
  },
};

function MyPointsScreen() {
  const navigation = useNavigation<MyPointsNav>();
  const language = useAppLanguage();
  const copy = POINTS_COPY[language] || POINTS_COPY.vi;
  const isVi = language === 'vi';

  const { data, isLoading, error, reload } = useMyPointsViewModel();
  const hasData = Boolean(data);

  const formatRuleText = (template: string, value?: number) => {
    return template.replace('%d', value && value > 0 ? String(value) : '%d');
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="h-16 flex-row items-center justify-between border-b border-slate-100 bg-white px-4">
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => navigation.goBack()}
          className="h-11 w-11 items-center justify-center rounded-full bg-slate-50"
        >
          <ArrowLeft size={24} color="#0000ff" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-extrabold text-slate-950" numberOfLines={1}>
          {copy.header}
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && !hasData ? (
          <View className="items-center justify-center bg-white rounded-3xl p-8 border border-slate-100">
            <ActivityIndicator size="small" color="#0000ff" />
            <Text className="mt-3 text-sm font-bold text-slate-500">{copy.loading}</Text>
          </View>
        ) : null}

        {error && !hasData ? (
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={reload}
            className="items-center justify-center bg-white rounded-3xl p-8 border border-slate-100"
          >
            <Text className="text-center text-sm font-extrabold text-red-500 mb-2">{error}</Text>
            <Text className="text-sm font-extrabold text-blue-600">{copy.retry}</Text>
          </TouchableOpacity>
        ) : null}

        {hasData && data ? (
          <View className="gap-y-6">
            {/* Points Rules List */}
            <View className="gap-y-5">
              {/* Rule 1: Comment */}
              <View className="flex-row items-center gap-x-4">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-[#dcfce7]">
                  <MessageSquare size={20} color="#16a34a" />
                </View>
                <Text className="flex-1 text-[15px] font-bold text-slate-700 leading-tight">
                  {formatRuleText(copy.rules.comment, data.commentsPoint)}
                </Text>
              </View>

              {/* Rule 2: Post */}
              <View className="flex-row items-center gap-x-4">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-[#eef2ff]">
                  <PlusCircle size={20} color="#3b82f6" />
                </View>
                <Text className="flex-1 text-[15px] font-bold text-slate-700 leading-tight">
                  {formatRuleText(copy.rules.post, data.createPostPoint)}
                </Text>
              </View>

              {/* Rule 3: React */}
              <View className="flex-row items-center gap-x-4">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-[#fff7ed]">
                  <Smile size={20} color="#f97316" />
                </View>
                <Text className="flex-1 text-[15px] font-bold text-slate-700 leading-tight">
                  {formatRuleText(copy.rules.react, data.reactionPoint)}
                </Text>
              </View>

              {/* Rule 4: Blog */}
              <View className="flex-row items-center gap-x-4">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-[#f1f5f9]">
                  <BookOpen size={20} color="#64748b" />
                </View>
                <Text className="flex-1 text-[15px] font-bold text-slate-700 leading-tight">
                  {formatRuleText(copy.rules.blog, data.createBlogPoint)}
                </Text>
              </View>
            </View>

            {/* Divider Line */}
            <View className="h-[1px] bg-slate-100 w-full" />

            {/* Points Balance Card (Mockup Match) */}
            <View
              className="rounded-3xl bg-slate-50 p-6 flex-row items-center justify-between relative overflow-hidden"
              style={{
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.02,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View className="flex-1 pr-4">
                <Text className="text-[13px] font-black text-slate-900 tracking-wider">
                  {copy.pointsTitle}
                </Text>
                <Text className="text-[34px] font-bold text-slate-800 mt-2 leading-none" numberOfLines={1}>
                  {formatNumber(data.pointsBalance)}
                </Text>
              </View>

              {/* Diamond Overlay Icon */}
              <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-200/60">
                <View
                  style={{ transform: [{ rotate: '45deg' }] }}
                  className="h-5 w-5 bg-white rounded-sm"
                />
              </View>
            </View>

            {/* Transfer Note Card (Mockup Match) */}
            <View className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 items-center">
              <View className="h-8 w-8 items-center justify-center rounded-full bg-slate-500/10">
                <Info size={16} color="#64748b" />
              </View>
              <Text className="text-center text-sm font-semibold text-slate-500 mt-3 leading-5">
                {copy.transferNotePrefix}
                <Text
                  onPress={() => navigation.navigate(ROUTES.MY_BALANCE as any)}
                  className="text-blue-600 underline font-bold"
                >
                  {copy.walletLink}
                </Text>
              </Text>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export default MyPointsScreen;
