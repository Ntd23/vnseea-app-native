// Description: Renders the no-footer forgot password screen using the real auth API.
import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  Mail,
  Network,
  RefreshCcw,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useAuthViewModel } from '../../application/view-models/useAuthViewModel';

type ForgotPasswordNav = NativeStackNavigationProp<RootStackParamList>;

function ForgotPasswordScreen() {
  const navigation = useNavigation<ForgotPasswordNav>();
  const [email, setEmail] = useState('');
  const { error, forgotPassword, isLoading, passwordResetSent } =
    useAuthViewModel();

  async function handleSubmit() {
    try {
      await forgotPassword({ email });
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
          <View className="h-10 w-10 items-center justify-center">
            <Network size={32} color="#0000FF" strokeWidth={2.6} />
          </View>
          <Text className="flex-1 text-center text-display text-brand">
            WoWonder
          </Text>
          <View className="h-10 w-10" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow justify-center px-4 py-6"
          keyboardShouldPersistTaps="handled"
        >
          <View className="surface-panel px-6 py-8">
            <View className="items-center">
              <View className="icon-chip mb-5 h-12 w-12 items-center justify-center">
                <RefreshCcw size={24} color="#0000FF" strokeWidth={3} />
                <View className="icon-chip absolute h-5 w-5 items-center justify-center">
                  <LockKeyhole size={12} color="#0000FF" strokeWidth={3} />
                </View>
              </View>
              <Text className="text-center text-heading">Quên mật khẩu</Text>
              <Text className="mt-3 text-center text-body-secondary">
                Vui lòng nhập địa chỉ email liên kết với tài khoản của bạn.
                Chúng tôi sẽ gửi một liên kết để đặt lại mật khẩu.
              </Text>
            </View>

            <View className="mt-6">
              <Text className="mb-2 text-title-primary">Email</Text>
              <View className="input-shell min-h-[48px] flex-row items-center px-3">
                <Mail size={20} color="#757589" />
                <TextInput
                  className="ml-3 flex-1 text-body-primary"
                  placeholder="nhapemail@domain.com"
                  placeholderTextColor="#6B7280"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  value={email}
                  onChangeText={setEmail}
                  onSubmitEditing={handleSubmit}
                />
              </View>
            </View>

            <TouchableOpacity
              className="btn-primary mt-6 min-h-[48px] flex-row rounded-full"
              activeOpacity={0.9}
              disabled={isLoading}
              onPress={handleSubmit}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Text className="text-title-primary text-inverse">Gửi</Text>
                  <ArrowRight size={20} color="#FFFFFF" />
                </>
              )}
            </TouchableOpacity>

            {error ? (
              <Text className="mt-3 text-center text-caption-primary text-red-500">
                {error}
              </Text>
            ) : null}

            {passwordResetSent ? (
              <Text className="mt-3 text-center text-caption-primary text-brand">
                Email đặt lại mật khẩu đã được gửi.
              </Text>
            ) : null}

            <TouchableOpacity
              className="mt-6 min-h-[44px] flex-row items-center justify-center"
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={() => navigation.navigate(ROUTES.LOGIN)}
            >
              <ArrowLeft size={16} color="#64748B" />
              <Text className="ml-2 text-body-secondary">
                Quay lại đăng nhập
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default ForgotPasswordScreen;
