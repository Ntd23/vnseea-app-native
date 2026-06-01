<!-- Description: Provides the PHP-parity feed comment composer with real text, image, GIF-file, and voice submit payloads. -->
<template>
  <form class="comment-composer" @submit.prevent="submitComment">
    <div class="comment-composer__avatar" aria-hidden="true">
      <img
        v-if="currentUserAvatarUrl"
        :src="currentUserAvatarUrl"
        :alt="currentUserName"
        class="comment-composer__avatar-img"
      >
      <span v-else-if="currentUserInitials">{{ currentUserInitials }}</span>
      <Icon v-else name="i-ph-user-circle-duotone" class="h-5 w-5 text-blue-600" />
    </div>

    <div class="comment-composer__shell">
      <div class="comment-composer__field">
        <div class="comment-composer__main-row">
          <div class="comment-composer__input-wrap">
            <div
              class="comment-composer__editor"
              :class="{ 'comment-composer__editor--highlighted': hasHighlightedMentions }"
            >
              <div v-if="hasHighlightedMentions" class="comment-composer__highlight" aria-hidden="true">
                <template v-for="segment in highlightedMessageSegments" :key="segment.key">
                  <span :class="{ 'comment-composer__highlight-mention': segment.isMention }">{{ segment.text }}</span>
                </template>
              </div>

              <textarea
                ref="textareaRef"
                v-model="message"
                class="comment-composer__textarea"
                :disabled="submitting"
                :placeholder="$t('feed.commentComposer.placeholder')"
                rows="1"
                spellcheck="false"
                autocomplete="off"
                autocapitalize="off"
                autocorrect="off"
                @input="handleComposerInput"
                @click="updateMentionQuery"
                @keyup="handleTextareaKeyup"
                @keydown.esc.prevent="closeMentionSuggestions"
                @keydown.enter.exact="handleEnterKeydown"
                @compositionstart="isComposingText = true"
                @compositionend="handleCompositionEnd"
              />
            </div>

            <div v-if="enableAttachments" class="comment-composer__inline-actions">
              <button
                class="comment-composer__inline-tool"
                type="button"
                title="Tag bạn bè"
                aria-label="Tag bạn bè"
                :disabled="submitting"
                @click="insertMentionTrigger"
              >
                @
              </button>

              <button
                class="comment-composer__inline-tool"
                type="button"
                :title="$t('feed.commentComposer.tooltipGif')"
                :aria-label="$t('feed.commentComposer.tooltipGif')"
                :disabled="submitting"
                @click="openGifPicker"
              >
                <Icon name="i-ph-gif-duotone" class="h-5 w-5" />
              </button>

              <button
                class="comment-composer__inline-tool"
                :class="{ 'comment-composer__tool--recording': recording }"
                type="button"
                :title="$t('feed.commentComposer.tooltipVoice')"
                :aria-label="$t('feed.commentComposer.tooltipVoice')"
                :disabled="submitting"
                @click="toggleRecording"
              >
                <Icon :name="recording ? 'i-ph-stop-circle-fill' : 'i-ph-microphone-duotone'" class="h-5 w-5" />
              </button>

              <div class="comment-composer__emoji-wrap">
                <button
                  class="comment-composer__inline-tool"
                  type="button"
                  :title="$t('feed.commentComposer.tooltipEmoji')"
                  :aria-label="$t('feed.commentComposer.tooltipEmoji')"
                  :disabled="submitting"
                  @click="emojiOpen = !emojiOpen"
                >
                  <Icon name="i-ph-smiley-duotone" class="h-5 w-5" />
                </button>
                <div v-if="emojiOpen" class="comment-composer__emoji-tray">
                  <button
                    v-for="emoji in emojiOptions"
                    :key="emoji.value"
                    class="comment-composer__emoji"
                    type="button"
                    :title="emoji.label"
                    @click="insertEmoji(emoji.text)"
                  >
                    <span class="text-xl leading-none">{{ emoji.text }}</span>
                  </button>
                </div>
              </div>

              <button
                class="comment-composer__inline-tool"
                type="button"
                :title="$t('feed.commentComposer.tooltipImage')"
                :aria-label="$t('feed.commentComposer.tooltipImage')"
                :disabled="submitting"
                @click="openImagePicker"
              >
                <Icon name="i-ph-images-square-duotone" class="h-5 w-5" />
              </button>

              <button
                type="submit"
                class="comment-composer__send"
                :disabled="submitting || !canSubmit"
                :aria-label="$t('feed.commentComposer.submit')"
              >
                <Icon v-if="submitting" name="i-ph-circle-notch-bold" class="h-4.5 w-4.5 animate-spin" />
                <Icon v-else name="i-ph-paper-plane-tilt-fill" class="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="showMentionSuggestions" class="comment-composer__mention-popover">
          <div v-if="mentionLoading" class="comment-composer__mention-state">
            <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
            <span>{{ $t("feed.commentComposer.mentionLoading") }}</span>
          </div>
          <template v-else-if="mentionQuery.trim().length > 0">
            <button
              v-for="user in mentionSuggestions"
              :key="user.id"
              type="button"
              class="comment-composer__mention-option"
              @mousedown.prevent="selectMention(user)"
            >
              <span class="comment-composer__mention-avatar">
                <img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.name">
                <span v-else>{{ user.initials }}</span>
              </span>
              <span class="comment-composer__mention-copy">
                <span class="comment-composer__mention-name">{{ user.name }}</span>
                <span class="comment-composer__mention-username">@{{ user.username }}</span>
              </span>
            </button>
          </template>
          <div v-if="!mentionLoading && mentionQuery.trim().length === 0" class="comment-composer__mention-state">
            {{ $t("feed.commentComposer.mentionTypeToSearch") }}
          </div>
          <div v-else-if="!mentionLoading && mentionSuggestions.length === 0" class="comment-composer__mention-state">
            {{ $t("feed.commentComposer.mentionEmpty") }}
          </div>
        </div>

        <div v-if="attachmentPreview || recording || recordingErrorMessage" class="comment-composer__preview">
          <template v-if="recording">
            <div class="comment-composer__recording-status">
              <span class="comment-composer__recording-dot" />
              <span class="comment-composer__preview-label">{{ $t("feed.commentComposer.recording") }}</span>
              <span class="comment-composer__recording-time">{{ recordingDurationLabel }}</span>
            </div>
            <div class="comment-composer__recording-progress" aria-hidden="true">
              <span class="comment-composer__recording-progress-bar" />
            </div>
          </template>

          <template v-else-if="attachmentPreview?.type === 'audio'">
            <div class="comment-composer__audio-preview">
              <audio
                ref="audioPreviewRef"
                :src="attachmentPreview.url"
                preload="metadata"
                class="comment-composer__audio-native"
                @loadedmetadata="syncAudioPreview"
                @timeupdate="syncAudioPreview"
                @ended="stopAudioPreview"
              />

              <button
                class="comment-composer__audio-toggle"
                type="button"
                :aria-label="audioPlaying ? 'Stop voice preview' : 'Play voice preview'"
                @click="toggleAudioPreview"
              >
                <Icon :name="audioPlaying ? 'i-ph-stop-fill' : 'i-ph-play-fill'" class="h-4 w-4" />
              </button>

              <div class="comment-composer__audio-track">
                <div class="comment-composer__audio-meta">
                  <span class="comment-composer__preview-label">
                    {{ attachmentPreview.name || $t("feed.commentComposer.tooltipVoice") }}
                  </span>
                  <span class="comment-composer__recording-time">{{ audioProgressLabel }}</span>
                </div>
                <div class="comment-composer__audio-progress" aria-hidden="true">
                  <span class="comment-composer__audio-progress-bar" :style="{ width: `${audioProgressPercent}%` }" />
                </div>
              </div>

              <button
                class="comment-composer__preview-remove"
                type="button"
                :aria-label="$t('feed.commentComposer.removeAttachment')"
                @click="clearAttachment"
              >
                <Icon name="i-ph-x-bold" class="h-3.5 w-3.5" />
              </button>
            </div>
          </template>

          <template v-else>
            <div class="comment-composer__preview-meta">
              <span class="comment-composer__preview-label">
                {{
                  recordingErrorMessage || attachmentPreview?.name || $t("feed.commentComposer.selectedAttachment")
                }}
              </span>
              <button
                v-if="attachmentPreview || recordingErrorMessage"
                class="comment-composer__preview-remove"
                type="button"
                :aria-label="$t('feed.commentComposer.removeAttachment')"
                @click="clearAttachment"
              >
                <Icon name="i-ph-x-bold" class="h-3.5 w-3.5" />
              </button>
            </div>
          </template>
        </div>
      </div>

      <!-- Ép Nuxt Icon nhận diện để đóng gói vào bundle local -->
      <div class="hidden" aria-hidden="true">
        <Icon name="i-ph-user-circle-duotone" />
        <Icon name="i-ph-paper-plane-tilt-fill" />
        <Icon name="i-ph-smiley-duotone" />
        <Icon name="i-ph-images-square-duotone" />
        <Icon name="i-ph-microphone-duotone" />
        <Icon name="i-ph-stop-circle-fill" />
        <Icon name="i-ph-stop-fill" />
        <Icon name="i-ph-play-fill" />
        <Icon name="i-ph-x-bold" />
        <Icon name="i-ph-circle-notch-bold" />
        <Icon name="i-ph-gif-duotone" />
      </div>

      <input
        v-if="enableAttachments"
        ref="imageInputRef"
        class="comment-composer__file"
        type="file"
        accept="image/png,image/jpeg,image/gif"
        @change="selectImageFile"
      >
      <input
        v-if="enableAttachments"
        ref="gifInputRef"
        class="comment-composer__file"
        type="file"
        accept="image/gif"
        @change="selectGifFile"
      >
    </div>
  </form>
