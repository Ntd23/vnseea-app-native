// Description: Renders the VNSEEA announcements tab used by the bottom navigation notifications route.
import React from 'react';
import {
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Megaphone,
  ShieldAlert,
  Sparkles,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const BRAND = '#0000ff';

const announcements = [
  {
    id: 'announcement-1',
    title: 'VNSEEA cập nhật giao diện mới',
    body: 'Bộ màn hình mobile đã được đồng bộ theo phong cách Minimalist Aqua UI.',
    time: 'Vừa xong',
    type: 'Sản phẩm',
    Icon: Sparkles,
  },
  {
    id: 'announcement-2',
    title: 'Bảo trì hệ thống tối nay',
    body: 'Một số tính năng có thể gián đoạn trong khoảng 23:00 - 23:30.',
    time: '2 giờ trước',
    type: 'Hệ thống',
    Icon: ShieldAlert,
  },
  {
    id: 'announcement-3',
    title: 'Sự kiện cộng đồng tháng 5',
    body: 'Đăng ký tham gia Product Meetup để kết nối với cộng đồng VNSEEA.',
    time: 'Hôm qua',
    type: 'Sự kiện',
    Icon: CalendarDays,
  },
];

function NotificationsScreen() {
  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      <View className="surface-brand h-14 flex-row items-center justify-between px-4">
        <View className="h-10 w-10 items-center justify-center rounded-full">
          <Megaphone size={22} color="#FFFFFF" />
        </View>
        <Text className="text-title-primary text-inverse">Thông báo</Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
        >
          <CheckCircle2 size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="surface-card mb-5 flex-row items-center p-4">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#0000ff]/10">
            <Bell size={28} color={BRAND} />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-heading">Announcement</Text>
            <Text className="mt-1 text-body-secondary">
              Cập nhật mới nhất từ hệ thống, cộng đồng và các hoạt động quan
              trọng.
            </Text>
          </View>
        </View>

        {announcements.map(({ Icon, body, id, time, title, type }) => (
          <TouchableOpacity
            key={id}
            className="surface-card mb-3 flex-row p-4"
            activeOpacity={0.84}
          >
            <View className="h-12 w-12 items-center justify-center rounded-full bg-[#0000ff]/10">
              <Icon size={24} color={BRAND} />
            </View>
            <View className="ml-4 flex-1">
              <View className="flex-row items-center justify-between">
                <Text className="text-caption-primary text-brand">{type}</Text>
                <Text className="text-caption-secondary">{time}</Text>
              </View>
              <Text className="mt-1 text-title-primary">{title}</Text>
              <Text className="mt-2 text-body-secondary">{body}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default NotificationsScreen;
