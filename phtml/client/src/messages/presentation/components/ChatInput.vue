<!-- Description: Renders the active thread composer with a PHP-style core shell for text, file, and voice note sending plus one-to-one typing events. -->
<template>
  <div class="border-t border-[var(--border-light)] bg-[#fcfdff] px-4 py-4 sm:px-6">
    <div class="chat-input-shell">
      <div class="chat-input-main-row">
        <div class="chat-input-body">
          <div class="chat-input-field-wrap">
            <UTextarea
              v-model="modelValue"
              autoresize
              class="chat-input-textarea-control"
              :rows="1"
              :disabled="disabled"
              :placeholder="placeholder || $t('pages.messagesPage.composerPlaceholder')"
              :ui="{
                base: 'chat-input-textarea',
              }"
              @input="handleTypingInput"
              @focus="handleTypingFocus"
              @keydown.enter.exact.prevent="handleEnterKey"
            />

            <div class="chat-input-send-wrap">
              <UTooltip :text="$t('pages.messagesPage.sendMessage')">
                <UButton
                  type="button"
                  variant="solid"
                  icon="i-ph-paper-plane-tilt-bold"
                  class="chat-input-send-button btn-primary"
                  :disabled="disabled || !canSend"
                  @click="submitMessage"
                />
              </UTooltip>
            </div>
          </div>

          <div v-if="attachmentPanelOpen && !recordDraft" class="chat-input-panel">
            <UFileUpload
              v-model="attachmentFile"
              :multiple="false"
              :disabled="disabled || isRecording"
              layout="list"
              highlight
              :label="$t('pages.messagesPage.chooseFile')"
              :description="$t('pages.messagesPage.attachmentOptional')"
              class="w-full"
            />
          </div>

          <div v-if="attachmentFile" class="flex items-center justify-between gap-3 rounded-[16px] border border-[var(--border-light)] bg-[var(--bg-muted)] px-4 py-3">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-[var(--text-primary)]">{{ attachmentFile.name }}</p>
              <p class="text-xs text-[var(--text-secondary)]">
                {{ formatFileSize(attachmentFile.size) }}
              </p>
            </div>
            <UButton
              type="button"
              color="error"
              variant="ghost"
              icon="i-ph-x-bold"
              class="rounded-full"
              @click="clearFile"
            />
          </div>

          <div v-if="isRecording || recordDraft" class="rounded-[20px] border border-[var(--border-light)] bg-[var(--bg-muted)] px-4 py-3">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <span
                  class="h-2.5 w-2.5 rounded-full"
                  :class="isRecording ? 'animate-pulse bg-rose-500' : 'bg-primary-500'"
                />
                <div>
                  <p class="text-sm font-semibold text-[var(--text-primary)]">
                    {{ isRecording ? $t('pages.messagesPage.recordingInProgress') : $t('pages.messagesPage.recordReady') }}
                  </p>
                  <p class="text-xs text-[var(--text-secondary)]">
                    {{ formattedRecordDuration }}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <UButton
                  v-if="isRecording"
                  type="button"
                  color="warning"
                  variant="soft"
                  icon="i-ph-stop-circle-duotone"
                  class="rounded-full"
                  @click="stopRecordingDraft"
                >
                  {{ $t("pages.messagesPage.stopRecording") }}
                </UButton>

                <template v-else-if="recordDraft">
                  <UButton
                    type="button"
                    color="neutral"
                    variant="soft"
                    icon="i-ph-trash-duotone"
                    class="rounded-full"
                    @click="discardRecording"
                  >
                    {{ $t("pages.messagesPage.discardRecording") }}
                  </UButton>
                </template>
              </div>
            </div>

            <audio
              v-if="recordDraft"
              :src="recordDraft.previewUrl"
              class="mt-3 w-full"
              controls
              preload="none"
            />
          </div>

          <UAlert
            v-if="permissionDenied || errorMessage"
            color="error"
            variant="subtle"
            icon="i-ph-warning-circle-duotone"
            :title="$t('pages.messagesPage.recordPermissionTitle')"
            :description="permissionDenied ? $t('pages.messagesPage.recordPermissionDenied') : errorMessage"
            class="rounded-[18px]"
          />
        </div>

        <div class="chat-input-actions-right">
          <UTooltip :text="$t('pages.messagesPage.attachmentLabel')">
            <UButton
              type="button"
              color="neutral"
              variant="soft"
              icon="i-ph-paperclip-duotone"
              class="chat-input-icon-button"
              :disabled="disabled || isRecording"
              @click="toggleAttachmentPanel"
            />
          </UTooltip>

          <UTooltip :text="isRecording ? $t('pages.messagesPage.stopRecording') : $t('pages.messagesPage.startRecording')">
            <UButton
              type="button"
              color="neutral"
              :variant="isRecording ? 'solid' : 'soft'"
              :icon="isRecording ? 'i-ph-stop-circle-duotone' : 'i-ph-microphone-duotone'"
              class="chat-input-icon-button"
              :disabled="disabled"
              @click="handleRecordButton"
            />
          </UTooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useMessageRecorder } from "../../application/composables/useMessageRecorder"
