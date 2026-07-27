import { APP_BRAND_COLOR } from '../theme/appColors';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
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
  withTiming,
} from 'react-native-reanimated';
import { Maximize2, RotateCcw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import {
  PROFILE_AVATAR_ASPECT_RATIO,
  PROFILE_AVATAR_OUTPUT_SIZE,
  PROFILE_COVER_ASPECT_RATIO,
  PROFILE_COVER_OUTPUT_SIZE,
} from '../../application/constants/profileImageGeometry';

export type ImageCropTarget = 'avatar' | 'cover';

export type CropSourceImage = {
  uri: string;
  width?: number;
  height?: number;
  fileName?: string;
  type?: string;
};

export type CroppedImageAsset = {
  uri: string;
  name: string;
  type: 'image/jpeg';
};

type ImageSize = {
  width: number;
  height: number;
};

type ImageCropperModalProps = {
  visible: boolean;
  image: CropSourceImage | null;
  target: ImageCropTarget;
  onCancel: () => void;
  onComplete: (asset: CroppedImageAsset) => void | Promise<void>;
};

const MAX_SCALE = 4;
const CROP_IMAGE_READY_FALLBACK_MS = 1_200;

const clampOnWorklet = (value: number, minimum: number, maximum: number) => {
  'worklet';
  return Math.min(maximum, Math.max(minimum, value));
};

const toFileUri = (uri: string) =>
  uri.startsWith('file://') || uri.startsWith('content://')
    ? uri
    : `file://${uri}`;

export function ImageCropperModal({
  visible,
  image,
  target,
  onCancel,
  onComplete,
}: ImageCropperModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cropViewportRef = useRef<View | null>(null);
  const captureLockRef = useRef(false);
  const imageErrorHandledRef = useRef(false);
  const [sourceSize, setSourceSize] = useState<ImageSize | null>(null);
  const [isImageReady, setImageReady] = useState(false);
  const [isCapturing, setCapturing] = useState(false);

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const pinchStartScale = useSharedValue(1);
  const pinchStartX = useSharedValue(0);
  const pinchStartY = useSharedValue(0);

  const cropAspectRatio =
    target === 'avatar'
      ? PROFILE_AVATAR_ASPECT_RATIO
      : PROFILE_COVER_ASPECT_RATIO;
  const frameSize = useMemo(() => {
    const horizontalPadding = target === 'avatar' ? 40 : 24;
    const maximumWidth = Math.max(220, windowWidth - horizontalPadding);
    const maximumHeight = Math.max(
      220,
      windowHeight - insets.top - insets.bottom - 250,
    );
    const width = Math.min(maximumWidth, maximumHeight * cropAspectRatio);

    return {
      width,
      height: width / cropAspectRatio,
    };
  }, [
    cropAspectRatio,
    insets.bottom,
    insets.top,
    target,
    windowHeight,
    windowWidth,
  ]);

  const baseImageSize = useMemo(() => {
    if (!sourceSize) {
      return frameSize;
    }

    const coverScale = Math.max(
      frameSize.width / sourceSize.width,
      frameSize.height / sourceSize.height,
    );

    return {
      width: sourceSize.width * coverScale,
      height: sourceSize.height * coverScale,
    };
  }, [frameSize, sourceSize]);

  const resetCrop = useCallback(
    (animated = true) => {
      scale.value = animated
        ? withSpring(1, { damping: 18, stiffness: 220 })
        : 1;
      translateX.value = animated
        ? withSpring(0, { damping: 18, stiffness: 220 })
        : 0;
      translateY.value = animated
        ? withSpring(0, { damping: 18, stiffness: 220 })
        : 0;
    },
    [scale, translateX, translateY],
  );

  useEffect(() => {
    let isActive = true;

    setImageReady(false);
    setSourceSize(null);
    imageErrorHandledRef.current = false;
    resetCrop(false);

    if (!visible || !image?.uri) {
      return () => {
        isActive = false;
      };
    }

    if (image.width && image.height && image.width > 0 && image.height > 0) {
      setSourceSize({ width: image.width, height: image.height });
      return () => {
        isActive = false;
      };
    }

    Image.getSize(
      image.uri,
      (width, height) => {
        if (isActive) {
          setSourceSize({ width, height });
        }
      },
      error => {
        console.error('[ImageCropper] Cannot read image size:', error);
        if (isActive) {
          Alert.alert(
            'Không thể mở ảnh',
            'Vui lòng chọn một ảnh khác rồi thử lại.',
          );
          onCancel();
        }
      },
    );

    return () => {
      isActive = false;
    };
  }, [image, onCancel, resetCrop, visible]);

  useEffect(() => {
    if (!visible || !image?.uri || !sourceSize || isImageReady) {
      return;
    }

    // Local profile previews have already been fully decoded and re-encoded
    // by the native preparation module. React Native can occasionally miss an
    // Image onLoad callback while a full-screen Modal is mounting, so never
    // leave crop controls permanently disabled when that event is lost.
    const fallbackTimer = setTimeout(() => {
      if (!imageErrorHandledRef.current) {
        setImageReady(true);
      }
    }, CROP_IMAGE_READY_FALLBACK_MS);

    return () => clearTimeout(fallbackTimer);
  }, [image?.uri, isImageReady, sourceSize, visible]);

  const cropGesture = useMemo(() => {
    const panGesture = Gesture.Pan()
      .enabled(isImageReady)
      .onBegin(() => {
        panStartX.value = translateX.value;
        panStartY.value = translateY.value;
      })
      .onUpdate(event => {
        const maxX = Math.max(
          0,
          (baseImageSize.width * scale.value - frameSize.width) / 2,
        );
        const maxY = Math.max(
          0,
          (baseImageSize.height * scale.value - frameSize.height) / 2,
        );

        translateX.value = clampOnWorklet(
          panStartX.value + event.translationX,
          -maxX,
          maxX,
        );
        translateY.value = clampOnWorklet(
          panStartY.value + event.translationY,
          -maxY,
          maxY,
        );
      });

    const pinchGesture = Gesture.Pinch()
      .enabled(isImageReady)
      .onBegin(() => {
        pinchStartScale.value = scale.value;
        pinchStartX.value = translateX.value;
        pinchStartY.value = translateY.value;
      })
      .onUpdate(event => {
        const nextScale = clampOnWorklet(
          pinchStartScale.value * event.scale,
          1,
          MAX_SCALE,
        );
        const scaleRatio = nextScale / pinchStartScale.value;
        const focalX = event.focalX - frameSize.width / 2;
        const focalY = event.focalY - frameSize.height / 2;
        const maxX = Math.max(
          0,
          (baseImageSize.width * nextScale - frameSize.width) / 2,
        );
        const maxY = Math.max(
          0,
          (baseImageSize.height * nextScale - frameSize.height) / 2,
        );

        scale.value = nextScale;
        translateX.value = clampOnWorklet(
          pinchStartX.value + focalX * (1 - scaleRatio),
          -maxX,
          maxX,
        );
        translateY.value = clampOnWorklet(
          pinchStartY.value + focalY * (1 - scaleRatio),
          -maxY,
          maxY,
        );
      });

    const doubleTapGesture = Gesture.Tap()
      .enabled(isImageReady)
      .numberOfTaps(2)
      .onEnd(() => {
        if (scale.value > 1.05) {
          scale.value = withSpring(1, { damping: 18, stiffness: 220 });
          translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
          translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
          return;
        }

        scale.value = withSpring(2, { damping: 18, stiffness: 220 });
        translateX.value = withTiming(0, { duration: 160 });
        translateY.value = withTiming(0, { duration: 160 });
      });

    return Gesture.Simultaneous(panGesture, pinchGesture, doubleTapGesture);
  }, [
    baseImageSize.height,
    baseImageSize.width,
    frameSize.height,
    frameSize.width,
    isImageReady,
    panStartX,
    panStartY,
    pinchStartScale,
    pinchStartX,
    pinchStartY,
    scale,
    translateX,
    translateY,
  ]);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handleImageLoadError = useCallback(
    (error: unknown) => {
      if (imageErrorHandledRef.current) return;

      imageErrorHandledRef.current = true;
      console.error('[ImageCropper] Cannot render selected image:', error);
      Alert.alert(
        'Không thể mở ảnh',
        'Ảnh đã chọn không thể tải để cắt. Vui lòng chọn một ảnh khác.',
        [{ text: 'Chọn lại', onPress: onCancel }],
      );
    },
    [onCancel],
  );

  const handleComplete = useCallback(async () => {
    if (
      !cropViewportRef.current ||
      !image?.uri ||
      !isImageReady ||
      captureLockRef.current
    ) {
      return;
    }

    captureLockRef.current = true;
    setCapturing(true);

    try {
      const outputSize =
        target === 'avatar'
          ? PROFILE_AVATAR_OUTPUT_SIZE
          : PROFILE_COVER_OUTPUT_SIZE;
      const croppedUri = await captureRef(cropViewportRef, {
        format: 'jpg',
        quality: 0.88,
        result: 'tmpfile',
        width: outputSize.width,
        height: outputSize.height,
      });

      await onComplete({
        uri: toFileUri(croppedUri),
        name: `${target}_crop_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });
    } catch (error) {
      console.error('[ImageCropper] Cannot export cropped image:', error);
      Alert.alert('Không thể cắt ảnh', 'Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      captureLockRef.current = false;
      setCapturing(false);
    }
  }, [image?.uri, isImageReady, onComplete, target]);

  const isAvatar = target === 'avatar';

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'android' ? 'none' : 'fade'}
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={isCapturing ? undefined : onCancel}
    >
      <GestureHandlerRootView style={styles.root}>
        <View
          style={[
            styles.header,
            {
              paddingTop: Math.max(insets.top, 12) + 8,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.78}
            disabled={isCapturing}
            onPress={onCancel}
          >
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>

          <View style={styles.titleWrap}>
            <Text style={styles.title}>
              {isAvatar ? 'Cắt ảnh đại diện' : 'Cắt ảnh bìa'}
            </Text>
            <Text style={styles.subtitle}>
              {isAvatar ? 'Khung vuông 1:1' : 'Khung ngang 16:9'}
            </Text>
          </View>

          <TouchableOpacity
            style={[
              styles.doneButton,
              (!isImageReady || isCapturing) && styles.doneButtonDisabled,
            ]}
            activeOpacity={0.82}
            disabled={!isImageReady || isCapturing}
            onPress={handleComplete}
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.doneText}>Xong</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View
            style={[
              styles.cropFrameShell,
              {
                width: frameSize.width,
                height: frameSize.height,
              },
            ]}
          >
            <GestureDetector gesture={cropGesture}>
              <View
                style={[
                  styles.cropViewport,
                  {
                    width: frameSize.width,
                    height: frameSize.height,
                  },
                ]}
              >
                <View
                  ref={cropViewportRef}
                  collapsable={false}
                  style={styles.cropCaptureSurface}
                >
                  {image?.uri && sourceSize ? (
                    <Animated.View
                      style={[
                        styles.cropImageTransform,
                        {
                          width: baseImageSize.width,
                          height: baseImageSize.height,
                        },
                        animatedImageStyle,
                      ]}
                    >
                      <Image
                        key={image.uri}
                        source={{ uri: image.uri }}
                        resizeMode="cover"
                        resizeMethod={
                          Platform.OS === 'android' ? 'scale' : 'resize'
                        }
                        fadeDuration={0}
                        onLoad={() => setImageReady(true)}
                        onLoadEnd={() => {
                          if (!imageErrorHandledRef.current) {
                            setImageReady(true);
                          }
                        }}
                        onError={handleImageLoadError}
                        style={styles.cropImage}
                      />
                    </Animated.View>
                  ) : null}

                  {!isImageReady ? (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="large" color="#FFFFFF" />
                    </View>
                  ) : null}
                </View>
              </View>
            </GestureDetector>
            <View pointerEvents="none" style={styles.cropGuideOverlay}>
              <View
                style={[styles.gridLineVertical, styles.gridLineFirstColumn]}
              />
              <View
                style={[styles.gridLineVertical, styles.gridLineSecondColumn]}
              />
              <View
                style={[styles.gridLineHorizontal, styles.gridLineFirstRow]}
              />
              <View
                style={[styles.gridLineHorizontal, styles.gridLineSecondRow]}
              />
              <View
                style={[
                  styles.cropOutline,
                  isAvatar && styles.avatarCropOutline,
                ]}
              />
            </View>
          </View>

          <View style={styles.gestureHint}>
            <Maximize2 size={16} color="#CBD5E1" />
            <Text style={styles.gestureHintText}>
              Kéo để căn ảnh · Chụm hai ngón để phóng to
            </Text>
          </View>

          <TouchableOpacity
            style={styles.resetButton}
            activeOpacity={0.78}
            disabled={!isImageReady || isCapturing}
            onPress={() => resetCrop(true)}
          >
            <RotateCcw size={16} color="#FFFFFF" />
            <Text style={styles.resetText}>Đặt lại vị trí</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: Math.max(insets.bottom, 14) }} />
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#070B14',
  },
  header: {
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  headerButton: {
    minWidth: 62,
    minHeight: 42,
    justifyContent: 'center',
  },
  cancelText: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '700',
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  subtitle: {
    marginTop: 2,
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  doneButton: {
    minWidth: 62,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_BRAND_COLOR,
    shadowColor: APP_BRAND_COLOR,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  doneButtonDisabled: {
    opacity: 0.48,
    shadowOpacity: 0,
    elevation: 0,
  },
  doneText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  cropFrameShell: {
    position: 'relative',
    backgroundColor: '#111827',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 16,
  },
  cropViewport: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#111827',
  },
  cropCaptureSurface: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
  },
  cropImageTransform: {
    flexShrink: 0,
  },
  cropImage: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    zIndex: 5,
  },
  cropGuideOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    elevation: 20,
  },
  cropOutline: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.96)',
  },
  avatarCropOutline: {
    borderRadius: 9999,
    borderWidth: 2.5,
  },
  gridLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  gridLineFirstColumn: {
    left: '33.333%',
  },
  gridLineSecondColumn: {
    left: '66.666%',
  },
  gridLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  gridLineFirstRow: {
    top: '33.333%',
  },
  gridLineSecondRow: {
    top: '66.666%',
  },
  gestureHint: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  gestureHintText: {
    marginLeft: 8,
    color: '#CBD5E1',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  resetButton: {
    height: 42,
    marginTop: 16,
    paddingHorizontal: 18,
    borderRadius: 21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  resetText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
