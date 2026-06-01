// English description: Owns blog directory filtering, query sync, pagination, and derived sidebar state.

import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import type { BlogCategory, BlogListArticle, BlogSortValue } from "../../domain/types/blog.types"
import { createApiBlogRepository } from "../../infrastructure/repositories/ApiBlogRepository"

const blogCategoryValues = new Set<BlogCategory>([
  "all",
  "vehicles",
  "business",
  "education",
  "movies",
  "gaming",
  "history",
  "lifestyle",
  "pets",
  "science",
  "sports",
  "travel",
  "people",
  "other",
])

const blogSortValues = new Set<BlogSortValue>(["latest", "popular", "views", "reading"])
const blogQueryKeys = ["search", "category", "sort", "mine", "page"] as const

type BlogsRouteQuery = Partial<Record<(typeof blogQueryKeys)[number], string>>
type PaginationPageItem = number | "ellipsis"

const getQueryValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "")

const resolveSearchQuery = (value: string | string[] | undefined) => getQueryValue(value).trim()

const resolveCategoryQuery = (value: string | string[] | undefined): BlogCategory => {
  const normalized = getQueryValue(value)
  return blogCategoryValues.has(normalized as BlogCategory) ? normalized as BlogCategory : "all"
}

const resolveSortQuery = (value: string | string[] | undefined): BlogSortValue => {
  const normalized = getQueryValue(value)
  return blogSortValues.has(normalized as BlogSortValue) ? normalized as BlogSortValue : "latest"
}

const resolveMineQuery = (value: string | string[] | undefined) => getQueryValue(value) === "1"

const resolvePageQuery = (value: string | string[] | undefined) => {
  const parsed = Number.parseInt(getQueryValue(value), 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 1
}

const buildBlogsQuery = (state: {
  search: string
  selectedCategory: BlogCategory
  sortBy: BlogSortValue
  mineOnly: boolean
  currentPage: number
}): BlogsRouteQuery => {
  const nextQuery: BlogsRouteQuery = {}
  const normalizedSearch = state.search.trim()

  if (normalizedSearch) nextQuery.search = normalizedSearch
  if (state.selectedCategory !== "all") nextQuery.category = state.selectedCategory
  if (state.sortBy !== "latest") nextQuery.sort = state.sortBy
  if (state.mineOnly) nextQuery.mine = "1"
  if (state.currentPage > 1) nextQuery.page = String(state.currentPage)

  return nextQuery
}

const hasSameBlogsQuery = (
  nextQuery: BlogsRouteQuery,
  currentQuery: ReturnType<typeof useRoute>["query"],
) => blogQueryKeys.every(key => (nextQuery[key] ?? "") === getQueryValue(currentQuery[key]))

const createVisiblePageNumbers = (currentPage: number, totalPages: number): PaginationPageItem[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const visiblePages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1])
  const pages = Array.from(visiblePages)
    .filter(page => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right)

  return pages.flatMap<PaginationPageItem>((page, index) => {
    const previousPage = pages[index - 1]

    if (!previousPage || page - previousPage === 1) return [page]

    return ["ellipsis", page]
  })
}

