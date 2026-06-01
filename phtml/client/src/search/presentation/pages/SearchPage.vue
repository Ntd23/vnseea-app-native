<template>
  <div class="mx-auto max-w-[1320px] space-y-8 pb-16 pt-8 px-4 sm:px-6">
    <SearchFiltersPanel
      v-model:keyword="searchText"
      v-model:type="selectedType"
      v-model:country="selectedCountry"
      v-model:filterbyage="selectedFilterByAge"
      v-model:age-from="selectedAgeFrom"
      v-model:age-to="selectedAgeTo"
      v-model:verified="selectedVerified"
      v-model:status="selectedStatus"
      v-model:gender="selectedGender"
      v-model:image="selectedImage"
      :country-options="countryOptions"
      :tabs="tabItems"
      @submit="commitSearch"
    />

    <!-- Summary Cards -->
    <section
      v-if="!loading && !errorMessage"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <article
        v-for="item in summaryCards"
        :key="item.label"
        class="surface-card p-6 border-secondary-100 flex flex-col justify-center"
      >
        <p class="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
          {{ item.label }}
        </p>
        <div class="mt-2 flex items-baseline gap-2">
          <p class="text-3xl font-extrabold text-[var(--text-primary)] leading-none">
            {{ item.value }}
          </p>
          <span class="text-xs font-bold text-[var(--text-primary)]">results</span>
        </div>
        <p class="mt-3 text-xs font-medium text-[var(--text-primary)] leading-relaxed">
          {{ item.description }}
        </p>
      </article>
    </section>

    <!-- Loading State -->
    <section
      v-if="loading"
      class="surface-card border-secondary-100 p-6 sm:p-8"
    >
      <FoundationLoadingSkeleton
        variant="list"
        :count="isMobile ? 3 : 4"
        :rows="3"
        :label="$t('community.search.loadingResults')"
      />
    </section>

    <!-- Error State -->
    <section
      v-else-if="errorMessage"
      class="surface-card border-secondary-100 p-12 sm:p-20"
    >
      <FoundationEmptyState
        icon="i-ph-warning-circle-duotone"
        :title="$t('community.search.errorTitle')"
        :description="errorMessage"
        :primary-label="$t('community.search.clearFilters')"
        primary-color="warning"
        @primary="clearFilters"
      />
    </section>

    <!-- No Results found -->
    <section
      v-else-if="totalResults === 0"
      class="surface-card border-secondary-100 p-12 sm:p-20"
    >
      <div class="mx-auto max-w-2xl text-center">
        <FoundationEmptyState
          icon="i-ph-magnifying-glass-duotone"
          :title="emptyResultsTitle"
          :description="emptyResultsDescription"
        />

        <div class="mt-10 flex flex-wrap justify-center gap-3">
          <UButton
            color="primary"
            size="lg"
            class="rounded-full px-8 font-semibold shadow-lg shadow-primary-500/20"
            @click="clearFilters"
          >
            {{ $t('community.search.clearFilters') }}
          </UButton>

          <UButton
            v-for="item in quickKeywords.slice(0, 3)"
            :key="item"
            variant="soft"
            color="gray"
            size="lg"
            class="rounded-full px-6 font-semibold"
            @click="applyQuickKeyword(item)"
          >
            {{ $t('community.search.tryKeyword', { keyword: item }) }}
          </UButton>
        </div>
      </div>
    </section>

    <!-- Main Results Flow -->
    <div v-else class="space-y-8">
      <section class="surface-card border-secondary-100/50 p-6 sm:p-8">
        <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div class="space-y-1">
            <p class="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
              {{ $t('community.search.results.label') }}
            </p>
            <h2 class="text-2xl font-extrabold text-[var(--text-primary)] leading-tight">
              {{ resultHeading }}
            </h2>
            <p class="text-body-secondary text-sm">
              {{ resultDescription }}
            </p>
          </div>

          <UButton
            v-if="selectedType !== 'all'"
            variant="soft"
            color="primary"
            size="md"
            class="rounded-full px-6 font-semibold"
            @click="showAllResults"
          >
            {{ $t('community.search.results.showAllTypes') }}
          </UButton>
        </div>
      </section>

      <section
        v-for="section in visibleSections"
        :key="section.kind"
        class="surface-card space-y-6 border-secondary-100/30 p-6 sm:p-8"
      >
        <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between border-b border-secondary-100/50 pb-6">
          <div class="space-y-1">
            <p class="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
              {{ $t(`community.search.tabs.${section.kind}.label`) }}
            </p>
            <p class="text-body-secondary text-sm">
              {{ $t(`community.search.tabs.${section.kind}.desc`) }}
            </p>
          </div>

          <UButton
            v-if="selectedType === 'all' && section.items.length > section.visibleItems.length"
            variant="ghost"
            color="primary"
            size="sm"
            class="rounded-full px-4 font-semibold"
            @click="selectOnlyType(section.kind)"
          >
            {{ $t('community.search.results.viewAllOfSpecific', { count: section.items.length }) }}
          </UButton>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <SearchResultCard
            v-for="item in section.visibleItems"
            :key="item.id"
            :result="item"
          />
        </div>
      </section>
    </div>

    <!-- Footer -->
    <footer class="surface-card border-secondary-100/50 p-6 sm:p-8">
      <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm font-semibold text-[var(--text-primary)]">
          <span class="text-[var(--text-primary)]">© 2026 VNSEEA</span>
          <NuxtLink
            v-for="link in primaryFooterLinks"
            :key="link.label"
            :to="link.to || appRoutes.feed"
            class="transition hover:text-secondary-900"
          >
            {{ $t(link.label) }}
          </NuxtLink>
        </div>

        <UButton
          variant="ghost"
          color="gray"
          size="sm"
          class="rounded-full font-semibold text-[var(--text-primary)] hover:text-secondary-900"
        >
          <template #leading>
            <Icon name="i-ph-globe-hemisphere-west-fill" class="h-4 w-4" />
          </template>
          {{ $t('community.search.footer.language') }}
        </UButton>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"