import type { MessageComposerDraft } from "../../domain/types/messages.types"

const modelValue = defineModel<string>({ default: "" })

defineProps<{
  disabled?: boolean
  placeholder?: string
}>()

const emit = defineEmits<{
  send: [value: MessageComposerDraft]
  "typing-start": []
  "typing-stop": []
}>()

const attachmentPanelOpen = ref(false)
const attachmentFile = ref<File | null>(null)
const {
  isSupported,
  isRecording,
  permissionDenied,
  errorMessage,
  durationMs,
  recordDraft,
  startRecording,
  stopRecording,
  clearRecording,
} = useMessageRecorder()

const canSend = computed(() =>
  modelValue.value.trim().length > 0 || Boolean(attachmentFile.value) || Boolean(recordDraft.value),
)

const formattedRecordDuration = computed(() => {
  const totalSeconds = Math.max(Math.floor(durationMs.value / 1000), 0)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
})

watch(attachmentFile, (file) => {
  if (file && recordDraft.value) {
    clearRecording()
  }
})

watch(recordDraft, (draft) => {
  if (draft && attachmentFile.value) {
    attachmentFile.value = null
  }
})

watch(modelValue, (value) => {
  if (!value.trim()) {
    emit("typing-stop")
  }
})

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function handleTypingFocus() {
  if (modelValue.value.trim()) {
    emit("typing-start")
  }
}

function handleTypingInput() {
  if (modelValue.value.trim()) {
    emit("typing-start")
    return
  }

  emit("typing-stop")
}

function toggleAttachmentPanel() {
  if (recordDraft.value || isRecording.value) {
    clearRecording()
  }

  attachmentPanelOpen.value = !attachmentPanelOpen.value
}

function clearFile() {
  attachmentFile.value = null
}

async function handleRecordButton() {
  emit("typing-stop")

  if (isRecording.value) {
    await stopRecordingDraft()
    return
  }

  clearFile()
  attachmentPanelOpen.value = false
  await startRecording()
}

async function stopRecordingDraft() {
  await stopRecording()
}

function discardRecording() {
  clearRecording()
}

const isSubmitting = ref(false)

function handleEnterKey(event: KeyboardEvent) {
  if (event.isComposing) {
    return
  }
  submitMessage()
}

function resetComposerState() {
  modelValue.value = ""
  attachmentFile.value = null
  attachmentPanelOpen.value = false
  clearRecording()
  emit("typing-stop")
}

function submitMessage() {
  if (!canSend.value || isSubmitting.value) {
    return
  }

  isSubmitting.value = true

  emit("send", {
    text: modelValue.value.trim(),
    file: attachmentFile.value,
    record: recordDraft.value,
  })

  resetComposerState()

  setTimeout(() => {
    isSubmitting.value = false
  }, 300)
}
</script>

<style scoped>
.chat-input-shell {
  border-radius: 24px;
  border: 1px solid var(--border-light);
  background: #ffffff;
  padding: 12px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.04);
}

.chat-input-main-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-input-actions-right {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.chat-input-icon-button {
  width: 44px !important;
  height: 44px !important;
  justify-content: center;
  border-radius: 999px !important;
}

.chat-input-body {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-input-field-wrap {
  position: relative;
  width: 100%;
  min-height: 46px;
  min-width: 0;
  flex: 1;
}

:deep(.chat-input-textarea-control) {
  width: 100%;
  display: block;
}

:deep(.chat-input-textarea) {
  min-height: 46px;
  width: 100%;
  border-radius: 999px !important;
  border: 1px solid var(--border-light) !important;
  background: var(--bg-muted) !important;
  padding: 11px 56px 11px 18px !important;
  color: var(--text-primary);
  font-size: 15px;
  line-height: 24px;
  box-shadow: none !important;
  resize: none;
}

.chat-input-send-wrap {
  position: absolute;
  right: 5px;
  top: 23px;
  z-index: 2;
  transform: translateY(-50%);
}

.chat-input-send-button {
  width: 36px !important;
  height: 36px !important;
  justify-content: center;
  border-radius: 999px !important;
  /* position: absolute !important; */
  /* right: 4px !important; */
  box-shadow: 0 10px 24px rgba(0, 42, 255, 0.18);
}

.chat-input-panel {
  border-radius: 20px;
  border: 1px solid var(--border-light);
  background: var(--bg-muted);
  padding: 12px;
}

@media (max-width: 520px) {
  .chat-input-main-row {
    gap: 8px;
  }

  .chat-input-actions-right {
    gap: 6px;
  }

  .chat-input-icon-button {
    width: 40px !important;
    height: 40px !important;
  }
}
</style>
