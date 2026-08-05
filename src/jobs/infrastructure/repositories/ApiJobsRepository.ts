// English description: Implements jobs data loading through the WoWonder job API.
import type { JobsRepository } from '../../domain/repositories/JobsRepository';
import type {
  CreateJobPayload,
  CreateJobResponse,
  JobApplicant,
  JobApplicantsPage,
  JobsItem,
  JobsListResponse,
  JobsMetadata,
  JobsMetadataResponse,
  JobsSelectOption,
} from '../../domain/types/jobs.types';
import { mapJobQuestions } from '../../application/mappers/jobQuestions';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { normalizeConfiguredUrl } from '../../../shared-kernel/infrastructure/config/url';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';

const EMPTY_METADATA: JobsMetadata = {
  types: [],
  categories: [],
  salaryDates: [],
  currencies: [],
  questionTypes: [],
  imageTypes: [],
  canCreate: false,
  ownedPages: [],
};

let metadataPromise: Promise<JobsMetadata> | null = null;

function normalizeOptions(options?: JobsSelectOption[]): JobsSelectOption[] {
  return (options ?? [])
    .map(option => ({
      value: String(option.value ?? '').trim(),
      label: String(option.label ?? '').trim(),
      ...(option.symbol ? { symbol: String(option.symbol) } : {}),
    }))
    .filter(option => option.value.length > 0);
}

async function loadJobsMetadata(): Promise<JobsMetadata> {
  if (!metadataPromise) {
    metadataPromise = apiBridge.get<JobsMetadataResponse>(apiRoutes.jobs.metadata)
      .then(response => {
        if (response.api_status !== 200 && response.api_status !== '200') {
          throw new Error('Không thể tải dữ liệu việc làm.');
        }
        return {
          types: normalizeOptions(response.types),
          categories: normalizeOptions(response.categories),
          salaryDates: normalizeOptions(response.salary_dates),
          currencies: normalizeOptions(response.currencies),
          questionTypes: normalizeOptions(response.question_types),
          imageTypes: normalizeOptions(response.image_types),
          canCreate: response.can_create === true,
          currentUser: response.current_user
            ? {
                name: String(response.current_user.name ?? ''),
                email: String(response.current_user.email ?? ''),
                phoneNumber: String(response.current_user.phone_number ?? ''),
                address: String(response.current_user.address ?? ''),
              }
            : undefined,
          ownedPages: Array.isArray(response.owned_pages) ? response.owned_pages : [],
        };
      })
      .catch(error => {
        metadataPromise = null;
        console.error('[ApiJobsRepository] getMetadata error:', error);
        return EMPTY_METADATA;
      });
  }
  return metadataPromise;
}

function normalizeUrl(url: string): string {
  return normalizeConfiguredUrl(url) ?? '';
}

function createJobApiError(response: CreateJobResponse): Error & { code?: string } {
  const errors = Array.isArray(response.errors)
    ? response.errors[0]
    : response.errors;
  const message = String(
    response.message ?? errors?.error_text ?? 'Tạo việc làm thất bại',
  );
  const error = new Error(message) as Error & { code?: string };
  const code = response.error_code ?? errors?.error_id;
  if (code !== undefined && code !== null && String(code).trim()) {
    error.code = String(code);
  }
  return error;
}

