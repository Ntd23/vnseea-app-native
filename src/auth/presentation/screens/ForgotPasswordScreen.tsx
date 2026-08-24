// Description: Renders the no-footer forgot password screen using the real auth API.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  Mail,
  RefreshCcw,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROOT_SAFE_AREA_EDGES } from '../../../shared-kernel/presentation/utils/safeAreaEdges';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useAuthViewModel } from '../../application/view-models/useAuthViewModel';
import { useAuthBranding } from '../../application/view-models/useAuthBranding';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getAuthCopy } from '../../application/i18n/authCopy';
import { parseRegistrationIdentity } from '../../domain/registrationIdentity';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type ForgotPasswordNav = NativeStackNavigationProp<RootStackParamList>;

function ForgotPasswordScreen() {
  const navigation = useNavigation<ForgotPasswordNav>();
  const [email, setEmail] = useState('');
  const [emailValidationError, setEmailValidationError] = useState('');
  const { error, forgotPassword, isLoading, passwordResetSent } =
    useAuthViewModel();
  const { logoUrl, notifyImageError } = useAuthBranding();
  const [language, setLanguage] = useState<AppLanguage>(() =>
    languageStorage.getLanguage(),
  );

  const copy = useMemo(() => getAuthCopy(language), [language]);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = languageStorage.getLanguage();
      setLanguage(prev => (prev === next ? prev : next));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const scrollRef = useRef<ScrollView | null>(null);
  const fieldYOffsets = useRef<Record<string, number>>({});
  const cardYOffset = useRef(0);

  const circleRotation = useSharedValue(0);
  const floatProgress = useSharedValue(0);

  useEffect(() => {
    circleRotation.value = withRepeat(
      withTiming(360, { duration: 60000, easing: Easing.linear }),
      -1,
      false,
    );
    floatProgress.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.cubic) }),
      -1,
      true,
    );
  }, [circleRotation, floatProgress]);

  const circle1Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${circleRotation.value}deg` }],
  }));
  const circle2Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-circleRotation.value * 0.6}deg` }],
  }));
  const circle3Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${circleRotation.value * 0.4}deg` }],
  }));
  const logoFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 + floatProgress.value * 8 }],
  }));

  const [isEmailFocused, setIsEmailFocused] = useState(false);

  const handleFieldLayout = (field: string) => (event: LayoutChangeEvent) => {
    fieldYOffsets.current[field] = event.nativeEvent.layout.y;
  };

  const handleCardLayout = (event: LayoutChangeEvent) => {
    cardYOffset.current = event.nativeEvent.layout.y;
  };

  const scrollToField = useCallback((field: string) => {
    const fieldY = fieldYOffsets.current[field] || 0;
    const targetY = Math.max(0, cardYOffset.current + fieldY - 20);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    }, 100);
  }, []);

  async function handleSubmit() {
    if (!email.trim()) {
      setEmailValidationError(copy.forgotPasswordEmailRequired);
      return;
    }

    const parsedIdentity = parseRegistrationIdentity(email);
    if (parsedIdentity?.type !== 'email') {
      setEmailValidationError(copy.forgotPasswordEmailInvalid);
      return;
    }

    setEmailValidationError('');
    try {
      await forgotPassword({ email: parsedIdentity.value });
    } catch {
      // The view model exposes the message for inline rendering.
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#F8FBFF]" edges={ROOT_SAFE_AREA_EDGES}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#F8FBFF" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="flex-grow bg-[#F8FBFF] pb-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero section */}
          <View className="relative h-[180px] items-center justify-center overflow-hidden">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="absolute left-4 top-4 z-10 h-10 w-10 items-center justify-center rounded-full bg-white"
              style={{
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 10,
                elevation: 4,
              }}
              activeOpacity={0.8}
            >
              <ArrowLeft size={20} color="#334155" />
            </TouchableOpacity>
            <Animated.View
              pointerEvents="none"
              className="absolute -right-14 -top-14 h-36 w-36 rounded-full"
              style={[{ backgroundColor: 'rgba(185,28,28,0.04)' }, circle1Style]}
            />
            <Animated.View
              pointerEvents="none"
              className="absolute -bottom-12 -left-16 h-36 w-36 rounded-full"
              style={[{ backgroundColor: 'rgba(185,28,28,0.035)' }, circle2Style]}
            />
            <Animated.View
              pointerEvents="none"
              className="absolute right-24 top-28 h-11 w-11 rounded-full"
              style={[{ backgroundColor: 'rgba(185,28,28,0.05)' }, circle3Style]}
            />
            <View pointerEvents="none" className="absolute left-7 top-10">
              {Array.from({ length: 12 }).map((_, index) => (
                <View
                  key={`left-dot-${index}`}
                  className="absolute h-1 w-1 rounded-full bg-[#D8E5FF]"
                  style={{
                    left: (index % 4) * 16,
                    top: Math.floor(index / 4) * 16,
                    opacity: 0.8,
                  }}
                />
              ))}
            </View>
            <View pointerEvents="none" className="absolute right-8 top-24">
              {Array.from({ length: 9 }).map((_, index) => (
                <View
                  key={`right-dot-${index}`}
                  className="absolute h-1 w-1 rounded-full bg-[#DDE8FF]"
                  style={{
                    left: (index % 3) * 16,
                    top: Math.floor(index / 3) * 16,
                    opacity: 0.75,
                  }}
                />
              ))}
            </View>

            <View className="items-center justify-center px-8 pt-4">
              <Animated.View
                className="mb-3 h-16 w-44 items-center justify-center overflow-hidden rounded-[16px] border-[3px] border-white bg-brand"
                style={[
                  {
                    shadowColor: APP_BRAND_COLOR,
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.12,
                    shadowRadius: 20,
                    elevation: 6,
                  },
                  logoFloatStyle,
                ]}
              >
                {logoUrl ? (
                  <Image
                    source={{ uri: logoUrl }}
                    className="h-10 w-36 rounded-lg"
                    resizeMode="contain"
                    onError={notifyImageError}
                  />
                ) : null}
              </Animated.View>
            </View>
          </View>

          {/* Form card */}
          <View
            onLayout={handleCardLayout}
            className="mx-5 rounded-[24px] bg-white px-5 pb-5 pt-6"
            style={{
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.07,
              shadowRadius: 24,
              elevation: 6,
            }}
          >
            <View className="items-center">
              <View className="relative mb-4 h-16 w-16 items-center justify-center rounded-full bg-[#EEF4FF]">
                <RefreshCcw size={28} color={APP_BRAND_COLOR} strokeWidth={2.5} />
                <View className="absolute h-6 w-6 items-center justify-center rounded-full bg-[#EEF4FF]">
                  <LockKeyhole size={14} color={APP_BRAND_COLOR} strokeWidth={2.5} />
                </View>
              </View>
              <Text className="text-center text-[18px] font-bold text-slate-900">
                {copy.forgotPasswordTitle}
              </Text>
              <Text className="mt-3 text-center text-[13px] leading-5 text-slate-500">
                {copy.forgotPasswordDesc}
              </Text>
            </View>

            <View className="mt-6" onLayout={handleFieldLayout('email')}>
              <Text className="mb-1.5 px-0.5 text-[12px] font-semibold text-slate-500">
                {copy.forgotPasswordEmailLabel}
              </Text>
              <View
                className="flex-row items-center rounded-xl bg-white px-3"
                style={{
                  height: 44,
                  borderWidth: isEmailFocused ? 1.5 : 1,
                  borderColor: isEmailFocused ? APP_BRAND_COLOR : 'rgba(185, 28, 28, 0.18)',
                  shadowColor: APP_BRAND_COLOR,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: isEmailFocused ? 0.08 : 0,
                  shadowRadius: 10,
                  elevation: isEmailFocused ? 2 : 0,
                }}
              >
                <Mail size={18} color={APP_BRAND_COLOR} />
                <TextInput
                  className="ml-2.5 flex-1 text-[14px] font-medium text-slate-900"
                  placeholder={copy.forgotPasswordEmailPlaceholder}
                  placeholderTextColor="#9AA0A6"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  value={email}
                  onChangeText={value => {
                    setEmail(value);
                    if (emailValidationError) {
                      setEmailValidationError('');
                    }
                  }}
                  onFocus={() => {
                    setIsEmailFocused(true);
                    scrollToField('email');
                  }}
                  onBlur={() => setIsEmailFocused(false)}
                  onSubmitEditing={handleSubmit}
                  style={{ paddingVertical: 0 }}
                />
              </View>
            </View>

            <TouchableOpacity
              className="mt-6 flex-row items-center justify-center rounded-full bg-brand"
              style={{
                height: 46,
                shadowColor: APP_BRAND_COLOR,
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.12,
                shadowRadius: 12,
                elevation: 3,
              }}
              activeOpacity={0.9}
              disabled={isLoading}
              onPress={handleSubmit}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <View className="flex-row items-center justify-center gap-2">
                  <Text className="text-[15px] font-extrabold text-white">
                    {copy.sendLinkButton}
                  </Text>
                  <ArrowRight size={18} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>

            {emailValidationError || error ? (
              <Text className="mt-3 text-center text-[12px] font-semibold text-red-500">
                {emailValidationError || error}
              </Text>
            ) : null}

            {passwordResetSent ? (
              <Text className="mt-3 text-center text-[12px] font-semibold text-brand">
                {copy.resetEmailSent}
              </Text>
            ) : null}
          </View>

          {/* Footer switch */}
          <View className="mt-6 flex-row items-center justify-center">
            <TouchableOpacity
              className="flex-row items-center justify-center rounded-full bg-white"
              style={{
                height: 40,
                width: 40,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
                elevation: 3,
              }}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(ROUTES.LOGIN)}
            >
              <ArrowLeft size={16} color={APP_BRAND_COLOR} />
            </TouchableOpacity>
            <TouchableOpacity
              className="ml-3"
              activeOpacity={0.8}
              onPress={() => navigation.navigate(ROUTES.LOGIN)}
            >
              <Text className="text-[13px] font-extrabold text-slate-600">
                {copy.backToLogin}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default ForgotPasswordScreen;
