// English description: Defines the contract for jobs data access.

import type { CreateJobPayload, CreateJobResponse, JobsItem, JobsMetadata, JobType } from '../types/jobs.types';

export interface JobsRepository {
  /**
   * Search/list jobs with optional filters
   * @param options - search options including keyword, category, job_type, pagination
   */
  searchJobs(options?: JobsSearchOptions): Promise<JobsItem[]>;

  getMetadata(): Promise<JobsMetadata>;

  /**
   * Get jobs for a specific page
   * @param pageId - the page ID
   * @param limit - number of jobs to fetch
   * @param offset - pagination offset
   */
  getPageJobs(pageId: string | number, limit?: number, offset?: number): Promise<JobsItem[]>;

  /**
   * Create a new job posting
   * @param payload - job creation data
   */
  createJob(payload: CreateJobPayload): Promise<CreateJobResponse>;

  deleteJob(postId: string | number): Promise<boolean>;
}

export interface JobsSearchOptions {
  keyword?: string;
  categoryId?: string | number;
  jobType?: JobType;
  distance?: number;
  limit?: number;
  offset?: number;
}
