// Description: Verifies newly registered email accounts with the backend six-digit OTP flow.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ArrowLeft, MailCheck, RotateCcw, ShieldCheck } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { ROOT_SAFE_AREA_EDGES } from '../../../shared-kernel/presentation/utils/safeAreaEdges';
import { getAuthCopy } from '../../application/i18n/authCopy';
import { createAuthRepository } from '../../infrastructure/repositories/ApiAuthRepository';

type EmailVerificationScreenProps = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.EMAIL_VERIFICATION
>;

const OTP_LENGTH = 6;
const RESEND_DELAY_SECONDS = 60;
const repository = createAuthRepository();

function readVerificationError(error: unknown, fallback: string) {
  if (!(error instanceof Error) || !error.message) return fallback;
  if (/wrong confirmation code|wrong code|incorrect code/i.test(error.message)) {
    return fallback;
  }
  return error.message;
}

function EmailVerificationScreen({
  navigation,
  route,
}: EmailVerificationScreenProps) {
  const { userId, email } = route.params;
  const insets = useSafeAreaInsets();
  const language = useAppLanguage();
  const copy = useMemo(() => getAuthCopy(language), [language]);
  const inputRef = useRef<TextInput | null>(null);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendRemaining, setResendRemaining] = useState(
    RESEND_DELAY_SECONDS,
  );

  useEffect(() => {
    if (resendRemaining <= 0) return;
    const timer = setTimeout(() => {
      setResendRemaining(value => Math.max(0, value - 1));
    }, 1000);
    return () => clearTimeout(timer);
  }, [resendRemaining]);

  useEffect(() => {
    const focusTimer = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(focusTimer);
  }, []);

  const handleCodeChange = useCallback((value: string) => {
    const nextCode = value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setCode(nextCode);
    setError(null);
    setNotice(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (code.length !== OTP_LENGTH || isSubmitting) {
      if (code.length !== OTP_LENGTH) {
        setError(copy.emailVerificationInvalidCode);
      }
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const result = await repository.confirmAccount({
        userId,
        code,
        timezone:
          Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      });
      if (result.status !== 'authenticated') {
        setError(copy.emailVerificationWrongCode);
        return;
      }
      navigation.reset({
        index: 0,
        routes: [{ name: ROUTES.MAIN_TABS }],
      });
    } catch (caughtError) {
      setError(
        readVerificationError(
          caughtError,
          copy.emailVerificationWrongCode,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [code, copy, isSubmitting, navigation, userId]);

  const handleResend = useCallback(async () => {
    if (resendRemaining > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    setNotice(null);
    try {
      await repository.resendAccountCode(userId);
      setCode('');
      setNotice(copy.emailVerificationResent);
      setResendRemaining(RESEND_DELAY_SECONDS);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (caughtError) {
      setError(
        readVerificationError(
          caughtError,
          copy.emailVerificationWrongCode,
        ),
      );
    } finally {
      setIsResending(false);
    }
  }, [copy, isResending, resendRemaining, userId]);

  const handleBackToLogin = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: ROUTES.LOGIN }],
    });
  }, [navigation]);

  const isSubmitDisabled = code.length !== OTP_LENGTH || isSubmitting;

  return (
    <SafeAreaView className="flex-1 bg-[#F8FBFF]" edges={ROOT_SAFE_AREA_EDGES}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#F8FBFF" />
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 12 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={copy.emailVerificationBackToLogin}
              onPress={handleBackToLogin}
              style={styles.backButton}
              activeOpacity={0.8}
            >
              <ArrowLeft size={21} color="#334155" />
            </TouchableOpacity>
            <View style={styles.headerIcon}>
              <MailCheck size={30} color={APP_BRAND_COLOR} strokeWidth={2.2} />
              <View style={styles.headerIconBadge}>
                <ShieldCheck size={15} color="#FFFFFF" strokeWidth={2.5} />
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>{copy.emailVerificationTitle}</Text>
            <Text style={styles.description}>
              {copy.emailVerificationDescription}
            </Text>
            <Text numberOfLines={1} style={styles.email}>
              {email}
            </Text>

            <Text style={styles.fieldLabel}>
              {copy.emailVerificationCode}
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={copy.emailVerificationCode}
              activeOpacity={1}
              onPress={() => inputRef.current?.focus()}
              style={styles.otpRow}
            >
              {Array.from({ length: OTP_LENGTH }).map((_, index) => {
                const value = code[index] || '';
                const isActive = index === code.length && code.length < OTP_LENGTH;
                return (
                  <View
                    key={`otp-${index}`}
                    style={[styles.otpCell, isActive && styles.otpCellActive]}
                  >
                    <Text style={styles.otpDigit}>{value}</Text>
                  </View>
                );
              })}
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={handleCodeChange}
                onSubmitEditing={handleSubmit}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={OTP_LENGTH}
                caretHidden
                style={styles.hiddenInput}
              />
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.88}
              disabled={isSubmitDisabled}
              onPress={handleSubmit}
              style={[
                styles.submitButton,
                isSubmitDisabled && styles.submitButtonDisabled,
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitText}>
                  {copy.emailVerificationSubmit}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.75}
              disabled={resendRemaining > 0 || isResending}
              onPress={handleResend}
              style={styles.resendButton}
            >
              {isResending ? (
                <ActivityIndicator size="small" color={APP_BRAND_COLOR} />
              ) : (
                <RotateCcw
                  size={16}
                  color={resendRemaining > 0 ? '#94A3B8' : APP_BRAND_COLOR}
                />
              )}
              <Text
                style={[
                  styles.resendText,
                  resendRemaining > 0 && styles.resendTextDisabled,
                ]}
              >
                {resendRemaining > 0
                  ? `${copy.emailVerificationResendIn} ${resendRemaining}s`
                  : copy.emailVerificationResend}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.8}
            onPress={handleBackToLogin}
            style={styles.loginButton}
          >
            <Text style={styles.loginText}>
              {copy.emailVerificationBackToLogin}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  backButton: {
    position: 'absolute',
    left: 0,
    top: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF1FF',
  },
  headerIconBadge: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#EAF1FF',
    backgroundColor: APP_BRAND_COLOR,
  },
  card: {
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 25,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 6,
  },
  title: {
    textAlign: 'center',
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 31,
  },
  description: {
    marginTop: 9,
    textAlign: 'center',
    color: '#64748B',
    fontSize: 14,
    lineHeight: 21,
  },
  email: {
    alignSelf: 'center',
    maxWidth: '100%',
    marginTop: 5,
    color: APP_BRAND_COLOR,
    fontSize: 14,
    fontWeight: '700',
  },
  fieldLabel: {
    marginBottom: 10,
    marginTop: 25,
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  otpRow: {
    position: 'relative',
    flexDirection: 'row',
    gap: 8,
  },
  otpCell: {
    flex: 1,
    height: 54,
    maxWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#DCE6F5',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
  },
  otpCellActive: {
    borderColor: APP_BRAND_COLOR,
    backgroundColor: '#EEF4FF',
  },
  otpDigit: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  errorText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#DC2626',
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 18,
  },
  noticeText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#15803D',
    fontSize: 12.5,
    fontWeight: '600',
    lineHeight: 18,
  },
  submitButton: {
    height: 50,
    marginTop: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    backgroundColor: APP_BRAND_COLOR,
  },
  submitButtonDisabled: {
    opacity: 0.42,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  resendButton: {
    minHeight: 44,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  resendText: {
    color: APP_BRAND_COLOR,
    fontSize: 13,
    fontWeight: '700',
  },
  resendTextDisabled: {
    color: '#94A3B8',
  },
  loginButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  loginText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
});

export default EmailVerificationScreen;
