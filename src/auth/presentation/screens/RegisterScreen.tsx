// Description: Renders the Stitch VNSEEA-style register screen using the real auth API.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  StatusBar,
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
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getAuthCopy } from '../../application/i18n/authCopy';
import { useAuthViewModel } from '../../application/view-models/useAuthViewModel';
import { useAuthBranding } from '../../application/view-models/useAuthBranding';

type RegisterNav = NativeStackNavigationProp<RootStackParamList>;


type RegisterTextFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  icon: React.ReactNode;
  isPassword?: boolean;
  keyboardType?: 'default' | 'email-address';
  showCheckIcon?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
  onLayout?: (event: LayoutChangeEvent) => void;
};

function RegisterTextField({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  isPassword = false,
  keyboardType = 'default',
  showCheckIcon = false,
  onFocus,
  onBlur,
  onLayout,
}: RegisterTextFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className="w-full" onLayout={onLayout}>
      <View className="mb-1 flex-row items-center gap-1.5 px-0.5">
        {icon}
        <Text className="text-[12px] font-semibold text-slate-500">{label}</Text>
      </View>
      <View
        className="flex-row items-center rounded-xl bg-white px-3"
        style={{
          height: 44,
          borderWidth: isFocused ? 1.5 : 1,
          borderColor: isFocused ? '#0000ff' : 'rgba(0, 0, 255, 0.08)',
          shadowColor: '#0000ff',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isFocused ? 0.08 : 0,
          shadowRadius: 10,
          elevation: isFocused ? 2 : 0,
        }}
      >
        <TextInput
          className="flex-1 text-[14px] font-medium text-slate-900"
          placeholder={placeholder}
          placeholderTextColor="#9AA0A6"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ paddingVertical: 0 }}
        />
        {isPassword ? (
          <TouchableOpacity
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => setShowPassword(v => !v)}
            className="pl-2"
          >
            {showPassword ? (
              <EyeOff size={18} color="#8A8D91" />
            ) : (
              <Eye size={18} color="#8A8D91" />
            )}
          </TouchableOpacity>
        ) : showCheckIcon ? (
          <CheckCircle2 size={18} color="#10B981" />
        ) : null}
      </View>
    </View>
  );
}