export function useBlogsPageVM(
  repository = createApiBlogRepository(),
) {
  const { t, locale } = useI18n()
  const route = useRoute()
  const router = useRouter()
  const { data: backendArticles, pending: isLoading, error: loadError, refresh } = useAsyncData(
    "blogs:list",
    () => repository.getBlogs({ limit: 50 }),
    {
      default: () => [],
    },
  )

  const search = ref(resolveSearchQuery(route.query.search))
  const selectedCategory = ref<BlogCategory>(resolveCategoryQuery(route.query.category))
  const sortBy = ref<BlogSortValue>(resolveSortQuery(route.query.sort))
  const currentPage = ref(resolvePageQuery(route.query.page))
  const mineOnly = ref(resolveMineQuery(route.query.mine))
  const pageSize = 7

  const categoryOptions = computed(() => [
    { label: t("pages.blogsPage.categoryAll"), value: "all", icon: "i-ph-squares-four-fill" },
    { label: t("pages.blogsPage.categoryVehicles"), value: "vehicles", icon: "i-ph-car-profile" },
    { label: t("pages.blogsPage.categoryBusiness"), value: "business", icon: "i-ph-trend-up" },
    { label: t("pages.blogsPage.categoryEducation"), value: "education", icon: "i-ph-graduation-cap" },
    { label: t("pages.blogsPage.categoryMovies"), value: "movies", icon: "i-ph-film-slate" },
    { label: t("pages.blogsPage.categoryGaming"), value: "gaming", icon: "i-ph-game-controller" },
    { label: t("pages.blogsPage.categoryHistory"), value: "history", icon: "i-ph-landmark" },
    { label: t("pages.blogsPage.categoryLifestyle"), value: "lifestyle", icon: "i-ph-house-line" },
    { label: t("pages.blogsPage.categoryPets"), value: "pets", icon: "i-ph-paw-print" },
    { label: t("pages.blogsPage.categoryScience"), value: "science", icon: "i-ph-microscope" },
    { label: t("pages.blogsPage.categorySports"), value: "sports", icon: "i-ph-soccer-ball" },
    { label: t("pages.blogsPage.categoryTravel"), value: "travel", icon: "i-ph-airplane-tilt" },
    { label: t("pages.blogsPage.categoryPeople"), value: "people", icon: "i-ph-globe-hemisphere-east" },
    { label: t("pages.blogsPage.categoryOther"), value: "other", icon: "i-ph-dots-three-circle" },
  ] satisfies { label: string; value: BlogCategory; icon: string }[])

  const sortOptions = computed(() => [
    { label: t("pages.blogsPage.sortLatest"), value: "latest" },
    { label: t("pages.blogsPage.sortPopular"), value: "popular" },
    { label: t("pages.blogsPage.sortViews"), value: "views" },
    { label: t("pages.blogsPage.sortReading"), value: "reading" },
  ] satisfies { label: string; value: BlogSortValue }[])

  const articles = computed<BlogListArticle[]>(() =>
    backendArticles.value.map(article => ({
      ...article,
      href: article.href || appRoutes.readBlog(article.slug),
    })),
  )

  const heroStats = computed(() => [
    {
      label: t("pages.blogsPage.statNewToday"),
      value: String(articles.value.filter(article => article.publishedHoursAgo <= 12).length),
      description: t("pages.blogsPage.statNewTodayDescription"),
    },
    {
      label: t("pages.blogsPage.statTopics"),
      value: String(categoryOptions.value.length - 1),
      description: t("pages.blogsPage.statTopicsDescription"),
    },
    {
      label: t("pages.blogsPage.statMine"),
      value: String(articles.value.filter(article => article.mine).length),
      description: t("pages.blogsPage.statMineDescription"),
    },
  ])

  const currentSortLabel = computed(
    () => sortOptions.value.find(option => option.value === sortBy.value)?.label ?? t("pages.blogsPage.sortLatest"),
  )

  const resultHeading = computed(() => {
    if (mineOnly.value) return t("pages.blogsPage.resultHeadingMine")
    if (selectedCategory.value === "all") return t("pages.blogsPage.resultHeadingAll")
    return categoryOptions.value.find(category => category.value === selectedCategory.value)?.label ?? t("pages.blogsPage.resultHeadingFallback")
  })

  const filteredArticles = computed(() => {
    const keyword = search.value.trim().toLowerCase()

    const filtered = articles.value.filter((article) => {
      const matchesKeyword = keyword.length === 0 || [
        article.title,
        article.excerpt,
        article.categoryLabel,
        article.author,
        ...article.tags,
      ].some(field => field.toLowerCase().includes(keyword))

      const matchesCategory =
        selectedCategory.value === "all" || article.category === selectedCategory.value

      const matchesMine = !mineOnly.value || article.mine

      return matchesKeyword && matchesCategory && matchesMine
    })

    return filtered.slice().sort((left, right) => {
      switch (sortBy.value) {
        case "popular":
          return right.likes - left.likes || right.views - left.views
        case "views":
          return right.views - left.views
        case "reading":
          return left.readMinutes - right.readMinutes
        case "latest":
        default:
          return left.publishedHoursAgo - right.publishedHoursAgo
      }
    })
  })

  const totalPages = computed(() => Math.max(1, Math.ceil(filteredArticles.value.length / pageSize)))

  watch(() => route.query, (query) => {
    search.value = resolveSearchQuery(query.search)
    selectedCategory.value = resolveCategoryQuery(query.category)
    sortBy.value = resolveSortQuery(query.sort)
    mineOnly.value = resolveMineQuery(query.mine)
    currentPage.value = resolvePageQuery(query.page)
  }, { immediate: true })

  watch([search, selectedCategory, sortBy, mineOnly], () => {
    currentPage.value = 1
  })

  watch(totalPages, (value) => {
    if (currentPage.value > value) currentPage.value = value
  })

  watch([search, selectedCategory, sortBy, mineOnly, currentPage], async () => {
    if (import.meta.server) return

    const nextQuery = buildBlogsQuery({
      search: search.value,
      selectedCategory: selectedCategory.value,
      sortBy: sortBy.value,
      mineOnly: mineOnly.value,
      currentPage: currentPage.value,
    })

    if (hasSameBlogsQuery(nextQuery, route.query)) return

    await router.replace({ query: nextQuery })
  }, { flush: "post" })

  const pageArticles = computed(() => {
    const start = (currentPage.value - 1) * pageSize
    return filteredArticles.value.slice(start, start + pageSize)
  })

  const featuredArticle = computed(() => filteredArticles.value[0] ?? null)

  const visibleArticles = computed(() =>
    currentPage.value === 1 ? pageArticles.value.slice(1) : pageArticles.value,
  )

  const visiblePageNumbers = computed(() =>
    createVisiblePageNumbers(currentPage.value, totalPages.value),
  )

  const trendingTopics = computed(() =>
    categoryOptions.value
      .filter(category => category.value !== "all")
      .map(category => ({
        ...category,
        count: articles.value.filter(article => article.category === category.value).length,
      }))
      .filter(topic => topic.count > 0)
      .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, locale.value === "vi" ? "vi" : "en"))
      .slice(0, 6),
  )

  const featuredAuthors = computed(() =>
    articles.value
      .slice()
      .sort((left, right) => right.likes - left.likes)
      .slice(0, 4)
      .map(article => ({
        name: article.author,
        avatarUrl: article.authorAvatarUrl,
        count: articles.value.filter(item => item.author === article.author).length,
        topic: article.categoryLabel,
      })),
  )

  const compactFormatter = computed(() => new Intl.NumberFormat(locale.value === "vi" ? "vi-VN" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }))

  const formatCompact = (value: number) => compactFormatter.value.format(value)

  const resetFilters = () => {
    search.value = ""
    selectedCategory.value = "all"
    sortBy.value = "latest"
    mineOnly.value = false
    currentPage.value = 1
  }

  const selectCategory = (value: string) => {
    selectedCategory.value = value as BlogCategory
  }

  return {
    articles,
    search,
    selectedCategory,
    sortBy,
    currentPage,
    mineOnly,
    pageSize,
    categoryOptions,
    sortOptions,
    heroStats,
    currentSortLabel,
    resultHeading,
    filteredArticles,
    totalPages,
    featuredArticle,
    visibleArticles,
    visiblePageNumbers,
    trendingTopics,
    featuredAuthors,
    formatCompact,
    isLoading,
    loadError,
    refresh,
    resetFilters,
    selectCategory,
  }
}
