// Description: Go Live screen - create a new live stream.
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  StyleSheet,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  ChevronDown,
  ChevronLeft,
  Globe,
  Lock,
  RefreshCw,
  UserCheck,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import { useGoLiveViewModel } from '../../application/view-models/useLiveViewModel';
import {
  LiveCameraPreview,
  type LiveCameraPreviewStatus,
} from '../components/LiveCameraPreview';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  getIosLiveKeyboardTranslation,
  getStableLivePreviewDimensions,
  IOS_LIVE_KEYBOARD_GAP,
} from './livePreviewLayout';
import { getLiveCreateErrorMessage } from '../../infrastructure/repositories/liveCreateError';
import { prepareIosLiveCameraRelease } from '../../infrastructure/native/liveCameraLifecycle';

export default function GoLiveScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { user } = useCurrentUserViewModel();
  const {
    title,
    privacy,
    privacyOptions,
    isLoading,
    setTitle,
    setPrivacy,
    startLive,
  } = useGoLiveViewModel();

  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [previewStatus, setPreviewStatus] =
    useState<LiveCameraPreviewStatus>('checking');
  const bottomTrayTranslateY = useRef(new Animated.Value(0)).current;
  const previewDimensions = useMemo(
    () => getStableLivePreviewDimensions(Dimensions.get('screen')),
    [],
  );

  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;

    const animateTray = (toValue: number, duration = 250) => {
      Animated.timing(bottomTrayTranslateY, {
        toValue,
        duration,
        useNativeDriver: true,
      }).start();
    };
    const changeSubscription = Keyboard.addListener(
      'keyboardWillChangeFrame',
      event => {
        animateTray(
          getIosLiveKeyboardTranslation({
            screenHeight: previewDimensions.height,
            keyboardScreenY: event.endCoordinates.screenY,
            bottomInset: insets.bottom,
          }),
          event.duration || 250,
        );
      },
    );
    const hideSubscription = Keyboard.addListener('keyboardWillHide', event => {
      animateTray(0, event.duration || 250);
    });

    return () => {
      changeSubscription.remove();
      hideSubscription.remove();
      bottomTrayTranslateY.stopAnimation();
    };
  }, [bottomTrayTranslateY, insets.bottom, previewDimensions.height]);

  const handleStartLive = useCallback(async () => {
    if (previewStatus !== 'ready') return;

    try {
      Keyboard.dismiss();
      const live = await startLive();
      const waitForCameraRelease = await prepareIosLiveCameraRelease();
      setPreviewEnabled(false);
      const releaseResult = await waitForCameraRelease();
      if (releaseResult.status === 'timeout') {
        console.warn('[GoLive] camera release confirmation timed out');
      }
      navigation.replace(ROUTES.LIVE_ROOM, {
        postId: live.postId,
        isHost: true,
        liveSession: live,
        initialCameraFacing: cameraFacing,
      });
    } catch (error) {
      console.error('[GoLive] create error:', error);
      setPreviewEnabled(true);
      Alert.alert('Lỗi', getLiveCreateErrorMessage(error));
    }
  }, [cameraFacing, navigation, previewStatus, startLive]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const privacyIcons: Record<string, React.ReactNode> = {
    '0': <Globe size={14} color="#ffffff" />,
    '1': <Users size={14} color="#ffffff" />,
    '2': <UserCheck size={14} color="#ffffff" />,
    '3': <Lock size={14} color="#ffffff" />,
  };

  const currentPrivacyOption =
    privacyOptions.find(opt => opt.value === privacy) || privacyOptions[0];

  const toggleCameraFacing = useCallback(() => {
    setCameraFacing(prev => (prev === 'front' ? 'back' : 'front'));
  }, []);

  return (
    <View className="flex-1 bg-black" style={styles.screen}>
      <FocusAwareStatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      <View style={[styles.preview, previewDimensions]}>
        <LiveCameraPreview
          cameraFacing={cameraFacing}
          enabled={previewEnabled}
          onStatusChange={setPreviewStatus}
        />
      </View>

      <SafeAreaView
        pointerEvents="box-none"
        style={styles.topOverlay}
        edges={['top']}
      >
        <View style={styles.topBar}>
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleBack}
              style={styles.circleButton}
            >
              <ChevronLeft size={24} color="#ffffff" />
            </TouchableOpacity>

            <View className="flex-row items-center gap-2">
              <Image
                source={{
                  uri:
                    user?.avatar ||
                    'https://lh3.googleusercontent.com/aida-public/AB6AXuBzOiwu9eVVr13_YUuLqFaZS5DMZSQjPQqGVp3m79mrFIOksxUaafxT6NOD7hWY1ovOOtnGqlKKmPy3vZS5LhbiBbX6XQyXexcys3dCd700wiTgDGs4KRiq5vM64_gByXbAgZ356Xg_1i8PN9yGMKSGadOq-PYlT497w8_Ab1upM7ybuluWZspaikqyZ-BtES8q1oKfjZ9BHYtV1APztnG0dp7bW-4y0QkJh46DJatsljh0w0WsaL0Os2nes04dtts1t6X_kG8wXqw',
                }}
                style={styles.avatar}
              />
              <View style={styles.identityBlock}>
                <Text style={styles.userName} numberOfLines={1}>
                  {user?.name || 'Thành viên'}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setDropdownVisible(prev => !prev)}
                  style={styles.privacyPill}
                >
                  <View className="flex-row items-center gap-1">
                    {privacyIcons[privacy] || (
                      <Globe size={14} color="#ffffff" />
                    )}
                    <Text style={styles.privacyText}>
                      {currentPrivacyOption.label}
                    </Text>
                    <ChevronDown size={12} color="#ffffff" />
                  </View>
                </TouchableOpacity>

                {dropdownVisible && (
                  <View style={styles.dropdownMenu}>
                    {privacyOptions.map(option => (
                      <TouchableOpacity
                        key={option.value}
                        activeOpacity={0.7}
                        onPress={() => {
                          setPrivacy(option.value);
                          setDropdownVisible(false);
                        }}
                        style={[
                          styles.dropdownItem,
                          privacy === option.value && styles.dropdownItemActive,
                        ]}
                      >
                        <View className="flex-row items-center gap-2">
                          {privacyIcons[option.value] || (
                            <Globe size={14} color="#ffffff" />
                          )}
                          <Text style={styles.dropdownItemText}>
                            {option.label}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={toggleCameraFacing}
            style={styles.circleButton}
          >
            <RefreshCw size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <Animated.View
        style={[
          styles.bottomTray,
          {
            bottom: insets.bottom + IOS_LIVE_KEYBOARD_GAP,
            transform: [{ translateY: bottomTrayTranslateY }],
          },
        ]}
      >
        <View className="mb-4 w-full">
          <View style={styles.inputCard}>
            <Text style={styles.inputLabel}>TIÊU ĐỀ PHÁT TRỰC TIẾP</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Nhấn để thêm tiêu đề..."
              placeholderTextColor="rgba(255, 255, 255, 0.55)"
              maxLength={100}
              returnKeyType="done"
              blurOnSubmit
            />
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleStartLive}
          disabled={isLoading || previewStatus !== 'ready'}
          style={[
            styles.startLiveButton,
            (isLoading || previewStatus !== 'ready') &&
              styles.startLiveButtonDisabled,
          ]}
        >
          <View style={styles.startLiveIndicator} />
          <Text style={styles.startLiveButtonText}>
            {isLoading ? 'Đang bắt đầu...' : 'Phát trực tiếp'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    overflow: 'hidden',
  },
  preview: {
    left: 0,
    position: 'absolute',
    top: 0,
  },
  topOverlay: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bottomTray: {
    left: 16,
    position: 'absolute',
    right: 16,
    zIndex: 10,
  },
  circleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  identityBlock: {
    position: 'relative',
    zIndex: 50,
  },
  userName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  privacyPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 2,
    alignSelf: 'flex-start',
  },
  privacyText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
    marginRight: 2,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingVertical: 6,
    minWidth: 160,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 5,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  dropdownItemText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  inputCard: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 16,
  },
  inputLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },
  textInput: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 4,
  },
  charCount: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    textAlign: 'right',
    marginTop: 6,
  },
  startLiveButton: {
    backgroundColor: '#0866ff',
    borderRadius: 12,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#0866ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startLiveButtonDisabled: {
    opacity: 0.55,
  },
  startLiveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  startLiveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
