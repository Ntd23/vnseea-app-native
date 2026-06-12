// Description: Renders the VNSEEA-style login screen with hero header,
// real branding logo (or "V" fallback), animated card, focus rings,
// inline error banner, and full i18n (vi / en).

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Lock, User } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInUp } from 'react-native-reanimated';
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

type LoginNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

function LoginScreen() {
  const navigation = useNavigation<LoginNav>();
  const [showPassword, setShowPassword] = useState(false);
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

  useEffect(() => {
    if (!sessionStorage.getAccessToken()) {
      return;
    }

    navigation.reset({
      index: 0,
      routes: [{ name: ROUTES.MAIN_TABS }],
    });
  }, [navigation]);

  // Re-read language if the user changes it in Settings while the screen is mounted
  // (Settings updates MMKV and dispatches the new value through languageStorage).
  useEffect(() => {
    const interval = setInterval(() => {
      const next = languageStorage.getLanguage();
      setLanguage(prev => (prev === next ? prev : next));
    }, 800);
    return () => clearInterval(interval);
  }, []);

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

  // We re-use the local showPassword flag only for backwards compat; the
  // AuthTextField manages its own toggle internally. Suppress the unused var
  // when minification-friendly code is added later.
  void showPassword;
  void setShowPassword;

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <LoginHero
            siteName={siteName}
            subtitle={copy.brandSubtitle}
            logoUrl={logoUrl}
            onLogoImageError={notifyImageError}
          />

          <Animated.View
            entering={FadeInUp.delay(140).duration(420)}
            className="surface-base -mt-8 flex-1 rounded-t-[32px] px-6 pb-10 pt-6"
          >
            <AuthTabs
              labels={{ active: copy.tabLogin, inactive: copy.tabRegister }}
              activeIsLogin
              onPressLogin={() => undefined}
              onPressRegister={handleRegister}
            />

            <View className="mt-6 gap-4">
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
              />

              <View>
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-[13px] font-semibold text-slate-800">
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
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default LoginScreen;
