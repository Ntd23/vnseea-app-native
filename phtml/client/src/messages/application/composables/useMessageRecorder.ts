// English description: Manages browser-side audio recording, timer state, and replayable message record drafts for the messages context.

import { computed, onBeforeUnmount, ref, shallowRef } from "vue"
import type { MessageRecordDraft } from "../../domain/types/messages.types"

function inferRecordExtension(mimeType: string) {
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a"
  if (mimeType.includes("ogg")) return "ogg"
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3"
  if (mimeType.includes("wav")) return "wav"
  return "webm"
}

export function useMessageRecorder() {
  const mediaRecorder = shallowRef<MediaRecorder | null>(null)
  const mediaStream = shallowRef<MediaStream | null>(null)
  const chunks = shallowRef<BlobPart[]>([])
  const timerId = shallowRef<ReturnType<typeof window.setInterval> | null>(null)
  const startedAt = ref(0)
  const durationMs = ref(0)
  const isRecording = ref(false)
  const permissionDenied = ref(false)
  const errorMessage = ref("")
  const recordDraft = ref<MessageRecordDraft | null>(null)

  const isSupported = computed(() =>
    import.meta.client
    && typeof window !== "undefined"
    && typeof navigator !== "undefined"
    && typeof navigator.mediaDevices?.getUserMedia === "function"
    && typeof window.MediaRecorder !== "undefined",
  )

  const clearTimer = () => {
    if (import.meta.client && timerId.value) {
      window.clearInterval(timerId.value)
      timerId.value = null
    }
  }

  const stopStream = () => {
    mediaStream.value?.getTracks().forEach(track => track.stop())
    mediaStream.value = null
  }

  const clearRecording = () => {
    clearTimer()

    if (recordDraft.value?.previewUrl) {
      URL.revokeObjectURL(recordDraft.value.previewUrl)
    }

    recordDraft.value = null
    durationMs.value = 0
    startedAt.value = 0
    errorMessage.value = ""
    permissionDenied.value = false
  }

  const stopRecording = async () => {
    if (!mediaRecorder.value || mediaRecorder.value.state === "inactive") {
      return
    }

    await new Promise<void>((resolve) => {
      const recorder = mediaRecorder.value

      if (!recorder) {
        resolve()
        return
      }

      recorder.addEventListener("stop", () => resolve(), { once: true })
      recorder.stop()
    })
  }

  const startRecording = async () => {
    if (!isSupported.value) {
      permissionDenied.value = false
      errorMessage.value = "Trinh duyet hoac ket noi hien tai khong ho tro ghi am."
      return false
    }

    if (isRecording.value) {
      return false
    }

    clearRecording()

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      })

      mediaStream.value = stream
      const recorder = new MediaRecorder(stream)
      chunks.value = []
      errorMessage.value = ""
      permissionDenied.value = false

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          chunks.value.push(event.data)
        }
      })

      recorder.addEventListener("stop", () => {
        clearTimer()
        isRecording.value = false

        const mimeType = recorder.mimeType || "audio/webm"
        const finalDurationMs = durationMs.value || Math.max(Date.now() - startedAt.value, 0)
        const blob = new Blob(chunks.value, { type: mimeType })
        const extension = inferRecordExtension(mimeType)
        const previewUrl = URL.createObjectURL(blob)

        recordDraft.value = {
          blob,
          fileName: `record-${Date.now()}.${extension}`,
          mimeType,
          durationMs: finalDurationMs,
          previewUrl,
        }

        stopStream()
      })

      mediaRecorder.value = recorder
      startedAt.value = Date.now()
      durationMs.value = 0
      isRecording.value = true
      recorder.start()

      timerId.value = window.setInterval(() => {
        durationMs.value = Math.max(Date.now() - startedAt.value, 0)
      }, 200)

      return true
    }
    catch (error) {
      permissionDenied.value = true
      isRecording.value = false
      stopStream()
      clearTimer()
      errorMessage.value = error instanceof Error
        ? error.message
        : "Unable to access the microphone."
      return false
    }
  }

  onBeforeUnmount(() => {
    clearTimer()
    stopStream()
    if (recordDraft.value?.previewUrl) {
      URL.revokeObjectURL(recordDraft.value.previewUrl)
    }
  })

  return {
    isSupported,
    isRecording,
    permissionDenied,
    errorMessage,
    durationMs,
    recordDraft,
    startRecording,
    stopRecording,
    clearRecording,
  }
}