</template>

<script setup lang="ts">
import { useFeedMentionSearch } from "../../application/composables/useFeedMentionSearch"
import { feedCommentComposerReactionAssets } from "../../application/constants/reaction-assets"
import type { FeedCommentAttachment, FeedCommentSubmitPayload } from "../../domain/types/feed.types"

const props = withDefaults(defineProps<{
  currentUserName?: string
  currentUserAvatarUrl?: string
  submitting?: boolean
  enableAttachments?: boolean
}>(), {
  currentUserName: "",
  currentUserAvatarUrl: "",
  submitting: false,
  enableAttachments: true,
})

const emit = defineEmits<{
  submit: [payload: FeedCommentSubmitPayload]
}>()
const { t } = useI18n()
const toast = useToast()

const emojiOptions = computed(() =>
  feedCommentComposerReactionAssets.map(reaction => ({
    value: reaction.value,
    src: reaction.src,
    text: reaction.text,
    label: t(reaction.labelKey),
  })),
)
const message = ref("")
const emojiOpen = ref(false)
const imageInputRef = ref<HTMLInputElement | null>(null)
const gifInputRef = ref<HTMLInputElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const audioPreviewRef = ref<HTMLAudioElement | null>(null)
const imageFile = ref<File | undefined>()
const gifFile = ref<File | undefined>()
const audioFile = ref<File | undefined>()
const attachmentPreview = ref<FeedCommentAttachment | undefined>()
const recording = ref(false)
const isComposingText = ref(false)
const recordingErrorMessage = ref("")
const audioPlaying = ref(false)
const audioCurrentTime = ref(0)
const audioDuration = ref(0)
const mediaStream = ref<MediaStream | null>(null)
const audioContext = ref<AudioContext | null>(null)
const mediaSource = ref<MediaStreamAudioSourceNode | null>(null)
const scriptProcessor = ref<ScriptProcessorNode | null>(null)
const pcmChunks = ref<Float32Array[]>([])
const recordingSampleRate = ref(44100)
const recordingStartedAt = ref<number | null>(null)
const recordingElapsedMs = ref(0)
let recordingTimer: ReturnType<typeof setInterval> | null = null

