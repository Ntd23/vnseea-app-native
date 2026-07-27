import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldAlert,
  Trash2,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthViewModel } from '../../../auth/application/view-models/useAuthViewModel';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';

type DeleteAccountNav = NativeStackNavigationProp<RootStackParamList>;

const COPY = {
  vi: {
    title: 'Xóa tài khoản',
    warningTitle: 'Tài khoản sẽ bị xóa vĩnh viễn',
    warning:
      'Bài viết, ảnh, tin nhắn và dữ liệu cá nhân của bạn có thể không khôi phục được sau khi xóa.',
    passwordLabel: 'Mật khẩu hiện tại',
    passwordPlaceholder: 'Nhập mật khẩu để tiếp tục',
    deleteButton: 'Xóa tài khoản',
    confirmingTitle: 'Xác nhận xóa tài khoản',
    confirmingMessage:
      'Bạn có chắc chắn muốn xóa vĩnh viễn tài khoản này? Hành động này không thể hoàn tác.',
    cancel: 'Hủy',
    deletePermanently: 'Xóa vĩnh viễn',
    passwordRequired: 'Vui lòng nhập mật khẩu hiện tại.',
    passwordMismatch: 'Mật khẩu hiện tại không đúng.',
    deleteFailed: 'Không thể xóa tài khoản. Vui lòng thử lại.',
  },
  en: {
    title: 'Delete account',
    warningTitle: 'Your account will be permanently deleted',
    warning:
      'Your posts, photos, messages and personal data may not be recoverable after deletion.',
    passwordLabel: 'Current password',
    passwordPlaceholder: 'Enter your password to continue',
    deleteButton: 'Delete account',
    confirmingTitle: 'Confirm account deletion',
    confirmingMessage:
      'Are you sure you want to permanently delete this account? This action cannot be undone.',
    cancel: 'Cancel',
    deletePermanently: 'Delete permanently',
    passwordRequired: 'Please enter your current password.',
    passwordMismatch: 'The current password is incorrect.',
    deleteFailed: 'Unable to delete your account. Please try again.',
  },
} as const;

function resolveDeleteError(message: string, language: 'vi' | 'en') {
  const copy = COPY[language];
  if (message.includes('password_required')) return copy.passwordRequired;
  if (message.includes('password_mismatch')) return copy.passwordMismatch;
  return copy.deleteFailed;
}

function DeleteAccountScreen() {
  const navigation = useNavigation<DeleteAccountNav>();
  const language = useAppLanguage();
  const copy = COPY[language] ?? COPY.vi;
  const { deleteAccount, isLoading } = useAuthViewModel();
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    if (isLoading) return;
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate(ROUTES.MAIN_TABS, { screen: ROUTES.SETTINGS });
  }, [isLoading, navigation]);

  const performDelete = useCallback(async () => {
    setError(null);
    try {
      await deleteAccount(password);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : String(caughtError);
      setError(resolveDeleteError(message, language));
    }
  }, [deleteAccount, language, password]);

  const handleDeletePress = useCallback(() => {
    if (!password.trim() || isLoading) return;

    Alert.alert(copy.confirmingTitle, copy.confirmingMessage, [
      {
        text: copy.cancel,
        style: 'cancel',
      },
      {
        text: copy.deletePermanently,
        style: 'destructive',
        onPress: () => void performDelete(),
      },
    ]);
  }, [copy, isLoading, password, performDelete]);

  return (
    <SafeAreaView
      edges={['top', 'left', 'right', 'bottom']}
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
    >
      <FocusAwareStatusBar
        barStyle="light-content"
        backgroundColor={APP_BRAND_COLOR}
      />
      <View
        style={{
          minHeight: 54,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: APP_BRAND_COLOR,
          borderBottomColor: APP_COLORS.brand.borderOnPrimary,
          borderBottomWidth: 1,
          paddingHorizontal: 12,
        }}
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={copy.cancel}
          activeOpacity={0.78}
          disabled={isLoading}
          onPress={handleBack}
          style={{
            width: 44,
            height: 44,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={23} color="#FFFFFF" />
        </TouchableOpacity>
        <Text
          style={{
            flex: 1,
            color: '#FFFFFF',
            fontSize: 18,
            fontWeight: '800',
            textAlign: 'center',
          }}
        >
          {copy.title}
        </Text>
        <View style={{ width: 44, height: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{
              borderRadius: 8,
              borderWidth: 1,
              borderColor: '#FECACA',
              backgroundColor: '#FEF2F2',
              padding: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ShieldAlert size={24} color="#DC2626" />
              <Text
                style={{
                  marginLeft: 10,
                  flex: 1,
                  color: '#991B1B',
                  fontSize: 16,
                  fontWeight: '800',
                }}
              >
                {copy.warningTitle}
              </Text>
            </View>
            <Text
              style={{
                marginTop: 10,
                color: '#7F1D1D',
                fontSize: 14,
                lineHeight: 21,
              }}
            >
              {copy.warning}
            </Text>
          </View>

          <Text
            style={{
              marginTop: 28,
              marginBottom: 8,
              color: '#0F172A',
              fontSize: 15,
              fontWeight: '700',
            }}
          >
            {copy.passwordLabel}
          </Text>
          <View
            style={{
              minHeight: 52,
              flexDirection: 'row',
              alignItems: 'center',
              borderRadius: 8,
              borderWidth: 1,
              borderColor: error ? '#DC2626' : '#CBD5E1',
              backgroundColor: '#FFFFFF',
              paddingLeft: 14,
            }}
          >
            <TextInput
              value={password}
              onChangeText={value => {
                setPassword(value);
                setError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              secureTextEntry={!isPasswordVisible}
              placeholder={copy.passwordPlaceholder}
              placeholderTextColor="#94A3B8"
              style={{
                flex: 1,
                color: '#0F172A',
                fontSize: 16,
                paddingVertical: Platform.OS === 'ios' ? 14 : 0,
              }}
            />
            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.7}
              disabled={isLoading}
              onPress={() => setPasswordVisible(current => !current)}
              style={{
                width: 48,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isPasswordVisible ? (
                <EyeOff size={21} color="#64748B" />
              ) : (
                <Eye size={21} color="#64748B" />
              )}
            </TouchableOpacity>
          </View>
          {error ? (
            <Text
              accessibilityRole="alert"
              style={{
                marginTop: 8,
                color: '#DC2626',
                fontSize: 13,
                fontWeight: '600',
              }}
            >
              {error}
            </Text>
          ) : null}

          <View style={{ flex: 1, minHeight: 32 }} />
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.82}
            disabled={!password.trim() || isLoading}
            onPress={handleDeletePress}
            style={{
              minHeight: 50,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 8,
              backgroundColor: '#DC2626',
              opacity: !password.trim() || isLoading ? 0.48 : 1,
            }}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Trash2 size={20} color="#FFFFFF" />
                <Text
                  style={{
                    marginLeft: 8,
                    color: '#FFFFFF',
                    fontSize: 16,
                    fontWeight: '800',
                  }}
                >
                  {copy.deleteButton}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default DeleteAccountScreen;
