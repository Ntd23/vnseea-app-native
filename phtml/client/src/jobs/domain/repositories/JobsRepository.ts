// English description: Defines the repository contract for job catalog loading and real backend apply/create mutations.

import type {
  JobApplicationDraft,
  JobCatalogQuery,
  JobCreateDraft,
  JobMutationResult,
  JobsCatalogRecord,
} from "../types/jobs.types"

export interface JobsRepository {
  getCatalog(input?: JobCatalogQuery): Promise<JobsCatalogRecord>
  applyToJob(input: JobApplicationDraft): Promise<JobMutationResult>
  createJob(input: JobCreateDraft): Promise<JobMutationResult>
}