function RegisterScreen() {
  const navigation = useNavigation<RegisterNav>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const { error, isLoading, register } = useAuthViewModel();
  const { logoUrl, siteName, notifyImageError } = useAuthBranding();
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

  async function handleRegister() {
    if (!acceptedTerms) {
      Alert.alert(copy.termsAlertTitle, copy.termsAlertMessage);
      return;
    }

    try {
      const result = await register({
        firstName,
        lastName,
        username,
        email,
        password,
        confirmPassword,
        gender,
      });

      if (result.status === 'authenticated') {
        navigation.reset({
          index: 0,
          routes: [{ name: ROUTES.MAIN_TABS }],
        });
        return;
      }

      Alert.alert(copy.verificationTitle, result.message);
    } catch {
      // The view model exposes the message for inline rendering.
    }
  }

  const isUsernameValid = username.trim().length >= 3;
  const isEmailValid = email.trim().includes('@') && email.trim().includes('.');

  return (
    <SafeAreaView className="flex-1 bg-[#F8FBFF]" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FBFF" />

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
              style={[{ backgroundColor: 'rgba(0,0,255,0.04)' }, circle1Style]}
            />
            <Animated.View
              pointerEvents="none"
              className="absolute -bottom-12 -left-16 h-36 w-36 rounded-full"
              style={[{ backgroundColor: 'rgba(0,0,255,0.035)' }, circle2Style]}
            />
            <Animated.View
              pointerEvents="none"
              className="absolute right-24 top-28 h-11 w-11 rounded-full"
              style={[{ backgroundColor: 'rgba(0,0,255,0.05)' }, circle3Style]}
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
                className="mb-3 h-16 w-44 items-center justify-center overflow-hidden rounded-[16px] border-[3px] border-white bg-[#0000ff]"
                style={[
                  {
                    shadowColor: '#0000ff',
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
              <Text className="text-[15px] font-bold text-slate-800">
                {copy.createAccountTitle}
              </Text>

              {/* Step indicator */}
              <View className="mt-2.5 flex-row items-center gap-1 justify-center">
                <View className="h-1 w-1 rounded-full bg-[#D8E5FF]" />
                <View className="h-1 w-6 rounded-full bg-[#0000ff]" />
                <View className="h-1 w-1 rounded-full bg-[#D8E5FF]" />
              </View>
            </View>
          </View>

          {/* Form card */}
          <View
            onLayout={handleCardLayout}
            className="mx-5 rounded-[24px] bg-white px-5 pb-5 pt-4"
            style={{
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 12 },
              shadowOpacity: 0.07,
              shadowRadius: 24,
              elevation: 6,
            }}
          >
            <View className="gap-2.5">
              {/* Họ & Tên row */}
              <View className="flex-row gap-3">
                <View className="flex-1" onLayout={handleFieldLayout('firstName')}>
                  <RegisterTextField
                    label={copy.firstName}
                    placeholder={copy.firstNamePlaceholder}
                    value={firstName}
                    onChangeText={setFirstName}
                    icon={<User size={14} color="#0000ff" />}
                    onFocus={() => scrollToField('firstName')}
                  />
                </View>
                <View className="flex-1" onLayout={handleFieldLayout('lastName')}>
                  <RegisterTextField
                    label={copy.lastName}
                    placeholder={copy.lastNamePlaceholder}
                    value={lastName}
                    onChangeText={setLastName}
                    icon={<User size={14} color="#0000ff" />}
                    onFocus={() => scrollToField('lastName')}
                  />
                </View>
              </View>

              {/* Tên đăng nhập */}
              <View onLayout={handleFieldLayout('username')}>
                <RegisterTextField
                  label={copy.username}
                  placeholder={copy.registerUsernamePlaceholder}
                  value={username}
                  onChangeText={setUsername}
                  icon={<User size={14} color="#0000ff" />}
                  showCheckIcon={isUsernameValid}
                  onFocus={() => scrollToField('username')}
                />
              </View>

              {/* Email */}
              <View onLayout={handleFieldLayout('email')}>
                <RegisterTextField
                  label={copy.email}
                  placeholder={copy.emailPlaceholder}
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                  icon={<Mail size={14} color="#0000ff" />}
                  showCheckIcon={isEmailValid}
                  onFocus={() => scrollToField('email')}
                />
              </View>

              {/* Mật khẩu */}
              <View onLayout={handleFieldLayout('password')}>
                <RegisterTextField
                  label={copy.password}
                  placeholder={copy.passwordPlaceholder}
                  isPassword
                  value={password}
                  onChangeText={setPassword}
                  icon={<Lock size={14} color="#0000ff" />}
                  onFocus={() => scrollToField('password')}
                />
              </View>

              {/* Xác nhận mật khẩu */}
              <View onLayout={handleFieldLayout('confirmPassword')}>
                <RegisterTextField
                  label={copy.confirmPassword}
                  placeholder={copy.confirmPasswordPlaceholder}
                  isPassword
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  icon={<Lock size={14} color="#0000ff" />}
                  onFocus={() => scrollToField('confirmPassword')}
                />
              </View>

              {/* Giới tính */}
              <View className="pt-1 px-0.5" onLayout={handleFieldLayout('gender')}>
                <View className="mb-2 flex-row items-center gap-1.5">
                  <User size={14} color="#0000ff" />
                  <Text className="text-[12px] font-semibold text-slate-500">
                    {copy.gender}
                  </Text>
                </View>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-center rounded-xl"
                    style={{
                      height: 40,
                      borderWidth: 1.5,
                      borderColor: gender === 'male' ? '#0000ff' : 'rgba(0,0,0,0.06)',
                      backgroundColor: gender === 'male' ? '#EEF4FF' : '#FFFFFF',
                    }}
                    activeOpacity={0.8}
                    onPress={() => setGender('male')}
                  >
                    <Text
                      className="text-[13px] font-bold"
                      style={{
                        color: gender === 'male' ? '#0000ff' : '#475569',
                      }}
                    >
                      {copy.genderMale}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 flex-row items-center justify-center rounded-xl"
                    style={{
                      height: 40,
                      borderWidth: 1.5,
                      borderColor: gender === 'female' ? '#0000ff' : 'rgba(0,0,0,0.06)',
                      backgroundColor: gender === 'female' ? '#EEF4FF' : '#FFFFFF',
                    }}
                    activeOpacity={0.8}
                    onPress={() => setGender('female')}
                  >
                    <Text
                      className="text-[13px] font-bold"
                      style={{
                        color: gender === 'female' ? '#0000ff' : '#475569',
                      }}
                    >
                      {copy.genderFemale}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Đồng ý điều khoản */}
              <View className="pt-1" onLayout={handleFieldLayout('terms')}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setAcceptedTerms(v => !v)}
                  className="flex-row items-start"
                >
                  <View
                    className={`h-4.5 w-4.5 rounded-md border items-center justify-center mt-0.5 ${
                      acceptedTerms
                        ? 'border-[#0000ff] bg-[#0000ff]'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {acceptedTerms && (
                      <View className="h-1.5 w-1.5 rounded-[2px] bg-white" />
                    )}
                  </View>
                  <Text className="ml-2.5 flex-1 text-[12px] leading-5 text-slate-500">
                    {copy.termsPrefix}
                    <Text className="font-semibold text-[#0000ff]">
                      {copy.termsService}
                    </Text>
                    {copy.termsAnd}
                    <Text className="font-semibold text-[#0000ff]">
                      {copy.privacyPolicy}
                    </Text>
                    {copy.termsSuffix}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                className="mt-2 flex-row items-center justify-center rounded-full bg-[#0000ff]"
                style={{
                  height: 46,
                  shadowColor: '#0000ff',
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: 0.12,
                  shadowRadius: 12,
                  elevation: 3,
                }}
                activeOpacity={0.9}
                disabled={isLoading}
                onPress={handleRegister}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <View className="flex-row items-center justify-center gap-2">
                    <Text className="text-[15px] font-extrabold text-white">
                      {copy.tabRegister}
                    </Text>
                    <ArrowRight size={18} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>

              {error ? (
                <Text className="text-center text-[12px] font-semibold text-red-500 mt-1">
                  {error}
                </Text>
              ) : null}
            </View>

            {/* Switch to login */}
            <View className="mt-4 flex-row items-center justify-center">
              <Text className="text-[13px] font-medium text-slate-500">
                {copy.alreadyHaveAccount}
              </Text>
              <TouchableOpacity
                className="ml-1.5"
                activeOpacity={0.8}
                onPress={() => navigation.navigate(ROUTES.LOGIN)}
              >
                <Text className="text-[13px] font-extrabold text-[#0000ff]">
                  {copy.tabLogin}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default RegisterScreen;

