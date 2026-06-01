<!-- Description: Renders the desktop and mobile user conversation detail panel with profile and delete actions, aligned to the PHP user chat shell. -->
<template>
  <div class="user-detail-panel flex h-full flex-col overflow-y-auto bg-[#fcfdff]">
    <template v-if="contact">
      <div class="user-detail-panel__top border-b border-[var(--border-light)] px-5 py-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
              {{ $t("pages.messagesPage.info") }}
            </p>
            <h3 class="mt-2 text-base font-semibold text-[var(--text-primary)]">
              {{ $t("pages.messagesPage.profile") }}
            </h3>
          </div>

          <UButton
            type="button"
            color="error"
            variant="ghost"
            :icon="deletingConversation ? 'i-ph-spinner-gap-bold' : 'i-ph-trash-bold'"
            class="h-10 w-10 justify-center rounded-full"
            :loading="deletingConversation"
            @click="$emit('delete-conversation')"
          />
        </div>
      </div>

      <div class="flex flex-1 flex-col px-5 py-6">
        <div class="rounded-[24px] border border-[var(--border-light)] bg-white px-5 py-6 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
          <UAvatar :src="contact.avatarUrl" size="3xl" class="mx-auto h-24 w-24 rounded-full ring-4 ring-[#eef2ff]" />
          <h4 class="mt-4 text-[20px] font-semibold text-[var(--text-primary)]">
            {{ contact.name }}
          </h4>
          <p class="mt-1 text-sm text-[var(--text-secondary)]">
            {{ contactStatus }}
          </p>

          <div class="mt-5 grid gap-3">
            <div class="rounded-[18px] border border-[var(--border-light)] bg-[var(--bg-muted)] px-4 py-3 text-left">
              <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {{ $t("pages.messagesPage.status") }}
              </p>
              <p class="mt-1 text-sm font-semibold text-[var(--text-primary)]">
                {{ contactStatus }}
              </p>
            </div>

            <div class="rounded-[18px] border border-[var(--border-light)] bg-[var(--bg-muted)] px-4 py-3 text-left">
              <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
                {{ $t("pages.messagesPage.conversation") }}
              </p>
              <p class="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                {{ $t("pages.messagesPage.userDetailDescription") }}
              </p>
            </div>
          </div>
        </div>

        <div class="mt-5 grid gap-3">
          <UButton
            v-if="contact.profileUrl"
            :to="contact.profileUrl"
            color="primary"
            variant="soft"
            class="justify-center rounded-full py-3 font-semibold"
          >
            <template #leading>
              <Icon name="i-ph-user-duotone" class="h-4 w-4" />
            </template>
            {{ $t("pages.messagesPage.viewProfile") }}
          </UButton>

          <UButton
            type="button"
            color="error"
            variant="soft"
            class="justify-center rounded-full py-3 font-semibold"
            :loading="deletingConversation"
            @click="$emit('delete-conversation')"
          >
            <template #leading>
              <Icon name="i-ph-trash-duotone" class="h-4 w-4" />
            </template>
            {{ $t("pages.messagesPage.deleteConversation") }}
          </UButton>
        </div>
      </div>
    </template>

    <div v-else class="flex flex-1 items-center justify-center px-6 py-8">
      <div class="max-w-[260px] text-center">
        <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-primary-50 text-primary-600">
          <Icon name="i-ph-user-circle-duotone" class="h-8 w-8" />
        </div>
        <h3 class="mt-5 text-base font-semibold text-[var(--text-primary)]">
          {{ emptyTitle }}
        </h3>
        <p class="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
          {{ emptyDescription }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MessageContact } from "../../domain/types/messages.types"

const props = defineProps<{
  contact?: MessageContact | null
  deletingConversation?: boolean
  emptyDescription: string
  emptyTitle: string
}>()

const { t } = useI18n()

defineEmits<{
  "delete-conversation": []
}>()

const contactStatus = computed(() => {
  const contact = props.contact

  if (!contact) {
    return ""
  }

  if (contact.isOnline) {
    return t("pages.messagesPage.activeNow")
  }

  return contact.status || t("pages.messagesPage.activeRecently")
})
</script>
