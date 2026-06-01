import { computed } from "vue"
import { resolveI18nMessage } from "#shared-kernel/application/utils/resolveI18nMessage"

export type JobCategoryKey = "engineering" | "design" | "marketing" | "sales" | "operations" | "finance"
export type JobCategoryFilter = "all" | JobCategoryKey
export type JobLocationKey = "all" | "ho-chi-minh" | "ha-noi" | "da-nang" | "remote"
export type JobTypeKey = "all" | "full-time" | "part-time" | "contract" | "internship"
export type JobSortKey = "latest" | "salary" | "applicants"

export type JobOption<T extends string = string> = {
  label: string
  value: T
  icon: string
}

export type MockJob = {
  id: string
  title: string
  company: string
  companyInitials: string
  companyGradient: string
  category: JobCategoryKey
  categoryLabel: string
  locationKey: Exclude<JobLocationKey, "all">
  location: string
  type: Exclude<JobTypeKey, "all">
  typeLabel: string
  salary: string
  postedAt: string
  deadline: string
  experience: string
  applicants: number
  views: number
  description: string
  requirements: string[]
  benefits: string[]
  skills: string[]
  isRemote: boolean
  isFeatured: boolean
  isSaved: boolean
  isOwner: boolean
}

export type JobApplicationPayload = {
  jobId: string
  name: string
  email: string
  phone: string
  message: string
  cvName: string
}

export type JobPostPayload = {
  title: string
  company: string
  category: JobCategoryKey
  locationKey: Exclude<JobLocationKey, "all">
  location: string
  type: Exclude<JobTypeKey, "all">
  salary: string
  description: string
}

export type JobFilterInput = {
  search?: string
  category?: JobCategoryFilter
  location?: JobLocationKey
  type?: JobTypeKey
  sort?: JobSortKey
  savedOnly?: boolean
  savedById?: Record<string, boolean>
}

export const defaultJobCategory: JobCategoryFilter = "all"
export const defaultJobLocation: JobLocationKey = "all"
export const defaultJobType: JobTypeKey = "all"
export const defaultJobSort: JobSortKey = "latest"

export const jobCategoryKeys = [
  "engineering",
  "design",
  "marketing",
  "sales",
  "operations",
  "finance",
] as const satisfies JobCategoryKey[]

export const jobCategoryFilterKeys = [
  "all",
  ...jobCategoryKeys,
] as const satisfies JobCategoryFilter[]

export const jobLocationKeys = [
  "all",
  "ho-chi-minh",
  "ha-noi",
  "da-nang",
  "remote",
] as const satisfies JobLocationKey[]

export const jobTypeKeys = [
  "all",
  "full-time",
  "part-time",
  "contract",
  "internship",
] as const satisfies JobTypeKey[]

export const jobSortKeys = [
  "latest",
  "salary",
  "applicants",
] as const satisfies JobSortKey[]

export const readJobQueryValue = (value: unknown) => {
  if (Array.isArray(value)) return String(value[0] || "")
  return typeof value === "string" ? value : ""
}

export const normalizeJobCategory = (value: string): JobCategoryFilter => {
  if (jobCategoryFilterKeys.includes(value as JobCategoryFilter)) {
    return value as JobCategoryFilter
  }

  return defaultJobCategory
}

export const normalizeJobLocation = (value: string): JobLocationKey => {
  if (jobLocationKeys.includes(value as JobLocationKey)) {
    return value as JobLocationKey
  }

  return defaultJobLocation
}

export const normalizeJobType = (value: string): JobTypeKey => {
  if (jobTypeKeys.includes(value as JobTypeKey)) {
    return value as JobTypeKey
  }

  return defaultJobType
}

export const normalizeJobSort = (value: string): JobSortKey => {
  if (jobSortKeys.includes(value as JobSortKey)) {
    return value as JobSortKey
  }

  return defaultJobSort
}

export const normalizeJobSavedFlag = (value: string) =>
  ["1", "true", "saved", "yes"].includes(value.trim().toLowerCase())

export const rankJobSalary = (salary: string) => {
  const numbers = salary.match(/\d+/g)?.map(Number) ?? []
  return numbers.length > 0 ? Math.max(...numbers) : 0
}

export const filterMockJobs = (
  jobs: ReadonlyArray<MockJob>,
  filters: JobFilterInput = {},
) => {
  const keyword = filters.search?.trim().toLowerCase() ?? ""
  const category = filters.category ?? defaultJobCategory
  const location = filters.location ?? defaultJobLocation
  const type = filters.type ?? defaultJobType
  const sort = filters.sort ?? defaultJobSort
  const savedOnly = filters.savedOnly ?? false
  const savedById = filters.savedById ?? {}

  const filtered = jobs.filter((job) => {
    const matchesKeyword = keyword.length === 0 || [
      job.title,
      job.company,
      job.categoryLabel,
      job.location,
      job.salary,
      job.description,
      ...job.skills,
      ...job.requirements,
      ...job.benefits,
    ].some(field => field.toLowerCase().includes(keyword))

    const matchesCategory = category === defaultJobCategory || job.category === category
    const matchesLocation = location === defaultJobLocation || job.locationKey === location
    const matchesType = type === defaultJobType || job.type === type
    const matchesSaved = !savedOnly || Boolean(savedById[job.id] ?? job.isSaved)

    return matchesKeyword && matchesCategory && matchesLocation && matchesType && matchesSaved
  })

  return filtered.slice().sort((left, right) => {
    if (sort === "salary") return rankJobSalary(right.salary) - rankJobSalary(left.salary)
    if (sort === "applicants") return right.applicants - left.applicants
    return jobs.indexOf(left) - jobs.indexOf(right)
  })
}

export const formatJobCompactNumber = (value: number, locale = "vi") =>
  new Intl.NumberFormat(locale.toLowerCase().startsWith("en") ? "en-US" : "vi-VN").format(value)

export const useMockJobsData = () => {
  const { tm, rt } = useI18n()
  const localized = <T>(key: string) =>
    resolveI18nMessage(tm(key), message => rt(message as never)) as T

  const jobCategories = computed(() =>
    localized<JobOption<JobCategoryFilter>[]>("pages.jobsPage.categories"),
  )

  const jobLocations = computed(() =>
    localized<JobOption<JobLocationKey>[]>("pages.jobsPage.locations"),
  )

  const jobTypes = computed(() =>
    localized<JobOption<JobTypeKey>[]>("pages.jobsPage.types"),
  )

  const jobs = computed(() =>
    localized<MockJob[]>("pages.jobsPage.jobs"),
  )

  const createdJobRequirements = computed(() =>
    localized<string[]>("pages.jobsPage.createdJobRequirements"),
  )

  const createdJobBenefits = computed(() =>
    localized<string[]>("pages.jobsPage.createdJobBenefits"),
  )

  const createdJobSkills = computed(() =>
    localized<string[]>("pages.jobsPage.createdJobSkills"),
  )

  return {
    jobs,
    jobCategories,
    jobLocations,
    jobTypes,
    createdJobRequirements,
    createdJobBenefits,
    createdJobSkills,
    findJobById: (id: string) => jobs.value.find(job => job.id === id),
  }
}
