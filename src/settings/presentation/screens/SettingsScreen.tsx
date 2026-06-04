// Description: Renders the main settings tab with profile, feature shortcuts, and settings menu.
import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Search } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import type {
  RootStackParamList,
  RootStackRouteName,
} from '../../../navigation/types';
import { useAuthViewModel } from '../../../auth/application/view-models/useAuthViewModel';
import CreateActionSheet from '../../../shared-kernel/presentation/components/CreateActionSheet';
import { useSettingsViewModel } from '../../application/view-models/useSettingsViewModel';
import ProfileHeaderCard from '../components/ProfileHeaderCard';
import FeatureGrid from '../components/FeatureGrid';
import GoProBanner from '../components/GoProBanner';
import SettingsMenuList from '../components/SettingsMenuList';

type SettingsNav = NativeStackNavigationProp<RootStackParamList>;

function SettingsScreen() {
  const navigation = useNavigation<SettingsNav>();
  const [sheetVisible, setSheetVisible] = useState(false);
  const { profile, features, settingsMenu } = useSettingsViewModel();
  const { logout } = useAuthViewModel();

  const handleCreateNavigate = useCallback(
    (route: RootStackRouteName) => {
      if (route === ROUTES.CREATE_EVENT) {
        navigation.navigate(ROUTES.CREATE_EVENT);
      }

      if (route === ROUTES.CREATE_PRODUCT) {
        navigation.navigate(ROUTES.CREATE_PRODUCT);
      }

      if (route === ROUTES.CREATE_PAGE) {
        navigation.navigate(ROUTES.CREATE_PAGE);
      }

      if (route === ROUTES.CREATE_GROUP) {
        navigation.navigate(ROUTES.CREATE_GROUP);
      }

      if (route === ROUTES.CREATE_STORY) {
        navigation.navigate(ROUTES.CREATE_STORY);
      }

      if (route === ROUTES.CREATE_POST) {
        navigation.navigate(ROUTES.CREATE_POST);
      }

      if (route === ROUTES.CREATE_POLL) {
        navigation.navigate(ROUTES.CREATE_POLL);
      }

      if (route === ROUTES.CREATE_REEL) {
        navigation.navigate(ROUTES.CREATE_REEL);
      }

      if (route === ROUTES.CREATE_AD) {
        navigation.navigate(ROUTES.CREATE_AD);
      }
    },
    [navigation],
  );

  const handleSettingsItemPress = useCallback(
    async (id: string) => {
      if (id === 'earnings') {
        navigation.navigate(ROUTES.EARNINGS);
      }

      if (id === 'my-info') {
        navigation.navigate(ROUTES.SETTINGS_MY_INFO);
      }

      if (id === 'address') {
        navigation.navigate(ROUTES.SETTINGS_ADDRESS);
      }

      if (id === 'logout') {
        try {
          await logout();
          navigation.reset({
            index: 0,
            routes: [{ name: ROUTES.LOGIN }],
          });
        } catch (error) {
          Alert.alert(
            'Đăng xuất',
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    },
    [logout, navigation],
  );

  const handleFeaturePress = useCallback(
    (id: string) => {
      if (id === 'messages') {
        navigation.navigate(ROUTES.MESSAGES);
      }

      if (id === 'following') {
        navigation.navigate(ROUTES.FOLLOWING);
      }

      if (id === 'memories') {
        navigation.navigate(ROUTES.MEMORIES);
      }

      if (id === 'offers') {
        navigation.navigate(ROUTES.OFFERS);
      }

      if (id === 'photos') {
        navigation.navigate(ROUTES.MY_PHOTOS);
      }

      if (id === 'albums') {
        navigation.navigate(ROUTES.ALBUMS);
      }

      if (id === 'videos') {
        navigation.navigate(ROUTES.MY_VIDEOS);
      }

      if (id === 'saved') {
        navigation.navigate(ROUTES.SAVED_POSTS);
      }

      if (id === 'pages') {
        navigation.navigate(ROUTES.PAGES);
      }

      if (id === 'groups') {
        navigation.navigate(ROUTES.EXPLORE_GROUPS);
      }

      if (id === 'market') {
        navigation.navigate(ROUTES.MARKETPLACE);
      }

      if (id === 'boosted') {
        navigation.navigate(ROUTES.BOOSTED);
      }

      if (id === 'popular') {
        navigation.navigate(ROUTES.POPULAR);
      }

      if (id === 'blogs') {
        navigation.navigate(ROUTES.BLOGS);
      }

      if (id === 'events') {
        navigation.navigate(ROUTES.EVENTS);
      }

      if (id === 'movies') {
        navigation.navigate(ROUTES.MOVIES);
      }

      if (id === 'jobs') {
        navigation.navigate(ROUTES.JOBS);
      }

      if (id === 'funding') {
        navigation.navigate(ROUTES.FUNDING);
      }

      if (id === 'ads') {
        navigation.navigate(ROUTES.ADVERTISING);
      }

      if (id === 'find-friends') {
        navigation.navigate(ROUTES.SEARCH);
      }

      if (id === 'nearby') {
        navigation.navigate(ROUTES.NEARBY_USERS);
      }

      if (id === 'live') {
        navigation.navigate(ROUTES.LIVE);
      }
    },
    [navigation],
  );

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Top App Bar */}
      <View className="surface-topbar flex-row items-center justify-between px-5 py-3">
        <Text className="text-heading text-[#ef4444]">WoWonder</Text>
        <View className="flex-row items-center gap-4">
          <TouchableOpacity
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => navigation.navigate(ROUTES.SEARCH)}
          >
            <Search size={22} color="#0000ff" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => setSheetVisible(true)}
            style={{ transform: [{ rotate: sheetVisible ? '45deg' : '0deg' }] }}
          >
            <Plus size={22} color="#0000ff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-28 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        {profile ? (
          <ProfileHeaderCard
            profile={profile}
            onPress={() => navigation.navigate(ROUTES.PROFILE)}
          />
        ) : (
          // Loading skeleton for profile card
          <View className="surface-card flex-row items-center gap-4 px-5 py-4">
            <View className="h-16 w-16 rounded-full bg-gray-200" />
            <View className="flex-1">
              <View className="h-5 w-32 rounded bg-gray-200 mb-2" />
              <View className="h-4 w-24 rounded bg-gray-200" />
            </View>
          </View>
        )}

        {/* Feature Grid */}
        <View className="mt-5">
          <FeatureGrid
            features={features}
            onFeaturePress={handleFeaturePress}
          />
        </View>

        {/* Go Pro Banner */}
        <View className="mt-5">
          <GoProBanner />
        </View>

        {/* Settings Menu List */}
        <View className="mt-6">
          <SettingsMenuList
            items={settingsMenu}
            onItemPress={handleSettingsItemPress}
          />
        </View>
      </ScrollView>

      <CreateActionSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onNavigate={handleCreateNavigate}
      />
    </SafeAreaView>
  );
}

export default SettingsScreen;