export function createJobsRepository(): JobsRepository {
  return {
    async getMetadata() {
      return loadJobsMetadata();
    },

    async searchJobs(options = {}) {
      const limit = options.limit ?? 20;

      try {
        const [metadata, response] = await Promise.all([
          loadJobsMetadata(),
          apiBridge.post<JobsListResponse>(
            apiRoutes.jobs.main,
            {
              type: 'search',
              keyword: options.keyword ?? '',
              c_id: options.categoryId ?? '',
              job_type: options.jobType ?? '',
              length: options.distance ? String(options.distance) : '',
              limit: String(limit),
              offset: options.offset ? String(options.offset) : '0',
            },
          ),
        ]);

        if (response.api_status !== 200 && response.api_status !== '200') {
          console.warn('[ApiJobsRepository] searchJobs failed:', response);
          return [];
        }

        return ((response.data ?? []) as unknown as Array<Record<string, unknown>>)
          .map(raw => mapJobItem(raw, metadata));
      } catch (error) {
        console.error('[ApiJobsRepository] searchJobs error:', error);
        return [];
      }
    },

    async getPageJobs(pageId, limit = 20, offset = 0) {
      try {
        const [metadata, response] = await Promise.all([
          loadJobsMetadata(),
          apiBridge.post<JobsListResponse>(
            apiRoutes.jobs.main,
            {
              type: 'get',
              page_id: String(pageId),
              limit: String(limit),
              offset: String(offset),
            },
          ),
        ]);

        if (response.api_status !== 200 && response.api_status !== '200') {
          console.warn('[ApiJobsRepository] getPageJobs failed:', response);
          return [];
        }

        return ((response.data ?? []) as unknown as Array<Record<string, unknown>>)
          .map(raw => {
            const nestedJob = raw.job && typeof raw.job === 'object'
              ? raw.job as Record<string, unknown>
              : raw;
            return mapJobItem({
              ...nestedJob,
              post_id: nestedJob.post_id ?? raw.id,
            }, metadata);
          });
      } catch (error) {
        console.error('[ApiJobsRepository] getPageJobs error:', error);
        return [];
      }
    },

    async createJob(payload: CreateJobPayload) {
      try {
        const [metadata, response] = await Promise.all([
          loadJobsMetadata(),
          apiBridge.multipart<CreateJobResponse>(apiRoutes.jobs.main, {
            type: 'create',
            job_title: payload.jobTitle,
            description: payload.description,
            location: payload.location,
            job_type: payload.jobType,
            category: payload.category,
            ...(payload.pageId
              ? { page_id: String(payload.pageId) }
              : {}),
            lat: payload.lat ?? '',
            lng: payload.lng ?? '',
            minimum: payload.minimum ? String(payload.minimum) : '',
            maximum: payload.maximum ? String(payload.maximum) : '',
            salary_date: payload.salaryDate ?? '',
            currency: payload.currency ?? '',
            image_type: payload.imageType ?? 'cover',
            ...(payload.questions?.[0]
              ? {
                  question_one: payload.questions[0].prompt,
                  question_one_type: payload.questions[0].type,
                  question_one_answers: payload.questions[0].answers?.join(',') ?? '',
                }
              : {}),
            ...(payload.questions?.[1]
              ? {
                  question_two: payload.questions[1].prompt,
                  question_two_type: payload.questions[1].type,
                  question_two_answers: payload.questions[1].answers?.join(',') ?? '',
                }
              : {}),
            ...(payload.questions?.[2]
              ? {
                  question_three: payload.questions[2].prompt,
                  question_three_type: payload.questions[2].type,
                  question_three_answers: payload.questions[2].answers?.join(',') ?? '',
                }
              : {}),
            ...(payload.thumbnail
              ? {
                  thumbnail: payload.thumbnail,
                }
              : {}),
          }),
        ]);

        if (response.api_status !== 200 && response.api_status !== '200') {
          throw createJobApiError(response);
        }

        const rawData = response.data as unknown;
        if (!rawData || typeof rawData !== 'object') {
          return response;
        }

        const rawRecord = rawData as Record<string, unknown>;
        const nestedJob =
          rawRecord.job && typeof rawRecord.job === 'object'
            ? (rawRecord.job as Record<string, unknown>)
            : rawRecord;

        return {
          ...response,
          data: mapJobItem(
            {
              ...nestedJob,
              id: nestedJob.id ?? nestedJob.job_id ?? response.job_id,
              post_id:
                nestedJob.post_id ?? rawRecord.post_id ?? response.post_id,
            },
            metadata,
          ),
        };
      } catch (error) {
        console.error('[ApiJobsRepository] createJob error:', error);
        throw error;
      }
    },

    async applyToJob(jobId, payload) {
      const questionAnswers = Object.fromEntries(
        Object.entries(payload.answers).map(([key, value]) => [
          `question_${key}_answer`,
          value ?? '',
        ]),
      );
      const response = await apiBridge.post<CreateJobResponse>(
        apiRoutes.jobs.main,
        {
          type: 'apply',
          job_id: String(jobId),
          user_name: payload.userName,
          phone_number: payload.phoneNumber,
          email: payload.email,
          location: payload.location,
          position: payload.position,
          where_did_you_work: payload.workplace,
          experience_description: payload.experienceDescription,
          experience_start_date: payload.experienceStartDate,
          experience_end_date: payload.experienceEndDate,
          i_currently_work: payload.currentlyWork ? 'on' : '',
          ...questionAnswers,
        },
      );
      if (response.api_status !== 200 && response.api_status !== '200') {
        throw createJobApiError(response);
      }
    },

    async getJobApplicants(jobId, options = {}): Promise<JobApplicantsPage> {
      const limit = options.limit ?? 20;
      const response = await apiBridge.post<{
        api_status: number | string;
        data?: Array<Record<string, unknown>>;
        error_code?: string;
        message?: string;
      }>(apiRoutes.jobs.main, {
        type: 'get_apply',
        job_id: String(jobId),
        limit: String(limit),
        offset: options.cursor ?? '',
      });
      if (response.api_status !== 200 && response.api_status !== '200') {
        const error = new Error(response.message || 'Không thể tải danh sách ứng viên.') as Error & { code?: string };
        error.code = response.error_code;
        throw error;
      }

      const items = (response.data ?? []).map(mapJobApplicant);
      return {
        items,
        nextCursor: items.length > 0 ? items[items.length - 1].id : undefined,
        hasMore: items.length >= limit,
      };
    },

    async deleteJob(postId) {
      const response = await apiBridge.post<{
        api_status: number | string;
        action?: string;
      }>(apiRoutes.feed.postActions, {
        action: 'delete',
        post_id: String(postId),
      });

      return (response.api_status === 200 || response.api_status === '200')
        && response.action === 'deleted';
    },
  };
}

