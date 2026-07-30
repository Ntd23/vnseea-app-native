// English description: Implements jobs data loading through the WoWonder job API.
import type { JobsRepository } from '../../domain/repositories/JobsRepository';
import type {
  CreateJobPayload,
  CreateJobResponse,
  JobsItem,
  JobsListResponse,
  JobsMetadata,
  JobsMetadataResponse,
  JobsSelectOption,
} from '../../domain/types/jobs.types';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';

const siteRoot = apiConfig.webBaseUrl.replace(/\/+$/, '');

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
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteRoot}/${url.replace(/^\/+/, '')}`;
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
            page_id: String(payload.pageId),
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
          const errorMsg = (response as any).errors?.[0]?.error_text ?? 'Tạo việc làm thất bại';
          throw new Error(errorMsg);
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
    currency_symbol: currencySymbols[currency] || currency,
    image: normalizeUrl(String(raw.image ?? '')),
    image_type: raw.image_type as string | undefined,
    page_id: String(raw.page_id ?? ''),
    user_id: String(raw.user_id ?? ''),
    time: typeof raw.time === 'number' ? raw.time : 0,
    post_id: raw.post_id ? String(raw.post_id) : undefined,
    apply: readBoolean(raw.apply),
    apply_count: readNumber(raw.apply_count) ?? 0,
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
