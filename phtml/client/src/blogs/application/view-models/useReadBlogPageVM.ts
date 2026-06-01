// English description: Owns read-blog article resolution, reactions, comments, related content, and reading progress.

import { appRoutes } from "../../../shared-kernel/application/constants/route-registry"
import { useCurrentAuthUserStore } from "../../../auth/application/stores/useCurrentAuthUserStore"
import { createApiBlogRepository } from "../../infrastructure/repositories/ApiBlogRepository"
import type { BlogReadArticle } from "../../domain/types/blog.types"
import type { FeedCommentRecord, FeedCommentSubmitPayload } from "../../../feed/domain/types/feed.types"
import type { FeedCommentActionRepository } from "../../../feed/application/view-models/useFeedCommentItemVM"

export function useReadBlogPageVM(
  repository = createApiBlogRepository(),
) {
  const route = useRoute()
  const { locale } = useI18n()
  const requestURL = useRequestURL()
  const currentAuthUserStore = useCurrentAuthUserStore()

  const currentSlug = computed(() => String(route.params.slug ?? ""))
  const backendBlogId = computed(() => Number.parseInt(currentSlug.value, 10))
  const { data: backendArticle, error: loadError, pending: isLoading, refresh } = useAsyncData(
    "blogs:read",
    () => Number.isInteger(backendBlogId.value) && backendBlogId.value > 0
      ? repository.getBlogBySlug(currentSlug.value)
      : Promise.resolve(null),
    {
      default: () => null,
      watch: [currentSlug],
    },
  )
  const { data: relatedResponse } = useAsyncData(
    "blogs:read:related",
    () => repository.getBlogs({ limit: 6 }),
    {
      default: () => [],
      watch: [currentSlug],
    },
  )
  const { data: backendComments, pending: commentsLoading, refresh: refreshComments } = useAsyncData(
    "blogs:read:comments",
    () => Number.isInteger(backendBlogId.value) && backendBlogId.value > 0
      ? repository.getBlogComments(currentSlug.value)
      : Promise.resolve([]),
    {
      default: () => [],
      watch: [currentSlug],
    },
  )
  const article = computed<BlogReadArticle | null>(() => backendArticle.value)
  const articleNotFound = computed(() =>
    !isLoading.value && !backendArticle.value,
  )

  const liked = ref(false)
  const shareOpen = ref(false)
  const comments = ref<FeedCommentRecord[]>([])
  const commenting = ref(false)

  watch(currentSlug, () => {
    liked.value = false
    shareOpen.value = false
    comments.value = []
  })

  watch(backendComments, (value) => {
    comments.value = [...value]
  }, { immediate: true })

  onMounted(async () => {
    await currentAuthUserStore.hydrate()
  })

  const displayedLikes = computed(() => (article.value?.likes ?? 0) + (liked.value ? 1 : 0))

  const relatedArticles = computed(() => {
    const currentArticle = article.value
    const articles = relatedResponse.value

    if (!currentArticle) return []

    const sameCategory = articles.filter(
      item => item.slug !== currentArticle.slug && item.category === currentArticle.category,
    )
    const fallback = articles.filter(item => item.slug !== currentArticle.slug)

    return (sameCategory.length > 0 ? sameCategory : fallback).slice(0, 4)
  })

  const shareUrl = computed(() =>
    new URL(appRoutes.readBlog(article.value?.slug ?? currentSlug.value), requestURL.origin).toString(),
  )

  const compactFormatter = computed(() => new Intl.NumberFormat(locale.value === "vi" ? "vi-VN" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }))

  const formatCompact = (value: number) => compactFormatter.value.format(value)

  const addComment = async (payload: FeedCommentSubmitPayload) => {
    if (commenting.value || !article.value || !payload.text.trim()) return

    commenting.value = true

    try {
      const comment = await repository.addBlogComment(article.value.slug, payload)
      await refreshComments()

      if (!backendComments.value.some(item => item.id === comment.id)) {
        comments.value = [comment, ...comments.value]
      }
    }
    finally {
      commenting.value = false
    }
  }

  const commentActionRepository: FeedCommentActionRepository = {
    getCommentReplies(input) {
      return repository.getBlogCommentReplies(currentSlug.value, input)
    },
    runCommentAction(input) {
      return repository.runBlogCommentAction(currentSlug.value, input)
    },
  }

  const readingProgress = ref(0)

  const updateProgress = () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    readingProgress.value = docHeight > 0 ? Math.min(100, Math.round((scrollTop / docHeight) * 100)) : 0
  }

  onMounted(() => {
    window.addEventListener("scroll", updateProgress, { passive: true })
    updateProgress()
  })

  onUnmounted(() => {
    window.removeEventListener("scroll", updateProgress)
  })

  return {
    article,
    articleNotFound,
    liked,
    shareOpen,
    comments,
    commentsLoading,
    commenting,
    displayedLikes,
    relatedArticles,
    shareUrl,
    formatCompact,
    addComment,
    readingProgress,
    isLoading,
    loadError,
    refresh,
    currentUserName: computed(() => currentAuthUserStore.user?.name || ""),
    currentUserAvatarUrl: computed(() => currentAuthUserStore.user?.avatarUrl || ""),
    commentActionRepository,
  }
}
