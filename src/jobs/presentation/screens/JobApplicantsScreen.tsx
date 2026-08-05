// Description: Shows the canonical applicant list for a job owner and links to profile or chat.
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  UserRound,
} from 'lucide-react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { ChatItem } from '../../../messages/domain/types/messages.types';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { APP_COLORS } from '../../../shared-kernel/presentation/theme/appColors';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { createJobsRepository } from '../../infrastructure/repositories/ApiJobsRepository';
import { getJobsCopy } from '../../application/i18n/jobsCopy';
import type {
  JobApplicant,
  JobQuestion,
  JobsItem,
} from '../../domain/types/jobs.types';

type ApplicantsNavigation = NativeStackNavigationProp<RootStackParamList>;
type ApplicantsRoute = RouteProp<RootStackParamList, typeof ROUTES.JOB_APPLICANTS>;

const jobsRepository = createJobsRepository();
const PAGE_SIZE = 20;

function formatAppliedDate(timestamp: number, language: 'vi' | 'en'): string {
  if (!timestamp) return '';
  const milliseconds = timestamp > 10000000000 ? timestamp : timestamp * 1000;
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(milliseconds));
}

function resolveAnswerLabel(
  applicant: JobApplicant,
  question: JobQuestion,
  yesLabel: string,
  noLabel: string,
): string {
  const answer = applicant.answers[question.key] ?? '';
  if (question.type === 'yes_no_question') {
    return answer === 'yes' ? yesLabel : answer === 'no' ? noLabel : answer;
  }
  if (question.type === 'multiple_choice_question') {
    return question.options.find(option => option.value === answer)?.label ?? answer;
  }
  return answer;
}

function ContactLine({
  Icon,
  value,
}: {
  Icon: React.ComponentType<{ size: number; color: string }>;
  value: string;
}) {
  if (!value) return null;
  return (
    <View className="mt-2 flex-row items-start">
      <Icon size={15} color={APP_COLORS.neutral.textMuted} />
      <Text className="ml-2 flex-1 text-[13px] leading-5 text-slate-600">{value}</Text>
    </View>
  );
}

