import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

export default function MemoriesScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView className="flex-1 bg-[#f9f9fc]" edges={['top']}>
      <FocusAwareStatusBar barStyle="light-content" backgroundColor={APP_BRAND_COLOR} />
      
      {/* TopAppBar */}
      <View className="h-16 flex-row items-center justify-between px-6 bg-brand z-50 relative">
        <TouchableOpacity 
          className="p-2 -ml-2 rounded-full active:bg-white/10 z-10" 
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft color="#ffffff" size={24} />
        </TouchableOpacity>
        
        <View className="absolute left-0 w-full h-full flex-row items-center justify-center" pointerEvents="none">
          <Text className="text-white font-semibold text-lg">
            Kỷ niệm
          </Text>
        </View>
        
        <View className="w-10" />
      </View>

      {/* Main Content Area (Empty State) */}
      <View className="flex-1 items-center justify-center px-6 pb-20">
        <View className="w-full max-w-sm flex-col items-center">
          
          {/* Empty State Illustration */}
          <View className="w-48 h-48 mb-6 bg-[#f3f3f6] rounded-full overflow-hidden items-center justify-center shadow-sm">
            <Image 
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDKZ45gyWWEgB841-qRJJ-0a0QDHZSv7d87M81iSJp4Cy_L-cIDZR_QY1UHu0HiJ_zvrKofQ_Hq2wD9xpH035U3WqNYOYcsvT15gX-xVXJWqeLEN85hCvZdozd-v4QcEzXHptzGktrSbsC19k20xYueDbH_RlNNx89IGhDhq4VFAFEN-n_nN64kN5qscjDOvlFtvCjumNiXGcvmXFQAzVDCvkoRqHXEK__KMFf77K54ejerGVfapzfHpuXNoyEd9RH_TD1JagyqTIm6' }}
              className="w-full h-full opacity-60"
              style={{ resizeMode: 'cover' }}
            />
          </View>
          
          {/* Empty State Typography */}
          <Text className="text-2xl font-bold text-[#1a1c1e] mb-4 text-center">
            Rất tiếc! Không có kỷ niệm nào
          </Text>
          <Text className="text-base text-[#454558] text-center leading-6">
            Cảm ơn bạn đã ghé thăm. Hiện tại chưa có kỷ niệm nào để hiển thị, chúng tôi sẽ thông báo cho bạn khi có những khoảnh khắc đáng nhớ.
          </Text>
          
        </View>
      </View>
    </SafeAreaView>
  );
}
