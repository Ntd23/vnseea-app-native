import { onMounted, ref, watch, type Ref } from "vue"
import { createApiSearchRepository } from "../../infrastructure/repositories/ApiSearchRepository"
import type {
  SearchBackendFilters,
  SearchCollectionType,
  SearchOption,
  SearchResultType,
  SearchResultsByType,
  SearchSortKey,
  SearchTabItem,
} from "../../domain/types/search.types"

const emptyResults = (): SearchResultsByType => ({
  users: [],
  pages: [],
  groups: [],
  posts: [],
})

export function useSearchData(keyword: Ref<string>, filters: Ref<SearchBackendFilters>) {
  const resultsByType = ref<SearchResultsByType>(emptyResults())
  const loading = ref(true)
  const errorMessage = ref("")
  const repository = createApiSearchRepository()

  const searchTypeOptions: SearchOption<SearchResultType>[] = [
    { label: "Tất cả kết quả", value: "all" },
    { label: "Người dùng", value: "users" },
    { label: "Các trang", value: "pages" },
    { label: "Các nhóm", value: "groups" },
    { label: "Bài đăng", value: "posts" },
  ]

  const searchSortOptions: SearchOption<SearchSortKey>[] = [
    { label: "Phù hợp nhất", value: "relevance" },
    { label: "Phổ biến", value: "popular" },
    { label: "Mới cập nhật", value: "recent" },
  ]

  const searchTabs: SearchTabItem[] = [
    {
      label: "Tất cả",
      value: "all",
      icon: "i-ph-squares-four-fill",
      description: "Gộp người dùng, trang, nhóm và bài đăng.",
    },
    {
      label: "Người dùng",
      value: "users",
      icon: "i-ph-user-circle-fill",
      description: "Tìm thành viên, liên hệ và đề xuất kết nối.",
    },
    {
      label: "Các trang",
      value: "pages",
      icon: "i-ph-flag-fill",
      description: "Tìm fanpage, thương hiệu và cộng đồng nội dung.",
    },
    {
      label: "Các nhóm",
      value: "groups",
      icon: "i-ph-users-three-fill",
      description: "Khám phá cộng đồng đang hoạt động trong hệ sinh thái.",
    },
    {
      label: "Bài đăng",
      value: "posts",
      icon: "i-ph-newspaper-clipping-fill",
      description: "Tìm thảo luận, recap và cập nhật mới nhất.",
    },
  ]

  const quickKeywords = [
    "AI product",
    "xe điện",
    "workshop",
    "mobility",
    "#automation",
    "#learning",
  ]

  async function refresh() {
    const query = keyword.value.trim()

    loading.value = true
    errorMessage.value = ""

    try {
      resultsByType.value = await repository.search(query, filters.value)
    }
    catch (error) {
      resultsByType.value = emptyResults()
      errorMessage.value = error instanceof Error ? error.message : "Unable to search."
    }
    finally {
      loading.value = false
    }
  }

  if (import.meta.client) {
    onMounted(() => {
      void refresh()
    })

    watch(
      () => [
        keyword.value,
        filters.value.type,
        filters.value.country,
        filters.value.filterbyage,
        filters.value.age_from,
        filters.value.age_to,
        filters.value.verified,
        filters.value.status,
        filters.value.gender,
        filters.value.image,
      ],
      () => {
        void refresh()
      },
    )
  }

  return {
    quickKeywords,
    searchTabs,
    searchTypeOptions,
    searchSortOptions,
    resultsByType,
    loading,
    errorMessage,
    refresh,
  }
}