import FoundationLoadingSkeleton from "../../../foundation/presentation/components/LoadingSkeleton.vue"
import SearchFiltersPanel from "../components/FiltersPanel.vue"
import SearchResultCard from "../components/ResultCard.vue"
import { useSearchData } from "../../application/composables/useSearchData"
import type {
  SearchAgeFilter,
  SearchBackendFilters,
  SearchCollectionType,
  SearchGenderFilter,
  SearchImageFilter,
  SearchResultItem,
  SearchResultType,
  SearchSortKey,
  SearchTriStateFilter,
} from "../../domain/types/search.types"

type SearchSection = {
  kind: SearchCollectionType
  label: string
  description: string
  items: SearchResultItem[]
  visibleItems: SearchResultItem[]
}

function readQueryValue(value: unknown) {
  if (Array.isArray(value)) return String(value[0] || "")
  return typeof value === "string" ? value : ""
}

function normalizeKeyword(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
}

const footerLinks = [
  { label: "community.search.footer.home", to: appRoutes.feed },
  { label: "community.search.footer.about", to: undefined },
  { label: "community.search.footer.contact", to: undefined },
  { label: "community.search.footer.privacy", to: undefined },
  { label: "community.search.footer.terms", to: undefined },
  { label: "community.search.footer.blog", to: appRoutes.blogs },
  { label: "community.search.footer.developers", to: undefined },
]

const primaryFooterLinks = footerLinks.filter(link => link.to)
const secondaryFooterLinks = footerLinks.filter(link => !link.to)

const route = useRoute()
const router = useRouter()

const { t } = useI18n()

const collectionKinds: SearchCollectionType[] = ["users", "pages", "groups", "posts"]
const searchTypeValues: SearchResultType[] = ["all", "users", "pages", "groups", "posts"]
const searchSortValues: SearchSortKey[] = ["relevance", "popular", "recent"]
const triStateValues: SearchTriStateFilter[] = ["all", "on", "off"]
const genderValues: SearchGenderFilter[] = ["all", "male", "female"]
const imageValues: SearchImageFilter[] = ["all", "yes", "no"]

const normalizeType = (value: string): SearchResultType =>
  searchTypeValues.includes(value as SearchResultType)
    ? value as SearchResultType
    : "all"

const normalizeSort = (value: string): SearchSortKey =>
  searchSortValues.includes(value as SearchSortKey)
    ? value as SearchSortKey
    : "relevance"

const normalizeTriState = (value: string): SearchTriStateFilter =>
  triStateValues.includes(value as SearchTriStateFilter)
    ? value as SearchTriStateFilter
    : "all"

