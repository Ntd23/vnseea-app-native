// Description: Renders the Stitch VNSEEA-style login screen using the real auth API.
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowRight, Eye, EyeOff, Network } from 'lucide-react-native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useAuthViewModel } from '../../application/view-models/useAuthViewModel';

type LoginNav = NativeStackNavigationProp<RootStackParamList>;

function SocialButton({
  label,
  icon,
}: {
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      className="btn-secondary min-h-[48px]"
      activeOpacity={0.8}
    >
      {icon}
      <Text className="text-title-primary">{label}</Text>
    </TouchableOpacity>
  );
}

function LoginScreen() {
  const navigation = useNavigation<LoginNav>();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { error, isLoading, login } = useAuthViewModel();

  async function handleLogin() {
    try {
      const result = await login({ username, password });

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

  return (
    <SafeAreaView className="flex-1 surface-base">
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9ff" />

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="surface-topbar h-16 flex-row items-center px-4">
          <View className="flex-row items-center">
            <Network size={26} color="#0000FF" strokeWidth={2.6} />
            <Text className="ml-2 text-display text-brand">WoWonder</Text>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center px-4 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <View className="surface-panel px-6 py-8">
            <View className="mb-8 items-center">
              <Text className="text-heading">Đăng nhập</Text>
              <Text className="mt-1 text-center text-body-secondary">
                Chào mừng bạn quay lại hệ thống.
              </Text>
            </View>

            <View>
              <Text className="mb-2 text-label-primary text-slate-500">
                Email hoặc username
              </Text>
              <View className="input-shell min-h-[48px] justify-center px-4">
                <TextInput
                  className="text-body-primary"
                  placeholder="Nhập email hoặc username"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  value={username}
                  onChangeText={setUsername}
                />
              </View>
            </View>

            <View className="mt-4">
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="text-label-primary text-slate-500">
                  Mật khẩu
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => navigation.navigate(ROUTES.FORGOT_PASSWORD)}
                >
                  <Text className="text-caption-primary text-brand">
                    Quên mật khẩu?
                  </Text>
                </TouchableOpacity>
              </View>
              <View className="input-shell min-h-[48px] flex-row items-center px-4">
                <TextInput
                  className="flex-1 text-body-primary"
                  placeholder="Nhập mật khẩu"
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="done"
                  value={password}
                  onChangeText={setPassword}
                  onSubmitEditing={handleLogin}
                />
                <TouchableOpacity
                  activeOpacity={0.8}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  onPress={() => setShowPassword(value => !value)}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#64748B" />
                  ) : (
                    <Eye size={20} color="#64748B" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              className="btn-primary mt-6 min-h-[48px]"
              activeOpacity={0.9}
              disabled={isLoading}
              onPress={handleLogin}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text className="text-title-primary text-inverse">
                    Đăng nhập
                  </Text>
                  <ArrowRight size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {error ? (
              <Text className="mt-3 text-center text-caption-primary text-red-500">
                {error}
              </Text>
            ) : null}

            <View className="my-6 flex-row items-center">
              <View className="divider-line flex-1" />
              <Text className="mx-4 text-caption-secondary">hoặc</Text>
              <View className="divider-line flex-1" />
            </View>

            <View className="gap-3">
              <SocialButton
                label="Đăng nhập với Google"
                icon={<Icon name="google" size={20} color="#4285F4" />}
              />
              <SocialButton
                label="Đăng nhập với Facebook"
                icon={<Icon name="facebook" size={20} color="#1877F2" />}
              />
              <SocialButton
                label="Đăng nhập với Apple"
                icon={<Icon name="apple" size={22} color="#000000" />}
              />
            </View>

            <View className="mt-8 flex-row items-center justify-center">
              <Text className="text-body-secondary">Chưa có tài khoản?</Text>
              <TouchableOpacity
                className="ml-1"
                activeOpacity={0.8}
                onPress={() => navigation.navigate(ROUTES.REGISTER)}
              >
                <Text className="text-title-primary text-brand">
                  Đăng ký ngay
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default LoginScreen;
