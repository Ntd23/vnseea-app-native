// Description: Renders the backend-backed register screen with Nuxt-aligned field labels and order.

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  LayoutChangeEvent,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CalendarDays, Lock, User } from 'lucide-react-native';
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
import LoginHero from '../components/LoginHero';
import AuthTabs from '../components/AuthTabs';
import AuthTextField from '../components/AuthTextField';
import AuthSubmitButton from '../components/AuthSubmitButton';
import AuthFooterLink from '../components/AuthFooterLink';
import AuthErrorBanner from '../components/AuthErrorBanner';

type RegisterNav = NativeStackNavigationProp<RootStackParamList>;
type RegisterFieldKey =
  | 'username'
  | 'email'
  | 'birthDate'
  | 'gender'
  | 'password'
  | 'confirmPassword'
  | 'terms';

const BRAND = '#0000ff';
const TERMS_URL = 'https://v2.vnseea.vn/terms/terms';
const PRIVACY_URL = 'https://v2.vnseea.vn/terms/privacy-policy';

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function formatDateForApi(date: Date) {
  return `${date.getFullYear()}-${padDatePart(
    date.getMonth() + 1,
  )}-${padDatePart(date.getDate())}`;
}

function parseBirthdayDate(value: string) {
  const normalized = value.trim();
  if (!normalized || normalized === '0000-00-00') return null;

  const apiMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (apiMatch) {
    const year = Number(apiMatch[1]);
    const month = Number(apiMatch[2]);
    const day = Number(apiMatch[3]);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const displayMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (displayMatch) {
    const day = Number(displayMatch[1]);
    const month = Number(displayMatch[2]);
    const year = Number(displayMatch[3]);
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function formatDateForDisplay(value: string) {
  const date = parseBirthdayDate(value);
  if (!date) return '';
  return `${padDatePart(date.getDate())}/${padDatePart(
    date.getMonth() + 1,
  )}/${date.getFullYear()}`;
}

function isValidLoginIdentity(value: string) {
  const normalized = value.trim();
  if (!normalized) return false;
  if (normalized.includes('@')) {
    return normalized.includes('.') && normalized.length >= 5;
  }
  return normalized.replace(/\D/g, '').length >= 8;
}

function RegisterScreen() {
  const navigation = useNavigation<RegisterNav>();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [hasExistingStorefront, setHasExistingStorefront] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [birthdayPickerVisible, setBirthdayPickerVisible] = useState(false);
  const [language, setLanguage] = useState<AppLanguage>(() =>
    languageStorage.getLanguage(),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const copy = useMemo(() => getAuthCopy(language), [language]);
  const { error, isLoading, register } = useAuthViewModel();
  const { logoUrl, siteName, notifyImageError } = useAuthBranding();
  const visibleError = validationError ?? error;

  const scrollRef = useRef<ScrollView | null>(null);
  const cardYRef = useRef(0);
  const fieldYRef = useRef<Record<RegisterFieldKey, number>>({
    username: 0,
    email: 0,
    birthDate: 0,
    gender: 0,
    password: 0,
    confirmPassword: 0,
    terms: 0,
  });
  const focusedFieldRef = useRef<RegisterFieldKey | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = languageStorage.getLanguage();
      setLanguage(prev => (prev === next ? prev : next));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const scrollToField = useCallback((field: RegisterFieldKey) => {
    focusedFieldRef.current = field;
    const targetY = Math.max(
      0,
      cardYRef.current + fieldYRef.current[field] - 24,
    );
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    }, 90);
  }, []);

  useEffect(() => {
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      if (focusedFieldRef.current) {
        scrollToField(focusedFieldRef.current);
      }
    });

    return () => subscription.remove();
  }, [scrollToField]);

  const handleCardLayout = useCallback((event: LayoutChangeEvent) => {
    cardYRef.current = event.nativeEvent.layout.y;
  }, []);

  const handleFieldLayout = useCallback(
    (field: RegisterFieldKey) => (event: LayoutChangeEvent) => {
      fieldYRef.current[field] = event.nativeEvent.layout.y;
    },
    [],
  );

  const selectedBirthday = parseBirthdayDate(birthDate) || new Date(2000, 0, 1);
  const birthDateDisplay = formatDateForDisplay(birthDate);

  const openBirthdayPicker = useCallback(() => {
    Keyboard.dismiss();
    scrollToField('birthDate');
    setBirthdayPickerVisible(true);
  }, [scrollToField]);

  const handleBirthdayChange = useCallback(
    (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setBirthdayPickerVisible(false);
      }
      if (event.type === 'dismissed' || !selectedDate) return;
      setBirthDate(formatDateForApi(selectedDate));
      setValidationError(null);
    },
    [],
  );

  const handleRegister = useCallback(async () => {
    if (!username.trim()) {
      setValidationError('Nhập tên người dùng.');
      return;
    }
    if (!isValidLoginIdentity(email)) {
      setValidationError(copy.validationUsername);
      return;
    }
    if (!password) {
      setValidationError(copy.validationPassword);
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (!acceptedTerms) {
      Alert.alert(copy.termsAlertTitle, copy.termsAlertMessage);
      return;
    }

    setValidationError(null);
    const displayName = username.trim() || email.trim();

    try {
      const result = await register({
        firstName: displayName,
        lastName: '',
        username,
        email,
        password,
        confirmPassword,
        birthday: birthDate,
        gender,
        hasExistingStorefront,
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
  }, [
    acceptedTerms,
    birthDate,
    confirmPassword,
    copy.termsAlertMessage,
    copy.termsAlertTitle,
    copy.validationPassword,
    copy.validationUsername,
    copy.verificationTitle,
    email,
    gender,
    hasExistingStorefront,
    navigation,
    password,
    register,
    username,
  ]);

  const handleLoginPress = useCallback(() => {
    navigation.navigate(ROUTES.LOGIN);
  }, [navigation]);

  const openExternalLink = useCallback((url: string) => {
    Linking.openURL(url).catch(() => undefined);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FBFF]" edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FBFF" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="flex-grow bg-[#F8FBFF] pb-4"
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="never"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LoginHero
            siteName={siteName}
            subtitle={copy.brandSubtitle}
            logoUrl={logoUrl}
            onLogoImageError={notifyImageError}
          />

          <View
            onLayout={handleCardLayout}
            className="mx-6 -mt-7 rounded-[32px] bg-white px-6 pb-6 pt-5"
            style={{
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 18 },
              shadowOpacity: 0.09,
              shadowRadius: 34,
              elevation: 8,
            }}
          >
            <AuthTabs
              labels={{ active: copy.tabLogin, inactive: copy.tabRegister }}
              activeIsLogin={false}
              onPressLogin={handleLoginPress}
              onPressRegister={() => undefined}
            />

            <View className="mt-5 gap-4">
              <AuthTextField
                label={copy.username}
                placeholder={copy.registerUsernamePlaceholder}
                value={username}
                onChangeText={value => {
                  setUsername(value);
                  setValidationError(null);
                }}
                icon={<User size={18} color={BRAND} />}
                returnKeyType="next"
                onFocus={() => scrollToField('username')}
                onBlur={() => {
                  focusedFieldRef.current = null;
                }}
                onContainerLayout={handleFieldLayout('username')}
              />

              <AuthTextField
                label={copy.email}
                placeholder={copy.emailPlaceholder}
                value={email}
                onChangeText={value => {
                  setEmail(value);
                  setValidationError(null);
                }}
                icon={<User size={18} color={BRAND} />}
                keyboardType="email-address"
                returnKeyType="next"
                onFocus={() => scrollToField('email')}
                onBlur={() => {
                  focusedFieldRef.current = null;
                }}
                onContainerLayout={handleFieldLayout('email')}
              />

              <View
                className="w-full"
                onLayout={handleFieldLayout('birthDate')}
              >
                <Text className="mb-2 text-[14px] font-extrabold text-slate-900">
                  {copy.birthDate}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={openBirthdayPicker}
                  className="flex-row items-center rounded-[20px] bg-white px-3.5"
                  style={{
                    height: 56,
                    borderWidth: birthdayPickerVisible ? 1.5 : 1,
                    borderColor: birthdayPickerVisible
                      ? BRAND
                      : 'rgba(0, 0, 255, 0.12)',
                    shadowColor: BRAND,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: birthdayPickerVisible ? 0.1 : 0,
                    shadowRadius: 12,
                    elevation: birthdayPickerVisible ? 2 : 0,
                  }}
                >
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-2xl bg-[#EEF4FF]">
                    <CalendarDays size={18} color={BRAND} />
                  </View>
                  <Text
                    className={`flex-1 text-[15px] font-medium ${
                      birthDateDisplay ? 'text-slate-900' : 'text-[#9AA0A6]'
                    }`}
                  >
                    {birthDateDisplay || copy.birthDatePlaceholder}
                  </Text>
                  <CalendarDays size={18} color="#8A8D91" />
                </TouchableOpacity>
              </View>

              <View onLayout={handleFieldLayout('gender')}>
                <Text className="mb-2 text-[14px] font-extrabold text-slate-900">
                  {copy.gender}
                </Text>
                <View className="flex-row gap-3">
                  {(['male', 'female'] as const).map(value => {
                    const active = gender === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        activeOpacity={0.82}
                        onPress={() => setGender(value)}
                        className="flex-1 items-center justify-center rounded-[20px]"
                        style={{
                          height: 50,
                          borderWidth: active ? 1.5 : 1,
                          borderColor: active ? BRAND : 'rgba(0,0,255,0.12)',
                          backgroundColor: active ? '#EEF4FF' : '#ffffff',
                        }}
                      >
                        <Text
                          className="text-[14px] font-extrabold"
                          style={{ color: active ? BRAND : '#475569' }}
                        >
                          {value === 'male'
                            ? copy.genderMale
                            : copy.genderFemale}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <AuthTextField
                label={copy.password}
                placeholder={copy.passwordPlaceholder}
                value={password}
                onChangeText={value => {
                  setPassword(value);
                  setValidationError(null);
                }}
                icon={<Lock size={18} color={BRAND} />}
                isPassword
                returnKeyType="next"
                onFocus={() => scrollToField('password')}
                onBlur={() => {
                  focusedFieldRef.current = null;
                }}
                onContainerLayout={handleFieldLayout('password')}
              />

              <AuthTextField
                label={copy.confirmPassword}
                placeholder={copy.confirmPasswordPlaceholder}
                value={confirmPassword}
                onChangeText={value => {
                  setConfirmPassword(value);
                  setValidationError(null);
                }}
                icon={<Lock size={18} color={BRAND} />}
                isPassword
                returnKeyType="done"
                onSubmitEditing={handleRegister}
                onFocus={() => scrollToField('confirmPassword')}
                onBlur={() => {
                  focusedFieldRef.current = null;
                }}
                onContainerLayout={handleFieldLayout('confirmPassword')}
              />

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setHasExistingStorefront(value => !value)}
                className="flex-row items-start"
              >
                <View
                  className={`mt-0.5 h-[18px] w-[18px] items-center justify-center rounded-md border ${
                    hasExistingStorefront
                      ? 'border-[#0000ff] bg-[#0000ff]'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {hasExistingStorefront ? (
                    <View className="h-2 w-2 rounded-[2px] bg-white" />
                  ) : null}
                </View>
                <Text className="ml-2.5 flex-1 text-[12px] leading-5 text-slate-500">
                  {copy.storefrontQuestion}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setAcceptedTerms(value => !value)}
                className="flex-row items-start"
                onLayout={handleFieldLayout('terms')}
              >
                <View
                  className={`mt-0.5 h-[18px] w-[18px] items-center justify-center rounded-md border ${
                    acceptedTerms
                      ? 'border-[#0000ff] bg-[#0000ff]'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {acceptedTerms ? (
                    <View className="h-2 w-2 rounded-[2px] bg-white" />
                  ) : null}
                </View>
                <Text className="ml-2.5 flex-1 text-[12px] leading-5 text-slate-500">
                  {copy.termsPrefix}
                  <Text
                    className="font-semibold text-[#0000ff]"
                    onPress={() => openExternalLink(TERMS_URL)}
                  >
                    {copy.termsService}
                  </Text>
                  {copy.termsAnd}
                  <Text
                    className="font-semibold text-[#0000ff]"
                    onPress={() => openExternalLink(PRIVACY_URL)}
                  >
                    {copy.privacyPolicy}
                  </Text>
                  {copy.termsSuffix}
                </Text>
              </TouchableOpacity>
            </View>

            <AuthErrorBanner message={visibleError} />

            <AuthSubmitButton
              label={copy.tabRegister}
              onPress={handleRegister}
              isLoading={isLoading}
            />

            <AuthFooterLink
              prompt={copy.alreadyHaveAccount}
              action={copy.tabLogin}
              onPress={handleLoginPress}
            />
          </View>
        </ScrollView>

        {birthdayPickerVisible && Platform.OS === 'android' ? (
          <DateTimePicker
            value={selectedBirthday}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={handleBirthdayChange}
          />
        ) : null}

        {birthdayPickerVisible && Platform.OS === 'ios' ? (
          <Modal
            transparent
            visible={birthdayPickerVisible}
            animationType="slide"
            onRequestClose={() => setBirthdayPickerVisible(false)}
          >
            <View className="flex-1 justify-end bg-black/40">
              <View className="rounded-t-3xl bg-white px-4 pb-6 pt-4">
                <View className="mb-4 flex-row items-center justify-between">
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setBirthdayPickerVisible(false)}
                    className="rounded-full bg-slate-100 px-4 py-2"
                  >
                    <Text className="font-semibold text-slate-700">Hủy</Text>
                  </TouchableOpacity>
                  <Text className="text-lg font-extrabold text-slate-950">
                    {copy.birthDate}
                  </Text>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => setBirthdayPickerVisible(false)}
                    className="rounded-full bg-blue-600 px-4 py-2"
                  >
                    <Text className="font-semibold text-white">Xong</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={selectedBirthday}
                  mode="date"
                  display="spinner"
                  maximumDate={new Date()}
                  onChange={handleBirthdayChange}
                />
              </View>
            </View>
          </Modal>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default RegisterScreen;