const trimmedMessage = computed(() => message.value.trim())
const canSubmit = computed(() =>
  Boolean(trimmedMessage.value || (props.enableAttachments && (imageFile.value || gifFile.value || audioFile.value))),
)
const recordingDurationLabel = computed(() => formatRecordingDuration(recordingElapsedMs.value))
const audioProgressPercent = computed(() => {
  if (!audioDuration.value) {
    return 0
  }

  return Math.min(100, Math.max(0, (audioCurrentTime.value / audioDuration.value) * 100))
})
const audioProgressLabel = computed(() => {
  const current = formatRecordingDuration(audioCurrentTime.value * 1000)
  const duration = formatRecordingDuration(audioDuration.value * 1000)

  return `${current} / ${duration}`
})
const canRecordAudio = computed(() => {
  if (!import.meta.client) {
    return false
  }

  return Boolean(
    navigator.mediaDevices?.getUserMedia
    && typeof AudioContext !== "undefined",
  )
})

const currentUserInitials = computed(() => {
  const value = props.currentUserName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0]?.toUpperCase() || "")
    .join("")

  return value
})

const textareaElement = computed(() => getTextareaElement())
const {
  mentionQuery,
  mentionLoading,
  mentionSuggestions,
  showMentionSuggestions,
  highlightedMentionSegments: highlightedMessageSegments,
  updateMentionQuery,
  handleMentionKeyup: handleTextareaKeyup,
  closeMentionSuggestions,
  selectMention,
  clearSelectedMentions,
  createBackendMentionText,
} = useFeedMentionSearch({
  text: message,
  textarea: textareaElement,
})
const hasHighlightedMentions = computed(() =>
  highlightedMessageSegments.value.some(segment => segment.isMention),
)

