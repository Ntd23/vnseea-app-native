// Description: Màn hình tạo cuộc thăm dò ý kiến với giao diện đẹp mắt.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  BarChart3,
  Check,
  Plus,
  List,
  Trash2,
  Loader2,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { postCreatedEvents } from '../../../feed/application/events/postCreatedEvents';
import { usePollViewModel } from '../../application/view-models/usePollViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { POLL_COPY } from '../../application/i18n/pollCopy';

type CreatePollNav = NativeStackNavigationProp<RootStackParamList>;

const POLL_HEADER_COLOR = APP_BRAND_COLOR;
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

function CreatePollScreen() {
  const navigation = useNavigation<CreatePollNav>();
  const language = useAppLanguage();
  const copy = POLL_COPY[language];
  const { createPoll, isLoading, error, clearError } = usePollViewModel({
    createErrorFallback: copy.createErrorFallback,
    voteErrorFallback: copy.voteErrorFallback,
  });

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [successMessage, setSuccessMessage] = useState('');

  // Simple fade animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;
  const publishScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(titleAnim, {
        toValue: 1,
        duration: 420,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, titleAnim]);

  const canAddMore = options.length < MAX_OPTIONS;
  const canRemove = options.length > MIN_OPTIONS;
  const canSubmit =
    question.trim().length > 0 &&
    options.filter(o => o.trim()).length >= MIN_OPTIONS;
  const validOptionsCount = options.filter(o => o.trim()).length;

  useEffect(() => {
    if (!canSubmit) {
      publishScale.setValue(1);
      return undefined;
    }

    publishScale.setValue(0.9);
    const animation = Animated.spring(publishScale, {
      toValue: 1,
      friction: 5,
      tension: 180,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [canSubmit, publishScale]);

  const animatePublishScale = (toValue: number) => {
    if (!canSubmit || isLoading) return;
    Animated.spring(publishScale, {
      toValue,
      friction: 6,
      tension: 220,
      useNativeDriver: true,
    }).start();
  };

  const publishButtonAnimationStyle = {
    transform: [{ scale: publishScale }],
  };
  const titleAnimationStyle = {
    opacity: titleAnim,
    transform: [
      {
        translateY: titleAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [-4, 0],
        }),
      },
    ],
  };

  const addOption = () => {
    if (canAddMore) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index: number) => {
    if (canRemove) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = async () => {
    if (!canSubmit || isLoading) return;

    const validOptions = options.filter(o => o.trim());
    try {
      const result = await createPoll(question.trim(), validOptions);
      if (result.post) {
        postCreatedEvents.emit({
          ...result.post,
          postedAt: result.post.postedAt || Math.floor(Date.now() / 1000),
        });
      }
      // Show success message first, then navigate back
      setSuccessMessage(
        result.underReview
          ? `✓ ${copy.underReviewSuccess}`
          : `✓ ${copy.publishedSuccess}`,
      );
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch {
      // The view-model owns the error; keep it visible in the toast below.
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: POLL_HEADER_COLOR }}
      edges={['top']}
    >
      <FocusAwareStatusBar
        barStyle="light-content"
        backgroundColor={POLL_HEADER_COLOR}
      />

      {/* Header */}
      <View className="surface-brand h-16 flex-row items-center px-3">
        <View style={styles.headerLeftSlot}>
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full active:bg-white/10"
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel={copy.backA11yLabel}
          >
            <ArrowLeft size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Animated.Text
          className="text-heading text-inverse"
          style={[styles.headerTitle, titleAnimationStyle]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.82}
        >
          {copy.headerTitle}
        </Animated.Text>
        <Animated.View
          style={[styles.headerRightSlot, publishButtonAnimationStyle]}
        >
          <TouchableOpacity
            className="h-10 min-w-[72px] items-center justify-center rounded-full px-4"
            style={
              canSubmit
                ? styles.publishButtonEnabled
                : styles.publishButtonDisabled
            }
            activeOpacity={canSubmit ? 0.8 : 1}
            onPress={handleSubmit}
            onPressIn={() => animatePublishScale(0.94)}
            onPressOut={() => animatePublishScale(1)}
            disabled={!canSubmit || isLoading}
            accessibilityRole="button"
            accessibilityLabel={copy.publishA11yLabel}
            accessibilityState={{ disabled: !canSubmit || isLoading }}
          >
            {isLoading ? (
              <View className="h-5 w-5 items-center justify-center">
                <Loader2
                  size={18}
                  color={POLL_HEADER_COLOR}
                  className="animate-spin"
                />
              </View>
            ) : (
              <Text
                className="text-title-primary font-bold"
                style={
                  canSubmit
                    ? styles.publishLabelEnabled
                    : styles.publishLabelDisabled
                }
              >
                {copy.publishButton}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>

      <KeyboardAvoidingView
        className="flex-1 surface-base"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-8"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View
            style={{
              padding: 20,
              opacity: fadeAnim,
            }}
          >
            {/* Poll Icon Header */}
            <View className="mb-6 items-center">
              <View className="mb-4 h-20 w-20 items-center justify-center rounded-full bg-brand-subtle">
                <BarChart3 size={40} color={APP_BRAND_COLOR} />
              </View>
              <Text className="text-heading">{copy.heroTitle}</Text>
              <Text className="mt-1 text-body-secondary">
                {copy.heroDescription}
              </Text>
            </View>

            {/* Question Input Card */}
            <View className="mb-5 overflow-hidden rounded-2xl bg-white">
              <View className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-5 py-4">
                <View className="flex-row items-center">
                  <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-brand-soft">
                    <List size={16} color={APP_BRAND_COLOR} />
                  </View>
                  <Text className="text-label-primary font-semibold text-slate-700">
                    {copy.questionLabel}
                  </Text>
                </View>
              </View>
              <TextInput
                className="mx-5 my-4 min-h-[80px] text-body-primary"
                placeholder={copy.questionPlaceholder}
                placeholderTextColor="#94A3B8"
                value={question}
                onChangeText={setQuestion}
                multiline
                textAlignVertical="top"
                style={Platform.OS === 'ios' ? styles.questionInputIos : undefined}
              />
            </View>

            {/* Options Card */}
            <View className="overflow-hidden rounded-2xl bg-white">
              <View className="border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white px-5 py-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-brand-soft">
                      <Check size={16} color={APP_BRAND_COLOR} />
                    </View>
                    <Text className="text-label-primary font-semibold text-slate-700">
                      {copy.optionsLabel}
                    </Text>
                  </View>
                  <View className="rounded-full bg-brand-soft px-3 py-1">
                    <Text className="text-caption-primary font-medium text-brand">
                      {validOptionsCount}/{MAX_OPTIONS}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="p-4">
                {options.map((opt, index) => (
                  <View key={index} className="mb-3">
                    <View
                      className={`flex-row items-center rounded-xl border-2 px-4 py-3 transition-colors ${
                        opt.trim()
                          ? 'border-brand bg-brand-subtle'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <View
                        className={`mr-3 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                          opt.trim()
                            ? 'bg-brand text-white'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {opt.trim() ? (
                          <Check size={16} color="#FFFFFF" />
                        ) : (
                          <Text>{index + 1}</Text>
                        )}
                      </View>
                      <TextInput
                        className={
                          Platform.OS === 'ios'
                            ? 'flex-1'
                            : 'flex-1 text-body-primary'
                        }
                        placeholder={copy.optionPlaceholder(index + 1)}
                        placeholderTextColor="#94A3B8"
                        value={opt}
                        onChangeText={value => updateOption(index, value)}
                        style={Platform.OS === 'ios' ? styles.optionInputIos : undefined}
                      />
                    </View>
                    {canRemove && (
                      <TouchableOpacity
                        className="mt-2 flex-row items-center"
                        activeOpacity={0.7}
                        onPress={() => removeOption(index)}
                        accessibilityRole="button"
                        accessibilityLabel={copy.removeOptionA11yLabel(index + 1)}
                      >
                        <Trash2 size={14} color="#EF4444" />
                        <Text className="ml-1 text-caption-secondary text-red-500">
                          {copy.removeOption}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}

                {/* Add Option Button */}
                {canAddMore && (
                  <TouchableOpacity
                    className="mt-2 flex-row items-center justify-center rounded-xl border-2 border-dashed border-brand bg-brand-subtle py-4"
                    activeOpacity={0.8}
                    onPress={addOption}
                    accessibilityRole="button"
                    accessibilityLabel={copy.addOptionA11yLabel}
                  >
                    <Plus size={20} color={APP_BRAND_COLOR} />
                    <Text className="ml-2 text-label-primary font-medium text-brand">
                      {copy.addOption}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Help Text Card */}
            <View className="mt-5 flex-row items-start rounded-2xl bg-amber-50 p-4">
              <View className="mr-3 h-6 w-6 items-center justify-center rounded-full bg-amber-200">
                <Text className="text-xs">💡</Text>
              </View>
              <View className="flex-1">
                <Text className="text-label-primary font-medium text-amber-800">
                  {copy.tipsTitle}
                </Text>
                <Text className="mt-1 text-caption-secondary text-amber-700">
                  {copy.tipsDescription(MIN_OPTIONS, MAX_OPTIONS)}
                </Text>
              </View>
            </View>

            {/* Progress Indicator */}
            <View className="mt-6 items-center">
              <View className="mb-2 h-2 w-48 overflow-hidden rounded-full bg-slate-200">
                <View
                  className="h-full rounded-full bg-brand"
                  style={{
                    width: `${Math.min(
                      100,
                      (validOptionsCount / MIN_OPTIONS) * 50 +
                        (question.trim() ? 50 : 0),
                    )}%`,
                  }}
                />
              </View>
              <Text className="text-caption-secondary">
                {canSubmit
                  ? `✓ ${copy.readyToPublish}`
                  : copy.completeForm}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Toast */}
      {successMessage ? (
        <View className="absolute bottom-6 left-4 right-4 items-center">
          <View className="flex-row items-center rounded-2xl bg-green-500 px-5 py-4 shadow-lg">
            <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Check size={18} color="#FFFFFF" />
            </View>
            <Text className="flex-1 text-title-primary text-white font-semibold">
              {successMessage}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Error Toast */}
      {error && (
        <View className="absolute bottom-6 left-4 right-4 items-center">
          <View className="flex-row items-center rounded-2xl bg-red-500 px-5 py-4">
            <View className="mr-3 h-8 w-8 items-center justify-center rounded-full bg-white/20">
              <Text>⚠️</Text>
            </View>
            <Text className="flex-1 text-title-primary text-white">
              {error}
            </Text>
            <TouchableOpacity
              onPress={clearError}
              className="ml-2"
              accessibilityRole="button"
              accessibilityLabel={copy.dismissErrorA11yLabel}
            >
              <Text className="text-white/80">✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerLeftSlot: {
    alignItems: 'flex-start',
    width: 84,
  },
  headerTitle: {
    flex: 1,
    paddingHorizontal: 4,
    textAlign: 'center',
  },
  headerRightSlot: {
    alignItems: 'flex-end',
    width: 84,
  },
  publishButtonEnabled: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
    borderWidth: 1,
    elevation: 4,
    shadowColor: '#0000AA',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 5,
  },
  publishButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderColor: 'rgba(255, 255, 255, 0.35)',
    borderWidth: 1,
  },
  publishLabelEnabled: {
    color: POLL_HEADER_COLOR,
  },
  publishLabelDisabled: {
    color: 'rgba(255, 255, 255, 0.72)',
  },
  questionInputIos: {
    lineHeight: 24,
    paddingTop: 0,
    paddingBottom: 0,
  },
  optionInputIos: {
    color: '#000000',
    fontFamily: 'Inter',
    fontSize: 14,
    fontWeight: '400',
    height: 32,
    paddingBottom: 0,
    paddingTop: 0,
  },
});

export default CreatePollScreen;
