// English description: Encapsulates the logic for a single community page card, managing optimistic UI updates for likes and follows without requiring a full list refresh.

import { ref, watch, computed } from "vue"
import type { CommunityPageRecord } from "../../domain/types/community.types"
import { createApiCommunityRepository } from "../../infrastructure/repositories/ApiCommunityRepository"
import { formatCommunityLikeCount } from "../../domain/services/community-helpers.service"

export function useCommunityPageCardVM(
  pageProps: () => CommunityPageRecord,
  repository = createApiCommunityRepository(),
) {
  const { t } = useI18n()
  const toast = useToast()

  const likePending = ref(false)
  const localIsLiked = ref(pageProps().following)
  const localLikes = ref(pageProps().likes)
  const localFollowers = ref(pageProps().followers)

  watch(() => pageProps().following, (newVal) => localIsLiked.value = newVal)
  watch(() => pageProps().likes, (newVal) => localLikes.value = newVal)
  watch(() => pageProps().followers, (newVal) => localFollowers.value = newVal)

  const likeCountLabel = computed(() => formatCommunityLikeCount(localLikes.value))
  const followerCountLabel = computed(() => formatCommunityLikeCount(localFollowers.value))

  async function handleLike() {
    if (likePending.value) return
    likePending.value = true
    try {
      const updatedPage = await repository.likePage(pageProps().slug)
      if (updatedPage) {
        localIsLiked.value = updatedPage.following
        localLikes.value = updatedPage.likes
        localFollowers.value = updatedPage.followers
      }
    } catch (error: any) {
      console.error("Failed to like page", error)
      toast.add({
        title: t('pages.pageDetailPage.actionFailed', 'Lỗi'),
        description: error?.statusMessage || error?.message || 'Không thể thực hiện thao tác',
        color: 'red',
      })
    } finally {
      likePending.value = false
    }
  }

  return {
    likePending,
    localIsLiked,
    likeCountLabel,
    followerCountLabel,
    handleLike,
  }
}
