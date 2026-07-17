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

  const cropAspectRatio = target === 'avatar' ? 1 : 16 / 9;
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

  const handleComplete = useCallback(async () => {
    if (
      !cropViewportRef.current ||
      !image?.uri ||
      !isImageReady ||
      isCapturing
    ) {
      return;
    }

    setCapturing(true);

    try {
      const outputSize =
        target === 'avatar'
          ? { width: 1080, height: 1080 }
          : { width: 1600, height: 900 };
      const croppedUri = await captureRef(cropViewportRef, {
        format: 'jpg',
        quality: 0.92,
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
      setCapturing(false);
    }
  }, [image?.uri, isCapturing, isImageReady, onComplete, target]);

  const isAvatar = target === 'avatar';

  return (
    <Modal
      visible={visible}
      animationType="fade"
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
                ref={cropViewportRef}
                collapsable={false}
                renderToHardwareTextureAndroid
                style={[
                  styles.cropViewport,
                  {
                    width: frameSize.width,
                    height: frameSize.height,
                  },
                ]}
              >
                {image?.uri && sourceSize ? (
                  <Animated.Image
                    source={{ uri: image.uri }}
                    resizeMode="cover"
                    onLoad={() => setImageReady(true)}
                    style={[
                      styles.cropImage,
                      {
                        width: baseImageSize.width,
                        height: baseImageSize.height,
                        left: (frameSize.width - baseImageSize.width) / 2,
                        top: (frameSize.height - baseImageSize.height) / 2,
                      },
                      animatedImageStyle,
                    ]}
                  />
                ) : null}

                {!isImageReady ? (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  </View>
                ) : null}
              </View>
            </GestureDetector>

            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
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
    backgroundColor: '#2563EB',
    shadowColor: '#2563EB',
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
  cropImage: {
    position: 'absolute',
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
