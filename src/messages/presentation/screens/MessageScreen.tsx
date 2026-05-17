// Description: Renders the VNSEEA Hub style messages screen translated from the Stitch reference.
import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Edit3, Plus, Search, Users } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';

type MessageNav = NativeStackNavigationProp<RootStackParamList>;

const profileAvatar =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDaMWNcH9S8wHozYQWXCmtbdaxB432TM87BjXOC7GfjDVscn2JUdv2UjZkXJUW9JrXW9TBf9ln1Z7MPs7oolFxWDYK9De2EQwlyFoXF04v_Y3B6mIox1safvM5UTkKqzqNNJNYQVv4Xk3vBBHNAJ-HrF5s3vI8w4mFbYtMvuvLZec2wwbjlytIwiyKdhFyqpBa0Pmy-pAE01j7ZQE5CvXSL7UGYPcSlqWkfBko55z9HyAqrWsrPgrXXLLkhWmeQInHyG5EevGFUMJ8';

const stories = [
  { name: 'Của tôi', image: profileAvatar, mine: true },
  {
    name: 'Anh Nguyễn',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAhNtDbDnLidJrh7uJcMw04C9XImkl2bziXzrVPrtLMrK-ysn9ImQd876lGPYjuY7tFUHn3UtZ9o1lD6F7WQRB9jBaekz767p-WjqVLj1kYqTwze7XmgrJjywnMTe4KOD6sFtvK1n-ricG1ZcwNbK-fCoqw4EJxbQw7d4mYow5TZiUSIN69aFDwj90HHrXWpBN6iv_oXoZWMbFaC7ADPTayWS3TTFHxpOGdNwb8GjXBkupBgB3z9k6CRnCbE98EScB_wg-fZ--aw_c',
  },
  {
    name: 'Linh Nguyễn',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAAfTc3Z-4i55DLq_hidez7RMKrJTFQP2p9RBLiLphinXwHMw37O41z6WBhDJ1Ku4-KUD1gLuYH4blfwNGxLvx1uahte17PdEqJpQtFXgF9A7wPIZFyLnMVS0XtGzv7fxTMsX5848aDOyiGCTgWecri_uktPAHQO0knwBcQLOCP6f_Be2Ljcpz04QJUna_orgkkzGltKAo4XBQGd8zlBjd77YqVrnLr9cuUzENgIHiTqgiYX4D3I_URccWw2HXr6f0KhiR5bPtKl3c',
  },
  {
    name: 'Đặng Tuấn',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBjOwyjzjKG0UF__i_h1zx46TFh3hO5W5JDrPrl5hX-BUR3-6YUpTC9apfXBBEj99b9Oy3bAuR0rzMJDH_xtd0JluYtOft4e9bspgKyqegCaPiQAgWNStBpPq3OE_rUQMKl-Az1HhU1D-tn311RrvbAajCvnL2W1yiWC0TonTYEuaTsFOg2SIX_HZgvyq6wjX1ddliPolbEIkVECdu7VrHDF7omzdftrPjjzbIKXLFpu886LQX8Wt9K95xxRVJVdieM_XkhyBkdAwE',
  },
];

const conversations = [
  {
    id: '1',
    name: 'Lê Thúy Quỳnh',
    message: 'Dự án VNSEEA đã hoàn thành giai đoạn thiết kế...',
    time: '10:45',
    unread: true,
    online: true,
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuC5xs1SPNNXU968Y61SL6ua59ywyN10iBTWfN7cgi1RF9eEJQc1Uq_-s02nMM_wUaHDspEXJsWXecTy__h82KlCNtEN9VfySSHvQjSdTsDmBo7tyI6WmKg-sCTkTHGbVd5cDlxwaDt9N1X2fr2gVD7lHjI7jUVBpH5ALgXKKQinevzKjSDlFY_JQICBe5NnfupDqzQ-IciJCYId8rP9cjw31flXv3HkBBysbgsOOvIOP1vynMJOoj9X5ehQfpUnP8Vo9I6ppiqqv2Y',
  },
  {
    id: '2',
    name: 'Nguyễn Minh Đức',
    message: 'Chào anh, em đã nhận được file báo cáo sáng nay.',
    time: 'Hôm qua',
    image: stories[1].image,
  },
  {
    id: '3',
    name: 'Trần Hoàng Lan',
    message: 'Hẹn gặp team vào lúc 2h chiều nay tại phòng họp 3 nhé.',
    time: 'Thứ 3',
    image: stories[2].image,
  },
  {
    id: '4',
    name: 'Phạm Huy',
    message: 'Bạn: Cảm ơn Huy nhiều nhen!',
    time: '22/10',
    initials: 'PH',
  },
  {
    id: '5',
    name: 'Đặng Quốc Tuấn',
    message: 'Đã gửi một ảnh',
    time: '15/10',
    image: stories[3].image,
  },
];

const groupConversations = [
  {
    id: 'g1',
    name: 'VNSEEA Design Team',
    message: 'Lan: Mình đã cập nhật prototype mới.',
    time: '11:20',
    initials: 'VD',
  },
  {
    id: 'g2',
    name: 'Product Launch',
    message: 'Đức: Check lại nội dung trước khi publish nhé.',
    time: 'Hôm qua',
    initials: 'PL',
  },
];

const tabs = ['Gửi nhiều người', 'Người dùng', 'Nhóm'];

