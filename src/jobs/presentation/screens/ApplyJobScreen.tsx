// Description: Collects and submits a complete application for a VNSEEA job.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, BriefcaseBusiness, Check } from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { APP_COLORS } from '../../../shared-kernel/presentation/theme/appColors';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { createJobsRepository } from '../../infrastructure/repositories/ApiJobsRepository';
import { getJobsCopy } from '../../application/i18n/jobsCopy';
import { validateJobApplication } from '../../domain/validation/jobApplicationValidation';
import type {
  JobApplicationDraft,
  JobQuestion,
  JobQuestionKey,
} from '../../domain/types/jobs.types';

type ApplyJobNavigation = NativeStackNavigationProp<RootStackParamList>;
type ApplyJobRoute = RouteProp<RootStackParamList, typeof ROUTES.JOB_APPLY>;

const jobsRepository = createJobsRepository();

const EMPTY_DRAFT: JobApplicationDraft = {
  userName: '',
  phoneNumber: '',
  email: '',
  location: '',
  position: '',
  workplace: '',
  experienceDescription: '',
  experienceStartDate: '',
  experienceEndDate: '',
  currentlyWork: false,
  answers: {},
};

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
};

function FormField({
  label,
  value,
  onChangeText,
  error,
  multiline = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
}: FieldProps) {
  return (
    <View className="mb-4">
      <Text className="mb-1.5 text-sm font-semibold text-slate-700">{label}</Text>
      <TextInput
        className={`rounded-lg border bg-white px-4 text-[15px] text-slate-950 ${
          error ? 'border-red-500' : 'border-slate-200'
        } ${multiline ? 'min-h-[96px] py-3' : 'h-12 py-0'}`}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor="#94A3B8"
      />
      {error ? <Text className="mt-1 text-xs text-red-600">{error}</Text> : null}
    </View>
  );
}

