// English description: Forum page view-model that owns backend catalog, thread selection, create/reply actions, and URL-synced filters.

import { createApiForumRepository } from "../../infrastructure/repositories/ApiForumRepository"
import type { ForumPageTab, ForumReplyPayload, ForumThreadPayload } from "../../domain/types/forum.types"

const readQueryValue = (value: unknown) => Array.isArray(value) ? String(value[0] || "") : String(value || "")
const forumTabs = ["browse", "my_threads"] as const satisfies readonly ForumPageTab[]
const readForumTab = (value: unknown): ForumPageTab => {
  const raw = readQueryValue(value)
  return forumTabs.includes(raw as ForumPageTab) ? raw as ForumPageTab : "browse"
}
const readQueryNumber = (value: unknown) => {
  const raw = readQueryValue(value)
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

export function useForumPageVM(repository = createApiForumRepository()) {
  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()
  const toast = useToast()

  const search = ref(readQueryValue(route.query.q))
  const createOpen = ref(false)
  const creating = ref(false)
  const replying = ref(false)
  const loadingMore = ref(false)

  const activeTab = computed(() => readForumTab(route.query.tab))
  const activeForumId = computed(() => readQueryNumber(route.query.fid))
  const activeThreadId = computed(() => readQueryNumber(route.query.tid))
  const isForumDrilldown = computed(() => activeForumId.value > 0)
  const isThreadDetail = computed(() => activeThreadId.value > 0)
  const shouldLoadForumThreads = computed(() => isForumDrilldown.value && activeTab.value !== "my_threads")
  const shouldLoadMyThreads = computed(() => activeTab.value === "my_threads")

  const catalogState = useAsyncData(
    () => `forum:catalog:${readQueryValue(route.query.q)}`,
    () => repository.getCatalog({ q: readQueryValue(route.query.q) }),
    { watch: [() => route.query.q] },
  )

  const threadListState = useAsyncData(
    () => `forum:threads:${activeTab.value}:${activeForumId.value}:${readQueryValue(route.query.q)}`,
    () => shouldLoadForumThreads.value
      ? repository.getThreads({ forumId: activeForumId.value, q: readQueryValue(route.query.q) })
      : Promise.resolve({ forum: null, threads: [], canCreate: false, hasMore: false, nextOffset: null }),
    { watch: [activeTab, activeForumId, () => route.query.q] },
  )

  const myThreadState = useAsyncData(
    () => `forum:my-threads:${readQueryValue(route.query.q)}`,
    () => shouldLoadMyThreads.value
      ? repository.getMyThreads({ q: readQueryValue(route.query.q) })
      : Promise.resolve({ forum: null, threads: [], canCreate: false, hasMore: false, nextOffset: null }),
    { watch: [activeTab, () => route.query.q] },
  )

  const detailState = useAsyncData(
    () => `forum:thread:${activeThreadId.value}`,
    () => activeThreadId.value
      ? repository.getThreadDetail(activeThreadId.value)
      : Promise.resolve({ thread: null, canCreate: false }),
    { watch: [activeThreadId] },
  )

  const sections = computed(() => catalogState.data.value?.sections ?? [])
  const forums = computed(() => sections.value.flatMap(section => section.forums))
  const activeForum = computed(() =>
    threadListState.data.value?.forum
    ?? forums.value.find(forum => forum.id === activeForumId.value)
    ?? null,
  )
  const forumThreads = computed(() => threadListState.data.value?.threads ?? [])
  const myThreads = computed(() => myThreadState.data.value?.threads ?? [])
  const threads = computed(() => activeTab.value === "my_threads" ? myThreads.value : forumThreads.value)
  const selectedThread = computed(() =>
    detailState.data.value?.thread
    ?? threads.value.find(thread => thread.id === activeThreadId.value)
    ?? null,
  )
  const canCreate = computed(() =>
    Boolean(catalogState.data.value?.canCreate || threadListState.data.value?.canCreate || myThreadState.data.value?.canCreate || detailState.data.value?.canCreate),
  )
  const hasMoreThreads = computed(() => Boolean(activeTab.value === "my_threads" ? myThreadState.data.value?.hasMore : threadListState.data.value?.hasMore))
  const pending = computed(() => Boolean(catalogState.pending.value || threadListState.pending.value || myThreadState.pending.value || detailState.pending.value))
  const error = computed(() => catalogState.error.value || threadListState.error.value || myThreadState.error.value || detailState.error.value)
  const totalForumCount = computed(() => forums.value.length)
  const totalThreadCount = computed(() => forums.value.reduce((total, forum) => total + forum.posts, 0))

  watch(
    () => route.query.q,
    value => {
      search.value = readQueryValue(value)
    },
  )

  const syncQuery = async () => {
    await router.push({
      path: "/forum",
      query: {
        tab: activeTab.value,
        ...(activeForumId.value ? { fid: String(activeForumId.value) } : {}),
        ...(activeThreadId.value ? { tid: String(activeThreadId.value) } : {}),
        ...(search.value.trim() ? { q: search.value.trim() } : {}),
      },
    })
  }

  const selectForum = async (forumId: number) => {
    await router.push({
      path: "/forum",
      query: {
        tab: activeTab.value === "search" ? "search" : "browse",
        fid: String(forumId),
        ...(search.value.trim() ? { q: search.value.trim() } : {}),
      },
    })
  }

  async function selectThread(threadId: number, options: { replace?: boolean } = {}) {
    const navigation = {
      path: "/forum",
      query: {
        ...(activeForumId.value ? { fid: String(activeForumId.value) } : {}),
        tab: activeTab.value === "my_threads" || activeTab.value === "search" ? activeTab.value : "browse",
        tid: String(threadId),
        ...(search.value.trim() ? { q: search.value.trim() } : {}),
      },
    }

    if (options.replace) {
      await router.replace(navigation)
      return
    }

    await router.push(navigation)
  }

  const resetFilters = async () => {
    search.value = ""
    await router.push({ path: "/forum", query: { tab: activeTab.value } })
  }

  const selectTab = async (tab: ForumPageTab) => {
    await router.push({
      path: "/forum",
      query: {
        tab,
        ...(search.value.trim() ? { q: search.value.trim() } : {}),
      },
    })
  }

  const openCreate = () => {
    createOpen.value = true
  }

  const closeCreate = () => {
    createOpen.value = false
  }

  async function createThread(payload: ForumThreadPayload) {
    if (creating.value) return

    creating.value = true
    try {
      const result = await repository.createThread(payload)
      createOpen.value = false
      await threadListState.refresh()

      if (result.thread) {
        await router.push({
          path: "/forum",
          query: {
            tab: "browse",
            fid: String(result.thread.forumId),
            tid: String(result.thread.id),
            ...(search.value.trim() ? { q: search.value.trim() } : {}),
          },
        })
      }

      toast.add({
        color: "success",
        icon: "i-ph-check-circle-fill",
        title: t("pages.forumPage.modalStatusSuccessTitle"),
        description: t("pages.forumPage.modalStatusSuccessDescription"),
      })
    }
    catch (err) {
      toast.add({
        color: "warning",
        icon: "i-ph-warning-circle-fill",
        title: t("pages.forumPage.modalStatusErrorTitle"),
        description: err instanceof Error ? err.message : t("pages.forumPage.modalStatusErrorDescription"),
      })
    }
    finally {
      creating.value = false
    }
  }

  async function replyThread(message: string) {
    const thread = selectedThread.value
    if (!thread || replying.value) return

    replying.value = true
    try {
      const payload: ForumReplyPayload = {
        threadId: thread.id,
        forumId: thread.forumId || activeForumId.value,
        subject: thread.title,
        message,
      }
      await repository.replyThread(payload)
      await Promise.all([detailState.refresh(), threadListState.refresh(), myThreadState.refresh()])

      toast.add({
        color: "success",
        icon: "i-ph-check-circle-fill",
        title: t("pages.forumPage.replyStatusSuccessTitle"),
        description: t("pages.forumPage.replyStatusSuccessDescription"),
      })
    }
    catch (err) {
      toast.add({
        color: "warning",
        icon: "i-ph-warning-circle-fill",
        title: t("pages.forumPage.replyStatusErrorTitle"),
        description: err instanceof Error ? err.message : t("pages.forumPage.replyStatusErrorDescription"),
      })
    }
    finally {
      replying.value = false
    }
  }

  const loadMoreThreads = async () => {
    const current = activeTab.value === "my_threads" ? myThreadState.data.value : threadListState.data.value
    if (!current?.nextOffset || loadingMore.value) return
    if (activeTab.value !== "my_threads" && !activeForumId.value) return

    loadingMore.value = true
    try {
      if (activeTab.value === "my_threads") {
        const next = await repository.getMyThreads({
          q: readQueryValue(route.query.q),
          offset: current.nextOffset,
        })
        myThreadState.data.value = {
          ...next,
          threads: [...current.threads, ...next.threads],
        }
      }
      else {
        const next = await repository.getThreads({
          forumId: activeForumId.value,
          q: readQueryValue(route.query.q),
          offset: current.nextOffset,
        })
        threadListState.data.value = {
          ...next,
          threads: [...current.threads, ...next.threads],
        }
      }
    }
    finally {
      loadingMore.value = false
    }
  }

  return {
    search,
    activeTab,
    createOpen,
    creating,
    replying,
    sections,
    forums,
    activeForumId,
    activeThreadId,
    isForumDrilldown,
    isThreadDetail,
    activeForum,
    forumThreads,
    myThreads,
    threads,
    selectedThread,
    canCreate,
    hasMoreThreads,
    pending,
    error,
    loadingMore,
    totalForumCount,
    totalThreadCount,
    syncQuery,
    selectTab,
    selectForum,
    selectThread,
    resetFilters,
    openCreate,
    closeCreate,
    createThread,
    replyThread,
    loadMoreThreads,
  }
}
