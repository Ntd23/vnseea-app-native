// Description: Full-screen avatar viewer with change avatar functionality (Facebook-style).
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, Camera } from 'lucide-react-native';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { RouteProp } from '@react-navigation/native';
import { useProfileViewModel } from '../../application/view-models/useProfileViewModel';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type AvatarViewerNav = NativeStackNavigationProp<RootStackParamList>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const FALLBACK_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBg12HbWQ9COz6EW-AyHRwh6TTRPdTun5HWxmzi1GHtkTwHjsF2VhXQV6yg-mCV0YYTXBDcEOCpZdcTGiCK1PpdUNPDQs6XTApo0nb_7Vi7IJPOfkXwbA1cq6d18Fft2V5ELBI4ZKLT6lvpj4O-9EBj3u3QfGt-Dzy_wf-DNRLwVAEeuaiEJ4B2Fvch4B0S9tk5tMCvbYQwuzGl0ttLC2hVIJh1Oj6Dn4dp6ueFANa1Yxy__ZIQLHKmtsMh2U8NBz0DLPHRlOZOzF4';

export default function AvatarViewerScreen() {
  const navigation = useNavigation<AvatarViewerNav>();
  const route = useRoute();
  const { updateAvatar } = useProfileViewModel();

  const session = sessionStorage.getSession();
  const currentUserId = session?.userId;

  // Get params from route - use any to handle dynamic params
  const params = route.params as any;
  const avatarUrl = params?.avatarUrl ?? FALLBACK_AVATAR;
  const userName = params?.userName ?? 'Người dùng';
  const profileUserId = params?.userId;

  // Check if this is own profile
  const isOwnProfile = !profileUserId || String(profileUserId) === String(currentUserId);

  const [isLoading, setIsLoading] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState(avatarUrl);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleChangeAvatar = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 800,
        maxHeight: 800,
        selectionLimit: 1,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        Alert.alert('Lỗi', result.errorMessage || 'Không thể mở thư viện ảnh');
        return;
      }

      const asset: Asset | undefined = result.assets?.[0];

      if (!asset?.uri) {
        Alert.alert('Lỗi', 'Vui lòng chọn một ảnh');
        return;
      }

      // Show confirmation
      Alert.alert(
        'Thay đổi ảnh đại diện',
        'Bạn có chắc muốn thay đổi ảnh đại diện không?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Thay đổi',
            onPress: () => uploadAvatar(asset),
          },
        ]
      );
    } catch (error) {
      console.error('[AvatarViewer] Error picking image:', error);
      Alert.alert('Lỗi', 'Đã xảy ra lỗi khi chọn ảnh');
    }
  };

  const uploadAvatar = async (asset: Asset) => {
    if (!asset.uri) return;

    setIsLoading(true);

    try {
      const success = await updateAvatar(asset.uri);

      if (success) {
        setLocalAvatarUrl(asset.uri);
        Alert.alert('Thành công', 'Ảnh đại diện đã được thay đổi');
      }
    } catch (error) {
      console.error('[AvatarViewer] Error uploading avatar:', error);
      Alert.alert('Lỗi', 'Không thể thay đổi ảnh đại diện. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-black">
      <FocusAwareStatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <SafeAreaView className="absolute top-0 left-0 right-0 z-10" edges={['top']}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full bg-black/40"
            activeOpacity={0.8}
            onPress={handleBack}
          >
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View className="flex-1 items-center">
            <Text className="text-[16px] font-semibold text-white">{userName}</Text>
            <Text className="text-[12px] text-white/70">Ảnh đại diện</Text>
          </View>

          <View className="h-10 w-10" />
        </View>
      </SafeAreaView>

      {/* Avatar Image */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={styles.scrollContent}
        maximumZoomScale={3}
        minimumZoomScale={1}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        centerContent
      >
        <Image
          source={{ uri: localAvatarUrl }}
          className="w-full"
          style={styles.avatarImage}
          resizeMode="contain"
        />
      </ScrollView>

      {/* Bottom Action Bar */}
      {isOwnProfile && (
        <SafeAreaView className="absolute bottom-0 left-0 right-0" edges={['bottom']}>
          <View className="bg-black/80 px-4 py-4">
            <TouchableOpacity
              className="flex-row items-center justify-center rounded-lg bg-white/10 px-4 py-3"
              activeOpacity={0.8}
              onPress={handleChangeAvatar}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" className="mr-2" />
              ) : (
                <Camera size={20} color="#FFFFFF" className="mr-2" />
              )}
              <Text className="text-[16px] font-semibold text-white">
                {isLoading ? 'Đang tải lên...' : 'Thay đổi ảnh đại diện'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: SCREEN_HEIGHT,
  },
  avatarImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
});
