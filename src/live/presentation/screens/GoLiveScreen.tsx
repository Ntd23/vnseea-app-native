// Description: Go Live screen - create a new live stream.
import React, { useCallback } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, ChevronLeft, Globe, Lock, Users, UserCheck } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGoLiveViewModel } from '../../application/view-models/useLiveViewModel';

export default function GoLiveScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const {
    title,
    description,
    privacy,
    privacyOptions,
    isLoading,
    setTitle,
    setDescription,
    setPrivacy,
    startLive,
  } = useGoLiveViewModel();

  const handleStartLive = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tiêu đề cho live');
      return;
    }
    try {
      await startLive();
      // TODO: navigate to live room after creating
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể bắt đầu live. Vui lòng thử lại.');
    }
  }, [startLive, title]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const privacyIcons: Record<string, React.ReactNode> = {
    '0': <Globe size={18} color="#0000ff" />,
    '1': <Users size={18} color="#0000ff" />,
    '2': <UserCheck size={18} color="#0000ff" />,
    '3': <Lock size={18} color="#0000ff" />,
  };

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="surface-topbar flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color="#1a1c1e" />
        </TouchableOpacity>
        <Text className="text-[18px] font-semibold text-[#1a1c1e]">
          Tạo live mới
        </Text>
        <View className="w-6" />
      </View>

      <ScrollView
        className="flex-1 px-4 pb-8"
        showsVerticalScrollIndicator={false}
      >
        {/* Thumbnail Preview */}
        <View className="mt-4 items-center">
          <TouchableOpacity
            activeOpacity={0.8}
            className="surface-card h-48 w-full items-center justify-center overflow-hidden"
          >
            <View className="items-center gap-2">
              <View className="rounded-full bg-[#0000ff]/10 p-4">
                <Camera size={32} color="#0000ff" />
              </View>
              <Text className="text-[14px] text-[#64748b]">
                Thêm ảnh bìa (tùy chọn)
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Title Input */}
        <View className="mt-6">
          <Text className="mb-2 text-[14px] font-medium text-[#1a1c1e]">
            Tiêu đề *
          </Text>
          <TextInput
            className="input-shell px-4 py-3"
            placeholder="VD: Chào buổi sáng mọi người!"
            placeholderTextColor="#94a3b8"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
          <Text className="mt-1 text-right text-[12px] text-[#94a3b8]">
            {title.length}/100
          </Text>
        </View>

        {/* Description Input */}
        <View className="mt-4">
          <Text className="mb-2 text-[14px] font-medium text-[#1a1c1e]">
            Mô tả
          </Text>
          <TextInput
            className="input-shell min-h-24 px-4 py-3"
            placeholder="Chia sẻ nội dung live của bạn..."
            placeholderTextColor="#94a3b8"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
            maxLength={500}
          />
        </View>

        {/* Privacy Selection */}
        <View className="mt-6">
          <Text className="mb-3 text-[14px] font-medium text-[#1a1c1e]">
            Quyền riêng tư
          </Text>
          <View className="gap-3">
            {privacyOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                activeOpacity={0.8}
                onPress={() => setPrivacy(option.value)}
                className={`surface-card flex-row items-center justify-between px-4 py-3 ${
                  privacy === option.value
                    ? 'border-2 border-[#0000ff]'
                    : ''
                }`}
              >
                <View className="flex-row items-center gap-3">
                  {privacyIcons[option.value]}
                  <Text className="text-[14px] text-[#1a1c1e]">
                    {option.label}
                  </Text>
                </View>
                <View
                  className={`h-5 w-5 rounded-full border-2 ${
                    privacy === option.value
                      ? 'border-[#0000ff] bg-[#0000ff]'
                      : 'border-[#94a3b8]'
                  }`}
                >
                  {privacy === option.value && (
                    <View className="h-2 w-2 rounded-full bg-white" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Start Live Button */}
      <View className="border-t border-[rgba(0,0,255,0.08)] p-4">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleStartLive}
          disabled={isLoading}
          className="btn-primary flex-row items-center justify-center gap-2 py-4"
        >
          {isLoading ? (
            <Text className="text-[16px] font-semibold text-white">
              Đang bắt đầu...
            </Text>
          ) : (
            <>
              <View className="h-3 w-3 animate-pulse rounded-full bg-white" />
              <Text className="text-[16px] font-semibold text-white">
                Bắt đầu live
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}