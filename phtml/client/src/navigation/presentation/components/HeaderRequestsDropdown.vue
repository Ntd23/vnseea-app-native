<!-- English description: Header dropdown for backend friend and group chat requests. -->

<template>
  <section class="header-requests-dropdown">
    <div class="header-requests-dropdown__header">
      <p class="text-label-secondary">
        {{ $t("navigation.headerBar.friendRequests") }}
      </p>
      <strong>{{ store.totalCount }}</strong>
    </div>

    <div v-if="store.loading && store.items.length === 0" class="header-requests-dropdown__empty">
      {{ $t("notifications.center.loading") }}
    </div>

    <div v-else-if="store.items.length === 0" class="header-requests-dropdown__empty">
      <Icon name="i-ph-user-plus-duotone" class="header-requests-dropdown__empty-icon" />
      <span>{{ $t("navigation.headerBar.noRequests") }}</span>
    </div>

    <div v-else class="header-requests-dropdown__list">
      <article
        v-for="item in store.items"
        :key="`${item.kind}-${item.id}`"
        class="header-requests-dropdown__item"
      >
        <NuxtLink
          :to="item.url || appRoutes.messages"
          class="header-requests-dropdown__identity"
          @click="$emit('navigate')"
        >
          <NuxtImg
            v-if="item.avatarUrl"
            :src="item.avatarUrl"
            :alt="item.title"
            class="header-requests-dropdown__avatar"
            width="40"
            height="40"
          />
          <span v-else class="header-requests-dropdown__avatar header-requests-dropdown__avatar--fallback">
            <Icon :name="item.kind === 'group_chat' ? 'i-ph-users-three-duotone' : 'i-ph-user-duotone'" class="h-5 w-5" />
          </span>
          <span class="header-requests-dropdown__copy">
            <strong>{{ item.title }}</strong>
            <small>{{ item.kind === "group_chat" ? $t("navigation.headerBar.groupChatRequest") : item.subtitle }}</small>
          </span>
        </NuxtLink>

        <div class="header-requests-dropdown__actions">
          <button type="button" class="header-requests-dropdown__accept" @click="store.updateRequest(item, 'accept')">
            <Icon name="i-ph-check-bold" class="h-4 w-4" />
          </button>
          <button type="button" class="header-requests-dropdown__decline" @click="store.updateRequest(item, 'decline')">
            <Icon name="i-ph-x-bold" class="h-4 w-4" />
          </button>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import { useNavigationRequestsStore } from "../../application/stores/useNavigationRequestsStore"

defineEmits<{
  navigate: []
}>()

const store = useNavigationRequestsStore()
</script>

<style scoped>
.header-requests-dropdown {
  width: min(360px, calc(100vw - 24px));
  max-height: min(520px, calc(100vh - 96px));
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  background: var(--bg-surface);
  box-shadow: var(--shadow-xl);
}

.header-requests-dropdown__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid var(--border-light);
}

.header-requests-dropdown__header strong {
  color: var(--text-brand);
  font-weight: var(--weight-bold);
}

.header-requests-dropdown__list {
  max-height: 420px;
  overflow-y: auto;
  padding: var(--space-2);
}

.header-requests-dropdown__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  border-radius: var(--radius-lg);
  padding: var(--space-2);
}

.header-requests-dropdown__item:hover {
  background: var(--bg-surface-active);
}

.header-requests-dropdown__identity {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: var(--space-3);
  color: inherit;
  text-decoration: none;
}

.header-requests-dropdown__avatar {
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  border-radius: var(--radius-full);
  object-fit: cover;
}

.header-requests-dropdown__avatar--fallback {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-surface-active);
  color: var(--icon-brand);
}

.header-requests-dropdown__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 3px;
}

.header-requests-dropdown__copy strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: var(--text-body);
  font-weight: var(--weight-bold);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-requests-dropdown__copy small {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: var(--text-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-requests-dropdown__actions {
  display: inline-flex;
  flex: 0 0 auto;
  gap: var(--space-1);
}

.header-requests-dropdown__accept,
.header-requests-dropdown__decline {
  display: inline-flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-full);
  cursor: pointer;
}

.header-requests-dropdown__accept {
  background: var(--bg-brand);
  color: var(--text-inverse);
}

.header-requests-dropdown__decline {
  background: var(--bg-muted);
  color: var(--text-secondary);
}

.header-requests-dropdown__empty {
  display: grid;
  min-height: 160px;
  place-items: center;
  gap: var(--space-2);
  padding: var(--space-6);
  color: var(--text-secondary);
  text-align: center;
}

.header-requests-dropdown__empty-icon {
  width: 34px;
  height: 34px;
  color: var(--icon-secondary);
}
</style>
