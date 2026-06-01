<!-- English description: Displays the host studio live comment feed and reply composer after a broadcast starts on the /live route. -->
<template>
  <div class="chat">
    <div class="chat__head">
      <div>
        <p class="chat__eyebrow">Hoạt động</p>
        <h3 class="chat__title">Bình luận trực tiếp</h3>
      </div>
      <div class="chat__state-badge" :class="`chat__state-badge--${liveState}`">
        <span class="chat__state-dot" />
        {{ stateLabel }}
      </div>
    </div>

    <div ref="feedEl" class="chat__feed">
      <template v-if="items.length > 0">
        <article
          v-for="item in items"
          :key="`${item.kind}-${item.id}-${item.username}-${item.timeText}`"
          class="chat__item animate-in fade-in slide-in-from-bottom-2 duration-300"
        >
          <UAvatar
            :src="item.avatarUrl || undefined"
            :text="item.author?.charAt(0) || '?'"
            size="sm"
            class="shrink-0 mt-0.5"
            :ui="{ rounded: 'rounded-xl', background: 'bg-blue-100', text: 'text-blue-700 font-bold' }"
          />
          <div class="min-w-0">
            <div class="chat__item-meta">
              <p class="chat__item-name">{{ item.author }}</p>
              <span v-if="item.isHost" class="chat__host-badge">Host</span>
            </div>
            <p class="chat__item-text">{{ item.message }}</p>
          </div>
        </article>
      </template>

      <div v-else class="chat__empty">
        <div class="chat__empty-icon">
          <Icon name="i-ph-chat-circle-dots-duotone" class="h-8 w-8 text-slate-300" />
        </div>
        <p class="chat__empty-title">Chưa có bình luận</p>
        <p class="chat__empty-desc">
          {{ liveState === "live" ? "Bình luận sẽ hiển thị ngay khi có người xem." : "Bắt đầu livestream để nhận bình luận." }}
        </p>
      </div>
    </div>

    <form class="chat__composer" @submit.prevent="submitMessage">
      <input
        v-model="draft"
        :disabled="disabled || sending"
        placeholder="Trả lời người xem..."
        class="chat__input"
      >
      <UButton
        type="submit"
        color="primary"
        square
        :loading="sending"
        :disabled="disabled || sending || draft.trim().length === 0"
        class="chat__send"
        aria-label="Gửi bình luận"
      >
        <template #leading>
          <UIcon name="i-ph-paper-plane-tilt-fill" class="h-4 w-4" />
        </template>
      </UButton>
      <p v-if="errorMessage" class="chat__error">{{ errorMessage }}</p>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { LiveStudioComment, LiveStudioState } from "../../domain/types/live.types"

const props = defineProps<{
  items: ReadonlyArray<LiveStudioComment>
  liveState: LiveStudioState
  sending?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  send: [message: string]
}>()

const feedEl = ref<HTMLElement | null>(null)
const draft = ref("")

const disabled = computed(() => props.liveState !== "live")

const stateLabel = computed(() => {
  if (props.liveState === "live") return "Đang phát"
  if (props.liveState === "stale") return "Mất heartbeat"
  return "Ngoại tuyến"
})

function submitMessage() {
  const message = draft.value.trim()

  if (!message || disabled.value || props.sending) {
    return
  }

  emit("send", message)
  draft.value = ""
}

watch(
  () => props.items.length,
  () => {
    nextTick(() => {
      if (feedEl.value) {
        feedEl.value.scrollTop = feedEl.value.scrollHeight
      }
    })
  },
)
</script>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  height: 100%;
  min-height: 0;
  background: #ffffff;
}

.chat__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid #f1f5f9;
  flex-shrink: 0;
}

.chat__eyebrow {
  margin: 0;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
}

.chat__title {
  margin: 4px 0 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
}

.chat__state-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  border: 1px solid;
  flex-shrink: 0;
}

.chat__state-badge--live {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #dc2626;
}

.chat__state-badge--stale {
  background: #fffbeb;
  border-color: #fcd34d;
  color: #b45309;
}

.chat__state-badge--offline {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #64748b;
}

.chat__state-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.chat__feed {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat__item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid #f1f5f9;
  transition: background 0.15s;
}

.chat__item:hover {
  background: #f1f5f9;
}

.chat__item-meta {
  display: flex;
  align-items: center;
  gap: 6px;
}

.chat__item-name {
  font-size: 12px;
  font-weight: 700;
  color: #374151;
  margin: 0;
}

.chat__host-badge {
  border-radius: 999px;
  background: rgba(0, 0, 255, 0.06);
  color: #0000ff;
  padding: 2px 7px;
  font-size: 10px;
  font-weight: 700;
}

.chat__item-text {
  font-size: 14px;
  color: #0f172a;
  margin: 3px 0 0;
  line-height: 1.5;
  word-break: break-word;
}

.chat__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 10px;
  text-align: center;
  padding: 32px 24px;
  min-height: 260px;
}

.chat__empty-icon {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: #f1f5f9;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chat__empty-title {
  font-size: 15px;
  font-weight: 700;
  color: #374151;
  margin: 0;
}

.chat__empty-desc {
  font-size: 13px;
  color: #94a3b8;
  line-height: 1.6;
  max-width: 220px;
  margin: 0;
}

.chat__composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 38px;
  align-items: center;
  flex-shrink: 0;
  gap: 6px;
  padding: 10px 12px 12px;
  border-top: 1px solid #f1f5f9;
  background: #ffffff;
}

.chat__input {
  min-width: 0;
  width: 100%;
  height: 38px;
  border: 1px solid #dbe3f2;
  border-radius: 13px;
  background: #ffffff;
  padding: 0 12px;
  color: #334155;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 38px;
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.chat__input::placeholder {
  color: #94a3b8;
}

.chat__input:focus {
  border-color: rgba(0, 0, 255, 0.25);
  box-shadow: 0 0 0 3px rgba(0, 0, 255, 0.06);
}

.chat__input:disabled {
  background: #f8fafc;
  cursor: not-allowed;
}

.chat__send {
  width: 38px;
  height: 38px;
  min-height: 38px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.chat__error {
  grid-column: 1 / -1;
  margin: 0;
  color: #dc2626;
  font-size: 12px;
  line-height: 1.45;
}
</style>
