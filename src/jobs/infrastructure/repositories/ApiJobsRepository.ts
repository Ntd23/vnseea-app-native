// Jobs API Repository (Infrastructure)
// English description: Implements jobs data loading through the WoWonder job API.
import type { JobsRepository } from '../../domain/repositories/JobsRepository';
import type {
  CreateJobPayload,
  CreateJobResponse,
  JobsItem,
  JobsListResponse,
} from '../../domain/types/jobs.types';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';

const siteRoot = apiConfig.webBaseUrl.replace(/\/+$/, '');

function normalizeUrl(url: string): string {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return `${siteRoot}/${url.replace(/^\/+/, '')}`;
}

export function createJobsRepository(): JobsRepository {
  return {
    async searchJobs(options = {}) {
      const limit = options.limit ?? 20;

      try {
        const response = await apiBridge.post<JobsListResponse>(
          'job',
          {
            type: 'search',
            keyword: options.keyword ?? '',
            c_id: options.categoryId ?? '',
            job_type: options.jobType ?? '',
            limit: String(limit),
            offset: options.offset ? String(options.offset) : '0',
          },
        );

        if (response.api_status !== 200 && response.api_status !== '200') {
          console.warn('[ApiJobsRepository] searchJobs failed:', response);
          return [];
        }

        return ((response.data ?? []) as unknown as Array<Record<string, unknown>>).map(mapJobItem);
      } catch (error) {
        console.error('[ApiJobsRepository] searchJobs error:', error);
        return [];
      }
    },

    async getPageJobs(pageId, limit = 20, offset = 0) {
      try {
        const response = await apiBridge.post<JobsListResponse>(
          'job',
          {
            type: 'get',
            page_id: String(pageId),
            limit: String(limit),
            offset: String(offset),
          },
        );

        if (response.api_status !== 200 && response.api_status !== '200') {
          console.warn('[ApiJobsRepository] getPageJobs failed:', response);
          return [];
        }

        return ((response.data ?? []) as unknown as Array<Record<string, unknown>>).map(mapJobItem);
      } catch (error) {
        console.error('[ApiJobsRepository] getPageJobs error:', error);
        return [];
      }
    },

    async createJob(payload: CreateJobPayload) {
      try {
        const response = await apiBridge.multipart<CreateJobResponse>(
          'job',
          {
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
            ...(payload.thumbnail
              ? {
                  thumbnail: payload.thumbnail,
                }
              : {}),
          },
        );

        if (response.api_status !== 200 && response.api_status !== '200') {
          const errorMsg = (response as any).errors?.[0]?.error_text ?? 'Tạo việc làm thất bại';
          throw new Error(errorMsg);
        }

        return response;
      } catch (error) {
        console.error('[ApiJobsRepository] createJob error:', error);
        throw error;
      }
    },
  };
}

function mapJobItem(raw: Record<string, unknown>): JobsItem {
  const page = raw.page as Record<string, unknown> | undefined;

  return {
    id: String(raw.id ?? raw.job_id ?? ''),
    title: String(raw.title ?? raw.job_title ?? ''),
    description: String(raw.description ?? ''),
    location: String(raw.location ?? ''),
    lat: raw.lat as string | undefined,
    lng: raw.lng as string | undefined,
    minimum: typeof raw.minimum === 'number' ? raw.minimum : undefined,
    maximum: typeof raw.maximum === 'number' ? raw.maximum : undefined,
    salary_date: raw.salary_date as string | undefined,
    job_type: String(raw.job_type ?? raw.job_type ?? 'full_time'),
    category: String(raw.category ?? ''),
    currency: raw.currency as string | undefined,
    image: normalizeUrl(String(raw.image ?? '')),
    image_type: raw.image_type as string | undefined,
    page_id: String(raw.page_id ?? ''),
    user_id: String(raw.user_id ?? ''),
    time: typeof raw.time === 'number' ? raw.time : 0,
    post_id: raw.post_id ? String(raw.post_id) : undefined,
    page: page
      ? {
          page_id: String(page.page_id ?? ''),
          page_title: String(page.page_title ?? ''),
          page_name: String(page.page_name ?? ''),
          page_description: String(page.page_description ?? ''),
          avatar: normalizeUrl(String(page.avatar ?? '')),
          cover: normalizeUrl(String(page.cover ?? '')),
          user_id: String(page.user_id ?? ''),
          is_page_onwer: Boolean(page.is_page_onwer),
        }
      : undefined,
  };
}