const normalizeGender = (value: string): SearchGenderFilter =>
  genderValues.includes(value as SearchGenderFilter)
    ? value as SearchGenderFilter
    : "all"

const normalizeImage = (value: string): SearchImageFilter =>
  imageValues.includes(value as SearchImageFilter)
    ? value as SearchImageFilter
    : "all"

const normalizeAgeFilter = (value: string): SearchAgeFilter =>
  value === "yes" ? "yes" : "no"

const normalizeAgeValue = (value: string, fallback: string) => {
  const numeric = Number(value)

  if (!Number.isFinite(numeric)) {
    return fallback
  }

  return String(Math.min(Math.max(Math.round(numeric), 10), 70))
}

// 1. Breakpoints logic
const { isMobile } = useAppBreakpoints()

// 2. Search logic with debouncing and URL sync
const { searchQuery: searchText, debouncedSearchQuery } = useDebouncedSearch({
  debounceMs: 500,
  syncUrl: true,
  queryParamName: "q"
})

// Other filters are synced to URL and sent to the PHP search bridge.
const selectedType = ref<SearchResultType>(normalizeType(readQueryValue(route.query.type)))
const selectedSort = ref<SearchSortKey>(normalizeSort(readQueryValue(route.query.sort)))
const selectedCountry = ref(readQueryValue(route.query.country) || "all")
const selectedFilterByAge = ref<SearchAgeFilter>(normalizeAgeFilter(readQueryValue(route.query.filterbyage)))
const selectedAgeFrom = ref(normalizeAgeValue(readQueryValue(route.query.age_from), "18"))
const selectedAgeTo = ref(normalizeAgeValue(readQueryValue(route.query.age_to), "50"))
const selectedVerified = ref<SearchTriStateFilter>(normalizeTriState(readQueryValue(route.query.verified)))
const selectedStatus = ref<SearchTriStateFilter>(normalizeTriState(readQueryValue(route.query.status)))
const selectedGender = ref<SearchGenderFilter>(normalizeGender(readQueryValue(route.query.gender)))
const selectedImage = ref<SearchImageFilter>(normalizeImage(readQueryValue(route.query.image)))

const countryOptions = computed(() => [
  { label: t("community.search.filters.country"), value: "all" },
  { label: t("community.search.countries.vietnam"), value: "233" },
  { label: t("community.search.countries.singapore"), value: "192" },
  { label: t("community.search.countries.thailand"), value: "213" },
  { label: t("community.search.countries.unitedStates"), value: "1" },
])

const searchFilters = computed<SearchBackendFilters>(() => ({
  type: selectedType.value,
  country: selectedCountry.value,
  filterbyage: selectedFilterByAge.value,
  age_from: selectedAgeFrom.value,
  age_to: selectedAgeTo.value,
  verified: selectedVerified.value,
  status: selectedStatus.value,
  gender: selectedGender.value,
  image: selectedImage.value,
}))

const {
  quickKeywords,
  searchTabs,
  searchTypeOptions,
  resultsByType,
  loading,
  errorMessage,
} = useSearchData(debouncedSearchQuery, searchFilters)

