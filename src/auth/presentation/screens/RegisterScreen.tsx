// Description: Renders the backend-backed register screen with Nuxt-aligned field labels and order.

import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  type KeyboardEvent,
  Linking,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CalendarDays, Lock, User } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROOT_SAFE_AREA_EDGES } from '../../../shared-kernel/presentation/utils/safeAreaEdges';
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
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { parseRegistrationIdentity } from '../../domain/registrationIdentity';

type RegisterNav = NativeStackNavigationProp<RootStackParamList>;
type RegisterFieldKey =
  | 'username'
  | 'email'
  | 'birthDate'
  | 'gender'
  | 'password'
  | 'confirmPassword'
  | 'terms';

const BRAND = APP_BRAND_COLOR;
const TERMS_URL = 'https://v2.vnseea.vn/terms/terms';
const PRIVACY_URL = 'https://v2.vnseea.vn/terms/privacy-policy';
const REGISTER_USERNAME_PATTERN = /^[A-Za-z0-9_]+$/;
const MIN_BIRTH_YEAR = new Date().getFullYear() - 100;
const BIRTHDAY_OPTION_ROW_HEIGHT = 50;
const BIRTHDAY_COLUMN_HEIGHT = 210;

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getTodayParts() {
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
}

function clampBirthdayParts(year: number, month: number, day: number) {
  const today = getTodayParts();
  const safeYear = Math.min(Math.max(year, MIN_BIRTH_YEAR), today.year);
  const maxMonth = safeYear === today.year ? today.month : 12;
  const safeMonth = Math.min(Math.max(month, 1), maxMonth);
  const maxDayForMonth = daysInMonth(safeYear, safeMonth);
  const maxDay =
    safeYear === today.year && safeMonth === today.month
      ? Math.min(today.day, maxDayForMonth)
      : maxDayForMonth;
  const safeDay = Math.min(Math.max(day, 1), maxDay);

  return { year: safeYear, month: safeMonth, day: safeDay };
}

