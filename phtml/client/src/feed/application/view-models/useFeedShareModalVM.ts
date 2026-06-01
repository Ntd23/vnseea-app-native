// English description: ViewModel for the feed share modal destination picker and search state.

import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import { useCurrentAuthUserStore } from "../../../auth/application/stores/useCurrentAuthUserStore"
import type {
  FeedShareDestination,
  FeedShareSearchTargets,
  FeedShareTarget,
} from "../../domain/types/feed-share.types"
import { createApiFeedRepository } from "../../infrastructure/repositories/ApiFeedRepository"
import { createApiFeedShareRepository } from "../../infrastructure/repositories/ApiFeedShareRepository"

const emptySearchResponse = (): FeedShareSearchTargets => ({
  users: [],
  pages: [],
  groups: [],
})

const createInitials = (value: string, fallback = "VN") => {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.slice(0, 1).toUpperCase())
    .join("")

  return initials || fallback
}

const createSearchableText = (parts: Array<string | number | undefined>) =>
  parts
    .map(part => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .toLowerCase()

const parseEntityId = (value: string | number | undefined) => {
  const rawValue = String(value ?? "")
  const match = rawValue.match(/(\d+)$/)
  const id = match ? Number(match[1]) : Number(rawValue)

  return Number.isFinite(id) && id > 0 ? id : undefined
}

const uniqueTargets = (targets: FeedShareTarget[]) => {
  const seen = new Set<string>()

  return targets.filter((target) => {
    const key = `${target.kind}:${target.id}`
    if (seen.has(key)) return false

    seen.add(key)
    return true
  })
}

const filterTargets = (targets: FeedShareTarget[], keyword: string) => {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) return targets

  return targets.filter(target => target.searchableText.includes(normalizedKeyword))
}