function JobQuestionField({
  question,
  value,
  error,
  yesLabel,
  noLabel,
  onChange,
}: {
  question: JobQuestion;
  value: string;
  error?: string;
  yesLabel: string;
  noLabel: string;
  onChange: (value: string) => void;
}) {
  return (
    <View className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
      <Text className="text-[15px] font-semibold leading-5 text-slate-900">
        {question.prompt}
      </Text>
      {question.type === 'free_text_question' ? (
        <TextInput
          className={`mt-3 min-h-[88px] rounded-lg border px-3 py-3 text-[15px] text-slate-950 ${
            error ? 'border-red-500' : 'border-slate-200'
          }`}
          value={value}
          onChangeText={onChange}
          multiline
          textAlignVertical="top"
          placeholderTextColor="#94A3B8"
        />
      ) : (
        <View className="mt-3 gap-2">
          {(question.type === 'yes_no_question'
            ? [
                { value: 'yes', label: yesLabel },
                { value: 'no', label: noLabel },
              ]
            : question.options
          ).map(option => {
            const selected = value === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                className={`min-h-[46px] flex-row items-center rounded-lg border px-3 ${
                  selected ? 'border-brand bg-brand-soft' : 'border-slate-200 bg-white'
                }`}
                onPress={() => onChange(option.value)}
                activeOpacity={0.8}
              >
                <View
                  className={`h-6 w-6 items-center justify-center rounded-full border ${
                    selected ? 'border-brand bg-brand' : 'border-slate-300'
                  }`}
                >
                  {selected ? <Check size={14} color="#FFFFFF" /> : null}
                </View>
                <Text className="ml-3 flex-1 text-[14px] text-slate-800">{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      {error ? <Text className="mt-2 text-xs text-red-600">{error}</Text> : null}
    </View>
  );
}

function ApplyJobScreen() {
  const navigation = useNavigation<ApplyJobNavigation>();
  const route = useRoute<ApplyJobRoute>();
  const language = useAppLanguage();
  const copy = getJobsCopy(language);
  const job = route.params.job;
  const [draft, setDraft] = useState<JobApplicationDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPrefilling, setIsPrefilling] = useState(true);

  const questions = useMemo(() => job.questions ?? [], [job.questions]);

  useEffect(() => {
    let active = true;
    jobsRepository.getMetadata().then(metadata => {
      if (!active || !metadata.currentUser) return;
      setDraft(current => ({
        ...current,
        userName: current.userName || metadata.currentUser?.name || '',
        phoneNumber: current.phoneNumber || metadata.currentUser?.phoneNumber || '',
        email: current.email || metadata.currentUser?.email || '',
        location: current.location || metadata.currentUser?.address || '',
      }));
    }).finally(() => {
      if (active) setIsPrefilling(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const updateField = useCallback(
    <K extends keyof JobApplicationDraft>(key: K, value: JobApplicationDraft[K]) => {
      setDraft(current => ({ ...current, [key]: value }));
      setErrors(current => {
        if (!current[String(key)]) return current;
        const next = { ...current };
        delete next[String(key)];
        return next;
      });
    },
    [],
  );

  const updateAnswer = useCallback((key: JobQuestionKey, value: string) => {
    setDraft(current => ({
      ...current,
      answers: { ...current.answers, [key]: value },
    }));
    setErrors(current => {
      const errorKey = `question_${key}`;
      if (!current[errorKey]) return current;
      const next = { ...current };
      delete next[errorKey];
      return next;
    });
  }, []);

  const returnToDetail = useCallback(() => {
    navigation.popTo(ROUTES.JOB_DETAIL, {
      jobId: String(job.id),
      job: { ...job, apply: true },
    });
  }, [job, navigation]);

  const submit = useCallback(async () => {
    if (isSubmitting) return;
    const validation = validateJobApplication(draft, questions, language);
    if (!validation.ok) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await jobsRepository.applyToJob(job.id, validation.value);
      Alert.alert(
        copy.applicationSuccessTitle,
        copy.applicationSuccessMessage,
        [{ text: 'OK', onPress: returnToDetail }],
      );
    } catch (caughtError) {
      const error = caughtError as Error & { code?: string };
      if (error.code === 'job_already_applied') {
        Alert.alert(copy.applicationSuccessTitle, copy.alreadyApplied, [
          { text: 'OK', onPress: returnToDetail },
        ]);
      } else {
        Alert.alert(
          copy.applicationErrorTitle,
          error.message || copy.applyFailed,
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [copy, draft, isSubmitting, job.id, language, questions, returnToDetail]);

  return (
    <View className="flex-1 bg-slate-50">
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <SafeAreaFeedHeader />
      <View className="h-14 flex-row items-center border-b border-slate-200 bg-white px-3">
        <TouchableOpacity
          className="h-11 w-11 items-center justify-center"
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={language === 'vi' ? 'Quay lại' : 'Back'}
        >
          <ArrowLeft size={23} color={APP_COLORS.neutral.text} />
        </TouchableOpacity>
        <View className="ml-1 flex-1">
          <Text className="text-[17px] font-bold text-slate-950">{copy.applyJobTitle}</Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>{job.title}</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator={false}
        >
          <View className="mb-4 flex-row items-center rounded-lg bg-brand-soft p-4">
            <View className="h-11 w-11 items-center justify-center rounded-full bg-brand">
              <BriefcaseBusiness size={21} color="#FFFFFF" />
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[15px] font-bold text-slate-950" numberOfLines={2}>{job.title}</Text>
              <Text className="mt-0.5 text-xs text-slate-600" numberOfLines={1}>
                {job.page?.page_title || job.page?.page_name || job.location}
              </Text>
            </View>
          </View>

          {job.apply ? (
            <View className="rounded-lg border border-brand bg-brand-soft p-4">
              <Text className="text-center font-semibold text-brand">{copy.alreadyApplied}</Text>
            </View>
          ) : (
            <>
              <Text className="mb-3 text-base font-bold text-slate-950">{copy.applicantInfo}</Text>
              <FormField label={copy.fullName} value={draft.userName} onChangeText={value => updateField('userName', value)} error={errors.userName} autoCapitalize="words" />
              <FormField label={copy.phoneNumber} value={draft.phoneNumber} onChangeText={value => updateField('phoneNumber', value)} error={errors.phoneNumber} keyboardType="phone-pad" autoCapitalize="none" />
              <FormField label={copy.email} value={draft.email} onChangeText={value => updateField('email', value)} error={errors.email} keyboardType="email-address" autoCapitalize="none" />
              <FormField label={copy.applicantLocation} value={draft.location} onChangeText={value => updateField('location', value)} error={errors.location} multiline />

              <Text className="mb-3 mt-2 text-base font-bold text-slate-950">{copy.experience}</Text>
              <FormField label={copy.position} value={draft.position} onChangeText={value => updateField('position', value)} />
              <FormField label={copy.workplace} value={draft.workplace} onChangeText={value => updateField('workplace', value)} />
              <FormField label={copy.experienceDescription} value={draft.experienceDescription} onChangeText={value => updateField('experienceDescription', value)} multiline />
              <FormField label={copy.startDate} value={draft.experienceStartDate} onChangeText={value => updateField('experienceStartDate', value)} autoCapitalize="none" />
              {!draft.currentlyWork ? (
                <FormField label={copy.endDate} value={draft.experienceEndDate} onChangeText={value => updateField('experienceEndDate', value)} autoCapitalize="none" />
              ) : null}
              <View className="mb-5 min-h-[48px] flex-row items-center justify-between rounded-lg border border-slate-200 bg-white px-4">
                <Text className="mr-3 flex-1 text-sm text-slate-800">{copy.currentlyWork}</Text>
                <Switch
                  value={draft.currentlyWork}
                  onValueChange={value => updateField('currentlyWork', value)}
                  trackColor={{ false: '#CBD5E1', true: APP_COLORS.brand.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {questions.length > 0 ? (
                <>
                  <Text className="mb-3 text-base font-bold text-slate-950">{copy.applicationQuestions}</Text>
                  {questions.map(question => (
                    <JobQuestionField
                      key={question.key}
                      question={question}
                      value={draft.answers[question.key] ?? ''}
                      error={errors[`question_${question.key}`]}
                      yesLabel={copy.yes}
                      noLabel={copy.no}
                      onChange={value => updateAnswer(question.key, value)}
                    />
                  ))}
                </>
              ) : null}

              <TouchableOpacity
                className="mt-2 min-h-[50px] items-center justify-center rounded-lg bg-brand disabled:opacity-50"
                onPress={submit}
                disabled={isSubmitting || isPrefilling}
                activeOpacity={0.85}
              >
                {isSubmitting || isPrefilling ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="font-bold text-white">{copy.submitApplication}</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export default ApplyJobScreen;

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
});