function buildBirthdayDate(year: number, month: number, day: number) {
  const safe = clampBirthdayParts(year, month, day);
  return new Date(safe.year, safe.month - 1, safe.day);
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

type BirthdayPickerOption = {
  value: number;
  label: string;
};

const BirthdayPickerColumn = React.memo(function BirthdayPickerColumn({
  label,
  options,
  selectedValue,
  onSelect,
}: {
  label: string;
  options: BirthdayPickerOption[];
  selectedValue: number;
  onSelect: (value: number) => void;
}) {
  const listRef = useRef<FlatList<BirthdayPickerOption> | null>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex(option => option.value === selectedValue),
  );

  useEffect(() => {
    if (!options.length) return undefined;

    const timeout = setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: false,
        viewPosition: 0.42,
      });
    }, 0);

    return () => clearTimeout(timeout);
  }, [options.length, selectedIndex]);

  return (
    <View className="flex-1">
      <Text className="mb-2 text-center text-[12px] font-extrabold uppercase text-slate-500">
        {label}
      </Text>
      <FlatList
        ref={listRef}
        data={options}
        keyExtractor={option => `${label}-${option.value}`}
        style={{
          maxHeight: BIRTHDAY_COLUMN_HEIGHT,
          borderRadius: 22,
          backgroundColor: '#f8fafc',
        }}
        contentContainerStyle={{ paddingVertical: 8 }}
        getItemLayout={(_, index) => ({
          length: BIRTHDAY_OPTION_ROW_HEIGHT,
          offset: BIRTHDAY_OPTION_ROW_HEIGHT * index,
          index,
        })}
        initialNumToRender={7}
        maxToRenderPerBatch={6}
        removeClippedSubviews
        windowSize={5}
        onScrollToIndexFailed={info => {
          setTimeout(() => {
            listRef.current?.scrollToOffset({
              offset: Math.max(0, info.index - 2) * BIRTHDAY_OPTION_ROW_HEIGHT,
              animated: false,
            });
          }, 0);
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const selected = item.value === selectedValue;
          return (
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => onSelect(item.value)}
              className="mx-2 my-1 items-center justify-center rounded-2xl"
              style={{
                height: 42,
                backgroundColor: selected ? BRAND : 'transparent',
                borderWidth: selected ? 0 : 1,
                borderColor: selected ? BRAND : 'rgba(15, 23, 42, 0.06)',
              }}
            >
              <Text
                className="text-[15px] font-extrabold"
                style={{ color: selected ? '#fff' : '#334155' }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
});

function RegisterScreen() {
  const navigation = useNavigation<RegisterNav>();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [draftBirthday, setDraftBirthday] = useState(() => new Date(2000, 0, 1));
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
  const isVi = language === 'vi';

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
  const keyboardBottomInsetRef = useRef(0);
  const [keyboardBottomInset, setKeyboardBottomInset] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = languageStorage.getLanguage();
      setLanguage(prev => (prev === next ? prev : next));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const scrollToField = useCallback((field: RegisterFieldKey, delay = 90) => {
    focusedFieldRef.current = field;
    const keyboardIsOpen = keyboardBottomInsetRef.current > 0;
    const shouldLiftMore =
      field === 'password' || field === 'confirmPassword' || field === 'terms';
    const fieldTopOffset = keyboardIsOpen ? (shouldLiftMore ? 112 : 56) : 48;
    const targetY = Math.max(
      0,
      cardYRef.current + fieldYRef.current[field] - fieldTopOffset,
    );
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    }, delay);
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleKeyboardShow = (event: KeyboardEvent) => {
      const nextInset =
        Platform.OS === 'android'
          ? Math.max(0, event.endCoordinates?.height ?? 0)
          : 0;
      keyboardBottomInsetRef.current = nextInset;
      setKeyboardBottomInset(nextInset);
      if (focusedFieldRef.current) {
        scrollToField(focusedFieldRef.current, Platform.OS === 'android' ? 140 : 40);
      }
    };

    const handleKeyboardHide = () => {
      keyboardBottomInsetRef.current = 0;
      setKeyboardBottomInset(0);
    };

    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
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

  const selectedBirthday = useMemo(
    () => parseBirthdayDate(birthDate) || new Date(2000, 0, 1),
    [birthDate],
  );
  const birthDateDisplay = formatDateForDisplay(birthDate);
  const draftYear = draftBirthday.getFullYear();
  const draftMonth = draftBirthday.getMonth() + 1;
  const draftDay = draftBirthday.getDate();
  const draftBirthdayDisplay = formatDateForDisplay(
    formatDateForApi(draftBirthday),
  );
  const todayParts = useMemo(() => getTodayParts(), []);

  const yearOptions = useMemo(
    () =>
      Array.from(
        { length: todayParts.year - MIN_BIRTH_YEAR + 1 },
        (_, index) => {
          const year = todayParts.year - index;
          return { value: year, label: String(year) };
        },
      ),
    [todayParts.year],
  );

  const monthOptions = useMemo(() => {
    const maxMonth = draftYear === todayParts.year ? todayParts.month : 12;
    return Array.from({ length: maxMonth }, (_, index) => {
      const month = index + 1;
      return { value: month, label: padDatePart(month) };
    });
  }, [draftYear, todayParts.month, todayParts.year]);

  const dayOptions = useMemo(() => {
    const maxDayForMonth = daysInMonth(draftYear, draftMonth);
    const maxDay =
      draftYear === todayParts.year && draftMonth === todayParts.month
        ? Math.min(todayParts.day, maxDayForMonth)
        : maxDayForMonth;
    return Array.from({ length: maxDay }, (_, index) => {
      const day = index + 1;
      return { value: day, label: padDatePart(day) };
    });
  }, [draftMonth, draftYear, todayParts.day, todayParts.month, todayParts.year]);

  const updateDraftBirthday = useCallback(
    (part: 'day' | 'month' | 'year', value: number) => {
      setDraftBirthday(previous => {
        const nextYear = part === 'year' ? value : previous.getFullYear();
        const nextMonth = part === 'month' ? value : previous.getMonth() + 1;
        const nextDay = part === 'day' ? value : previous.getDate();
        return buildBirthdayDate(nextYear, nextMonth, nextDay);
      });
    },
    [],
  );

  const openBirthdayPicker = useCallback(() => {
    if (birthdayPickerVisible) return;

    setDraftBirthday(selectedBirthday);
    setBirthdayPickerVisible(true);
    focusedFieldRef.current = null;
    setTimeout(() => {
      Keyboard.dismiss();
    }, 0);
  }, [birthdayPickerVisible, selectedBirthday]);

  const closeBirthdayPicker = useCallback(() => {
    setBirthdayPickerVisible(false);
  }, []);

  const confirmBirthdayPicker = useCallback(() => {
    setBirthDate(formatDateForApi(draftBirthday));
    setBirthdayPickerVisible(false);
    setValidationError(null);
  }, [draftBirthday]);

  const clearBirthdayPicker = useCallback(() => {
    setBirthDate('');
    setDraftBirthday(new Date(2000, 0, 1));
    setBirthdayPickerVisible(false);
    setValidationError(null);
  }, []);

  const handleRegister = useCallback(async () => {
    const normalizedUsername = username.trim();
    if (!normalizedUsername) {
      setValidationError('Nhập tên người dùng.');
      return;
    }
    if (normalizedUsername.length < 5 || normalizedUsername.length > 32) {
      setValidationError(
        isVi
          ? 'Tên người dùng phải có từ 5 đến 32 ký tự.'
          : 'Username must be between 5 and 32 characters.',
      );
      return;
    }
    if (!REGISTER_USERNAME_PATTERN.test(normalizedUsername)) {
      setValidationError(
        isVi
          ? 'Tên người dùng chỉ được chứa chữ, số và dấu gạch dưới.'
          : 'Username can only contain letters, numbers, and underscores.',
      );
      return;
    }
    const registrationIdentity = parseRegistrationIdentity(email);
    if (!registrationIdentity) {
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
    const displayName = normalizedUsername;

    try {
      const result = await register({
        firstName: displayName,
        lastName: '',
        username: normalizedUsername,
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

      navigation.replace(ROUTES.EMAIL_VERIFICATION, {
        userId: result.userId,
        identity: result.identity || registrationIdentity.value,
        channel:
          result.channel ||
          (registrationIdentity.type === 'phone' ? 'sms' : 'email'),
      });
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
    email,
    gender,
    hasExistingStorefront,
    isVi,
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
    <SafeAreaView className="flex-1 bg-[#F8FBFF]" edges={ROOT_SAFE_AREA_EDGES}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#F8FBFF" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="flex-grow bg-[#F8FBFF]"
          contentContainerStyle={{
            paddingBottom:
              Platform.OS === 'android' && keyboardBottomInset > 0
                ? keyboardBottomInset + 32
                : 16,
          }}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentInsetAdjustmentBehavior="never"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
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
                  activeOpacity={0.9}
                  delayPressIn={0}
                  onPressIn={openBirthdayPicker}
                  className="flex-row items-center rounded-[20px] bg-white px-3.5"
                  style={{
                    height: 56,
                    borderWidth: birthdayPickerVisible ? 1.5 : 1,
                    borderColor: birthdayPickerVisible
                      ? BRAND
                      : 'rgba(185, 28, 28, 0.18)',
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
                          borderColor: active ? BRAND : 'rgba(185,28,28,0.18)',
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
                      ? 'border-brand bg-brand'
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
                      ? 'border-brand bg-brand'
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
                    className="font-semibold text-brand"
                    onPress={() => openExternalLink(TERMS_URL)}
                  >
                    {copy.termsService}
                  </Text>
                  {copy.termsAnd}
                  <Text
                    className="font-semibold text-brand"
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

        <Modal
          transparent
          visible={birthdayPickerVisible}
          animationType="none"
          statusBarTranslucent
          onRequestClose={closeBirthdayPicker}
        >
          <View className="flex-1 justify-end bg-black/45">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="close-birthday-picker"
              onPress={closeBirthdayPicker}
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
              }}
            />
            <View
              className="rounded-t-[32px] bg-white px-5 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 16) + 10 }}
            >
              <View className="self-center h-1.5 w-12 rounded-full bg-slate-200" />

              <View className="mt-4 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl bg-[#EEF4FF]">
                    <CalendarDays size={20} color={BRAND} />
                  </View>
                  <View>
                    <Text className="text-[18px] font-extrabold text-slate-950">
                      {isVi ? 'Chọn ngày sinh' : 'Choose birthday'}
                    </Text>
                    <Text className="mt-0.5 text-[12px] font-semibold text-slate-500">
                      {isVi
                        ? 'Không chọn ngày trong tương lai'
                        : 'Future dates are disabled'}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={closeBirthdayPicker}
                  className="rounded-full bg-slate-100 px-4 py-2"
                >
                  <Text className="text-[13px] font-extrabold text-slate-700">
                    {isVi ? 'Hủy' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View className="mt-4 rounded-[24px] bg-[#EEF4FF] px-4 py-3">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-[12px] font-extrabold uppercase text-slate-500">
                      {isVi ? 'Đang chọn' : 'Selected'}
                    </Text>
                    <Text className="mt-1 text-[22px] font-extrabold text-slate-950">
                      {draftBirthdayDisplay}
                    </Text>
                  </View>
                  <TouchableOpacity
                    activeOpacity={0.82}
                    onPress={clearBirthdayPicker}
                    className="rounded-full bg-white px-3 py-2"
                  >
                    <Text className="text-[12px] font-extrabold text-slate-600">
                      {isVi ? 'Bỏ chọn' : 'Clear'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View className="mt-4 flex-row gap-3">
                <BirthdayPickerColumn
                  label={isVi ? 'Ngày' : 'Day'}
                  options={dayOptions}
                  selectedValue={draftDay}
                  onSelect={value => updateDraftBirthday('day', value)}
                />
                <BirthdayPickerColumn
                  label={isVi ? 'Tháng' : 'Month'}
                  options={monthOptions}
                  selectedValue={draftMonth}
                  onSelect={value => updateDraftBirthday('month', value)}
                />
                <BirthdayPickerColumn
                  label={isVi ? 'Năm' : 'Year'}
                  options={yearOptions}
                  selectedValue={draftYear}
                  onSelect={value => updateDraftBirthday('year', value)}
                />
              </View>

              <View className="mt-5 flex-row gap-3">
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={closeBirthdayPicker}
                  className="h-12 flex-1 items-center justify-center rounded-[18px] bg-slate-100"
                >
                  <Text className="text-[14px] font-extrabold text-slate-700">
                    {isVi ? 'Hủy' : 'Cancel'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.86}
                  onPress={confirmBirthdayPicker}
                  className="h-12 flex-1 items-center justify-center rounded-[18px] bg-brand"
                >
                  <Text className="text-[14px] font-extrabold text-white">
                    {isVi ? 'Xong' : 'Done'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default RegisterScreen;