function revokeAttachmentUrl() {
  if (attachmentPreview.value?.url?.startsWith("blob:")) {
    URL.revokeObjectURL(attachmentPreview.value.url)
  }
}

function resetFileInputs() {
  if (imageInputRef.value) imageInputRef.value.value = ""
  if (gifInputRef.value) gifInputRef.value.value = ""
}

function resetAudioPreviewState() {
  if (audioPreviewRef.value) {
    audioPreviewRef.value.pause()
    audioPreviewRef.value.currentTime = 0
  }

  audioPlaying.value = false
  audioCurrentTime.value = 0
  audioDuration.value = 0
}

function resetComposerState() {
  resetAudioPreviewState()
  revokeAttachmentUrl()
  imageFile.value = undefined
  gifFile.value = undefined
  audioFile.value = undefined
  attachmentPreview.value = undefined
  recordingErrorMessage.value = ""
  resetFileInputs()
}

function openImagePicker() {
  imageInputRef.value?.click()
}

function openGifPicker() {
  gifInputRef.value?.click()
}

function selectImageFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]

  if (!file) {
    return
  }

  setAttachment(file, file.type === "image/gif" ? "gif" : "image")
}

function selectGifFile(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]

  if (!file) {
    return
  }

  setAttachment(file, "gif")
}

function setAttachment(file: File, type: FeedCommentAttachment["type"]) {
  resetComposerState()
  const previewUrl = URL.createObjectURL(file)

  attachmentPreview.value = {
    type,
    url: previewUrl,
    name: file.name,
  }

  if (type === "gif") {
    gifFile.value = file
  }
  else {
    imageFile.value = file
  }
}

function setAudioAttachment(file: File) {
  resetComposerState()
  const previewUrl = URL.createObjectURL(file)

  audioFile.value = file
  attachmentPreview.value = {
    type: "audio",
    url: previewUrl,
    name: file.name,
  }
}

function clearAttachment() {
  resetComposerState()
}

function insertEmoji(emoji: string) {
  message.value = `${message.value}${emoji}`
  emojiOpen.value = false
  nextTick(() => {
    syncTextareaHeight()
    focusComposer()
  })
}

function getTextareaElement() {
  return textareaRef.value
}

function focusComposer() {
  getTextareaElement()?.focus()
}

function syncTextareaHeight() {
  const textarea = getTextareaElement()

  if (!textarea) {
    return
  }

  textarea.style.height = "auto"
  textarea.style.height = `${textarea.scrollHeight}px`
}

function handleComposerInput() {
  syncTextareaHeight()
  updateMentionQuery()
}

function handleCompositionEnd() {
  isComposingText.value = false
  nextTick(() => {
    syncTextareaHeight()
    updateMentionQuery()
  })
}

function handleEnterKeydown(event: KeyboardEvent) {
  if (event.isComposing || isComposingText.value) {
    return
  }

  event.preventDefault()
  submitComment()
}

function insertMentionTrigger() {
  if (!message.value.endsWith("@")) {
    const separator = message.value && !/\s$/.test(message.value) ? " " : ""
    message.value = `${message.value}${separator}@`
  }

  nextTick(() => {
    syncTextareaHeight()
    focusComposer()
    updateMentionQuery()
  })
}

function syncAudioPreview() {
  const audio = audioPreviewRef.value

  if (!audio) {
    return
  }

  audioCurrentTime.value = audio.currentTime || 0
  audioDuration.value = Number.isFinite(audio.duration) ? audio.duration : 0
}

