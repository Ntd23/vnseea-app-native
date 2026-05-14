// Description: Renders a lightweight Explore route placeholder inside the main tab shell.
import React from 'react';
import { StatusBar, Text, View } from 'react-native';
import { Compass, Search } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function ExploreScreen() {
  return (
    <SafeAreaView className="flex-1 surface-base">
      <StatusBar barStyle="dark-content" backgroundColor="#F1F4FB" />
      <View className="surface-topbar h-16 flex-row items-center justify-between px-4">
        <Text className="text-heading">Khám phá</Text>
        <Search size={22} color="#0000FF" />
      </View>
      <View className="flex-1 items-center justify-center px-6">
        <View className="icon-chip h-20 w-20 items-center justify-center">
          <Compass size={40} color="#0000FF" />
        </View>
        <Text className="mt-5 text-center text-heading">Explore</Text>
        <Text className="mt-2 text-center text-body-secondary">
          Màn Khám phá sẽ được thiết kế theo Stitch khi có screen reference.
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default ExploreScreen;
