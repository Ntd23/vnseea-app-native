// Description: Full-screen cover photo viewer with zoom support and cover change functionality.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Camera, Download } from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { useProfileViewModel } from '../../application/view-models/useProfileViewModel';
import { launchImageLibrary } from 'react-native-image-picker';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type CoverRoute = RouteProp<RootStackParamList, typeof ROUTES.COVER_VIEWER>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type Props = {
  route?: CoverRoute;
  navigation?: Nav;
};

function CoverViewerScreen({ route, navigation }: Props) {
  const nav = navigation ?? useNavigation<Nav>();
  const screenRoute = route ?? useRoute<CoverRoute>();

  const { coverUrl, userName, userId } = screenRoute.params;

  const { updateCover } = useProfileViewModel();
  const [isLoading, setIsLoading] = useState(false);

  // Zoom animation values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Pinch to zoom gesture
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else if (scale.value > 4) {
        scale.value = withSpring(4);
        savedScale.value = 4;
      } else {
        savedScale.value = scale.value;
      }
    });

  // Pan gesture (only when zoomed in)
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (scale.value > 1) {
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  // Double tap to zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withSpring(2);
        savedScale.value = 2;
      }
    });

  const composed = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleClose = useCallback(() => {
    nav.goBack();
  }, [nav]);

  const handleChangeCover = useCallback(async () => {
    Alert.alert(
      'Đổi ảnh bìa',
      'Chọn ảnh bìa mới từ thư viện',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Chọn ảnh',
          onPress: async () => {
            try {
              const result = await launchImageLibrary({
                mediaType: 'photo',
                selectionLimit: 1,
                quality: 0.8,
                includeBase64: false,
              });

              if (result.didCancel || result.errorCode) {
                return;
              }

              const asset = result.assets?.[0];
              if (!asset?.uri) {
                Alert.alert('Lỗi', 'Không chọn được ảnh');
                return;
              }

              setIsLoading(true);
              const success = await updateCover(asset.uri);

              if (success) {
                Alert.alert('Thành công', 'Đã cập nhật ảnh bìa!');
                // Reload profile to get new cover
                nav.goBack();
              } else {
                Alert.alert('Lỗi', 'Không thể cập nhật ảnh bìa. Vui lòng thử lại.');
              }
            } catch (error) {
              console.error('[CoverViewer] Change cover error:', error);
              Alert.alert('Lỗi', 'Đã xảy ra lỗi khi đổi ảnh bìa.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ],
    );
  }, [nav, updateCover]);

  const handleDownload = useCallback(() => {
    Alert.alert('Thông báo', 'Tính năng tải ảnh sẽ sớm được cập nhật!');
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {userName || 'Ảnh bìa'}
            </Text>
          </View>

          <View style={styles.headerActions}>
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleChangeCover}
                  activeOpacity={0.8}
                >
                  <Camera size={22} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={handleDownload}
                  activeOpacity={0.8}
                >
                  <Download size={22} color="#FFFFFF" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Image Viewer with Gestures */}
        <GestureDetector gesture={composed}>
          <View style={styles.imageContainer}>
            <Animated.Image
              source={{ uri: coverUrl }}
              style={[styles.image, animatedImageStyle]}
              resizeMode="contain"
              onLoadStart={() => console.log('[CoverViewer] Loading...')}
              onLoadEnd={() => console.log('[CoverViewer] Loaded')}
            />
          </View>
        </GestureDetector>

        {/* Hint */}
        <View style={styles.hintContainer}>
          <Text style={styles.hintText}>
            Chạm hai lần để phóng to • Kéo để di chuyển
          </Text>
        </View>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 8,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  hintContainer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },
});

export default CoverViewerScreen;
