// Description: Renders the VNSEEA albums screen with album cards and create album navigation.
import React from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Images, Plus, Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';

type AlbumsNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

const albums = [
  {
    id: 'album-1',
    title: 'Khoảnh khắc cộng đồng',
    count: '128 ảnh',
    privacy: 'Công khai',
    image:
      'https://images.unsplash.com/photo-1511988617509-a57c8a288659?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'album-2',
    title: 'Product Meetup',
    count: '64 ảnh',
    privacy: 'Bạn bè',
    image:
      'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1000&auto=format&fit=crop',
  },
  {
    id: 'album-3',
    title: 'Design Workshop',
    count: '42 ảnh',
    privacy: 'Riêng tư',
    image:
      'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=1000&auto=format&fit=crop',
  },
];

function AlbumsScreen() {
  const navigation = useNavigation<AlbumsNav>();

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
        <Text className="text-title-primary text-inverse">Album</Text>
        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
          >
            <Search size={21} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
            onPress={() => navigation.navigate(ROUTES.CREATE_ALBUM)}
          >
            <Plus size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-10 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="surface-card mb-5 flex-row items-center p-4">
          <View className="h-14 w-14 items-center justify-center rounded-2xl bg-[#0000ff]/10">
            <Images size={28} color={BRAND} />
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-heading">Album của tôi</Text>
            <Text className="mt-1 text-body-secondary">
              Quản lý các bộ ảnh đã tạo và chia sẻ với cộng đồng.
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap justify-between">
          {albums.map(album => (
            <TouchableOpacity
              key={album.id}
              className="surface-card mb-4 w-[48%] overflow-hidden"
              activeOpacity={0.86}
            >
              <Image
                source={{ uri: album.image }}
                className="h-36 w-full"
                resizeMode="cover"
              />
              <View className="p-3">
                <Text className="text-title-primary" numberOfLines={2}>
                  {album.title}
                </Text>
                <Text className="mt-1 text-caption-secondary">
                  {album.count}
                </Text>
                <Text className="mt-1 text-caption-primary text-brand">
                  {album.privacy}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default AlbumsScreen;