const hasKeyword = computed(() => searchText.value.trim().length > 0)
const keywordTokens = computed(() =>
  normalizeKeyword(searchText.value)
    .split(" ")
    .map(token => token.replace(/^#+/, ""))
    .filter(Boolean),
)

function syncFromRoute() {
  const nextType = normalizeType(readQueryValue(route.query.type))
  const nextSort = normalizeSort(readQueryValue(route.query.sort))
  const nextCountry = readQueryValue(route.query.country) || "all"
  const nextFilterByAge = normalizeAgeFilter(readQueryValue(route.query.filterbyage))
  const nextAgeFrom = normalizeAgeValue(readQueryValue(route.query.age_from), "18")
  const nextAgeTo = normalizeAgeValue(readQueryValue(route.query.age_to), "50")
  const nextVerified = normalizeTriState(readQueryValue(route.query.verified))
  const nextStatus = normalizeTriState(readQueryValue(route.query.status))
  const nextGender = normalizeGender(readQueryValue(route.query.gender))
  const nextImage = normalizeImage(readQueryValue(route.query.image))

  if (nextType !== selectedType.value) selectedType.value = nextType
  if (nextSort !== selectedSort.value) selectedSort.value = nextSort
  if (nextCountry !== selectedCountry.value) selectedCountry.value = nextCountry
  if (nextFilterByAge !== selectedFilterByAge.value) selectedFilterByAge.value = nextFilterByAge
  if (nextAgeFrom !== selectedAgeFrom.value) selectedAgeFrom.value = nextAgeFrom
  if (nextAgeTo !== selectedAgeTo.value) selectedAgeTo.value = nextAgeTo
  if (nextVerified !== selectedVerified.value) selectedVerified.value = nextVerified
  if (nextStatus !== selectedStatus.value) selectedStatus.value = nextStatus
  if (nextGender !== selectedGender.value) selectedGender.value = nextGender
  if (nextImage !== selectedImage.value) selectedImage.value = nextImage
}

watch(
  () => [
    route.query.type,
    route.query.sort,
    route.query.country,
    route.query.filterbyage,
    route.query.age_from,
    route.query.age_to,
    route.query.verified,
    route.query.status,
    route.query.gender,
    route.query.image,
  ],
  syncFromRoute,
)

function commitSearch() {
  const nextType = selectedType.value === "all" ? "" : selectedType.value
  const nextSort = selectedSort.value === "relevance" ? "" : selectedSort.value
  const nextKeyword = searchText.value.trim()

  const nextQuery: Record<string, string> = {}
  if (nextKeyword) nextQuery.q = nextKeyword
  if (nextType) nextQuery.type = nextType
  if (nextSort) nextQuery.sort = nextSort
  if (selectedCountry.value !== "all") nextQuery.country = selectedCountry.value

  if (selectedFilterByAge.value === "yes") {
    nextQuery.filterbyage = selectedFilterByAge.value
    nextQuery.age_from = selectedAgeFrom.value
    nextQuery.age_to = selectedAgeTo.value
  }

  if (selectedVerified.value !== "all") nextQuery.verified = selectedVerified.value
  if (selectedStatus.value !== "all") nextQuery.status = selectedStatus.value
  if (selectedGender.value !== "all") nextQuery.gender = selectedGender.value
  if (selectedImage.value !== "all") nextQuery.image = selectedImage.value

  void router.replace({ path: appRoutes.search, query: nextQuery })
}

watch([
  selectedType,
  selectedSort,
  selectedCountry,
  selectedFilterByAge,
  selectedAgeFrom,
  selectedAgeTo,
  selectedVerified,
  selectedStatus,
  selectedGender,
  selectedImage,
], commitSearch)

function matchesKeyword(item: SearchResultItem) {
  if (!keywordTokens.value.length) return true

  return keywordTokens.value.every(token =>
    item.searchableText.includes(token),
  )
}

function relevanceScore(item: SearchResultItem) {
  const keyword = normalizeKeyword(searchText.value).replace(/^#+/, "")
  if (!keyword) return item.popularityScore * 0.05 + item.recentScore * 0.3

  const title = item.title.toLowerCase()
  const subtitle = item.subtitle.toLowerCase()
  const description = item.description.toLowerCase()
  const normalizedTags = item.tags.map(tag => tag.toLowerCase())

  let score = item.popularityScore * 0.05 + item.recentScore * 0.3

  if (title.includes(keyword)) score += 44
  if (subtitle.includes(keyword)) score += 20
  if (description.includes(keyword)) score += 12
  if (normalizedTags.some(tag => tag.includes(keyword))) score += 18
  if (item.searchableText.startsWith(keyword)) score += 10

  return score
}

function sortItems(items: SearchResultItem[]) {
  return items.slice().sort((left, right) => {
    if (selectedSort.value === "popular") {
      return right.popularityScore - left.popularityScore || right.recentScore - left.recentScore
    }

    if (selectedSort.value === "recent") {
      return right.recentScore - left.recentScore || right.popularityScore - left.popularityScore
    }

    return relevanceScore(right) - relevanceScore(left) || right.popularityScore - left.popularityScore
  })
}

const filteredResults = computed<Record<SearchCollectionType, SearchResultItem[]>>(() => ({
  users: sortItems(resultsByType.value.users.filter(matchesKeyword)),
  pages: sortItems(resultsByType.value.pages.filter(matchesKeyword)),
  groups: sortItems(resultsByType.value.groups.filter(matchesKeyword)),
  posts: sortItems(resultsByType.value.posts.filter(matchesKeyword)),
}))

const tabItems = computed(() =>
  searchTabs.map((tab) => {
    const count = tab.value === "all"
      ? collectionKinds.reduce((sum, kind) => sum + filteredResults.value[kind].length, 0)
      : filteredResults.value[tab.value].length

    return {
      ...tab,
      count,
    }
  }),
)

const totalResults = computed(() =>
  collectionKinds.reduce((sum, kind) => sum + filteredResults.value[kind].length, 0),
)

const currentTypeLabel = computed(() =>
  searchTypeOptions.find(option => option.value === selectedType.value)
    ? t(`community.search.types.${selectedType.value}`)
    : t('community.search.types.all')
)

const summaryCards = computed(() => [
  {
    label: t('community.search.summary.total.label'),
    value: totalResults.value,
    description: hasKeyword.value
      ? t('community.search.summary.total.descQuery', { keyword: searchText.value.trim() })
      : t('community.search.summary.total.descEmpty'),
  },
  {
    label: t('community.search.summary.users.label'),
    value: filteredResults.value.users.length,
    description: t('community.search.summary.users.desc'),
  },
  {
    label: t('community.search.summary.communities.label'),
    value: filteredResults.value.pages.length + filteredResults.value.groups.length,
    description: t('community.search.summary.communities.desc'),
  },
  {
    label: t('community.search.summary.posts.label'),
    value: filteredResults.value.posts.length,
    description: t('community.search.summary.posts.desc'),
  },
])

const visibleSections = computed<SearchSection[]>(() => {
  const sections = collectionKinds
    .filter(kind => selectedType.value === "all" || selectedType.value === kind)
    .map((kind) => {
      const source = filteredResults.value[kind]
      const config = searchTabs.find(tab => tab.value === kind)

      return {
        kind,
        label: config?.label ?? kind,
        description: config?.description ?? "",
        items: source,
        visibleItems: selectedType.value === "all" 
          ? source.slice(0, isMobile.value ? 2 : 4) 
          : source,
      }
    })

  return sections.filter(section => section.items.length > 0)
})

const resultHeading = computed(() =>
  totalResults.value === 1
    ? t('community.search.results.headingSingle', { type: currentTypeLabel.value.toLowerCase() })
    : t('community.search.results.headingMultiple', { count: totalResults.value, type: currentTypeLabel.value.toLowerCase() })
)

const resultDescription = computed(() => {
  const keyword = searchText.value.trim()
  if (!keyword) return t('community.search.results.descEmpty')

  if (selectedType.value === "all") {
    return t('community.search.results.descAll', { keyword })
  }

  return t('community.search.results.descSpecific', { type: currentTypeLabel.value.toLowerCase(), keyword })
})

const emptyResultsTitle = computed(() =>
  hasKeyword.value
    ? t('community.search.emptyValue.title')
    : t('community.search.emptyState.title')
)

const emptyResultsDescription = computed(() =>
  hasKeyword.value
    ? t('community.search.emptyValue.desc', { keyword: searchText.value.trim() })
    : t('community.search.emptyState.desc')
)

function applyQuickKeyword(keyword: string) {
  searchText.value = keyword
  commitSearch()
}

function clearFilters() {
  searchText.value = ""
  selectedType.value = "all"
  selectedSort.value = "relevance"
  selectedCountry.value = "all"
  selectedFilterByAge.value = "no"
  selectedAgeFrom.value = "18"
  selectedAgeTo.value = "50"
  selectedVerified.value = "all"
  selectedStatus.value = "all"
  selectedGender.value = "all"
  selectedImage.value = "all"
  commitSearch()
}

function selectOnlyType(kind: SearchCollectionType) {
  selectedType.value = kind
  commitSearch()
}

function showAllResults() {
  selectedType.value = "all"
  commitSearch()
}

useSeoMeta({
  title: computed(() => {
    const keyword = searchText.value.trim()
    return keyword ? t('community.search.seoTitleQuery', { query: keyword }) : t('community.search.seoTitle')
  }),
  description: computed(() => {
    const keyword = searchText.value.trim()
    return keyword
      ? t('community.search.seoDescQuery', { query: keyword })
      : t('community.search.seoDesc')
  }),
})
</script>
