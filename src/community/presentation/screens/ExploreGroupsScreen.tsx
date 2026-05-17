// Description: Renders the VNSEEA group exploration screen with group cards and create navigation.
import React from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Lock, Plus, Search, Users } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';

type ExploreGroupsNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

const groups = [
  {
    id: 'group-1',
    name: 'VNSEEA Design Circle',
    privacy: 'Công khai',
    members: '24,8K thành viên',
    posts: '126 bài viết hôm nay',
    image:
      'https://images.unsplash.com/photo-1559136555-9303baea8ebd?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 'group-2',
    name: 'React Native Việt Nam',
    privacy: 'Riêng tư',
    members: '18,2K thành viên',
    posts: '84 bài viết hôm nay',
    image:
      'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 'group-3',
    name: 'Startup & Growth',
    privacy: 'Công khai',
    members: '9,6K thành viên',
    posts: '42 bài viết hôm nay',
    image:
      'https://images.unsplash.com/photo-1556761175-b413da4baf72?q=80&w=1200&auto=format&fit=crop',
  },
];

function ExploreGroupsScreen() {
  const navigation = useNavigation<ExploreGroupsNav>();

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
        <Text className="text-title-primary text-inverse">Nhóm</Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
        >
          <Search size={21} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-24 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          className="btn-primary mb-5 min-h-[50px]"
          activeOpacity={0.86}
          onPress={() => navigation.navigate(ROUTES.CREATE_GROUP)}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text className="text-title-primary text-inverse">Tạo nhóm mới</Text>
        </TouchableOpacity>

        <View className="mb-4 flex-row gap-3">
          {['Khám phá', 'Đã tham gia', 'Gần bạn'].map((tab, index) => (
            <View
              key={tab}
              className={`rounded-full px-4 py-2 ${
                index === 0 ? 'surface-brand' : 'surface-muted'
              }`}
            >
              <Text
                className={
                  index === 0
                    ? 'text-caption-primary text-inverse'
                    : 'text-caption-secondary'
                }
              >
                {tab}
              </Text>
            </View>
          ))}
        </View>

        {groups.map(group => (
          <TouchableOpacity
            key={group.id}
            className="surface-card mb-4 overflow-hidden"
            activeOpacity={0.88}
            onPress={() => navigation.navigate(ROUTES.GROUP_DETAIL)}
          >
            <Image
              source={{ uri: group.image }}
              className="h-40 w-full"
              resizeMode="cover"
            />
            <View className="p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Text className="text-title-primary">{group.name}</Text>
                  <View className="mt-2 flex-row items-center">
                    {group.privacy === 'Riêng tư' ? (
                      <Lock size={15} color={BRAND} />
                    ) : (
                      <Users size={15} color={BRAND} />
                    )}
                    <Text className="ml-2 text-caption-secondary">
                      {group.privacy} · {group.members}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  className="rounded-full bg-[#0000ff]/10 px-4 py-2"
                  activeOpacity={0.8}
                >
                  <Text className="text-caption-primary text-brand">
                    Tham gia
                  </Text>
                </TouchableOpacity>
              </View>
              <Text className="mt-3 text-caption-secondary">{group.posts}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default ExploreGroupsScreen;
