<!-- Description: Renders the real multi-send composer and forwards payloads to the backend bridge used by the PHP messages page. -->
<template>
  <div class="flex h-full min-h-0 w-full flex-col overflow-hidden bg-white">
    <div class="border-b border-[#e2e8f0] px-5 py-5">
      <div class="flex items-center gap-3">
        <UButton
          variant="ghost"
          color="neutral"
          class="md:hidden -ml-2 h-10 w-10 shrink-0 justify-center rounded-full p-0 text-slate-500 hover:bg-slate-100"
          @click="$emit('close')"
        >
          <Icon name="i-ph-arrow-left-bold" class="h-5 w-5" />
        </UButton>
        <p class="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
          {{ $t("pages.messagesPage.composeTitle") }}
        </p>
      </div>
      <h3 class="mt-2 text-lg font-black text-[var(--text-primary)]">
        {{ $t("pages.messagesPage.sendMultiple") }}
      </h3>
      <p class="mt-2 text-sm leading-6 text-slate-500">
        {{ $t("pages.messagesPage.multiComposerDescription") }}
      </p>
    </div>

    <div class="scrollbar-hide flex-1 space-y-5 overflow-y-auto px-5 py-5">
      <section>
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-black text-[var(--text-primary)]">
            {{ $t("pages.messagesPage.sendTo") }}
          </p>
          <span class="text-xs font-semibold text-slate-500">
            {{ selectedCountLabel }}
          </span>
        </div>

        <div v-if="recipients.length > 0" class="mt-3 flex flex-wrap gap-2">
          <UBadge
            v-for="recipient in recipients.slice(0, 8)"
            :key="recipient.id"
            color="primary"
            variant="soft"
            class="rounded-full px-3 py-1 font-semibold"
          >
            {{ recipient.name }}
          </UBadge>
          <UBadge
            v-if="recipients.length > 8"
            color="neutral"
            variant="soft"
            class="rounded-full px-3 py-1 font-semibold"
          >
            +{{ recipients.length - 8 }}
          </UBadge>
        </div>

        <div v-else class="mt-3 rounded-[18px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-4 text-sm text-slate-500">
          {{ $t("pages.messagesPage.noRecipientsSelected") }}
        </div>
      </section>

      <section>
        <label class="mb-2 block text-sm font-black text-[var(--text-primary)]">
          {{ $t("pages.messagesPage.content") }}
        </label>
        <textarea
          v-model="textModel"
          rows="4"
          class="w-full rounded-[20px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-primary-500 focus:bg-white"
          :placeholder="$t('pages.messagesPage.messagePlaceholder')"
        />
      </section>

      <section class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <label class="text-sm font-black text-[var(--text-primary)]">
            {{ $t("pages.messagesPage.attachmentLabel") }}
          </label>
          <span class="text-xs font-semibold text-slate-500">
            {{ $t("pages.messagesPage.attachmentOptional") }}
          </span>
        </div>

        <input
          ref="fileInput"
          type="file"
          class="block w-full rounded-[16px] border border-dashed border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:font-semibold file:text-primary-700 hover:file:bg-primary-100"
          @change="handleFileChange"
        >

        <div v-if="fileModel" class="flex items-center justify-between gap-3 rounded-[18px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3">
          <div class="min-w-0">
            <p class="truncate text-sm font-semibold text-[var(--text-primary)]">
              {{ fileModel.name }}
            </p>
            <p class="text-xs text-slate-500">
              {{ formatBytes(fileModel.size) }}
            </p>
          </div>

          <UButton
            variant="soft"
            color="neutral"
            size="sm"
            class="rounded-full px-4 font-semibold"
            @click="clearFile"
          >
            {{ $t("pages.messagesPage.removeAttachment") }}
          </UButton>
        </div>
      </section>

      <div
        v-if="statusMessage"
        class="rounded-[18px] px-4 py-3 text-sm font-semibold"
        :class="statusClass"
      >
        {{ statusMessage }}
      </div>
    </div>

    <div class="flex items-center justify-between gap-3 border-t border-[#e2e8f0] px-5 py-4">
      <p class="text-xs font-semibold text-slate-500">
        {{ $t("pages.messagesPage.multiSubmitHint") }}
      </p>

      <UButton
        class="rounded-full px-5 font-semibold"
        :disabled="pending || !canSubmit"
        @click="$emit('send')"
      >
        <template #leading>
          <Icon name="i-ph-paper-plane-tilt-bold" class="h-4 w-4" />
        </template>
        {{ pending ? $t("pages.messagesPage.multiSendingButton") : $t("pages.messagesPage.sendMessage") }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MessageContact } from "../../domain/types/messages.types"

const textModel = defineModel<string>("text", { default: "" })
const fileModel = defineModel<File | null>("file", { default: null })

const props = defineProps<{
  pending?: boolean
  recipients: MessageContact[]
  statusMessage?: string
  statusTone?: "neutral" | "success" | "warning" | "error"
}>()

defineEmits<{
  send: []
  close: []
}>()

const { t } = useI18n()
const fileInput = ref<HTMLInputElement | null>(null)

const canSubmit = computed(() =>
  props.recipients.length > 0
  && (textModel.value.trim().length > 0 || Boolean(fileModel.value)),
)

const selectedCountLabel = computed(() =>
  t("pages.messagesPage.selectedRecipientsCount", {
    count: props.recipients.length,
  }),
)

const statusClass = computed(() => {
  if (props.statusTone === "success") {
    return "bg-emerald-50 text-emerald-700"
  }

  if (props.statusTone === "warning") {
    return "bg-amber-50 text-amber-700"
  }

  if (props.statusTone === "error") {
    return "bg-rose-50 text-rose-700"
  }

  return "bg-slate-100 text-slate-700"
})

function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  fileModel.value = input.files?.[0] ?? null
}

function clearFile() {
  fileModel.value = null

  if (fileInput.value) {
    fileInput.value.value = ""
  }
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}
</script>
