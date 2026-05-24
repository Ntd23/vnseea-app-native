// Description: Screen cho phép người dùng chọn hoặc quay video, xem trước, rồi đăng lên dưới dạng Reel.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import type { Asset, ImagePickerResponse } from 'react-native-image-picker';
import VideoPlayer from 'react-native-video';
import {
  AtSign,
  ChevronLeft,
  Film,
  Globe,
  Hash,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Users,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useCreateReelViewModel } from '../../application/view-models/useCreateReelViewModel';
import type { ReelPrivacy } from '../../domain/types/reels.types';

const PRIVACY_OPTIONS = [
  { label: 'Công khai', value: 0 as ReelPrivacy, icon: Globe },
  { label: 'Bạn bè', value: 1 as ReelPrivacy, icon: Users },
  { label: 'Chỉ mình tôi', value: 2 as ReelPrivacy, icon: Lock },
];

// Library — keep original file, no re-encode
const VIDEO_LIBRARY_OPTIONS = {
  mediaType: 'video' as const,
  durationLimit: 60,
  includeBase64: false,
  includeExtra: false,
  selectionLimit: 1,
} as const;

// Camera — record at high quality
const VIDEO_CAMERA_OPTIONS = {
  mediaType: 'video' as const,
  durationLimit: 60,
  includeBase64: false,
  videoQuality: 'high' as const,
  cameraType: 'back' as const,
  saveToPhotos: true,
} as const;

const MAX_REEL_DURATION_SECONDS = 60;
const MAX_REEL_FILE_SIZE_BYTES = 300 * 1024 * 1024;

function getVideoAsset(response: ImagePickerResponse) {
  if (response.didCancel || response.errorCode || !response.assets?.length) {
    return null;
  }
  return response.assets[0];
}

function buildVideoFileName(asset: Asset) {
  if (asset.fileName) {
    return asset.fileName;
  }

  const extension = asset.type?.split('/')[1] || 'mp4';
  return `reel-${Date.now()}.${extension}`;
}

/** Request CAMERA + RECORD_AUDIO runtime permissions on Android. */
async function requestCameraPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  try {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);

    const cameraGranted =
      results[PermissionsAndroid.PERMISSIONS.CAMERA] ===
      PermissionsAndroid.RESULTS.GRANTED;
    const audioGranted =
      results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
      PermissionsAndroid.RESULTS.GRANTED;

    if (!cameraGranted || !audioGranted) {
      const neverAskCamera =
        results[PermissionsAndroid.PERMISSIONS.CAMERA] ===
        PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;
      const neverAskAudio =
        results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
        PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN;

      if (neverAskCamera || neverAskAudio) {
        Alert.alert(
          'Cần cấp quyền',
          'Bạn đã từ chối quyền Camera hoặc Microphone. Vui lòng vào Cài đặt để bật lại.',
          [
            { text: 'Huỷ', style: 'cancel' },
            { text: 'Mở Cài đặt', onPress: () => Linking.openSettings() },
          ],
        );
      } else {
        Alert.alert(
          'Cần cấp quyền',
          'Vui lòng cấp quyền Camera và Microphone để quay video.',
        );
      }
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

interface ScaleButtonProps {
  children: React.ReactNode;
  onPress?: () => void;
  className?: string;
  style?: any;
  disabled?: boolean;
  activeOpacity?: number;
  hitSlop?: { top: number; bottom: number; left: number; right: number };
}

function ScaleButton({
  children,
  onPress,
  className,
  style,
  disabled,
  activeOpacity = 0.8,
  hitSlop,
  ...props
}: ScaleButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scale, {
      toValue: 0.96,
      useNativeDriver: true,
      tension: 150,
      friction: 12,
    }).start();
  }, [scale]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 150,
      friction: 12,
    }).start();
  }, [scale]);

  return (
    <AnimatedTouchableOpacity
      activeOpacity={activeOpacity}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={onPress}
      disabled={disabled}
      className={className}
      style={[style, { transform: [{ scale }] }]}
      hitSlop={hitSlop}
      {...props}
    >
      {children}
    </AnimatedTouchableOpacity>
  );
}