function mapJobItem(raw: Record<string, unknown>, metadata: JobsMetadata = EMPTY_METADATA): JobsItem {
  const page = raw.page as Record<string, unknown> | undefined;
  const readNumber = (value: unknown): number | undefined => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const readBoolean = (value: unknown): boolean => (
    value === true || value === 1 || value === '1' || value === 'true'
  );
  const typeLabels = Object.fromEntries(metadata.types.map(option => [option.value, option.label]));
  const categoryLabels = Object.fromEntries(metadata.categories.map(option => [option.value, option.label]));
  const salaryDateLabels = Object.fromEntries(metadata.salaryDates.map(option => [option.value, option.label]));
  const currencySymbols = Object.fromEntries(metadata.currencies.map(option => [option.value, option.symbol || option.value]));
  const currencyCodes = Object.fromEntries(metadata.currencies.map(option => [option.value, option.label]));
  const jobType = String(raw.job_type ?? '');
  const category = String(raw.category ?? '');
  const salaryDate = String(raw.salary_date ?? '');
  const currency = String(raw.currency ?? '');

  return {
    id: String(raw.id ?? raw.job_id ?? ''),
    title: String(raw.title ?? raw.job_title ?? ''),
    description: String(raw.description ?? ''),
    location: String(raw.location ?? ''),
    lat: raw.lat as string | undefined,
    lng: raw.lng as string | undefined,
    minimum: readNumber(raw.minimum),
    maximum: readNumber(raw.maximum),
    salary_date: salaryDate,
    salary_date_label: salaryDateLabels[salaryDate] || salaryDate,
    job_type: jobType,
    job_type_label: typeLabels[jobType] || jobType,
    category,
    category_label: categoryLabels[category] || category,
    currency,
    currency_code:
      String(raw.currency_code ?? '').trim() ||
      currencyCodes[currency] ||
      (/^[A-Za-z]{3}$/.test(currency) ? currency.toUpperCase() : undefined),
    currency_symbol:
      String(raw.currency_symbol ?? '').trim() ||
      currencySymbols[currency] ||
      undefined,
    image: normalizeUrl(String(raw.image ?? '')),
    image_type: raw.image_type as string | undefined,
    page_id: String(raw.page_id ?? ''),
    user_id: String(raw.user_id ?? ''),
    time: typeof raw.time === 'number' ? raw.time : 0,
    post_id: raw.post_id ? String(raw.post_id) : undefined,
    apply: readBoolean(raw.apply),
    apply_count: readNumber(raw.apply_count) ?? 0,
    questions: mapJobQuestions(raw),
    url: normalizeUrl(String(raw.url ?? '')),
    page: page
      ? {
          page_id: String(page.page_id ?? ''),
          page_title: String(page.page_title ?? ''),
          page_name: String(page.page_name ?? ''),
          page_description: String(page.page_description ?? ''),
          avatar: normalizeUrl(String(page.avatar ?? '')),
          cover: normalizeUrl(String(page.cover ?? '')),
          user_id: String(page.user_id ?? ''),
          is_page_onwer: readBoolean(page.is_page_onwer),
        }
      : undefined,
  };
}

function mapJobApplicant(raw: Record<string, unknown>): JobApplicant {
  const user = raw.user_data && typeof raw.user_data === 'object'
    ? raw.user_data as Record<string, unknown>
    : {};
  const answer = (key: string) => String(raw[`question_${key}_answer`] ?? '').trim();
  return {
    id: String(raw.id ?? ''),
    userId: String(raw.user_id ?? user.user_id ?? ''),
    name: String(user.name ?? raw.user_name ?? ''),
    username: String(user.username ?? ''),
    avatar: normalizeUrl(String(user.avatar ?? '')),
    phoneNumber: String(raw.phone_number ?? ''),
    email: String(raw.email ?? ''),
    location: String(raw.location ?? ''),
    position: String(raw.position ?? ''),
    workplace: String(raw.where_did_you_work ?? ''),
    experienceDescription: String(raw.experience_description ?? ''),
    experienceStartDate: String(raw.experience_start_date ?? ''),
    experienceEndDate: String(raw.experience_end_date ?? ''),
    currentlyWork:
      String(raw.experience_end_date ?? '').trim() === '' &&
      String(raw.position ?? '').trim() !== '',
    appliedAt: Number(raw.time) || 0,
    answers: {
      ...(answer('one') ? { one: answer('one') } : {}),
      ...(answer('two') ? { two: answer('two') } : {}),
      ...(answer('three') ? { three: answer('three') } : {}),
    },
  };
}
