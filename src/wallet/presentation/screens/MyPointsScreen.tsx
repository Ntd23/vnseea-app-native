import React from 'react';
import {ScrollView, StatusBar, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  ArrowLeft,
  FileText,
  Info,
  MessageSquare,
  PenLine,
  ThumbsUp,
} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import {useMyPointsViewModel} from '../../application/view-models/useMyPointsViewModel';
import type {PointActivity} from '../../domain/types/wallet.types';

/* ── Icon map ── */
const ICON_MAP: Record<
  string,
  React.ComponentType<{size: number; color: string}>
> = {
  MessageSquare,
  PenLine,
  ThumbsUp,
  FileText,
};

/* ── Segmented progress bar ── */
function SegmentedBar({
  activities,
  total,
  goal,
}: {
  activities: PointActivity[];
  total: number;
  goal: number;
}) {
  const filled = Math.min(total / goal, 1); // 0-1
  const emptyFlex = Math.max(0, 1 - filled);

  return (
    <View className="w-full mt-2">
      {/* Bar */}
      <View className="h-3 w-full flex-row overflow-hidden rounded-full bg-[#d3e4fe]">
        {activities.map(a => {
          const segFlex = (a.percentage / 100) * filled * (1 / filled);
          return (
            <View
              key={a.id}
              style={{
                flex: a.percentage,
                backgroundColor: a.color,
              }}
            />
          );
        })}
        {/* empty/remaining */}
        {emptyFlex > 0 && (
          <View style={{flex: emptyFlex * 100}} className="bg-transparent" />
        )}
      </View>

      {/* Labels */}
      <View className="mt-2 flex-row justify-between">
        <Text className="text-[11px] font-bold uppercase tracking-widest text-[#64748b]">
          0
        </Text>
        <Text className="text-[11px] font-bold uppercase tracking-widest text-[#64748b]">
          MỤC TIÊU: {goal.toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

/* ── Activity row ── */
function ActivityRow({activity}: {activity: PointActivity}) {
  const IconComponent = ICON_MAP[activity.iconKey];
  return (
    <View className="flex-row items-center justify-between rounded-lg bg-[#eff4ff] px-3 py-3">
      <View className="flex-row items-center gap-3 flex-1 mr-3">
        <View
          className="h-8 w-8 items-center justify-center rounded-full"
          style={{backgroundColor: activity.chipBg}}>
          {IconComponent ? (
            <IconComponent size={16} color={activity.color} />
          ) : null}
        </View>
        <Text
          className="text-[14px] leading-5 text-[#0b1c30] flex-1"
          numberOfLines={2}>
          {activity.label}
        </Text>
      </View>
      <Text
        className="text-[15px] font-bold"
        style={{color: activity.color}}>
        {activity.percentage}%
      </Text>
    </View>
  );
}

/* ── Main screen ── */
function MyPointsScreen() {
  const navigation = useNavigation();
  const {data, isLoading} = useMyPointsViewModel();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 surface-base items-center justify-center">
        <Text className="text-body-secondary">Đang tải...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Top App Bar */}
      <View className="surface-brand flex-row items-center px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-heading text-inverse">
          Điểm của tôi
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-12 pt-6"
        showsVerticalScrollIndicator={false}>

        {/* ── Points Card ── */}
        <View className="surface-card items-center px-6 py-6">
          {/* Avatar */}
          <View className="h-24 w-24 items-center justify-center rounded-full border-4 border-[#eef0ff] bg-[#0000ff]">
            <Text className="text-display text-inverse">{data.initials}</Text>
          </View>

          {/* Points + Level */}
          <View className="mt-4 items-center">
            <Text className="text-heading text-[#0b1c30]">
              {data.total.toLocaleString()} Điểm
            </Text>
            <Text className="text-[12px] text-[#64748b] mt-0.5">
              {data.level}
            </Text>
          </View>

          {/* Segmented progress bar */}
          <SegmentedBar
            activities={data.activities}
            total={data.total}
            goal={data.goal}
          />
        </View>

        {/* ── Activity Breakdown Card ── */}
        <View className="surface-card mt-5 px-5 py-5">
          <Text className="text-title-primary mb-4">
            Hoạt động tích điểm
          </Text>
          <View className="gap-3">
            {data.activities.map(a => (
              <ActivityRow key={a.id} activity={a} />
            ))}
          </View>
        </View>

        {/* ── Info Box ── */}
        <View className="mt-5 flex-row items-start gap-3 rounded-xl border border-blue-200 bg-[#e6e6ff] px-4 py-4">
          <Info size={20} color="#0000ff" style={{marginTop: 2}} />
          <View className="flex-1">
            <Text className="text-title-primary text-[#000066] mb-1">
              Lưu ý quan trọng
            </Text>
            <Text className="text-[12px] leading-5 text-[#454558]">
              Điểm của bạn sẽ được chuyển thẳng vào{' '}
              <Text className="font-bold text-[#0000ff]">#Ví</Text> của bạn.
              Bạn có thể sử dụng điểm để đổi quà hoặc thanh toán các dịch vụ.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default MyPointsScreen;