function stopAudioPreview() {
  if (audioPreviewRef.value) {
    audioPreviewRef.value.pause()
    audioPreviewRef.value.currentTime = 0
  }

  audioPlaying.value = false
  audioCurrentTime.value = 0
}

async function toggleAudioPreview() {
  const audio = audioPreviewRef.value

  if (!audio) {
    return
  }

  if (audioPlaying.value) {
    stopAudioPreview()
    return
  }

  try {
    if (audio.readyState === HTMLMediaElement.HAVE_NOTHING) {
      audio.load()
    }

    audioPlaying.value = true
    await audio.play()
    syncAudioPreview()
  }
  catch {
    audioPlaying.value = false
  }
}

function stopMediaStream() {
  stopRecordingTimer()
  scriptProcessor.value?.disconnect()
  mediaSource.value?.disconnect()
  void audioContext.value?.close()
  scriptProcessor.value = null
  mediaSource.value = null
  audioContext.value = null
  mediaStream.value?.getTracks().forEach(track => track.stop())
  mediaStream.value = null
}

function formatRecordingDuration(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
}

function startRecordingTimer() {
  stopRecordingTimer()
  recordingStartedAt.value = Date.now()
  recordingElapsedMs.value = 0
  recordingTimer = setInterval(() => {
    if (!recordingStartedAt.value) {
      return
    }

    recordingElapsedMs.value = Date.now() - recordingStartedAt.value
  }, 200)
}

function stopRecordingTimer() {
  if (recordingTimer) {
    clearInterval(recordingTimer)
    recordingTimer = null
  }

  recordingStartedAt.value = null
}

function mergeFloat32Chunks(chunks: Float32Array[]) {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const merged = new Float32Array(totalLength)
  let offset = 0

  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.length
  }

  return merged
}

function encodeWav(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index))
    }
  }

  writeString(0, "RIFF")
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, "WAVE")
  writeString(12, "fmt ")
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, "data")
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true)
    offset += 2
  }

  return new Blob([buffer], { type: "audio/wav" })
}

function createAudioFileFromChunks() {
  const merged = mergeFloat32Chunks(pcmChunks.value)
  const blob = encodeWav(merged, recordingSampleRate.value)

  return new File([blob], `comment-audio-${Date.now()}.wav`, { type: "audio/wav" })
}

async function toggleRecording() {
  if (recording.value) {
    if (pcmChunks.value.length > 0) {
      setAudioAttachment(createAudioFileFromChunks())
    }

    recording.value = false
    stopMediaStream()
    return
  }

  if (!import.meta.client) {
    return
  }

  try {
    if (!canRecordAudio.value) {
      recordingErrorMessage.value = t("feed.commentComposer.microphoneUnavailable")
      toast.add({
        color: "warning",
        icon: "i-ph-warning-circle-fill",
        title: t("feed.commentComposer.tooltipVoice"),
        description: t("feed.commentComposer.microphoneUnavailable"),
      })
      return
    }

    resetComposerState()
    pcmChunks.value = []
    mediaStream.value = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioContext.value = new AudioContext()
    recordingSampleRate.value = audioContext.value.sampleRate
    mediaSource.value = audioContext.value.createMediaStreamSource(mediaStream.value)
    scriptProcessor.value = audioContext.value.createScriptProcessor(4096, 1, 1)

    scriptProcessor.value.onaudioprocess = (event) => {
      if (!recording.value) {
        return
      }

      const channelData = event.inputBuffer.getChannelData(0)
      pcmChunks.value.push(new Float32Array(channelData))
    }

    mediaSource.value.connect(scriptProcessor.value)
    scriptProcessor.value.connect(audioContext.value.destination)
    recording.value = true
    startRecordingTimer()
  }
  catch (error) {
    const message = error instanceof Error && error.name === "NotAllowedError"
      ? t("feed.commentComposer.microphonePermissionDenied")
      : t("feed.commentComposer.microphoneUnavailable")

    recordingErrorMessage.value = message
    toast.add({
      color: "warning",
      icon: "i-ph-warning-circle-fill",
      title: t("feed.commentComposer.tooltipVoice"),
      description: message,
    })
    recording.value = false
    stopMediaStream()
  }
}

