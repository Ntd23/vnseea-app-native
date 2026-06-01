<!-- Description: Displays a compact group list row aligned to the legacy PHP group-list layout without extra hero metadata. -->
<template>
  <article class="group-card">
    <div class="group-card__main">
      <NuxtLink 
        :to="groupTo" 
        class="group-card__avatar" 
        :style="{ background: !group.avatar ? group.banner : 'transparent' }"
        :aria-label="groupName"
      >
        <img 
          v-if="group.avatar" 
          :src="group.avatar" 
          class="absolute inset-0 h-full w-full object-cover" 
        />
        <span class="group-card__avatar-overlay" />
        <Icon v-if="!group.avatar" name="i-ph-users-three-fill" class="group-card__avatar-icon" />
      </NuxtLink>

      <div class="group-card__content">
        <NuxtLink :to="groupTo" class="group-card__title">
          {{ groupName }}
        </NuxtLink>

        <p class="group-card__members">
          {{ memberLabel }}
        </p>
      </div>
    </div>

    <div class="group-card__actions">
      <NuxtLink
        v-if="group.canManage"
        :to="groupSettingsTo"
        class="group-card__action group-card__action--secondary"
      >
        {{ $t("community.groups.action.manage") }}
      </NuxtLink>

      <NuxtLink
        v-else
        :to="groupTo"
        class="group-card__action group-card__action--primary"
      >
        {{ resolvedActionLabel }}
      </NuxtLink>
    </div>
  </article>
</template>

<script setup lang="ts">
import {
  getCommunityGroupPath,
  getCommunityGroupSettingsPath,
} from "../../domain/services/community-helpers.service"
import type { CommunityGroupRecord } from "../../domain/types/community.types"

const { t, locale } = useI18n()

const props = withDefaults(defineProps<{
  group: CommunityGroupRecord
  actionLabel?: string
}>(), {
  actionLabel: "",
})

const groupName = computed(() => props.group.name)

const memberLabel = computed(() =>
  t("community.groups.format.members", {
    count: new Intl.NumberFormat(locale.value === "vi" ? "vi-VN" : "en-US").format(props.group.members),
  }),
)

const resolvedActionLabel = computed(() =>
  props.actionLabel ? t(props.actionLabel) : t("community.groups.action.explore"),
)

const groupTo = computed(() => getCommunityGroupPath(props.group.slug))
const groupSettingsTo = computed(() => getCommunityGroupSettingsPath(props.group.slug))
</script>

<style scoped>
.group-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--bg-surface);
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.group-card__main {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.group-card__avatar {
  position: relative;
  display: inline-flex;
  width: 72px;
  height: 72px;
  flex: 0 0 72px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 18px;
  text-decoration: none;
}

.group-card__avatar-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.12), rgba(15, 23, 42, 0.36));
}

.group-card__avatar-icon {
  position: relative;
  z-index: 1;
  width: 28px;
  height: 28px;
  color: #ffffff;
}

.group-card__content {
  min-width: 0;
  flex: 1;
}

.group-card__title {
  display: inline-block;
  color: var(--text-primary);
  font-size: 17px;
  font-weight: 800;
  line-height: 1.3;
  text-decoration: none;
}

.group-card__title:hover {
  color: var(--text-brand);
}

.group-card__members {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 600;
}

.group-card__actions {
  display: flex;
  justify-content: flex-end;
}

.group-card__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border-radius: 10px;
  padding: 0 14px;
  font-size: 12px;
  font-weight: 700;
  text-decoration: none;
}

.group-card__action--secondary {
  border: 1px solid var(--border-default);
  color: var(--text-primary);
  background: var(--bg-surface);
}

.group-card__action--primary {
  background: var(--bg-brand);
  color: var(--text-inverse);
  box-shadow: var(--shadow-brand);
}

.group-card__action--primary:hover {
  background: var(--bg-brand-hover);
}
</style>
