<!-- Description: Renders a single inbox row for the PHP-parity left conversation list. -->
<template>
  <div
    class="cli-item"
    :class="{ 'cli-item--active': isActive }"
    role="button"
    tabindex="0"
    @click="$emit('click')"
    @keydown.enter="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <!-- Avatar -->
    <div class="cli-avatar">
      <UChip
        :show="type === 'user' ? isOnline : type === 'group' && isOnline"
        position="bottom-right"
        color="success"
        :ui="{ base: '!bg-emerald-500' }"
        inset
      >
        <div v-if="type === 'group' && !avatarUrl" class="cli-group-avatar">
          <Icon name="i-ph-users-three-fill" class="h-5 w-5" />
        </div>
        <UAvatar
          v-else
          :src="avatarUrl"
          :alt="name"
          size="md"
          class="h-11 w-11 rounded-full"
        />
      </UChip>
    </div>

    <!-- Info -->
    <div class="cli-body">
      <div class="cli-row">
        <p class="cli-name">{{ name }}</p>
        <span class="cli-time">{{ time }}</span>
      </div>

      <p v-if="!isTyping" class="cli-status">{{ status }}</p>

      <div class="cli-row cli-row--bottom">
        <p v-if="!isTyping" class="cli-preview" :class="previewClass">
          {{ preview }}
        </p>
        <div v-else class="cli-typing-indicator" aria-label="Typing">
          <span class="cli-typing-dot" style="animation-delay: 0ms" />
          <span class="cli-typing-dot" style="animation-delay: 180ms" />
          <span class="cli-typing-dot" style="animation-delay: 360ms" />
        </div>

        <!-- Unread badge -->
        <span v-if="!showSelect && unreadCount > 0" class="cli-badge">
          {{ unreadCount > 99 ? '99+' : unreadCount }}
        </span>

        <!-- Select + open-chat (multi tab) -->
        <div v-if="showSelect" class="cli-actions" @click.stop>
          <label class="cli-checkbox-label" @click="emit('click')">
            <span class="cli-checkbox" :class="{ 'cli-checkbox--checked': isActive }">
              <Icon v-if="isActive" name="i-ph-check-bold" class="h-3 w-3" />
            </span>
          </label>
          <button type="button" class="cli-open-btn" @click="$emit('open-chat')">
            {{ $t("pages.messagesPage.openChat") }}
          </button>
        </div>
      </div>

      <!-- Tags + tag action -->
      <div v-if="tags.length > 0 || showTagAction" class="cli-tags-row">
        <div v-if="tags.length > 0" class="cli-tags">
          <span
            v-for="tag in tags"
            :key="tag.id"
            class="cli-tag-dot"
            :title="tag.name"
            :style="{ backgroundColor: tag.color }"
          />
        </div>
        <button
          v-if="showTagAction"
          type="button"
          class="cli-tag-btn"
          :title="$t('pages.messagesPage.tagActionLabel')"
          @click.stop="$emit('manage-tags')"
        >
          <Icon name="i-ph-tag-duotone" class="h-3 w-3" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { MessageThreadType, MessageUserTag } from "../../domain/types/messages.types"

useI18n()

const props = withDefaults(defineProps<{
  name: string
  avatarUrl?: string
  isActive?: boolean
  isTyping?: boolean
  isOnline?: boolean
  type: MessageThreadType
  preview: string
  showSelect?: boolean
  showTagAction?: boolean
  status: string
  tags?: MessageUserTag[]
  time: string
  unreadCount: number
}>(), {
  tags: () => [],
})

const emit = defineEmits<{
  click: []
  "manage-tags": []
  "open-chat": []
}>()
const previewClass = computed(() => ({
  "cli-preview--unread": props.unreadCount > 0 && !props.isTyping,
}))
</script>

<style scoped>
.cli-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  text-align: left;
  transition: background var(--duration-fast) var(--ease-default);
}

.cli-item:hover {
  background: var(--bg-surface-hover);
}

.cli-item--active {
  background: var(--bg-surface-active);
  border-color: var(--border-light);
}

/* Avatar */
.cli-avatar {
  position: relative;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
}

.cli-group-avatar {
  display: flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 255, 0.06);
  color: var(--color-primary-600);
}

/* Body */
.cli-body {
  flex: 1;
  min-width: 0;
}

.cli-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.cli-row--bottom {
  margin-top: 3px;
  align-items: center;
}

.cli-name {
  font-size: var(--text-title);
  font-weight: var(--weight-semibold);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  line-height: 1.3;
  margin: 0;
  font-family: var(--font-primary);
}

.cli-time {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  font-weight: var(--weight-medium);
  flex-shrink: 0;
  font-family: var(--font-primary);
}

.cli-status {
  font-size: var(--text-caption);
  color: var(--text-tertiary);
  margin: 1px 0 0;
  font-family: var(--font-primary);
}

.cli-preview {
  font-size: var(--text-body);
  color: var(--text-secondary);
  font-weight: var(--weight-regular);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
  margin: 0;
  font-family: var(--font-primary);
}

.cli-preview--unread {
  font-weight: var(--weight-semibold);
  color: var(--text-primary);
}

.cli-typing-indicator {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 20px;
  flex: 1;
  min-width: 0;
}

.cli-typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--color-primary-600);
  animation: cli-typing-bounce 1s infinite ease-in-out;
}

@keyframes cli-typing-bounce {
  0%, 60%, 100% {
    opacity: 0.35;
    transform: translateY(0);
  }

  30% {
    opacity: 1;
    transform: translateY(-3px);
  }
}

/* Badge */
.cli-badge {
  flex-shrink: 0;
  min-width: 18px;
  height: 18px;
  border-radius: var(--radius-full);
  background: var(--color-primary-500);
  color: #ffffff;
  font-size: var(--text-micro);
  font-weight: var(--weight-bold);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

/* Multi-tab actions */
.cli-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.cli-checkbox-label {
  cursor: pointer;
  display: flex;
  align-items: center;
}

.cli-checkbox {
  width: 18px;
  height: 18px;
  border-radius: 5px;
  border: 1.5px solid var(--border-default);
  background: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  transition: all var(--duration-fast) var(--ease-default);
}

.cli-checkbox--checked {
  background: var(--color-primary-500);
  border-color: var(--color-primary-500);
}

.cli-open-btn {
  font-size: var(--text-caption);
  font-weight: var(--weight-medium);
  color: var(--text-secondary);
  background: var(--bg-muted);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  padding: 3px 8px;
  cursor: pointer;
  font-family: var(--font-primary);
  transition: all var(--duration-fast) var(--ease-default);
}

.cli-open-btn:hover {
  background: var(--bg-surface-active);
  color: var(--text-brand);
  border-color: var(--border-default);
}

/* Tags row */
.cli-tags-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 5px;
}

.cli-tags {
  display: flex;
  gap: 3px;
}

.cli-tag-dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  border: 1px solid rgba(0,0,0,0.06);
  flex-shrink: 0;
}

.cli-tag-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 18px;
  border: 1px solid var(--border-light);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  color: var(--text-tertiary);
  cursor: pointer;
  transition: all var(--duration-fast) var(--ease-default);
}

.cli-tag-btn:hover {
  border-color: var(--color-primary-500);
  color: var(--color-primary-500);
  background: var(--color-primary-50);
}

/* Responsive: tighter on small screens */
@media (max-width: 400px) {
  .cli-item { padding: 8px 10px; }
  .cli-avatar { width: 40px; height: 40px; }
}
</style>