function submitComment() {
  if (!canSubmit.value || props.submitting) {
    return
  }

  const displayText = trimmedMessage.value

  emit("submit", {
    text: displayText,
    backendText: createBackendMentionText(displayText),
    imageFile: imageFile.value,
    gifFile: gifFile.value,
    audioFile: audioFile.value,
    attachmentPreview: attachmentPreview.value,
  })

  message.value = ""
  clearSelectedMentions()
  closeMentionSuggestions()
  emojiOpen.value = false
  resetComposerState()
  nextTick(syncTextareaHeight)
}

watch(message, () => {
  nextTick(syncTextareaHeight)
})

onBeforeUnmount(() => {
  revokeAttachmentUrl()
  stopMediaStream()
})

defineExpose({
  focus: focusComposer,
  insertMentionTrigger,
})
</script>

<style scoped>
.comment-composer {
  display: flex;
  width: 100%;
  align-items: flex-start;
  gap: 10px;
}

.comment-composer__avatar {
  display: inline-flex;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--bg-surface-active);
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: 800;
}

.comment-composer__avatar-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.comment-composer__shell {
  width: 100%;
  min-width: 0;
  flex: 1;
}

.comment-composer__field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.comment-composer__main-row {
  display: flex;
  align-items: flex-end;
  min-width: 0;
}

.comment-composer__input-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-end;
  background: var(--bg-surface-hover);
  border: 1px solid var(--border-default);
  border-radius: 24px;
  transition: all 0.2s ease;
}

.comment-composer__input-wrap:focus-within {
  background: var(--bg-surface);
  border-color: var(--color-primary-300);
  box-shadow: 0 0 0 4px var(--color-primary-50);
}

.comment-composer__inline-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
  padding: 6px 8px 6px 4px;
}

.comment-composer__inline-tool {
  display: inline-flex;
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-full);
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.comment-composer__inline-tool:hover {
  background: var(--bg-surface-active);
  color: var(--color-primary-500);
}

.comment-composer__editor {
  position: relative;
  min-width: 0;
  flex: 1;
}

.comment-composer__highlight {
  position: absolute;
  inset: 0;
  z-index: 2;
  min-height: 44px;
  overflow: hidden;
  padding: 12px 8px 12px 16px;
  color: transparent;
  font-family: inherit;
  font-size: var(--text-body);
  line-height: 20px;
  pointer-events: none;
  text-decoration: none;
  white-space: pre-wrap;
  word-break: break-word;
}

.comment-composer__highlight *,
.comment-composer__highlight-mention {
  text-decoration: none !important;
  text-decoration-line: none !important;
}

.comment-composer__highlight-mention {
  color: #0000ff;
}

.comment-composer__textarea {
  position: relative;
  z-index: 1;
  width: 100%;
  min-height: 44px;
  min-width: 0;
  flex: 1;
  resize: none;
  overflow: hidden;
  border: 0;
  background: transparent;
  padding: 12px 8px 12px 16px;
  font-family: inherit;
  font-size: var(--text-body);
  line-height: 20px;
  color: var(--text-primary);
  outline: none;
  box-shadow: none;
}

.comment-composer__textarea::placeholder {
  color: var(--text-tertiary);
}

.comment-composer__mention-popover {
  width: min(360px, 100%);
  border: 1px solid rgba(20, 32, 255, 0.12);
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
  overflow: hidden;
}

.comment-composer__mention-option,
.comment-composer__mention-state {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border: 0;
  background: #ffffff;
  color: #475569;
  text-align: left;
}

.comment-composer__mention-option {
  cursor: pointer;
}

.comment-composer__mention-option:hover {
  background: rgba(20, 32, 255, 0.06);
}

.comment-composer__mention-state {
  font-size: 13px;
  font-weight: 700;
}

.comment-composer__mention-avatar {
  display: inline-flex;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  background: #eef2ff;
  color: #1420ff;
  font-size: 12px;
  font-weight: 800;
}

.comment-composer__mention-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.comment-composer__mention-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.comment-composer__mention-name {
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
}

.comment-composer__mention-username {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
}

.comment-composer__preview {
  display: flex;
  width: 100%;
  max-width: 100%;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-xl);
  background: var(--bg-surface-hover);
  padding: 10px 12px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
}

.comment-composer__preview-meta,
.comment-composer__recording-status,
.comment-composer__audio-preview {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
}

