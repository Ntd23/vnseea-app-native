// Description: Centralized i18n copy for the auth bounded context (login / register / forgot password).
// Mirrors the AppLanguage + Record<AppLanguage, Record<key, string>> pattern
// used by useSettingsViewModel and notificationCopy.

import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';

export const AUTH_COPY: Record<AppLanguage, Record<string, string>> = {
  vi: {
    brandSubtitle: 'MẠNG XÃ HỘI VIỆT NAM',
    tabLogin: 'Đăng nhập',
    tabRegister: 'Đăng ký',
    usernameOrEmail: 'Email hoặc username',
    usernamePlaceholder: 'Nhập email hoặc username',
    password: 'Mật khẩu',
    passwordPlaceholder: 'Nhập mật khẩu',
    forgotPassword: 'Quên mật khẩu?',
    loginCta: 'Đăng nhập',
    loginFailed: 'Đăng nhập thất bại',
    or: 'hoặc',
    noAccount: 'Chưa có tài khoản?',
    registerNow: 'Đăng ký ngay',
    verificationTitle: 'Cần xác minh',
    validationUsername: 'Nhập email hoặc username.',
    validationPassword: 'Nhập mật khẩu.',
  },
  en: {
    brandSubtitle: 'VIETNAM SOCIAL NETWORK',
    tabLogin: 'Log in',
    tabRegister: 'Sign up',
    usernameOrEmail: 'Email or username',
    usernamePlaceholder: 'Enter email or username',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    forgotPassword: 'Forgot password?',
    loginCta: 'Log in',
    loginFailed: 'Login failed',
    or: 'or',
    noAccount: "Don't have an account?",
    registerNow: 'Sign up now',
    verificationTitle: 'Verification required',
    validationUsername: 'Enter email or username.',
    validationPassword: 'Enter your password.',
  },
};

export type AuthCopyKey = keyof typeof AUTH_COPY.vi;

export function getAuthCopy(language: AppLanguage): Record<AuthCopyKey, string> {
  return AUTH_COPY[language] as Record<AuthCopyKey, string>;
}
