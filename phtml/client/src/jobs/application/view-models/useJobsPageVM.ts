// English description: Owns jobs route query sync, real catalog loading, pagination, and apply/create mutations for the jobs page.

import { watchDebounced } from "@vueuse/core"
import { createApiJobsRepository } from "../../infrastructure/repositories/ApiJobsRepository"
import type { JobsRepository } from "../../domain/repositories/JobsRepository"
import type {
  JobApplicationDraft,
  JobCreateDraft,
  JobRecord,
  JobsCatalogRecord,
} from "../../domain/types/jobs.types"

const EMPTY_CATALOG: JobsCatalogRecord = {
  items: [],
  categories: [],
  types: [],
  distanceOptions: [],
  currencies: [],
  salaryDates: [],
  questionTypes: [],
  imageTypes: [],
  ownedPages: [],
  currentUser: {
    name: "",
    email: "",
    phoneNumber: "",
    location: "",
    lat: null,
    lng: null,
  },
  canCreate: false,
  createDisabledReason: "",
  distanceEnabled: false,
  hasMore: false,
  nextAfterId: null,
}

const toErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error && error.message
    ? error.message
    : fallback

const prependOption = (label: string, value: string, options: Array<{ value: string; label: string }>) => [
  { value, label },
  ...options,
]