export function useFeedShareModalVM(open: Ref<boolean>) {
  const feedRepository = createApiFeedRepository()
  const feedShareRepository = createApiFeedShareRepository()
  const authStore = useCurrentAuthUserStore()

  const selectedDestination = ref<FeedShareDestination>("timeline")
  const selectedTargetId = ref("")
  const pageSearch = ref("")
  const groupSearch = ref("")
  const messageSearch = ref("")
  const searchData = ref<FeedShareSearchTargets>(emptySearchResponse())
  const searchPending = ref(false)
  const searchRequestId = ref(0)
  let searchTimeout: ReturnType<typeof setTimeout> | undefined

  const { data: pagesData, status: pagesStatus, refresh: refreshPages } = useAsyncData(
    "feed-share:owned-pages",
    () => feedShareRepository.getPageTargets(),
    {
      default: () => [],
      immediate: false,
    },
  )

  const { data: groupsData, status: groupsStatus, refresh: refreshGroups } = useAsyncData(
    "feed-share:joined-groups",
    () => feedShareRepository.getGroupTargets(),
    {
      default: () => [],
      immediate: false,
    },
  )

  const activeSearch = computed(() => {
    if (selectedDestination.value === "page") return pageSearch.value
    if (selectedDestination.value === "group") return groupSearch.value
    if (selectedDestination.value === "message") return messageSearch.value

    return ""
  })

  const currentProfileTarget = computed<FeedShareTarget>(() => {
    const user = authStore.user
    const title = user?.name || "Trang cá nhân của tôi"
    const username = user?.username || ""

    return {
      id: user?.id ? String(user.id) : "me",
      kind: "timeline",
      title,
      subtitle: username ? `@${username}` : "Timeline",
      avatarUrl: user?.avatarUrl,
      initials: createInitials(title),
      href: username ? appRoutes.profile(username) : appRoutes.feed,
      searchableText: createSearchableText([title, username]),
      entityId: user?.id,
    }
  })

  const pageTargets = computed(() => {
    return filterTargets(uniqueTargets([...(pagesData.value ?? []), ...searchData.value.pages]), pageSearch.value)
  })

  const groupTargets = computed(() => {
    const localTargets = groupsData.value ?? []

    return filterTargets(uniqueTargets([...localTargets, ...searchData.value.groups]), groupSearch.value)
  })

  const messageTargets = computed(() =>
    searchData.value.users,
  )

  const destinationTargets = computed(() => {
    if (selectedDestination.value === "page") return pageTargets.value
    if (selectedDestination.value === "group") return groupTargets.value
    if (selectedDestination.value === "message") return messageTargets.value

    return [currentProfileTarget.value]
  })

  const selectedTarget = computed(() => {
    if (selectedDestination.value === "timeline") return currentProfileTarget.value

    return destinationTargets.value.find(target => target.id === selectedTargetId.value) ?? null
  })

  const destinationPending = computed(() => {
    if (selectedDestination.value === "page") {
      return pagesStatus.value === "pending" || searchPending.value
    }

    if (selectedDestination.value === "group") {
      return groupsStatus.value === "pending" || searchPending.value
    }

    if (selectedDestination.value === "message") {
      return searchPending.value
    }

    return false
  })

  const canShare = computed(() =>
    selectedDestination.value === "timeline" || Boolean(selectedTarget.value),
  )

  function selectDestination(destination: FeedShareDestination) {
    selectedDestination.value = destination
    selectedTargetId.value = ""
  }

  function selectTarget(targetId: string) {
    selectedTargetId.value = targetId
  }

  function reset() {
    selectedDestination.value = "timeline"
    selectedTargetId.value = ""
    pageSearch.value = ""
    groupSearch.value = ""
    messageSearch.value = ""
    searchData.value = emptySearchResponse()
    searchPending.value = false
    searchRequestId.value += 1
    if (searchTimeout) clearTimeout(searchTimeout)
  }

  function createShareText(input: {
    caption?: string
    postText?: string
    shareUrl?: string
  }) {
    const caption = input.caption?.trim()
    const postText = input.postText?.trim()
    const parts = [caption, postText].filter(Boolean)

    return parts.join("\n\n") || postText || ""
  }

  async function submitShare(input: {
    caption?: string
    postText?: string
    postId?: number
  }) {
    const target = selectedTarget.value
    const text = input.postId
      ? selectedDestination.value === "message"
        ? [input.caption?.trim(), input.postText?.trim()].filter(Boolean).join("\n\n")
        : (input.caption?.trim() ?? "")
      : createShareText(input)

    if (!canShare.value || (!text && !input.postId)) {
      throw new Error("Share target and content are required.")
    }

    if (selectedDestination.value === "message") {
      const recipientId = target?.entityId ?? parseEntityId(target?.id)

      if (!recipientId) {
        throw new Error("Message recipient is required.")
      }

      await feedShareRepository.sendMessageShare({
        recipientIds: [recipientId],
        text,
      })

      return {
        destination: "message" as const,
        target,
        post: null,
      }
    }

    const pageId = selectedDestination.value === "page"
      ? target?.entityId ?? parseEntityId(target?.id)
      : undefined
    const groupId = selectedDestination.value === "group"
      ? target?.entityId ?? parseEntityId(target?.id)
      : undefined

    if (selectedDestination.value === "page" && !pageId) {
      throw new Error("Page target is required.")
    }

    if (selectedDestination.value === "group" && !groupId) {
      throw new Error("Group target is required.")
    }

    const response = await feedRepository.createPost({
      text,
      audience: selectedDestination.value === "group" ? "group" : "public",
      pageId,
      groupId,
      sharedPostId: input.postId,
    })

    return {
      destination: selectedDestination.value,
      target,
      post: response.post,
    }
  }

  async function runSearch(keyword: string) {
    const trimmedKeyword = keyword.trim()

    if (selectedDestination.value === "timeline" || !trimmedKeyword) {
      searchData.value = emptySearchResponse()
      searchPending.value = false
      return
    }

    const requestId = ++searchRequestId.value
    searchPending.value = true

    try {
      const response = await feedShareRepository.searchTargets(trimmedKeyword, 12)

      if (requestId === searchRequestId.value) {
        searchData.value = response
      }
    }
    catch {
      if (requestId === searchRequestId.value) {
        searchData.value = emptySearchResponse()
      }
    }
    finally {
      if (requestId === searchRequestId.value) {
        searchPending.value = false
      }
    }
  }

  watch(open, async (isOpen) => {
    if (!isOpen) {
      reset()
      return
    }

    await authStore.hydrate()
    await Promise.all([refreshPages(), refreshGroups()])
  })

  watch(activeSearch, (keyword) => {
    if (searchTimeout) clearTimeout(searchTimeout)

    searchTimeout = setTimeout(() => {
      runSearch(keyword)
    }, 260)
  })

  watch(selectedDestination, () => {
    selectedTargetId.value = ""
    searchData.value = emptySearchResponse()
    searchPending.value = false
    searchRequestId.value += 1
    if (searchTimeout) clearTimeout(searchTimeout)
    if (activeSearch.value.trim()) {
      searchTimeout = setTimeout(() => {
        runSearch(activeSearch.value)
      }, 120)
    }
  })

  return {
    selectedDestination,
    selectedTargetId,
    selectedTarget,
    currentProfileTarget,
    pageSearch,
    groupSearch,
    messageSearch,
    destinationTargets,
    destinationPending,
    canShare,
    selectDestination,
    selectTarget,
    submitShare,
    reset,
  }
}
