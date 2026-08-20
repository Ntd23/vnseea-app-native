import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { ArrowLeft, Camera, ImageOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

export type PageMediaKind = 'avatar' | 'cover';

type Props = {
  visible: boolean;
  uri: string | null | undefined;
  kind: PageMediaKind;
  pageTitle: string;
  canEdit?: boolean;
  isUploading?: boolean;
  onClose: () => void;
  onChange?: () => void;
};

const MAX_ZOOM = 4;

const COPY = {
  vi: {
    avatarTitle: 'Ảnh đại diện',
    coverTitle: 'Ảnh bìa',
    back: 'Quay lại',
    changeAvatar: 'Thay ảnh đại diện',
    changeCover: 'Thay ảnh bìa',
    loading: 'Đang tải ảnh',
    loadError: 'Không tải được ảnh',
    hint: 'Chạm hai lần để phóng to • Kéo để di chuyển',
  },
  en: {
    avatarTitle: 'Profile picture',
    coverTitle: 'Cover photo',
    back: 'Back',
    changeAvatar: 'Change profile picture',
    changeCover: 'Change cover photo',
    loading: 'Loading image',
    loadError: 'Could not load image',
    hint: 'Double tap to zoom • Drag to move',
  },
};

export function PageMediaViewerModal({
  visible,
  uri,
  kind,
  pageTitle,
  canEdit = false,
  isUploading = false,
  onClose,
  onChange,
}: Props) {
  const language = useAppLanguage();
  const copy = language === 'en' ? COPY.en : COPY.vi;
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const imageSource = useMemo(() => (uri ? { uri } : undefined), [uri]);

  const androidStatusBarHeight =
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const topSafeInset = Math.max(insets.top, androidStatusBarHeight, 12);
  const bottomSafeInset = Math.max(insets.bottom, 12);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;

    setIsLoading(true);
    setHasError(false);
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [
    kind,
    savedScale,
    savedTranslateX,
    savedTranslateY,
    scale,
    translateX,
    translateY,
    uri,
    visible,
  ]);

  const resetTransform = () => {
    'worklet';
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  const pinchGesture = Gesture.Pinch()
    .onUpdate(event => {
      'worklet';
      scale.value = Math.max(
        1,
        Math.min(savedScale.value * event.scale, MAX_ZOOM),
      );
    })
    .onEnd(() => {
      'worklet';
      if (scale.value <= 1.01) {
        resetTransform();
        return;
      }

      savedScale.value = Math.min(scale.value, MAX_ZOOM);
    });

  const panGesture = Gesture.Pan()
    .onUpdate(event => {
      'worklet';
      if (scale.value <= 1.01) return;

      const maxTranslateX = (width * (scale.value - 1)) / 2;
      const maxTranslateY = (height * (scale.value - 1)) / 2;
      translateX.value = Math.max(
        -maxTranslateX,
        Math.min(
          savedTranslateX.value + event.translationX,
          maxTranslateX,
        ),
      );
      translateY.value = Math.max(
        -maxTranslateY,
        Math.min(
          savedTranslateY.value + event.translationY,
          maxTranslateY,
        ),
      );
    })
    .onEnd(() => {
      'worklet';
      if (scale.value <= 1.01) {
        resetTransform();
        return;
      }

      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDistance(20)
    .onEnd(() => {
      'worklet';
      if (scale.value > 1.01) {
        resetTransform();
        return;
      }

      scale.value = withSpring(2);
      savedScale.value = 2;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture,
  );

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const mediaTitle =
    kind === 'avatar' ? copy.avatarTitle : copy.coverTitle;
  const changeLabel =
    kind === 'avatar' ? copy.changeAvatar : copy.changeCover;

  return (
    <Modal
      visible={visible && Boolean(uri)}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent={Platform.OS === 'android'}
      hardwareAccelerated
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.container}>
        <FocusAwareStatusBar
          barStyle="light-content"
          backgroundColor="#000000"
          translucent
        />

        <GestureDetector gesture={composedGesture}>
          <View style={styles.imageViewport}>
            {imageSource && !hasError ? (
              <Animated.Image
                key={`${kind}:${uri}`}
                source={imageSource}
                style={[
                  styles.image,
                  { width, height },
                  animatedImageStyle,
                ]}
                resizeMode="contain"
                onLoad={() => {
                  setIsLoading(false);
                  setHasError(false);
                }}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              />
            ) : (
              <View style={styles.errorState}>
                <ImageOff size={38} color="rgba(255,255,255,0.72)" />
                <Text
                  style={styles.errorText}
                  maxFontSizeMultiplier={1.2}
                >
                  {copy.loadError}
                </Text>
              </View>
            )}

            {isLoading && !hasError ? (
              <View
                style={styles.loadingState}
                accessibilityLabel={copy.loading}
              >
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            ) : null}
          </View>
        </GestureDetector>

        <View style={[styles.header, { paddingTop: topSafeInset + 6 }]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={copy.back}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.headerButton}
            onPress={onClose}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text
              style={styles.headerTitle}
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
            >
              {pageTitle}
            </Text>
            <Text
              style={styles.headerSubtitle}
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
            >
              {mediaTitle}
            </Text>
          </View>

          <View style={styles.headerButtonPlaceholder} />
        </View>

        <View
          pointerEvents="box-none"
          style={[styles.footer, { paddingBottom: bottomSafeInset + 12 }]}
        >
          <Text style={styles.hintText} maxFontSizeMultiplier={1.15}>
            {copy.hint}
          </Text>

          {canEdit && onChange ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={changeLabel}
              activeOpacity={0.82}
              disabled={isUploading}
              style={styles.changeButton}
              onPress={onChange}
            >
              {isUploading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Camera size={20} color="#FFFFFF" />
              )}
              <Text
                style={styles.changeButtonText}
                numberOfLines={1}
                maxFontSizeMultiplier={1.15}
              >
                {changeLabel}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  imageViewport: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  image: {
    position: 'absolute',
  },
  loadingState: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    marginTop: 12,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    fontWeight: '600',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingBottom: 10,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  headerButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  headerTitleContainer: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    marginTop: 1,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '500',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  hintText: {
    color: 'rgba(255,255,255,0.64)',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  changeButton: {
    width: '100%',
    maxWidth: 420,
    minHeight: 48,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.24)',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 16,
  },
  changeButtonText: {
    minWidth: 0,
    marginLeft: 9,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
