// Description: Renders a lightweight Reels route placeholder inside the main tab shell.
import React from 'react';
import { StatusBar, Text, View } from 'react-native';
import { PlaySquare, Plus } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function ReelsScreen() {
  return (
    <SafeAreaView className="flex-1 surface-base">
      <StatusBar barStyle="dark-content" backgroundColor="#F1F4FB" />
      <View className="surface-topbar h-16 flex-row items-center justify-between px-4">
        <Text className="text-heading">Reel</Text>
        <Plus size={22} color="#0000FF" />
      </View>
      <View className="flex-1 items-center justify-center px-6">
        <View className="icon-chip h-20 w-20 items-center justify-center">
          <PlaySquare size={40} color="#0000FF" />
        </View>
        <Text className="mt-5 text-center text-heading">Reel</Text>
        <Text className="mt-2 text-center text-body-secondary">
          Màn video ngắn sẽ được hoàn thiện khi có Stitch screen riêng.
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default ReelsScreen;
