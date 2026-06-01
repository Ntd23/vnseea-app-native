// English description: Declares canonical job catalog, create, and apply types for the jobs bounded context.

export type JobTypeValue =
  | "full_time"
  | "part_time"
  | "internship"
  | "volunteer"
  | "contract"

export type JobQuestionType =
  | "free_text_question"
  | "yes_no_question"
  | "multiple_choice_question"

export type JobQuestionAnswer = "yes" | "no" | string

export interface JobQuestionRecord {
  slot: 1 | 2 | 3
  prompt: string
  type: JobQuestionType
  answers: JobsSelectOption[]
}

export interface JobOwnerRecord {
  kind: "page" | "user"
  id: number
  name: string
  slug: string
  avatarUrl: string
}

export interface JobRecord {
  id: number
  postId: number | null
  title: string
  description: string
  imageUrl: string
  imageType: "cover" | "upload" | "unknown"
  location: string
  lat: number | null
  lng: number | null
  category: string
  categoryLabel: string
  jobType: JobTypeValue | string
  typeLabel: string
  minimum: number | null
  maximum: number | null
  currency: string
  currencySymbol: string
  salaryDate: string
  salaryDateLabel: string
  salaryLabel: string
  owner: JobOwnerRecord | null
  applyCount: number
  alreadyApplied: boolean
  isOwner: boolean
  canApply: boolean
  questions: JobQuestionRecord[]
  postUrl: string
}

export interface JobsSelectOption {
  label: string
  value: string
}

export interface JobOwnerPageOption {
  id: number
  slug: string
  title: string
  coverUrl: string
}

export interface JobUserDefaults {
  name: string
  email: string
  phoneNumber: string
  location: string
  lat: number | null
  lng: number | null
}

export interface JobsCatalogRecord {
  items: JobRecord[]
  categories: JobsSelectOption[]
  types: JobsSelectOption[]
  distanceOptions: JobsSelectOption[]
  currencies: Array<JobsSelectOption & { symbol: string }>
  salaryDates: JobsSelectOption[]
  questionTypes: JobsSelectOption[]
  imageTypes: JobsSelectOption[]
  ownedPages: JobOwnerPageOption[]
  currentUser: JobUserDefaults
  canCreate: boolean
  createDisabledReason: string
  distanceEnabled: boolean
  hasMore: boolean
  nextAfterId: number | null
}

export interface JobCatalogQuery {
  q?: string
  category?: string
  type?: string
  distance?: number
  afterId?: number
  limit?: number
}

export interface JobApplyExperienceDraft {
  position: string
  whereDidYouWork: string
  experienceDescription: string
  experienceStartDate: string
  experienceEndDate: string
  currentlyWorkHere: boolean
}

export interface JobApplicationDraft {
  jobId: number
  userName: string
  phoneNumber: string
  location: string
  email: string
  experience: JobApplyExperienceDraft
  answers: Partial<Record<1 | 2 | 3, JobQuestionAnswer>>
}

export interface JobCreateQuestionDraft {
  enabled: boolean
  prompt: string
  type: JobQuestionType
  answers: string[]
}

export interface JobCreateDraft {
  pageId: number
  title: string
  location: string
  lat: number | null
  lng: number | null
  minimum: number | null
  maximum: number | null
  currency: string
  salaryDate: string
  jobType: string
  category: string
  description: string
  imageType: "cover" | "upload"
  thumbnailFile: File | null
  questions: [JobCreateQuestionDraft, JobCreateQuestionDraft, JobCreateQuestionDraft]
}

export interface JobMutationResult {
  success: boolean
  message: string
}
