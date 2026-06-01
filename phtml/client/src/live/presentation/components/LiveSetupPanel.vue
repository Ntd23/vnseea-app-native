<!-- English description: Hosts the pre-broadcast setup form for the backend-backed /live studio route. -->
<template>
  <aside class="setup-panel">
    <template v-if="bootstrapLoading">
      <div class="setup-panel__skeleton-stack">
        <USkeleton class="h-16 w-full rounded-2xl" />
        <USkeleton class="h-10 w-3/4 rounded-xl" />
        <USkeleton class="h-10 w-full rounded-2xl" />
        <USkeleton class="h-10 w-full rounded-2xl" />
        <USkeleton class="h-24 w-full rounded-2xl" />
        <USkeleton class="h-12 w-full rounded-2xl" />
      </div>
    </template>

    <template v-else>
      <div v-if="bootstrapErrorMessage || blockedReasonMessage || errorMessage || statusMessage" class="setup-panel__alerts">
        <UAlert v-if="bootstrapErrorMessage" color="error" variant="soft" :title="t('pages.livePage.studio.bootstrapErrorTitle')" :description="bootstrapErrorMessage" class="rounded-2xl" />
        <UAlert v-else-if="blockedReasonMessage" color="warning" variant="soft" :title="t('pages.livePage.studio.blockedTitle')" :description="blockedReasonMessage" class="rounded-2xl" />
        <UAlert v-if="errorMessage" color="error" variant="soft" :title="t('pages.livePage.studio.errorTitle')" :description="errorMessage" class="rounded-2xl" />
        <UAlert v-if="statusMessage" :color="liveState === 'offline' ? 'neutral' : 'primary'" variant="soft" :title="t('pages.livePage.studio.statusTitle')" :description="statusMessage" class="rounded-2xl" />
      </div>

      <div class="setup-panel__host">
        <UAvatar
          :src="bootstrap.host?.avatarUrl || undefined"
          :alt="bootstrap.host?.name || t('pages.livePage.studio.hostFallback')"
          size="lg"
          class="shrink-0"
          :ui="{ rounded: 'rounded-2xl' }"
        />
        <div class="min-w-0">
          <p class="setup-panel__host-name">{{ bootstrap.host?.name || t("pages.livePage.studio.hostFallback") }}</p>
          <p class="setup-panel__host-role">{{ bootstrap.host?.note || t("pages.livePage.studio.hostRoleFallback") }}</p>
        </div>
      </div>

      <div class="setup-panel__fields">
        <div class="setup-panel__field">
          <label class="setup-panel__label">{{ t("pages.livePage.studio.destinationLabel") }}</label>
          <USelect
            :model-value="bootstrap.destination"
            :items="destinationSelectOptions"
            value-key="value"
            label-key="label"
            disabled
            color="primary"
            size="xl"
            class="w-full"
            :ui="{ base: 'rounded-2xl bg-white border-slate-200' }"
          />
        </div>

        <div class="setup-panel__field">
          <label class="setup-panel__label">{{ t("pages.livePage.studio.privacyLabel") }}</label>
          <USelect
            :model-value="privacy"
            :items="privacySelectOptions"
            value-key="value"
            label-key="label"
            color="primary"
            size="xl"
            class="w-full"
            :ui="{ base: 'rounded-2xl bg-white border-slate-200' }"
            @update:model-value="emit('update:privacy', String($event))"
          />
        </div>

        <div class="setup-panel__field">
          <label class="setup-panel__label">{{ t("pages.livePage.studio.titleLabel") }}</label>
          <UInput
            :model-value="title"
            :placeholder="t('pages.livePage.studio.titlePlaceholder')"
            :ui="{ base: 'rounded-2xl bg-white border-slate-200 focus:border-blue-500' }"
            @update:model-value="emit('update:title', String($event))"
          />
        </div>

      </div>

      <div class="setup-panel__device-section">
        <div class="setup-panel__media-toggles">
          <UButton
            :icon="videoMuted ? 'i-ph-video-camera-slash-bold' : 'i-ph-video-camera-bold'"
            :label="videoMuted ? t('pages.livePage.studio.enableCamera') : t('pages.livePage.studio.disableCamera')"
            :color="videoMuted ? 'error' : 'neutral'"
            :variant="videoMuted ? 'soft' : 'outline'"
            size="md"
            class="setup-panel__toggle-btn"
            @click="emit('toggle-video')"
          />
          <UButton
            :icon="audioMuted ? 'i-ph-microphone-slash-bold' : 'i-ph-microphone-bold'"
            :label="audioMuted ? t('pages.livePage.studio.enableMicrophone') : t('pages.livePage.studio.disableMicrophone')"
            :color="audioMuted ? 'error' : 'neutral'"
            :variant="audioMuted ? 'soft' : 'outline'"
            size="md"
            class="setup-panel__toggle-btn"
            @click="emit('toggle-audio')"
          />
        </div>
      </div>

      <div class="setup-panel__action">
        <UButton
          size="xl"
          color="primary"
          class="w-full justify-center rounded-2xl font-bold"
          :loading="starting"
          :disabled="!canStart || previewLoading || !mediaSupported"
          @click="emit('start-live')"
        >
          <template #leading>
            <UIcon name="i-ph-broadcast-bold" class="h-5 w-5" />
          </template>
          {{ t("pages.livePage.studio.startBroadcast") }}
        </UButton>
      </div>
    </template>
  </aside>
</template>

<script setup lang="ts">
import type {
  LiveStudioBootstrap,
  LiveStudioOption,
  LiveStudioState,
} from "../../domain/types/live.types"

defineProps<{
  bootstrap: LiveStudioBootstrap
  bootstrapLoading: boolean
  bootstrapErrorMessage: string
  blockedReasonMessage: string
  errorMessage: string
  statusMessage: string
  liveState: LiveStudioState
  title: string
  privacy: string
  destinationSelectOptions: ReadonlyArray<LiveStudioOption>
  privacySelectOptions: ReadonlyArray<LiveStudioOption>
  canStart: boolean
  starting: boolean
  previewLoading: boolean
  mediaSupported: boolean
  audioMuted: boolean
  videoMuted: boolean
}>()

const emit = defineEmits<{
  "update:title": [value: string]
  "update:privacy": [value: string]
  "toggle-audio": []
  "toggle-video": []
  "start-live": []
}>()

const { t } = useI18n()
</script>

<style scoped>
.setup-panel {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 255, 0.04);
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: sticky;
  top: 82px;
}

.setup-panel__skeleton-stack,
.setup-panel__alerts,
.setup-panel__fields {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setup-panel__host {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  background: #fafbfe;
}

.setup-panel__host-name {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.setup-panel__host-role {
  font-size: 12px;
  color: #64748b;
  margin: 3px 0 0;
}

.setup-panel__field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.setup-panel__label {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
}

.setup-panel__device-section {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.setup-panel__media-toggles {
  display: flex;
  gap: 10px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.setup-panel__toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: 999px;
  background: #f8fafc;
  color: #374151;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.setup-panel__action {
  margin-top: auto;
}

@media (max-width: 1180px) {
  .setup-panel {
    position: static;
  }

  .setup-panel__fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .setup-panel__action {
    margin-top: 0;
  }
}

@media (max-width: 640px) {
  .setup-panel {
    padding: 14px;
  }

  .setup-panel__fields {
    grid-template-columns: 1fr;
  }
}
</style>
