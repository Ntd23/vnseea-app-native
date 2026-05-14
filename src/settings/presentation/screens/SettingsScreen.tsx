import React, {useCallback} from 'react';
import {ScrollView, StatusBar, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Plus, Search} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../navigation/AppNavigator';
import {ROUTES} from '../../../navigation/constants/routes';
import {useSettingsViewModel} from '../../application/view-models/useSettingsViewModel';
import ProfileHeaderCard from '../components/ProfileHeaderCard';
import FeatureGrid from '../components/FeatureGrid';
import GoProBanner from '../components/GoProBanner';
import SettingsMenuList from '../components/SettingsMenuList';

type SettingsNav = NativeStackNavigationProp<RootStackParamList>;

function SettingsScreen() {
  const navigation = useNavigation<SettingsNav>();
  const {profile, features, settingsMenu} = useSettingsViewModel();

  const handleSettingsItemPress = useCallback(
    (id: string) => {
      if (id === 'earnings') {
        navigation.navigate(ROUTES.EARNINGS);
      }
      // TODO: handle other settings items
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
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Search size={22} color="#0000ff" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Plus size={22} color="#0000ff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8 pt-4"
        showsVerticalScrollIndicator={false}>
        {/* Profile Header Card */}
        <ProfileHeaderCard profile={profile} />

        {/* Feature Grid */}
        <View className="mt-5">
          <FeatureGrid features={features} />
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
    </SafeAreaView>
  );
}

export default SettingsScreen;
