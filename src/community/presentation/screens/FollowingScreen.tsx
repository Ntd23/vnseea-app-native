// Description: Renders the VNSEEA following list with a following button on each row.
import React from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';

type FollowingNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

const following = [
  {
    id: 'follow-1',
    name: 'VNSEEA Official',
    meta: 'Trang · 128K người theo dõi',
    image:
      'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'follow-2',
    name: 'Nguyễn Minh Anh',
    meta: 'Nhà thiết kế sản phẩm',
    image:
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'follow-3',
    name: 'React Native Việt Nam',
    meta: 'Cộng đồng · 54K người theo dõi',
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop',
  },
  {
    id: 'follow-4',
    name: 'Hoàng Long',
    meta: 'Founder · Startup & Growth',
    image:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=800&auto=format&fit=crop',
  },
];

function FollowingScreen() {
  const navigation = useNavigation<FollowingNav>();

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
        <Text className="text-title-primary text-inverse">Theo dõi</Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {following.map(item => (
          <View
            key={item.id}
            className="surface-card mb-3 flex-row items-center p-4"
          >
            <Image
              source={{ uri: item.image }}
              className="h-14 w-14 rounded-full"
              resizeMode="cover"
            />
            <View className="ml-4 flex-1">
              <Text className="text-title-primary">{item.name}</Text>
              <Text className="mt-1 text-caption-secondary">{item.meta}</Text>
            </View>
            <TouchableOpacity
              className="rounded-full bg-[#0000ff]/10 px-4 py-2"
              activeOpacity={0.8}
            >
              <Text className="text-caption-primary text-brand">Following</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default FollowingScreen;
