// Description: Renders the VNSEEA-style empty state for the user's uploaded photos.
import React from 'react';
import { StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, Image, RotateCw } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';

type MyPhotosNav = NativeStackNavigationProp<RootStackParamList>;

function MyPhotosScreen() {
  const navigation = useNavigation<MyPhotosNav>();

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0000FF" />

      <View className="surface-brand h-14 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-title-primary text-inverse">Ảnh của tôi</Text>
        <View className="h-10 w-10" />
      </View>

      <View className="flex-1 items-center justify-center px-4 pb-10">
        <View className="surface-card w-full max-w-[340px] items-center px-8 py-9">
          <View className="mb-4 h-24 w-24 items-center justify-center rounded-full bg-[#f1edff]">
            <Image size={32} color="#334155" strokeWidth={1.8} />
          </View>

          <Text className="text-title-primary">Chưa có ảnh !!</Text>
          <Text className="mt-3 text-center text-caption-secondary">
            Hãy bắt đầu tải những bức ảnh đầu tiên của bạn lên
          </Text>

          <TouchableOpacity
            className="btn-primary mt-7 min-h-[44px] w-full"
            activeOpacity={0.85}
          >
            <RotateCw size={17} color="#FFFFFF" />
            <Text className="text-title-primary text-inverse">Thử lại</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default MyPhotosScreen;
