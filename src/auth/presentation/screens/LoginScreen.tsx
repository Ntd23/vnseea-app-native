// Description: Renders the VNSEEA-style login screen with hero header,
// real branding logo (or "V" fallback), animated card, focus rings,
// inline error banner, and full i18n (vi / en).

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Animated as RNAnimated,
  KeyboardAvoidingView,
  Keyboard,
  LayoutChangeEvent,
  Platform,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Lock, User } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROOT_SAFE_AREA_EDGES } from '../../../shared-kernel/presentation/utils/safeAreaEdges';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { useAuthViewModel } from '../../application/view-models/useAuthViewModel';
import { useAuthBranding } from '../../application/view-models/useAuthBranding';
import { getAuthCopy } from '../../application/i18n/authCopy';
import LoginHero from '../components/LoginHero';
import AuthTabs from '../components/AuthTabs';
import AuthTextField from '../components/AuthTextField';
import AuthSubmitButton from '../components/AuthSubmitButton';
import AuthDivider from '../components/AuthDivider';
import AuthFooterLink from '../components/AuthFooterLink';
import AuthErrorBanner from '../components/AuthErrorBanner';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type LoginNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';
type LoginFieldKey = 'username' | 'password';

function LoginScreen() {
  const navigation = useNavigation<LoginNav>();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [language, setLanguage] = useState<AppLanguage>(() =>
    languageStorage.getLanguage(),
  );

  const copy = useMemo(() => getAuthCopy(language), [language]);
  const { error, isLoading, login } = useAuthViewModel();
  const { logoUrl, siteName, notifyImageError } = useAuthBranding();
  const visibleError = validationError ?? error;
  const scrollRef = useRef<ScrollView | null>(null);
  const cardYRef = useRef(0);
  const fieldYRef = useRef<Record<LoginFieldKey, number>>({
    username: 0,
    password: 0,
  });
  const focusedFieldRef = useRef<LoginFieldKey | null>(null);
  const cardOpacity = useRef(new RNAnimated.Value(0)).current;
  const cardTranslateY = useRef(new RNAnimated.Value(26)).current;
  const heroScale = useRef(new RNAnimated.Value(0.96)).current;

  useEffect(() => {
    if (!sessionStorage.getAccessToken()) {
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: ROUTES.MAIN_TABS }],
    });
  }, [navigation]);

  useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.timing(cardOpacity, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
      RNAnimated.spring(cardTranslateY, {
        toValue: 0,
        damping: 18,
        stiffness: 110,
        mass: 0.9,
        useNativeDriver: true,
      }),
      RNAnimated.spring(heroScale, {
        toValue: 1,
        damping: 18,
        stiffness: 100,
        mass: 0.9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [cardOpacity, cardTranslateY, heroScale]);

  // Re-read language if the user changes it in Settings while the screen is mounted
  // (Settings updates MMKV and dispatches the new value through languageStorage).
  useEffect(() => {
    const interval = setInterval(() => {
      const next = languageStorage.getLanguage();
      setLanguage(prev => (prev === next ? prev : next));
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const scrollToField = useCallback((field: LoginFieldKey) => {
    focusedFieldRef.current = field;
    const targetY = Math.max(0, cardYRef.current + fieldYRef.current[field] - 24);

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
    (field: LoginFieldKey) => (event: LayoutChangeEvent) => {
      fieldYRef.current[field] = event.nativeEvent.layout.y;
    },
    [],
  );

  const handleLogin = useCallback(async () => {
    const normalizedUsername = username.trim();

    if (!normalizedUsername) {
      setValidationError(copy.validationUsername);
      return;
    }
    if (!password) {
      setValidationError(copy.validationPassword);
      return;
    }

    setValidationError(null);

    try {
      const result = await login({ username: normalizedUsername, password });
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
    copy.validationPassword,
    copy.validationUsername,
    copy.verificationTitle,
    login,
    navigation,
    password,
    username,
  ]);

  const handleForgotPassword = useCallback(() => {
    navigation.navigate(ROUTES.FORGOT_PASSWORD);
  }, [navigation]);

  const handleRegister = useCallback(() => {
    navigation.navigate(ROUTES.REGISTER);
  }, [navigation]);

  return (
    <SafeAreaView className="flex-1 bg-[#F8FBFF]" edges={ROOT_SAFE_AREA_EDGES}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#F8FBFF" />

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
          <RNAnimated.View
            style={{
              transform: [{ scale: heroScale }],
              opacity: cardOpacity,
            }}
          >
            <LoginHero
              siteName={siteName}
              subtitle={copy.brandSubtitle}
              logoUrl={logoUrl}
              onLogoImageError={notifyImageError}
            />
          </RNAnimated.View>

          <RNAnimated.View
            onLayout={handleCardLayout}
            className="mx-6 -mt-7 rounded-[32px] bg-white px-6 pb-6 pt-5"
            style={{
              opacity: cardOpacity,
              transform: [{ translateY: cardTranslateY }],
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 18 },
              shadowOpacity: 0.09,
              shadowRadius: 34,
              elevation: 8,
            }}
          >
            <AuthTabs
              labels={{ active: copy.tabLogin, inactive: copy.tabRegister }}
              activeIsLogin
              onPressLogin={() => undefined}
              onPressRegister={handleRegister}
            />

            <View className="mt-5 gap-4">
              <AuthTextField
                label={copy.usernameOrEmail}
                placeholder={copy.usernamePlaceholder}
                value={username}
                onChangeText={value => {
                  setUsername(value);
                  setValidationError(null);
                }}
                icon={<User size={18} color={BRAND} />}
                returnKeyType="next"
                keyboardType="email-address"
                onFocus={() => scrollToField('username')}
                onBlur={() => {
                  focusedFieldRef.current = null;
                }}
                onContainerLayout={handleFieldLayout('username')}
              />

              <View>
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-[14px] font-extrabold text-slate-900">
                    {copy.password}
                  </Text>
                  <Text
                    accessibilityRole="link"
                    onPress={handleForgotPassword}
                    className="text-[12px] font-semibold text-[#0000ff]"
                  >
                    {copy.forgotPassword}
                  </Text>
                </View>
                <AuthTextField
                  label=""
                  placeholder={copy.passwordPlaceholder}
                  value={password}
                  onChangeText={value => {
                    setPassword(value);
                    setValidationError(null);
                  }}
                  icon={<Lock size={18} color={BRAND} />}
                  isPassword
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
                  onFocus={() => scrollToField('password')}
                  onBlur={() => {
                    focusedFieldRef.current = null;
                  }}
                  onContainerLayout={handleFieldLayout('password')}
                />
              </View>
            </View>

            <AuthErrorBanner message={visibleError} />

            <AuthSubmitButton
              label={copy.loginCta}
              onPress={handleLogin}
              isLoading={isLoading}
            />

            <AuthDivider label={copy.or} />

            <AuthFooterLink
              prompt={copy.noAccount}
              action={copy.registerNow}
              onPress={handleRegister}
            />
          </RNAnimated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default LoginScreen;
