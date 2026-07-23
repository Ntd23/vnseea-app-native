// Description: Renders the VNSEEA following/followers list with real API data.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useEffect } from 'react';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft, UserCheck, UserPlus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import { useFollowingViewModel } from '../../application/view-models/useFollowingViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type FollowingNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = APP_BRAND_COLOR;

function FollowingScreen() {
  const navigation = useNavigation<FollowingNav>();
  const {
    currentList,
    activeTab,
    error,
    isLoading,
    isLoadingMore,
    hasMore,
    loadFirstPage,
    switchTab,
  } = useFollowingViewModel();

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="light-content" backgroundColor={BRAND} />

      {/* Header */}
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

      {/* Tab Selector */}
      <View className="flex-row border-b border-[#E4E6EB] bg-white">
        <TouchableOpacity
          className={`flex-1 items-center py-3 ${
            activeTab === 'following' ? 'border-b-2 border-brand' : ''
          }`}
          activeOpacity={0.8}
          onPress={() => switchTab('following')}
        >
          <Text
            className={`text-[14px] font-semibold ${
              activeTab === 'following' ? 'text-brand' : 'text-[#65676B]'
            }`}
          >
            Đang theo dõi
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className={`flex-1 items-center py-3 ${
            activeTab === 'followers' ? 'border-b-2 border-brand' : ''
          }`}
          activeOpacity={0.8}
          onPress={() => switchTab('followers')}
        >
          <Text
            className={`text-[14px] font-semibold ${
              activeTab === 'followers' ? 'text-brand' : 'text-[#65676B]'
            }`}
          >
            Người theo dõi
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isLoading && currentList.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      ) : error && currentList.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-body-secondary">{error}</Text>
          <TouchableOpacity
            className="mt-4 rounded-lg bg-brand px-6 py-2"
            activeOpacity={0.8}
            onPress={() => loadFirstPage()}
          >
            <Text className="text-white">Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : currentList.length === 0 ? (
        <View className="flex-1 items-center justify-center px-4">
          <Text className="text-center text-body-secondary">
            {activeTab === 'following'
              ? 'Bạn chưa theo dõi ai.'
              : 'Chưa có ai theo dõi bạn.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-10 pt-4"
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={() => {
            if (hasMore) {
              // Could implement load more on scroll here
            }
          }}
        >
          {currentList.map(item => (
            <TouchableOpacity
              key={item.id}
              className="surface-card mb-3 flex-row items-center p-4"
              activeOpacity={0.86}
              onPress={() => navigateToUserProfile(navigation, item.id)}
            >
              <Image
                source={{ uri: item.avatarUrl }}
                className="h-14 w-14 rounded-full"
                resizeMode="cover"
              />
              <View className="ml-4 flex-1">
                <View className="flex-row items-center">
                  <Text className="text-title-primary" numberOfLines={1}>
                    {item.name || item.username}
                  </Text>
                  {item.verified && (
                    <View className="ml-1">
                      <Text style={{ color: APP_BRAND_COLOR, fontSize: 12 }}>✓</Text>
                    </View>
                  )}
                </View>
                {item.about && (
                  <Text className="mt-1 text-caption-secondary" numberOfLines={1}>
                    {item.about}
                  </Text>
                )}
                <Text className="mt-1 text-caption-secondary">
                  {item.address || item.working || ''}
                </Text>
              </View>
              {item.followingState === 'following' ? (
                <TouchableOpacity
                  className="flex-row items-center rounded-full bg-brand/10 px-4 py-2"
                  activeOpacity={0.8}
                >
                  <UserCheck size={16} color={BRAND} />
                  <Text className="ml-2 text-caption-primary text-brand">Following</Text>
                </TouchableOpacity>
              ) : item.followingState === 'requested' ? (
                <TouchableOpacity
                  className="flex-row items-center rounded-full bg-[#E4E6EB] px-4 py-2"
                  activeOpacity={0.8}
                >
                  <Text className="text-caption-primary text-[#65676B]">Đã gửi</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  className="flex-row items-center rounded-full bg-brand px-4 py-2"
                  activeOpacity={0.8}
                >
                  <UserPlus size={16} color="#FFFFFF" />
                  <Text className="ml-2 text-caption-primary text-white">Theo dõi</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}

          {isLoadingMore && (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color={BRAND} />
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default FollowingScreen;