function StoryItem({ story }: { story: (typeof stories)[number] }) {
  return (
    <TouchableOpacity className="w-16 items-center" activeOpacity={0.8}>
      <View
        className={`relative rounded-full p-0.5 ${
          story.mine
            ? 'border-2 border-dashed border-[#c5c4db]'
            : 'border-2 border-[#0000ff]'
        }`}
      >
        <Image
          source={{ uri: story.image }}
          className="h-14 w-14 rounded-full border-2 border-white"
          resizeMode="cover"
        />
        {story.mine ? (
          <View className="absolute bottom-0 right-0 h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-[#0000ff]">
            <Plus size={11} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      <Text
        className="mt-1 w-full text-center text-[10px] text-[#0b1c30]"
        numberOfLines={1}
      >
        {story.name}
      </Text>
    </TouchableOpacity>
  );
}

function ConversationRow({
  item,
  selectable = false,
}: {
  item: (typeof conversations)[number] | (typeof groupConversations)[number];
  selectable?: boolean;
}) {
  return (
    <TouchableOpacity
      className="mb-3 flex-row items-center rounded-[24px] border border-[rgba(0,0,0,0.05)] bg-white p-4"
      activeOpacity={0.8}
    >
      <View className="relative">
        {'image' in item && item.image ? (
          <Image
            source={{ uri: item.image }}
            className="h-14 w-14 rounded-full"
            resizeMode="cover"
          />
        ) : (
          <View className="h-14 w-14 items-center justify-center rounded-full bg-[#d0e1fb]">
            <Text className="text-title-primary text-brand">
              {'initials' in item ? item.initials : ''}
            </Text>
          </View>
        )}
        {'online' in item && item.online ? (
          <View className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-[#22c55e]" />
        ) : null}
      </View>

      <View className="ml-4 min-w-0 flex-1">
        <View className="mb-1 flex-row items-baseline justify-between">
          <Text className="mr-3 flex-1 text-title-primary" numberOfLines={1}>
            {item.name}
          </Text>
          <Text
            className={`text-caption-secondary ${
              'unread' in item && item.unread ? 'text-brand' : ''
            }`}
          >
            {item.time}
          </Text>
        </View>
        <Text
          className={`mr-4 text-body-primary ${
            'unread' in item && item.unread
              ? 'font-bold text-[#0b1c30]'
              : 'text-[#454558]'
          }`}
          numberOfLines={1}
        >
          {item.message}
        </Text>
      </View>

      {selectable ? (
        <View className="h-6 w-6 rounded-full border-2 border-[#0000ff]" />
      ) : 'unread' in item && item.unread ? (
        <View className="h-2.5 w-2.5 rounded-full bg-[#0000ff]" />
      ) : null}
    </TouchableOpacity>
  );
}

function MessageScreen() {
  const navigation = useNavigation<MessageNav>();
  const [activeTab, setActiveTab] = useState(tabs[1]);
  const list = activeTab === 'Nhóm' ? groupConversations : conversations;

  return (
    <SafeAreaView className="flex-1 bg-[#f8f9ff]" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0000FF" />
      <View className="surface-brand h-16 flex-row items-center justify-between px-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="ml-2 text-display text-inverse">Tin nhắn</Text>
        </View>
        <Image
          source={{ uri: profileAvatar }}
          className="h-10 w-10 rounded-full border-2 border-white/25"
          resizeMode="cover"
        />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-28 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="input-shell mb-6 min-h-[48px] flex-row items-center px-4">
          <Search size={18} color="#757589" />
          <TextInput
            className="ml-3 flex-1 text-body-primary"
            placeholder="Tìm kiếm hội thoại..."
            placeholderTextColor="#757589"
          />
        </View>

        <Text className="mb-3 px-2 text-label-secondary">TIN</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-4 pb-6"
        >
          {stories.map(story => (
            <StoryItem key={story.name} story={story} />
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-6 border-b border-[#c5c4db]/30 pb-3"
        >
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab}
              activeOpacity={0.8}
              onPress={() => setActiveTab(tab)}
            >
              <Text
                className={`text-title-primary ${
                  activeTab === tab
                    ? 'border-b-2 border-[#0000ff] pb-3 text-brand'
                    : 'pb-3 text-[#757589]'
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {activeTab === 'Nhóm' ? (
          <TouchableOpacity
            className="surface-card my-4 flex-row items-center justify-center p-4"
            activeOpacity={0.85}
          >
            <Users size={20} color="#0000FF" />
            <Text className="ml-2 text-title-primary text-brand">Tạo nhóm</Text>
          </TouchableOpacity>
        ) : null}

        {activeTab === 'Gửi nhiều người' ? (
          <View className="form-note-panel my-4 p-4">
            <Text className="text-body-secondary">
              Chọn nhiều người để gắn thẻ hoặc gửi cùng một nội dung.
            </Text>
          </View>
        ) : null}

        <View className="pt-1">
          {list.map(item => (
            <ConversationRow
              key={item.id}
              item={item}
              selectable={activeTab === 'Gửi nhiều người'}
            />
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity
        className="absolute bottom-8 right-6 h-14 w-14 items-center justify-center rounded-2xl bg-[#0000ff]"
        activeOpacity={0.85}
      >
        <Edit3 size={26} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default MessageScreen;
