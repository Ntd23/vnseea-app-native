// Description: Renders the VNSEEA-style empty state for the user's uploaded videos.
import React from 'react';
import { StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, RotateCw, Search, Video } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';

type MyVideosNav = NativeStackNavigationProp<RootStackParamList>;

function MyVideosScreen() {
  const navigation = useNavigation<MyVideosNav>();

  return (
    <SafeAreaView className="flex-1 bg-[#f9f9fc]" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9F9FC" />

      <View className="h-14 flex-row items-center justify-between border-b border-[rgba(0,0,255,0.08)] bg-[#f9f9fc] px-5">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#0000FF" />
          </TouchableOpacity>
          <Text className="ml-1 text-heading text-brand">Video của tôi</Text>
        </View>

        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.navigate(ROUTES.SEARCH)}
        >
          <Search size={20} color="#0000FF" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 items-center justify-center px-6 pb-24">
        <View className="items-center">
          <View className="mb-8 h-48 w-48 items-center justify-center">
            <View className="absolute h-48 w-48 rounded-full bg-[#0000ff]/5" />
            <View className="h-[116px] w-[116px] items-center justify-center rounded-[32px] border border-white/70 bg-white/60">
              <Video
                size={72}
                color="rgba(0, 0, 255, 0.36)"
                strokeWidth={1.7}
              />
            </View>
          </View>

          <Text className="text-display text-center text-[#111827]">
            Chưa có video !!
          </Text>
          <Text className="mt-3 max-w-[310px] text-center text-body-secondary">
            Hãy bắt đầu tải những video đầu tiên của bạn lên để chia sẻ khoảnh
            khắc với mọi người.
          </Text>

          <TouchableOpacity
            className="btn-primary mt-10 min-h-[52px] w-[280px] rounded-xl"
            activeOpacity={0.85}
          >
            <RotateCw size={18} color="#FFFFFF" />
            <Text className="text-title-primary text-inverse">Thử lại</Text>
          </TouchableOpacity>
        </View>

        <View className="absolute bottom-8 left-6 right-6 flex-row gap-4 opacity-40">
          <View className="mt-14 h-32 flex-1 rounded-[28px] bg-[#e8e8ea]" />
          <View className="h-48 flex-1 rounded-[28px] bg-[#e2e2e5]" />
        </View>
      </View>
    </SafeAreaView>
  );
}

export default MyVideosScreen;