export default function CreateReelScreen() {
  const navigation = useNavigation();
  const vm = useCreateReelViewModel();
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Caption input ref + keyboard tracking for the floating suggestion bar
  const captionInputRef = useRef<TextInput | null>(null);
  const [isCaptionFocused, setIsCaptionFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, e => {
      setKeyboardHeight(e.endCoordinates?.height ?? 0);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // On Android with windowSoftInputMode=adjustResize the view already shrinks
  // above the keyboard, so we anchor the bar at the bottom (0). On iOS the
  // keyboard overlays content, so we lift the bar by the keyboard height.
  const suggestionBarBottom = Platform.OS === 'ios' ? keyboardHeight : 0;
  const isSuggestionBarVisible = isCaptionFocused && keyboardHeight > 0;

  /** Insert "#" or "@" at the end of the caption with a leading space if needed. */
  const insertCaptionChar = useCallback(
    (char: '#' | '@') => {
      const current = vm.draft.caption ?? '';
      const needsSpace = current.length > 0 && !/\s$/.test(current);
      const next = `${current}${needsSpace ? ' ' : ''}${char}`;
      if (next.length > 500) return;
      vm.setCaption(next);
      // Make sure the input keeps focus so suggestions can populate
      captionInputRef.current?.focus();
    },
    [vm],
  );

  // Pulsing animation for loading overlay
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  React.useEffect(() => {
    if (isVideoLoading) {
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 750,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 750,
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoop.current.start();
    } else {
      pulseLoop.current?.stop();
      pulseAnim.setValue(1);
    }
  }, [isVideoLoading, pulseAnim]);

  const selectVideo = useCallback(
    (asset: Asset | null) => {
      if (!asset) {
        return;
      }

      if (!asset.uri) {
        Alert.alert(
          'Không thể đọc video',
          'Video đã chọn không có đường dẫn hợp lệ. Vui lòng chọn video khác.',
        );
        return;
      }

      if (asset.duration && asset.duration > MAX_REEL_DURATION_SECONDS + 1) {
        Alert.alert(
          'Video quá dài',
          'Reel chỉ hỗ trợ video tối đa 60 giây. Vui lòng chọn hoặc quay video ngắn hơn.',
        );
        return;
      }

      if (asset.fileSize && asset.fileSize > MAX_REEL_FILE_SIZE_BYTES) {
        Alert.alert(
          'Video quá lớn',
          'Video này quá nặng để xem trước ổn định trên thiết bị. Vui lòng chọn video nhẹ hơn.',
        );
        return;
      }

      vm.setVideo(
        asset.uri,
        asset.type || 'video/mp4',
        buildVideoFileName(asset),
      );
      setPaused(false);
      setMuted(false);
      setPreviewError(null);
      setIsVideoLoading(true);
    },
    [vm],
  );

  const handlePickFromLibrary = useCallback(async () => {
    const response = await launchImageLibrary(VIDEO_LIBRARY_OPTIONS);
    if (response.errorCode) {
      Alert.alert(
        'Không thể chọn video',
        response.errorMessage ?? 'Vui lòng thử lại hoặc chọn video khác.',
      );
      return;
    }

    selectVideo(getVideoAsset(response));
  }, [selectVideo]);

  const handleRecordVideo = useCallback(async () => {
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) {
      return;
    }

    const response = await launchCamera(VIDEO_CAMERA_OPTIONS);
    if (response.errorCode) {
      Alert.alert(
        'Không thể quay video',
        response.errorMessage ?? 'Vui lòng kiểm tra quyền Camera và thử lại.',
      );
      return;
    }

    selectVideo(getVideoAsset(response));
  }, [selectVideo]);

  const handleSubmit = useCallback(async () => {
    await vm.submit();
  }, [vm]);

  // Pause video when screen loses focus to free memory
  React.useEffect(() => {
    const unsubBlur = navigation.addListener('blur', () => {
      setPaused(true);
    });
    return unsubBlur;
  }, [navigation]);

  // Show result alerts
  React.useEffect(() => {
    if (vm.uploadState.phase === 'success') {
      const { result } = vm.uploadState;
      if (result.status === 'created') {
        Alert.alert('Thành công', 'Video Reel đã được đăng lên!', [
          { text: 'OK', onPress: () => { vm.reset(); navigation.goBack(); } },
        ]);
      } else if (result.status === 'processing') {
        Alert.alert('Đang xử lý', result.message ?? 'Video đang được máy chủ xử lý, vui lòng chờ.', [
          { text: 'OK', onPress: () => { vm.reset(); navigation.goBack(); } },
        ]);
      } else if (result.status === 'review') {
        Alert.alert('Chờ duyệt', 'Video của bạn đang chờ quản trị viên phê duyệt.', [
          { text: 'OK', onPress: () => { vm.reset(); navigation.goBack(); } },
        ]);
      }
    }
  }, [vm.uploadState.phase, navigation, vm]);

  return (
    <SafeAreaView className="flex-1 surface-base">
      <StatusBar barStyle="dark-content" />

      {/* App bar */}
      <View 
        className="surface-topbar h-14 flex-row items-center px-4 border-b border-slate-100 bg-white"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
          elevation: 1,
        }}
      >
        <ScaleButton
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          className="h-10 w-10 items-center justify-center rounded-full bg-slate-50 border border-slate-100"
        >
          <ChevronLeft size={20} color="#334155" strokeWidth={2.5} />
        </ScaleButton>
        <Text className="text-heading flex-1 text-center font-bold text-slate-800 mr-10">
          Đăng Reel Video
        </Text>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 py-5"
          keyboardShouldPersistTaps="handled"
        >
          {/* Video picker / preview section */}
          {!vm.hasVideo ? (
            /* Empty state — pick or record */
            <View 
              className="surface-card mb-5 items-center px-6 py-12 border border-dashed border-blue-200"
              style={{ backgroundColor: 'rgba(239, 246, 255, 0.05)' }}
            >
              <View 
                className="mb-5 h-20 w-20 items-center justify-center rounded-full bg-blue-50 border border-blue-100"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
              >
                <Film size={32} color="#0000FF" strokeWidth={2} />
              </View>
              <Text className="text-lg font-bold text-slate-850 mb-1 text-center">
                Tải lên Reel Video của bạn
              </Text>
              <Text className="text-body-secondary mb-8 text-center max-w-[245px]">
                Tạo thước phim ngắn tối đa 60 giây để chia sẻ những khoảnh khắc tuyệt vời.
              </Text>

              <ScaleButton
                className="w-full flex-row items-center justify-center py-4 bg-[#0000ff] rounded-full mb-3"
                style={{
                  shadowColor: '#0000ff',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 4,
                }}
                onPress={handlePickFromLibrary}
              >
                <Film size={18} color="#fff" strokeWidth={2.2} />
                <Text className="ml-2 text-base font-semibold text-white">
                  Chọn từ thư viện máy
                </Text>
              </ScaleButton>

              <ScaleButton
                className="w-full flex-row items-center justify-center py-4 bg-white border border-slate-200 rounded-full"
                style={{
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  elevation: 1,
                }}
                onPress={handleRecordVideo}
              >
                <Video size={18} color="#0000FF" strokeWidth={2.2} />
                <Text className="ml-2 text-base font-semibold text-brand">
                  Quay video trực tiếp
                </Text>
              </ScaleButton>
            </View>
          ) : (
            /* Video preview player card */
            <View 
              className="surface-card mb-5 overflow-hidden border border-slate-100"
              style={{
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.04,
                shadowRadius: 4,
                elevation: 2,
              }}
            >
              {/* ── Dark video stage ──────────────────────────────────────────
                  Rules that keep VideoPlayer rendering on Android:
                  • NO overflow:hidden on the direct VideoPlayer parent
                  • NO borderRadius on the direct VideoPlayer parent
                  The outer surface-card already clips to rounded corners. */}
              <View style={{ backgroundColor: '#0A0A0A', height: 300 }}>
                {/* VideoPlayer fills the dark stage completely */}
                <VideoPlayer
                  source={{ uri: vm.draft.videoUri! }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                  repeat
                  paused={paused}
                  muted={muted}
                  onLoad={() => setIsVideoLoading(false)}
                  onError={() => {
                    setIsVideoLoading(false);
                    setPaused(true);
                    setPreviewError(
                      'Không thể xem trước video này. Vui lòng chọn video khác.',
                    );
                  }}
                />

                {/* ── Loading overlay — pulsing icon while video buffers ── */}
                {isVideoLoading && !previewError && (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, right: 0, bottom: 0,
                      backgroundColor: '#0A0A0A',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {/* Outer ring */}
                    <Animated.View
                      style={{
                        opacity: pulseAnim,
                        width: 80,
                        height: 80,
                        borderRadius: 40,
                        borderWidth: 2,
                        borderColor: 'rgba(99,102,241,0.5)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 16,
                      }}
                    >
                      {/* Inner fill */}
                      <View
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: 30,
                          backgroundColor: 'rgba(99,102,241,0.15)',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Film size={28} color="#818cf8" strokeWidth={1.8} />
                      </View>
                    </Animated.View>
                    <ActivityIndicator color="#818cf8" size="small" />
                    <Text
                      style={{
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: 13,
                        fontWeight: '500',
                        marginTop: 10,
                        letterSpacing: 0.2,
                      }}
                    >
                      Đang tải video...
                    </Text>
                  </View>
                )}

                {/* Dark gradient bottom bar — play/pause + label + mute */}
                <View
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: 'rgba(0,0,0,0.65)',
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => !previewError && setPaused(p => !p)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  >
                    <View
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 17,
                        backgroundColor: 'rgba(255,255,255,0.18)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {paused ? (
                        <Play size={18} color="#fff" fill="#fff" />
                      ) : (
                        <Pause size={18} color="#fff" fill="#fff" />
                      )}
                    </View>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>
                      Xem trước Reel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setMuted(m => !m)}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: 'rgba(255,255,255,0.18)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {muted ? (
                      <VolumeX size={18} color="#fff" />
                    ) : (
                      <Volume2 size={18} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Error overlay */}
                {previewError && (
                  <View
                    style={{
                      position: 'absolute',
                      inset: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(0,0,0,0.82)',
                      paddingHorizontal: 24,
                    }}
                  >
                    <Film size={32} color="#fff" strokeWidth={1.8} />
                    <Text style={{ marginTop: 12, color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                      {previewError}
                    </Text>
                  </View>
                )}
              </View>

              {/* Change video buttons */}
              <View className="flex-row gap-3 px-4 py-3">
                <ScaleButton
                  className="flex-1 flex-row items-center justify-center rounded-full border border-slate-200 bg-slate-50 py-2.5"
                  onPress={handlePickFromLibrary}
                >
                  <RotateCcw size={15} color="#475569" strokeWidth={2.2} />
                  <Text className="ml-2 text-xs font-semibold text-slate-600">
                    Chọn video khác
                  </Text>
                </ScaleButton>
                <ScaleButton
                  className="flex-1 flex-row items-center justify-center rounded-full border border-slate-200 bg-slate-50 py-2.5"
                  onPress={handleRecordVideo}
                >
                  <Video size={15} color="#475569" strokeWidth={2.2} />
                  <Text className="ml-2 text-xs font-semibold text-slate-600">
                    Quay lại video
                  </Text>
                </ScaleButton>
              </View>
            </View>
          )}

          {/* Caption input */}
          <View 
            className="surface-card mb-5 p-5 border border-slate-100"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <Text
                className="text-caption-primary flex-1 text-slate-500 font-semibold uppercase"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ lineHeight: 18 }}
              >
                MÔ TẢ (tuỳ chọn)
              </Text>
              <Text
                className="text-xs font-medium text-slate-400"
                numberOfLines={1}
                style={{ lineHeight: 18 }}
              >
                {(vm.draft.caption ?? '').length}/500
              </Text>
            </View>
            <TextInput
              ref={captionInputRef}
              className="input-shell min-h-[112px] px-4 py-3 text-body-primary border border-slate-200"
              placeholder="Viết gì đó về video này..."
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={500}
              value={vm.draft.caption ?? ''}
              onChangeText={vm.setCaption}
              onFocus={() => setIsCaptionFocused(true)}
              onBlur={() => setIsCaptionFocused(false)}
              textAlignVertical="top"
              style={{ lineHeight: 20 }}
            />
          </View>

          {/* Privacy selector */}
          <View 
            className="surface-card mb-6 p-5 border border-slate-100"
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.04,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Text
              className="text-caption-primary mb-3 text-slate-500 font-semibold uppercase"
              numberOfLines={1}
              style={{ lineHeight: 18 }}
            >
              ĐỐI TƯỢNG XEM
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {PRIVACY_OPTIONS.map(opt => {
                const isSelected = (vm.draft.privacy ?? 0) === opt.value;
                const IconComponent = opt.icon;
                return (
                  <ScaleButton
                    key={opt.value}
                    onPress={() => vm.setPrivacy(opt.value)}
                    className={`flex-row items-center rounded-full px-4 py-2.5 border ${
                      isSelected
                        ? 'bg-[#0000ff] border-[#0000ff]'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <IconComponent
                      size={15}
                      color={isSelected ? '#ffffff' : '#64748b'}
                      strokeWidth={2.2}
                    />
                    <Text
                      className={`ml-2 text-xs font-semibold ${
                        isSelected ? 'text-white' : 'text-slate-700'
                      }`}
                    >
                      {opt.label}
                    </Text>
                  </ScaleButton>
                );
              })}
            </View>
          </View>

          {/* Error message */}
          {vm.uploadState.phase === 'error' && (
            <View className="mb-5 rounded-2xl bg-red-50 border border-red-100 px-4 py-3">
              <Text className="text-sm font-medium text-red-600">
                {vm.uploadState.message}
              </Text>
            </View>
          )}

          {/* Submit button */}
          <ScaleButton
            className={`flex-row items-center justify-center py-4 rounded-full bg-[#0000ff] ${
              !vm.hasVideo || vm.isUploading ? 'opacity-50' : ''
            }`}
            style={{
              shadowColor: '#0000ff',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 4,
            }}
            onPress={handleSubmit}
            disabled={!vm.hasVideo || vm.isUploading}
          >
            {vm.isUploading ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text className="ml-2 text-base font-semibold text-white">
                  Đang đăng Reel...
                </Text>
              </>
            ) : (
              <>
                <Film size={18} color="#fff" strokeWidth={2.2} className="mr-2" />
                <Text className="ml-2 text-base font-semibold text-white">
                  Đăng Reel Video
                </Text>
              </>
            )}
          </ScaleButton>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Floating suggestion bar (sits just above the keyboard) ──────── */}
      {isSuggestionBarVisible && (
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: suggestionBarBottom,
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#E5E7EB',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
            elevation: 8,
          }}
        >
          {/* Row 1: Suggestion chips (only when there are matches) */}
          {(vm.isLoadingCaptionSuggestions || vm.captionSuggestions.length > 0) && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{
                paddingHorizontal: 12,
                paddingVertical: 10,
                gap: 8,
                alignItems: 'center',
              }}
            >
              {vm.isLoadingCaptionSuggestions &&
              vm.captionSuggestions.length === 0 ? (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                  }}
                >
                  <ActivityIndicator color="#0000ff" size="small" />
                  <Text
                    style={{
                      marginLeft: 8,
                      fontSize: 13,
                      color: '#64748B',
                      fontWeight: '500',
                    }}
                  >
                    Đang tìm gợi ý...
                  </Text>
                </View>
              ) : (
                vm.captionSuggestions.map(suggestion => {
                  const isMention = suggestion.kind === 'mention';
                  return (
                    <TouchableOpacity
                      key={`${suggestion.kind}-${suggestion.id}`}
                      activeOpacity={0.75}
                      onPress={() => vm.applyCaptionSuggestion(suggestion)}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        borderRadius: 999,
                        backgroundColor: isMention ? '#EFF6FF' : '#F5F3FF',
                        borderWidth: 1,
                        borderColor: isMention ? '#DBEAFE' : '#EDE9FE',
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: isMention ? '#1D4ED8' : '#6D28D9',
                        }}
                        numberOfLines={1}
                      >
                        {suggestion.label}
                      </Text>
                      {suggestion.subtitle ? (
                        <Text
                          style={{
                            marginLeft: 6,
                            fontSize: 11,
                            color: isMention ? '#60A5FA' : '#A78BFA',
                          }}
                          numberOfLines={1}
                        >
                          {suggestion.subtitle}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          )}

          {/* Row 2: Quick action toolbar */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderTopWidth:
                vm.isLoadingCaptionSuggestions || vm.captionSuggestions.length > 0
                  ? 1
                  : 0,
              borderTopColor: '#F1F5F9',
            }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => insertCaptionChar('#')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 4,
              }}
            >
              <Hash size={20} color="#475569" strokeWidth={2.2} />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => insertCaptionChar('@')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AtSign size={20} color="#475569" strokeWidth={2.2} />
            </TouchableOpacity>

            <View style={{ flex: 1 }} />

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => Keyboard.dismiss()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 999,
                backgroundColor: '#0000FF',
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '700',
                  color: '#ffffff',
                }}
              >
                Hoàn tất
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