function ApplicantCard({
  applicant,
  job,
  language,
  copy,
  onProfile,
  onMessage,
}: {
  applicant: JobApplicant;
  job: JobsItem;
  language: 'vi' | 'en';
  copy: ReturnType<typeof getJobsCopy>;
  onProfile: () => void;
  onMessage: () => void;
}) {
  const appliedDate = formatAppliedDate(applicant.appliedAt, language);
  const experienceParts = [applicant.position, applicant.workplace].filter(Boolean);

  return (
    <View className="mb-3 border-y border-slate-200 bg-white px-4 py-4">
      <View className="flex-row items-center">
        {applicant.avatar ? (
          <Image source={{ uri: applicant.avatar }} className="h-12 w-12 rounded-full bg-slate-100" />
        ) : (
          <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <UserRound size={23} color="#94A3B8" />
          </View>
        )}
        <View className="ml-3 flex-1">
          <Text className="text-[16px] font-bold text-slate-950" numberOfLines={1}>
            {applicant.name || applicant.username}
          </Text>
          {applicant.username ? (
            <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>@{applicant.username}</Text>
          ) : null}
          {appliedDate ? (
            <Text className="mt-0.5 text-xs text-slate-400">
              {copy.appliedAt.replace('{date}', appliedDate)}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
        <ContactLine Icon={Phone} value={applicant.phoneNumber} />
        <ContactLine Icon={Mail} value={applicant.email} />
        <ContactLine Icon={MapPin} value={applicant.location} />
      </View>

      {experienceParts.length > 0 || applicant.experienceDescription ? (
        <View className="mt-3">
          <Text className="text-sm font-bold text-slate-800">{copy.experience}</Text>
          {experienceParts.length > 0 ? (
            <View className="mt-2 flex-row items-start">
              <BriefcaseBusiness size={15} color={APP_COLORS.neutral.textMuted} />
              <Text className="ml-2 flex-1 text-[13px] leading-5 text-slate-600">
                {experienceParts.join(' · ')}
              </Text>
            </View>
          ) : null}
          {applicant.experienceDescription ? (
            <Text className="mt-2 text-[13px] leading-5 text-slate-600">
              {applicant.experienceDescription}
            </Text>
          ) : null}
        </View>
      ) : null}

      {(job.questions ?? []).some(question => applicant.answers[question.key]) ? (
        <View className="mt-3 border-t border-slate-100 pt-3">
          <Text className="text-sm font-bold text-slate-800">{copy.applicationQuestions}</Text>
          {(job.questions ?? []).map(question => {
            const answer = resolveAnswerLabel(applicant, question, copy.yes, copy.no);
            if (!answer) return null;
            return (
              <View key={question.key} className="mt-2">
                <Text className="text-xs font-semibold text-slate-500">{question.prompt}</Text>
                <Text className="mt-0.5 text-[13px] leading-5 text-slate-800">{answer}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View className="mt-4 flex-row gap-2">
        <TouchableOpacity
          className="min-h-[44px] flex-1 flex-row items-center justify-center rounded-lg border border-brand"
          onPress={onProfile}
          activeOpacity={0.8}
        >
          <UserRound size={17} color={APP_COLORS.brand.primary} />
          <Text className="ml-2 font-semibold text-brand">{copy.viewProfile}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="min-h-[44px] flex-1 flex-row items-center justify-center rounded-lg bg-brand"
          onPress={onMessage}
          activeOpacity={0.8}
        >
          <MessageCircle size={17} color="#FFFFFF" />
          <Text className="ml-2 font-semibold text-white">{copy.message}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function JobApplicantsScreen() {
  const navigation = useNavigation<ApplicantsNavigation>();
  const route = useRoute<ApplicantsRoute>();
  const language = useAppLanguage();
  const copy = getJobsCopy(language);
  const job = route.params.job;
  const [items, setItems] = useState<JobApplicant[]>([]);
  const [nextCursor, setNextCursor] = useState<string>();
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = useCallback(async (refreshing = false) => {
    if (refreshing) setIsRefreshing(true);
    else setIsLoading(true);
    setError(null);
    try {
      const page = await jobsRepository.getJobApplicants(job.id, { limit: PAGE_SIZE });
      setItems(page.items);
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : copy.applicantsLoadFailed);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [copy.applicantsLoadFailed, job.id]);

  useFocusEffect(
    useCallback(() => {
      loadFirstPage();
    }, [loadFirstPage]),
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || isLoadingMore || isLoading) return;
    setIsLoadingMore(true);
    try {
      const page = await jobsRepository.getJobApplicants(job.id, {
        limit: PAGE_SIZE,
        cursor: nextCursor,
      });
      setItems(current => {
        const known = new Set(current.map(item => item.id));
        return [...current, ...page.items.filter(item => !known.has(item.id))];
      });
      setNextCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : copy.applicantsLoadFailed);
    } finally {
      setIsLoadingMore(false);
    }
  }, [copy.applicantsLoadFailed, hasMore, isLoading, isLoadingMore, job.id, nextCursor]);

  const openProfile = useCallback((applicant: JobApplicant) => {
    navigation.navigate(ROUTES.USER_PROFILE, { userId: applicant.userId });
  }, [navigation]);

  const openChat = useCallback((applicant: JobApplicant) => {
    const chat: ChatItem = {
      id: `user:${applicant.userId}`,
      chatType: 'user',
      userId: applicant.userId,
      participantId: applicant.userId,
      username: applicant.username,
      name: applicant.name || applicant.username,
      avatar: applicant.avatar,
      lastMessage: '',
      lastMessageTime: 0,
      unreadCount: 0,
      isOnline: false,
      isVerified: false,
    };
    navigation.navigate(ROUTES.CHAT, { chat });
  }, [navigation]);

  const countLabel = useMemo(
    () => copy.applicantsCount.replace('{count}', String(items.length || job.apply_count || 0)),
    [copy.applicantsCount, items.length, job.apply_count],
  );

  return (
    <View className="flex-1 bg-slate-100">
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
          <Text className="text-[17px] font-bold text-slate-950">{copy.applicantsTitle}</Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>{job.title} · {countLabel}</Text>
        </View>
      </View>

      {isLoading && items.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={APP_COLORS.brand.primary} />
        </View>
      ) : error && items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-slate-600">{error}</Text>
          <TouchableOpacity className="mt-4 rounded-lg bg-brand px-5 py-3" onPress={() => loadFirstPage()}>
            <Text className="font-semibold text-white">{copy.retry}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ApplicantCard
              applicant={item}
              job={job}
              language={language}
              copy={copy}
              onProfile={() => openProfile(item)}
              onMessage={() => openChat(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={(
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadFirstPage(true)}
              tintColor={APP_COLORS.brand.primary}
              colors={[APP_COLORS.brand.primary]}
            />
          )}
          onEndReached={() => loadMore()}
          onEndReachedThreshold={0.35}
          ListEmptyComponent={(
            <View className="flex-1 items-center justify-center px-8 py-20">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-brand-soft">
                <UserRound size={26} color={APP_COLORS.brand.primary} />
              </View>
              <Text className="mt-4 text-base font-bold text-slate-900">{copy.noApplicants}</Text>
              <Text className="mt-1 text-center text-sm leading-5 text-slate-500">{copy.noApplicantsDescription}</Text>
            </View>
          )}
          ListFooterComponent={isLoadingMore ? (
            <ActivityIndicator className="py-5" color={APP_COLORS.brand.primary} />
          ) : null}
        />
      )}
    </View>
  );
}

export default JobApplicantsScreen;

const styles = StyleSheet.create({
  listContent: {
    paddingTop: 12,
    paddingBottom: 32,
    flexGrow: 1,
  },
});
