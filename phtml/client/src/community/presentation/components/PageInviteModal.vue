<template>
  <div class="invite-card">
    <!-- Header -->
    <header class="invite-card__header">
      <button class="invite-card__back-btn" @click="closeModal" aria-label="Quay lại">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="icon-svg">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
      </button>
      <h3 class="invite-card__title">{{ $t('pages.pageDetailPage.invites.title') }}</h3>
    </header>

    <!-- Search -->
    <div class="invite-card__search">
      <div class="search-input-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="search-icon">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          :value="searchQuery"
          @input="$emit('update:searchQuery', ($event.target as HTMLInputElement).value)"
          :placeholder="$t('pages.pageDetailPage.invites.searchPlaceholder')"
          class="search-input"
          autocomplete="off"
        >
      </div>
    </div>

    <!-- Content -->
    <div class="invite-card__content">
      <!-- Loading State -->
      <div v-if="isPending" class="invite-card__status invite-card__status--pending">
        <div class="spinner"></div>
      </div>

      <!-- Empty State -->
      <div v-else-if="visibleCandidates.length === 0" class="invite-card__status invite-card__status--empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        <p>{{ $t('pages.pageDetailPage.invites.empty') }}</p>
      </div>

      <!-- User List -->
      <div v-else class="invite-list">
        <div
          v-for="user in visibleCandidates"
          :key="user.id"
          class="invite-item"
        >
          <div class="invite-item__info">
            <div class="invite-item__avatar">
              <img v-if="user.avatarUrl" :src="user.avatarUrl" :alt="user.name">
              <span v-else>{{ user.name.charAt(0) }}</span>
            </div>
            <div class="invite-item__meta">
              <div class="invite-item__name-row">
                <span class="invite-item__name">{{ user.name }}</span>
                <svg v-if="user.verified" viewBox="0 0 24 24" fill="currentColor" class="verified-icon">
                  <path d="M22.5 12.5c0-1.58-.88-2.95-2.18-3.65.25-1.53-.13-3.08-1.18-4.13s-2.6-1.43-4.13-1.18c-.7-.13-2.07-2.18-3.65-2.18s-2.95.88-3.65 2.18c-1.53-.25-3.08.13-4.13 1.18S2.13 7.29 2.38 8.82C1.08 9.52.2 10.89.2 12.47s.88 2.95 2.18 3.65c-.25 1.53.13 3.08 1.18 4.13s2.6 1.43 4.13 1.18c.7.13 2.07 2.18 3.65 2.18s2.95-.88 3.65-2.18c1.53.25 3.08-.13 4.13-1.18s1.43-2.6 1.18-4.13c1.3-.7 2.18-2.07 2.18-3.65zM10.12 17.5l-4.5-4.5 1.41-1.41 3.09 3.09 7.09-7.09 1.41 1.41-8.5 8.5z" />
                </svg>
              </div>
              <span class="invite-item__username">{{ '@' + user.username }}</span>
            </div>
          </div>
          <button
            class="invite-btn"
            :class="{ 'invite-btn--invited': invitedIds.has(user.id) }"
            :disabled="invitedIds.has(user.id)"
            @click="$emit('invite', user.id)"
          >
            {{ invitedIds.has(user.id) ? $t('pages.pageDetailPage.invites.invitedButton') : $t('pages.pageDetailPage.invites.inviteButton') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UserRecord } from "../../../shared-kernel/domain/types/user.types"

defineProps<{
  isOpen: boolean
  isPending: boolean
  searchQuery: string
  visibleCandidates: UserRecord[]
  invitedIds: Set<number>
}>()

const emit = defineEmits<{
  (e: 'update:searchQuery', value: string): void
  (e: 'close'): void
  (e: 'invite', userId: number): void
}>()

function closeModal() {
  emit('close')
}
</script>

<style scoped>
.invite-card {
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05), 0 10px 20px rgba(0, 0, 0, 0.02);
  margin-bottom: 16px;
  overflow: hidden;
  border: 1px solid #f1f5f9;
}

/* Header */
.invite-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid #f1f5f9;
}

.invite-card__back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s;
}

.invite-card__back-btn:hover {
  background: #f1f5f9;
  color: #0f172a;
}

.icon-svg {
  width: 20px;
  height: 20px;
}

.invite-card__title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.01em;
}

/* Search */
.invite-card__search {
  padding: 16px 20px;
}

.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  width: 18px;
  height: 18px;
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 44px;
  padding: 0 16px 0 44px;
  border-radius: 12px;
  border: 1.5px solid #e2e8f0;
  background: #fafafa;
  font-size: 14px;
  color: #1e293b;
  outline: none;
  transition: all 0.2s;
  box-sizing: border-box;
}

.search-input:focus {
  border-color: #0000ff;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(0, 0, 255, 0.06);
}

.search-input::placeholder {
  color: #94a3b8;
}

/* Content */
.invite-card__content {
  padding: 0 20px 20px;
}

.invite-card__status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
}

.invite-card__status--empty p {
  margin-top: 12px;
  font-size: 14px;
  font-weight: 500;
}

.empty-icon {
  width: 48px;
  height: 48px;
  opacity: 0.2;
}

/* Spinner */
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(0, 0, 255, 0.1);
  border-top-color: #0000ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* List */
.invite-list {
  max-height: 500px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-right: 4px;
}

.invite-list::-webkit-scrollbar {
  width: 6px;
}

.invite-list::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 99px;
}

.invite-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.invite-item:hover {
  background: #f8fafc;
  border-color: #f1f5f9;
}

.invite-item__info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.invite-item__avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f1f5f9;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2px solid #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.invite-item__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.invite-item__avatar span {
  font-weight: 700;
  color: #64748b;
  font-size: 18px;
}

.invite-item__meta {
  min-width: 0;
}

.invite-item__name-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.invite-item__name {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.verified-icon {
  width: 14px;
  height: 14px;
  color: #0000ff;
  flex-shrink: 0;
}

.invite-item__username {
  display: block;
  font-size: 12px;
  color: #64748b;
  font-weight: 500;
}

/* Button */
.invite-btn {
  height: 32px;
  padding: 0 16px;
  border-radius: 999px;
  border: none;
  background: #0000ff;
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.invite-btn:hover:not(:disabled) {
  background: #0000cc;
  transform: translateY(-1px);
}

.invite-btn--invited {
  background: #f1f5f9;
  color: #64748b;
  cursor: default;
}

.invite-btn:disabled {
  opacity: 0.8;
}
</style>
