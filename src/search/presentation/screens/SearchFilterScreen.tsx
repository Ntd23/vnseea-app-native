// Description: Renders the VNSEEA search filter screen with Stitch styling and filter.png functionality.
import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  BadgeCheck,
  Cake,
  ChevronRight,
  Globe2,
  Image as ImageIcon,
  MapPin,
  UserRound,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type SearchFilterNav = NativeStackNavigationProp<RootStackParamList>;

const genders = ['Tất cả', 'Nữ', 'Nam'];
const rows = [
  { label: 'Vị trí', value: 'Tất cả', Icon: MapPin },
  { label: 'Đã xác minh', value: 'Tất cả', Icon: BadgeCheck },
  { label: 'Trạng thái', value: 'Tất cả', Icon: Globe2 },
  { label: 'Ảnh đại diện', value: 'Tất cả', Icon: ImageIcon },
];

function FilterRow({
  label,
  value,
  Icon,
}: {
  label: string;
  value: string;
  Icon: React.ComponentType<{
    size: number;
    color: string;
    strokeWidth?: number;
  }>;
}) {
  return (
    <TouchableOpacity
      className="min-h-[64px] flex-row items-center border-b border-[rgba(0,0,255,0.08)]"
      activeOpacity={0.75}
    >
      <Icon size={28} color="#0000ff" strokeWidth={1.9} />
      <Text className="ml-4 flex-1 text-title-primary">{label}</Text>
      <Text className="mr-3 text-title-secondary">{value}</Text>
      <ChevronRight size={20} color="#94A3B8" />
    </TouchableOpacity>
  );
}

function SearchFilterScreen() {
  const navigation = useNavigation<SearchFilterNav>();
  const [gender, setGender] = useState(genders[0]);
  const [ageEnabled, setAgeEnabled] = useState(false);

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="light-content" backgroundColor="#0000FF" />

      <View className="surface-brand h-16 flex-row items-center justify-center px-4">
        <TouchableOpacity
          className="absolute left-4 h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-heading text-inverse">Bộ lọc</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="surface-card mb-5 p-5">
          <View className="mb-5 flex-row items-center">
            <UserRound size={28} color="#0000ff" strokeWidth={1.8} />
            <Text className="ml-4 text-heading">Giới tính</Text>
          </View>

          <View className="flex-row gap-3">
            {genders.map(item => (
              <TouchableOpacity
                key={item}
                className={`min-h-[44px] flex-1 items-center justify-center rounded-full border ${
                  gender === item
                    ? 'border-[#0000ff] bg-[#0000ff]'
                    : 'border-[#e2e8f0] bg-white'
                }`}
                activeOpacity={0.85}
                onPress={() => setGender(item)}
              >
                <Text
                  className={`text-title-primary ${
                    gender === item ? 'text-inverse' : 'text-[#334155]'
                  }`}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="surface-card mb-5 p-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Cake size={28} color="#0000ff" strokeWidth={1.8} />
              <Text className="ml-4 text-heading">Tuổi</Text>
            </View>
            <TouchableOpacity
              className={`h-8 w-14 rounded-full px-1 ${
                ageEnabled
                  ? 'items-end bg-[#0000ff]'
                  : 'items-start bg-[#cbd5e1]'
              } justify-center`}
              activeOpacity={0.8}
              onPress={() => setAgeEnabled(value => !value)}
            >
              <View className="h-7 w-7 rounded-full bg-white" />
            </TouchableOpacity>
          </View>
          {ageEnabled ? (
            <Text className="mt-4 text-body-secondary">
              Đã bật bộ lọc theo tuổi. Các cài đặt khoảng tuổi chi tiết sẽ hiển thị ở bước tiếp theo.
            </Text>
          ) : null}
        </View>

        <View className="surface-card mb-6 px-5">
          {rows.map(row => (
            <FilterRow key={row.label} {...row} />
          ))}
        </View>

        <TouchableOpacity
          className="btn-primary min-h-[56px] rounded-[18px]"
          activeOpacity={0.9}
        >
          <Text className="text-title-primary text-inverse">Áp dụng bộ lọc</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

export default SearchFilterScreen;
