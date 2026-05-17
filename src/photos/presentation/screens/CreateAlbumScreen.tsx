// Description: Renders the VNSEEA create album screen for naming, privacy, and photo upload setup.
import React from 'react';
import {
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CheckCircle2,
  Globe2,
  ImagePlus,
  Lock,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';

type CreateAlbumNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

function CreateAlbumScreen() {
  const navigation = useNavigation<CreateAlbumNav>();

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
        <Text className="text-title-primary text-inverse">Tạo Album</Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-28 pt-5"
        showsVerticalScrollIndicator={false}
      >
        <View className="surface-card p-4">
          <Text className="text-caption-primary">Tên album</Text>
          <TextInput
            className="mt-2 rounded-xl border border-slate-200 px-4 py-3 text-body-primary"
            placeholder="Nhập tên album"
            placeholderTextColor="#94A3B8"
          />

          <Text className="mt-5 text-caption-primary">Mô tả</Text>
          <TextInput
            className="mt-2 min-h-[110px] rounded-xl border border-slate-200 px-4 py-3 text-body-primary"
            placeholder="Viết mô tả ngắn cho album"
            placeholderTextColor="#94A3B8"
            multiline
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          className="preview-panel mt-4 min-h-[190px] items-center justify-center border border-dashed border-[#0000ff] p-6"
          activeOpacity={0.85}
        >
          <ImagePlus size={48} color={BRAND} />
          <Text className="mt-4 text-title-primary text-brand">
            Thêm ảnh vào album
          </Text>
          <Text className="mt-2 text-center text-caption-secondary">
            Chọn nhiều ảnh để tạo bộ sưu tập đầu tiên.
          </Text>
        </TouchableOpacity>

        <View className="mt-4 gap-3">
          {[
            {
              label: 'Công khai',
              desc: 'Mọi người đều có thể xem',
              Icon: Globe2,
            },
            { label: 'Bạn bè', desc: 'Chỉ bạn bè có thể xem', Icon: Users },
            { label: 'Riêng tư', desc: 'Chỉ mình tôi', Icon: Lock },
          ].map(({ Icon, desc, label }, index) => {
            const selected = index === 1;
            return (
              <TouchableOpacity
                key={label}
                className={`surface-card flex-row items-center border p-4 ${
                  selected ? 'border-[#0000ff]' : 'border-transparent'
                }`}
                activeOpacity={0.84}
              >
                <View className="h-12 w-12 items-center justify-center rounded-full bg-[#0000ff]/10">
                  <Icon size={23} color={BRAND} />
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-title-primary">{label}</Text>
                  <Text className="mt-1 text-caption-secondary">{desc}</Text>
                </View>
                {selected && <CheckCircle2 size={22} color={BRAND} />}
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
          <Text className="text-title-primary text-inverse">Tạo album</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default CreateAlbumScreen;