export function useJobsPageVM(
  repository: JobsRepository = createApiJobsRepository(),
) {
  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()
  const syncingFromRoute = ref(false)

  const searchQuery = ref("")
  const selectedCategory = ref("")
  const selectedType = ref("")
  const selectedDistance = ref("")

  const applyModalJob = ref<JobRecord | null>(null)
  const createModalOpen = ref(false)
  const applySubmitting = ref(false)
  const createSubmitting = ref(false)
  const applyErrorMessage = ref("")
  const createErrorMessage = ref("")

  const buildRouteQuery = () => {
    const query: Record<string, string> = {}

    if (searchQuery.value.trim()) {
      query.q = searchQuery.value.trim()
    }

    if (selectedCategory.value) {
      query.category = selectedCategory.value
    }

    if (selectedType.value) {
      query.type = selectedType.value
    }

    if (selectedDistance.value) {
      query.distance = selectedDistance.value
    }

    return query
  }

  const syncStateFromRoute = () => {
    syncingFromRoute.value = true
    searchQuery.value = typeof route.query.q === "string" ? route.query.q.trim() : ""
    selectedCategory.value = typeof route.query.category === "string" ? route.query.category.trim() : ""
    selectedType.value = typeof route.query.type === "string" ? route.query.type.trim() : ""
    selectedDistance.value = typeof route.query.distance === "string" ? route.query.distance.trim() : ""
    nextTick(() => {
      syncingFromRoute.value = false
    })
  }

  watch(
    () => route.query,
    syncStateFromRoute,
    { immediate: true },
  )

  watchDebounced(
    [searchQuery, selectedCategory, selectedType, selectedDistance],
    async () => {
      if (syncingFromRoute.value) {
        return
      }

      await router.replace({
        query: buildRouteQuery(),
      })
    },
    {
      debounce: 240,
      maxWait: 700,
    },
  )

  const filtersKey = computed(() => JSON.stringify({
    q: searchQuery.value.trim(),
    category: selectedCategory.value,
    type: selectedType.value,
    distance: selectedDistance.value,
  }))

  const { data, status, error, refresh } = useAsyncData(
    "jobs:catalog",
    () => repository.getCatalog({
      q: searchQuery.value.trim(),
      category: selectedCategory.value,
      type: selectedType.value,
      distance: selectedDistance.value ? Number(selectedDistance.value) : undefined,
      limit: 10,
    }),
    {
      watch: [filtersKey],
      default: () => EMPTY_CATALOG,
    },
  )

  const items = ref<JobRecord[]>([])
  const nextAfterId = ref<number | null>(null)
  const hasMore = ref(false)
  const loadingMore = ref(false)

  watch(
    data,
    (catalog) => {
      items.value = catalog.items
      nextAfterId.value = catalog.nextAfterId
      hasMore.value = catalog.hasMore
    },
    { immediate: true },
  )

  const loading = computed(() => status.value === "pending")
  const errorMessage = computed(() =>
    error.value ? toErrorMessage(error.value, t("pages.jobsPage.emptyDescription")) : "",
  )

  const categories = computed(() =>
    prependOption(t("pages.jobsPage.allCategories"), "__all_categories__", data.value.categories),
  )
  const types = computed(() =>
    prependOption(t("pages.jobsPage.allTypes"), "__all_types__", data.value.types),
  )
  const distanceOptions = computed(() =>
    prependOption(t("pages.jobsPage.allDistances"), "__all_distances__", data.value.distanceOptions),
  )
  const currencies = computed(() => data.value.currencies)
  const salaryDates = computed(() => data.value.salaryDates)
  const questionTypes = computed(() => data.value.questionTypes)
  const imageTypes = computed(() => data.value.imageTypes)
  const ownedPages = computed(() => data.value.ownedPages)
  const currentUser = computed(() => data.value.currentUser)
  const canCreate = computed(() => data.value.canCreate)
  const createDisabledReason = computed(() => data.value.createDisabledReason)
  const distanceEnabled = computed(() => data.value.distanceEnabled)
  const hasActiveFilters = computed(() =>
    Boolean(searchQuery.value.trim() || selectedCategory.value || selectedType.value || selectedDistance.value),
  )

  async function loadMore() {
    if (loadingMore.value || !hasMore.value || !nextAfterId.value) {
      return
    }

    loadingMore.value = true

    try {
      const response = await repository.getCatalog({
        q: searchQuery.value.trim(),
        category: selectedCategory.value,
        type: selectedType.value,
        distance: selectedDistance.value ? Number(selectedDistance.value) : undefined,
        afterId: nextAfterId.value,
        limit: 10,
      })

      const existingIds = new Set(items.value.map(item => item.id))
      const extraItems = response.items.filter(item => !existingIds.has(item.id))

      items.value = [...items.value, ...extraItems]
      nextAfterId.value = response.nextAfterId
      hasMore.value = response.hasMore
    }
    finally {
      loadingMore.value = false
    }
  }

  function resetFilters() {
    searchQuery.value = ""
    selectedCategory.value = ""
    selectedType.value = ""
    selectedDistance.value = ""
  }

  function openApply(job: JobRecord) {
    applyErrorMessage.value = ""
    applyModalJob.value = job
  }

  function closeApply() {
    applyErrorMessage.value = ""
    applyModalJob.value = null
  }

  function openCreate() {
    createErrorMessage.value = ""
    createModalOpen.value = true
  }

  function closeCreate() {
    createErrorMessage.value = ""
    createModalOpen.value = false
  }

  async function submitApplication(input: JobApplicationDraft) {
    applySubmitting.value = true
    applyErrorMessage.value = ""

    try {
      await repository.applyToJob(input)
      items.value = items.value.map(job =>
        job.id === input.jobId
          ? {
              ...job,
              alreadyApplied: true,
              canApply: false,
              applyCount: job.applyCount + 1,
            }
          : job,
      )
      closeApply()
    }
    catch (submitError) {
      applyErrorMessage.value = toErrorMessage(
        submitError,
        t("pages.jobsPage.applyStatusErrorDescription"),
      )
    }
    finally {
      applySubmitting.value = false
    }
  }

  async function submitCreate(input: JobCreateDraft) {
    createSubmitting.value = true
    createErrorMessage.value = ""

    try {
      await repository.createJob(input)
      closeCreate()
      await refresh()
    }
    catch (submitError) {
      createErrorMessage.value = toErrorMessage(
        submitError,
        t("pages.jobsPage.createErrorDescription"),
      )
    }
    finally {
      createSubmitting.value = false
    }
  }

  return {
    loading,
    loadingMore,
    errorMessage,
    items,
    categories,
    types,
    distanceOptions,
    currencies,
    salaryDates,
    questionTypes,
    imageTypes,
    ownedPages,
    currentUser,
    canCreate,
    createDisabledReason,
    distanceEnabled,
    hasMore,
    hasActiveFilters,
    searchQuery,
    selectedCategory,
    selectedType,
    selectedDistance,
    applyModalJob,
    createModalOpen,
    applySubmitting,
    createSubmitting,
    applyErrorMessage,
    createErrorMessage,
    resetFilters,
    loadMore,
    openApply,
    closeApply,
    openCreate,
    closeCreate,
    submitApplication,
    submitCreate,
    refresh,
  }
}