.comment-composer__preview-label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.comment-composer__recording-time {
  flex-shrink: 0;
  color: var(--text-tertiary);
  font-variant-numeric: tabular-nums;
}

.comment-composer__preview-remove {
  display: inline-flex;
  width: 22px;
  height: 22px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  color: var(--text-tertiary);
  cursor: pointer;
}

.comment-composer__audio-preview {
  color-scheme: light;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-full);
  background: var(--bg-surface);
  padding: var(--space-2);
  color: var(--text-primary);
  box-shadow: var(--shadow-md);
}

.comment-composer__audio-native {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.comment-composer__audio-toggle {
  display: inline-flex;
  width: 34px;
  height: 34px;
  flex: 0 0 34px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-full);
  background: var(--bg-brand);
  color: var(--icon-inverse);
  cursor: pointer;
  box-shadow: var(--shadow-brand);
  transition: transform var(--duration-fast) var(--ease-default), background var(--duration-fast) var(--ease-default);
}

.comment-composer__audio-toggle:hover {
  background: var(--bg-brand-hover);
  transform: translateY(-1px);
}

.comment-composer__audio-track {
  min-width: 0;
  flex: 1;
}

.comment-composer__audio-meta {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--space-2);
}

.comment-composer__audio-progress {
  width: 100%;
  height: 6px;
  margin-top: 6px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--bg-surface-active);
}

.comment-composer__audio-progress-bar {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--bg-brand);
  transition: width var(--duration-fast) linear;
}

.comment-composer__recording-progress {
  width: 100%;
  height: 6px;
  overflow: hidden;
  border-radius: var(--radius-full);
  background: var(--bg-surface-active);
}

.comment-composer__recording-progress-bar {
  display: block;
  width: 36%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--color-primary-400) 0%, var(--color-primary-600) 100%);
  animation: comment-recording-progress 1.2s ease-in-out infinite;
}

.comment-composer__recording-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  background: var(--color-error);
  animation: comment-recording-pulse 1s ease-in-out infinite;
}

.comment-composer__tool--recording {
  background: var(--bg-surface-active);
  color: var(--text-brand);
}

.comment-composer__inline-tool:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.comment-composer__emoji-wrap {
  position: relative;
}

.comment-composer__emoji-tray {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 20;
  display: grid;
  grid-template-columns: repeat(6, 30px);
  gap: 4px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  padding: 8px;
  box-shadow: var(--shadow-lg);
}

.comment-composer__emoji {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
}

.comment-composer__emoji:hover {
  background: var(--bg-surface-hover);
}

.comment-composer__emoji-image {
  width: 22px;
  height: 22px;
  object-fit: contain;
}

.comment-composer__send {
  display: inline-flex;
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, var(--color-primary-500) 0%, var(--color-primary-600) 100%);
  color: var(--icon-inverse);
  cursor: pointer;
  box-shadow: 0 4px 12px var(--color-primary-100);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.comment-composer__send:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 20px var(--color-primary-200);
}

.comment-composer__send:active:not(:disabled) {
  transform: translateY(0) scale(0.95);
}

.comment-composer__send:disabled {
  background: #1420ff;
  cursor: not-allowed;
  opacity: 0.4;
  filter: grayscale(1);
  box-shadow: none;
}

.comment-composer__file {
  display: none;
}

@media (max-width: 640px) {
  .comment-composer {
    gap: 8px;
  }

  .comment-composer__avatar {
    width: 32px;
    height: 32px;
    flex-basis: 32px;
  }

  .comment-composer__main-row {
    gap: 8px;
  }

  .comment-composer__input-wrap {
    flex-direction: column;
    align-items: stretch;
    border-radius: 20px;
  }

  .comment-composer__highlight,
  .comment-composer__textarea {
    font-size: 16px;
    line-height: 22px;
  }

  .comment-composer__inline-actions {
    justify-content: flex-end;
    padding: 0 8px 8px;
  }

  .comment-composer__inline-tool {
    width: 30px;
    height: 30px;
    flex-basis: 30px;
  }

  .comment-composer__send {
    width: 34px;
    height: 34px;
    flex-basis: 34px;
  }
}

@keyframes comment-recording-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: 0.45;
    transform: scale(0.82);
  }
}

@keyframes comment-recording-progress {
  0% {
    transform: translateX(-100%);
  }

  100% {
    transform: translateX(280%);
  }
}
</style>
