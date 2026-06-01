import { ref, computed } from "vue"
import type { UserRecord } from "../../../shared-kernel/domain/types/user.types"
import { createApiCommunityRepository } from "../../infrastructure/repositories/ApiCommunityRepository"

export function useCommunityPageInviteVM(
  pageSlug: () => string,
  repository = createApiCommunityRepository(),
) {
  const { t } = useI18n()
  const toast = useToast()

  const isOpen = ref(false)
  const isPending = ref(false)
  const searchQuery = ref("")
  const candidates = ref<UserRecord[]>([])
  const invitedIds = ref<Set<number>>(new Set())

  const visibleCandidates = computed(() => {
    const q = searchQuery.value.toLowerCase().trim()
    if (!q) return candidates.value
    return candidates.value.filter(
      user => user.name.toLowerCase().includes(q) || user.username.toLowerCase().includes(q)
    )
  })

  async function openModal() {
    isOpen.value = true
    await fetchCandidates()
  }

  function closeModal() {
    isOpen.value = false
    searchQuery.value = ""
    // We optionally keep candidates cached or clear them
  }

  async function fetchCandidates() {
    if (isPending.value) return
    isPending.value = true
    try {
      const data = await repository.getPageInvites(pageSlug())
      candidates.value = data
      // Clear invited IDs that are fetched fresh
      invitedIds.value.clear()
    } catch (error: any) {
      console.error("Failed to fetch invite candidates", error)
      toast.add({
        title: t('pages.pageDetailPage.actionFailed', 'Lỗi'),
        description: error?.statusMessage || error?.message || 'Không thể tải danh sách bạn bè',
        color: 'red',
      })
    } finally {
      isPending.value = false
    }
  }

  async function sendInvite(userId: number) {
    if (invitedIds.value.has(userId)) return

    try {
      await repository.sendPageInvite(pageSlug(), userId)
      invitedIds.value = new Set([...invitedIds.value, userId])
      toast.add({
        title: t('community.profilePage.invites.inviteSuccess', 'Thành công'),
        description: t('community.profilePage.invites.inviteSuccess', 'Đã gửi lời mời thích trang'),
        color: 'green',
      })
    } catch (error: any) {
      console.error("Failed to send invite", error)
      toast.add({
        title: t('pages.pageDetailPage.actionFailed', 'Lỗi'),
        description: error?.statusMessage || error?.message || 'Không thể gửi lời mời',
        color: 'red',
      })
    }
  }

  return {
    isOpen,
    isPending,
    searchQuery,
    visibleCandidates,
    invitedIds,
    openModal,
    closeModal,
    sendInvite,
  }
}
