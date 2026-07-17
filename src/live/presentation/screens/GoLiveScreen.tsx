// Description: Go Live screen - create a new live stream.
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Image,
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
import { LiveCameraPreview } from '../components/LiveCameraPreview';
import { useCurrentUserViewModel } from '../../../shared-kernel/application/view-models/useCurrentUserViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { KeyboardSafeView } from '../../../shared-kernel/presentation/components/KeyboardSafeView';

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

  const handleStartLive = useCallback(async () => {
    try {
      const live = await startLive();
      navigation.replace(ROUTES.LIVE_ROOM, {
        postId: live.postId,
        isHost: true,
        liveSession: live,
        initialCameraFacing: cameraFacing,
      });
    } catch (error) {
      console.error('[GoLive] create error:', error);
      Alert.alert('Lỗi', 'Không thể bắt đầu live. Vui lòng thử lại.');
    }
  }, [navigation, startLive, cameraFacing]);

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
    <View className="flex-1 bg-black">
      <FocusAwareStatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* Camera Background */}
      <View style={StyleSheet.absoluteFill}>
        <LiveCameraPreview cameraFacing={cameraFacing} enabled={true} />
      </View>

      {/* Keep the bottom title controls above Android's software keyboard. */}
      <KeyboardSafeView
        style={StyleSheet.absoluteFill}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
      >
        {/* Screen content wrapper using SafeAreaView (all overlay covers remain transparent) */}
        <SafeAreaView
          className="flex-1 bg-transparent justify-between"
          style={{ backgroundColor: 'transparent' }}
          edges={['top', 'bottom']}
        >
          {/* Top Control Bar */}
          <View style={styles.topBar}>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleBack}
                style={styles.circleButton}
              >
                <ChevronLeft size={24} color="#ffffff" />
              </TouchableOpacity>

              {/* User info & Privacy */}
              <View className="flex-row items-center gap-2">
                <Image
                  source={{
                    uri:
                      user?.avatar ||
                      'https://lh3.googleusercontent.com/aida-public/AB6AXuBzOiwu9eVVr13_YUuLqFaZS5DMZSQjPQqGVp3m79mrFIOksxUaafxT6NOD7hWY1ovOOtnGqlKKmPy3vZS5LhbiBbX6XQyXexcys3dCd700wiTgDGs4KRiq5vM64_gByXbAgZ356Xg_1i8PN9yGMKSGadOq-PYlT497w8_Ab1upM7ybuluWZspaikqyZ-BtES8q1oKfjZ9BHYtV1APztnG0dp7bW-4y0QkJh46DJatsljh0w0WsaL0Os2nes04dtts1t6X_kG8wXqw',
                  }}
                  style={styles.avatar}
                />
                <View style={{ position: 'relative', zIndex: 50 }}>
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

                  {/* Dropdown Options List Menu (Inline directly below the name/privacy badge) */}
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
                            privacy === option.value &&
                              styles.dropdownItemActive,
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

            {/* Switch Camera */}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={toggleCameraFacing}
              style={styles.circleButton}
            >
              <RefreshCw size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          {/* Spacer to push input and button to bottom */}
          <View className="flex-1" />

          {/* Input Card for Title */}
          <View className="mb-4 px-4 w-full">
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

          {/* Bottom Button */}
          <View className="px-4 pb-2 w-full">
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleStartLive}
              disabled={isLoading}
              style={styles.startLiveButton}
            >
              <View style={styles.startLiveIndicator} />
              <Text style={styles.startLiveButtonText}>
                {isLoading ? 'Đang bắt đầu...' : 'Phát trực tiếp'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardSafeView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
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
