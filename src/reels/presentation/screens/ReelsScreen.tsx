import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { ChevronLeft, MoreHorizontal, Heart, MessageCircle, Share2, Disc } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../../../navigation/constants/routes';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ReelsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Background Image/Video Placeholder */}
      <Image 
        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAES61WhnrlYcVvFVVum7yDn8D7wCpXyB8XVfgEc-IlcLmRDH-BuyBTo94el76U1n0wVo-PaW_SyhlEojBlhdliVPJMbXNIdFeCYoiJ08bA5dQTSGlMSI8xeeGBMg8CZ9sMe7wJAExch9rI65h77bjHue_ByQTIJKkVJ601RNgHlk5A1BubWL_AMgxPx-E8VvpuRtWyWsSpkyrxpAwJ8SFkyt3ZLMTG1pOjWj8uPJJioQ1olTUZzYcE_UQcAbX6z-OqnMYMJUDtb--X' }}
        className="absolute inset-0 w-full h-full"
        style={{ resizeMode: 'cover' }}
      />

      {/* Top Header Overlay - Transparent */}
      <View 
        className="absolute top-0 left-0 w-full z-10 px-4 pb-4 flex-row justify-between items-center bg-transparent"
        style={{ paddingTop: Math.max(insets.top, 12) }}
      >
        <TouchableOpacity className="p-2" onPress={() => navigation.navigate(ROUTES.FEED)}>
          <ChevronLeft color="#fff" size={28} style={styles.iconShadow} />
        </TouchableOpacity>
        <Text className="text-white font-semibold text-lg tracking-wide" style={styles.textShadow}>Reels</Text>
        <TouchableOpacity className="p-2">
          <MoreHorizontal color="#fff" size={28} style={styles.iconShadow} />
        </TouchableOpacity>
      </View>

      {/* Main Content Overlay - Transparent background, normal padding bottom (tab bar is hidden) */}
      <View className="absolute bottom-0 left-0 w-full z-10 flex-col justify-end px-4 pb-6 pt-20 bg-transparent" pointerEvents="box-none">
        <View className="flex-row justify-between items-end w-full" pointerEvents="box-none">
          
          {/* Left Column - User Info & Caption */}
          <View className="flex-1 pr-12 flex-col gap-3">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-gray-800">
                <Image 
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC6A7SktZOmPItFw_ruagQpAw7MdT0XE2tNiLM-CdT6bkVBnjZiiTvUmk4w3hNHg23XcC6M0NQYkFeH5TuknT4CQRGOSKsgFgzic09tO1IzRdM6jV5v-8GvZQFpTRHW0yZcWdXi3_plf9rQDc3yMEUvNjsHSmSIM2L3GUQ-qNZj_vIAbA_HOZ_U0Xff0G7NxeuIUAZeElnK-fKzPYCARSZ-jK_ADzrj7Yfq3mKR5Nx4t892nA6-EsuamNHesCc-5aVvp9s6pUGyo6vX' }}
                  className="w-full h-full"
                />
              </View>
              <Text className="font-bold text-base text-white tracking-wide" style={styles.textShadow}>vidya bala</Text>
              <TouchableOpacity className="bg-[#0000ff] ml-2 px-4 py-1.5 rounded-full">
                <Text className="text-white text-xs font-semibold">Follow</Text>
              </TouchableOpacity>
            </View>

            <View className="max-h-24 overflow-hidden relative">
              <Text className="text-sm text-gray-100 leading-snug" numberOfLines={2} style={styles.textShadow}>
                One of the most important aspects of legal paperwork is document validation. In India, stamp paper is vital for this process.
              </Text>
              <TouchableOpacity className="mt-1">
                <Text className="text-gray-300 font-medium underline">Read More</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Right Column - Actions */}
          <View className="flex-col items-center gap-6 pb-2 pl-2">
            <TouchableOpacity className="items-center gap-1 active:scale-95">
              <View className="bg-black/30 p-2.5 rounded-full">
                <Heart color="#fff" size={28} style={styles.iconShadow} />
              </View>
              <Text className="text-xs font-semibold text-white mt-1" style={styles.textShadow}>12.4K</Text>
            </TouchableOpacity>

            <TouchableOpacity className="items-center gap-1 active:scale-95">
              <View className="bg-black/30 p-2.5 rounded-full">
                <MessageCircle color="#fff" size={28} style={styles.iconShadow} />
              </View>
              <Text className="text-xs font-semibold text-white mt-1" style={styles.textShadow}>342</Text>
            </TouchableOpacity>

            <TouchableOpacity className="items-center gap-1 active:scale-95">
              <View className="bg-black/30 p-2.5 rounded-full">
                <Share2 color="#fff" size={28} style={styles.iconShadow} />
              </View>
              <Text className="text-xs font-semibold text-white mt-1" style={styles.textShadow}>Share</Text>
            </TouchableOpacity>

            <View className="w-10 h-10 rounded-full border-2 border-gray-500 overflow-hidden mt-2 flex items-center justify-center bg-gray-900">
              <Disc color="#d1d5db" size={20} />
            </View>
          </View>

        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  iconShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 5,
  },
  textShadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  }
});
