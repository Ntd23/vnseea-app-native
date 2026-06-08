// Description: Renders the Stitch VNSEEA-style login screen using the real auth API.
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight, Eye, EyeOff, Lock, User } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { useAuthViewModel } from '../../application/view-models/useAuthViewModel';

type LoginNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000FF';

function LoginScreen() {
  const navigation = useNavigation<LoginNav>();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const { error, isLoading, login } = useAuthViewModel();
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

  async function handleLogin() {
    const normalizedUsername = username.trim();

    if (!normalizedUsername) {
      setValidationError('Nhập email hoặc username.');
      return;
    }

    if (!password) {
      setValidationError('Nhập mật khẩu.');
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

      Alert.alert('Cần xác minh', result.message);
    } catch {
      // The view model exposes the message for inline rendering.
    }
  }

  function handleForgotPassword() {
    navigation.navigate(ROUTES.FORGOT_PASSWORD);
  }

  function handleRegister() {
    navigation.navigate(ROUTES.REGISTER);
  }

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" />

      <KeyboardAvoidingView
        style={styles.flex1}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Hero Header - Brand Blue */}
        <View style={styles.heroHeader}>
          {/* Decorative circles */}
          <View style={styles.heroCircle1} />
          <View style={styles.heroCircle2} />
          <View style={styles.heroCircle3} />

          <View style={styles.heroContent}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoText}>V</Text>
            </View>
            <Text style={styles.brandName}>VNSEEA</Text>
            <Text style={styles.brandSubtitle}>MẠNG XÃ HỘI VIỆT NAM</Text>
          </View>
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          {/* Tab Switcher */}
          <View style={styles.tabContainer}>
            <View style={styles.tabActive}>
              <Text style={styles.tabActiveText}>Đăng nhập</Text>
            </View>
            <TouchableOpacity
              style={styles.tabInactive}
              activeOpacity={0.7}
              onPress={handleRegister}
            >
              <Text style={styles.tabInactiveText}>Đăng ký</Text>
            </TouchableOpacity>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email hoặc username</Text>
            <View style={styles.inputShell}>
              <View style={styles.inputIconWrapper}>
                <User size={18} color={BRAND} />
              </View>
              <TextInput
                style={styles.textInput}
                placeholder="Nhập email hoặc username"
                placeholderTextColor="#9AA0A6"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                value={username}
                onChangeText={value => {
                  setUsername(value);
                  setValidationError(null);
                }}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={[styles.inputGroup, styles.mt16]}>
            <View style={styles.labelRow}>
              <Text style={styles.inputLabel}>Mật khẩu</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={handleForgotPassword}>
                <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputShell}>
              <View style={styles.inputIconWrapper}>
                <Lock size={18} color={BRAND} />
              </View>
              <TextInput
                style={[styles.textInput, styles.flex1]}
                placeholder="Nhập mật khẩu"
                placeholderTextColor="#9AA0A6"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                returnKeyType="done"
                value={password}
                onChangeText={value => {
                  setPassword(value);
                  setValidationError(null);
                }}
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => setShowPassword(value => !value)}
                style={styles.eyeBtn}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#8A8D91" />
                ) : (
                  <Eye size={20} color="#8A8D91" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Error Message */}
          {visibleError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{visibleError}</Text>
            </View>
          ) : null}

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, isLoading && styles.loginBtnLoading]}
            activeOpacity={0.9}
            disabled={isLoading}
            onPress={handleLogin}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <View style={styles.loginBtnContent}>
                <Text style={styles.loginBtnText}>Đăng nhập</Text>
                <ChevronRight size={20} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerTextSecondary}>Chưa có tài khoản?</Text>
            <TouchableOpacity
              style={styles.ml6}
              activeOpacity={0.7}
              onPress={handleRegister}
            >
              <Text style={styles.registerLinkText}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  ml6: { marginLeft: 6 },

  // Hero Header
  heroHeader: {
    backgroundColor: BRAND,
    height: 280,
    overflow: 'hidden',
    position: 'relative',
  },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
  },
  heroCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroCircle2: {
    position: 'absolute',
    bottom: -20,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  heroCircle3: {
    position: 'absolute',
    top: 40,
    left: 30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  brandName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 1.5,
    marginTop: 6,
  },

  // Card Body
  cardBody: {
    flex: 1,
    backgroundColor: '#F1F4FB',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -32,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },

  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 4,
    marginBottom: 24,
  },
  tabActive: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: BRAND,
    borderRadius: 12,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  tabActiveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tabInactive: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabInactiveText: {
    color: '#8A8D91',
    fontSize: 14,
    fontWeight: '600',
  },

  // Inputs
  inputGroup: {
    width: '100%',
  },
  mt16: { marginTop: 16 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  forgotPasswordText: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND,
  },
  inputShell: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 255, 0.12)',
    borderRadius: 16,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  inputIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#1A1A1A',
    paddingVertical: 0,
  },
  eyeBtn: {
    paddingHorizontal: 8,
  },

  // Error
  errorContainer: {
    marginTop: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Login Button
  loginBtn: {
    height: 52,
    borderRadius: 16,
    backgroundColor: BRAND,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: BRAND,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
  loginBtnLoading: { opacity: 0.8 },
  loginBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Register
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  registerTextSecondary: {
    fontSize: 14,
    color: '#8A8D91',
  },
  registerLinkText: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND,
  },
});

export default LoginScreen;