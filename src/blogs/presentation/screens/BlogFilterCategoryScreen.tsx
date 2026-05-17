// Description: Renders the VNSEEA blog category filter screen for article browsing.
import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Briefcase,
  CheckCircle2,
  Code2,
  Palette,
  Sprout,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';

type BlogFilterNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

const categories = [
  { id: 'design', label: 'Thiết kế', count: '128 bài', Icon: Palette },
  { id: 'tech', label: 'Công nghệ', count: '96 bài', Icon: Code2 },
  { id: 'community', label: 'Cộng đồng', count: '74 bài', Icon: Users },
  { id: 'business', label: 'Kinh doanh', count: '52 bài', Icon: Briefcase },
  { id: 'growth', label: 'Phát triển', count: '38 bài', Icon: Sprout },
];

function BlogFilterCategoryScreen() {
  const navigation = useNavigation<BlogFilterNav>();
  const [selected, setSelected] = useState('design');

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
        <Text className="text-title-primary text-inverse">Danh mục</Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-28 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-heading">Lọc article theo danh mục</Text>
        <Text className="mt-2 text-body-secondary">
          Chọn danh mục để thu hẹp danh sách bài viết phù hợp với nội dung bạn
          muốn đọc.
        </Text>

        <View className="mt-5 gap-3">
          {categories.map(({ Icon, count, id, label }) => {
            const isSelected = id === selected;
            return (
              <TouchableOpacity
                key={id}
                className={`surface-card flex-row items-center border p-4 ${
                  isSelected ? 'border-[#0000ff]' : 'border-transparent'
                }`}
                activeOpacity={0.84}
                onPress={() => setSelected(id)}
              >
                <View className="h-12 w-12 items-center justify-center rounded-full bg-[#0000ff]/10">
                  <Icon size={24} color={BRAND} />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-title-primary">{label}</Text>
                  <Text className="mt-1 text-caption-secondary">{count}</Text>
                </View>
                {isSelected && <CheckCircle2 size={22} color={BRAND} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 border-t border-[rgba(0,0,255,0.08)] bg-white px-4 pb-5 pt-3">
        <TouchableOpacity
          className="btn-primary min-h-[52px]"
          activeOpacity={0.86}
          onPress={() => navigation.goBack()}
        >
          <Text className="text-title-primary text-inverse">Áp dụng</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default BlogFilterCategoryScreen;
