// Description: ViewModel for the group call page; owns API interactions with the call backend and exposes reactive state to the View.

import type { Ref } from "vue"
import type { MessageGroupCallCandidate, MessageGroupCallPayload, MessageGroupCallSync } from "../../domain/types/calls.types"
import type { MessageCallsRepository } from "../../domain/repositories/MessageCallsRepository"
import { createApiMessageCallsRepository } from "../../infrastructure/repositories/ApiMessageCallsRepository"

export function useGroupCallPageVM(
  callId: Ref<number>,
  repository: MessageCallsRepository = createApiMessageCallsRepository(),
) {
  const runtimeConfig = useRuntimeConfig()

  const payload = ref<MessageGroupCallPayload | null>(null)
  const loading = ref(true)
  const loadError = ref("")
  const candidates = ref<MessageGroupCallCandidate[]>([])
  const selectedCandidateIds = ref<number[]>([])
  const candidatesPending = ref(false)
  const invitePending = ref(false)

  const apiBase = computed(() =>
    String(runtimeConfig.public.apiBase || "/_api"),
  )

  async function loadPayload(): Promise<MessageGroupCallPayload> {
    const joinResult = await repository.joinGroupCall({ id: callId.value })

    if (joinResult.status !== 200) {
      throw new Error("Can not join this group call.")
    }

    const loaded = await repository.getGroupCallPayload({ id: callId.value })

    if (loaded.status !== 200 || !loaded.id) {
      throw new Error("Can not load this group call.")
    }

    payload.value = loaded
    return loaded
  }

  async function syncCall(): Promise<MessageGroupCallSync | null> {
    if (!payload.value) {
      return null
    }

    const sync = await repository.syncGroupCall({ id: payload.value.id }).catch(() => null)

    if (sync?.status === 200) {
      payload.value = {
        ...payload.value,
        participantCount: sync.participantCount,
        groupName: sync.groupName || payload.value.groupName,
        groupAvatar: sync.groupAvatar || payload.value.groupAvatar,
      }
    }

    return sync
  }

  async function leaveCall(): Promise<void> {
    if (!payload.value?.id) {
      return
    }

    await repository.leaveGroupCall({ id: payload.value.id }).catch(() => null)
  }

  function leaveCallKeepalive(): void {
    if (!payload.value?.id || !import.meta.client) {
      return
    }

    repository.leaveGroupCallKeepalive({
      id: payload.value.id,
      apiBase: apiBase.value,
    })
  }

  async function fetchCandidates(): Promise<void> {
    if (!payload.value) {
      return
    }

    candidatesPending.value = true

    try {
      candidates.value = await repository.getGroupCallCandidates({
        id: payload.value.id,
        groupId: payload.value.groupId,
      })
    }
    catch {
      candidates.value = []
    }
    finally {
      candidatesPending.value = false
    }
  }

  function toggleCandidate(userId: number, checked: boolean): void {
    selectedCandidateIds.value = checked
      ? [...new Set([...selectedCandidateIds.value, userId])]
      : selectedCandidateIds.value.filter(id => id !== userId)
  }

  function clearSelectedCandidates(): void {
    selectedCandidateIds.value = []
  }

  function setLoadError(message: string): void {
    loadError.value = message
  }

  async function inviteSelected(): Promise<boolean> {
    if (!payload.value || selectedCandidateIds.value.length === 0) {
      return false
    }

    invitePending.value = true

    try {
      await repository.inviteGroupCallMembers({
        id: payload.value.id,
        userIds: selectedCandidateIds.value,
      })
      return true
    }
    catch {
      return false
    }
    finally {
      invitePending.value = false
    }
  }

  return {
    payload,
    loading,
    loadError,
    candidates,
    selectedCandidateIds,
    candidatesPending,
    invitePending,
    loadPayload,
    syncCall,
    leaveCall,
    leaveCallKeepalive,
    fetchCandidates,
    toggleCandidate,
    clearSelectedCandidates,
    setLoadError,
    inviteSelected,
  }
}
