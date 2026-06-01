<template>
  <CommunitySettingsSectionCard
    :eyebrow="$t('community.pageSettings.controls.eyebrow')"
    :title="$t('community.pageSettings.controls.title')"
    :description="$t('community.pageSettings.controls.desc')"
    icon="i-ph-cursor-click-bold"
  >
    <template #trailing>
      <div class="flex items-center gap-3">
        <!-- <span class="page-settings-controls__selected">
          {{ selectedCtaLabel }}
        </span> -->
        <slot name="trailing" />
      </div>
    </template>

    <div class="page-settings-controls space-y-5">
      <div>
        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <button
            v-for="option in ctaOptions"
            :key="option.value"
            type="button"
            class="cta-card"
            :class="model.ctaLabel === option.value
              ? 'cta-card--active'
              : 'cta-card--inactive'"
            @click="model.ctaLabel = option.value"
          >
            <div class="cta-card__icon-wrap">
              <Icon :name="option.icon || 'i-ph-circle-fill'" class="h-6 w-6" />
            </div>

            <div class="cta-card__content">
              <h3 class="cta-card__title">
                {{ option.labelText }}
              </h3>

              <p class="cta-card__desc">
                {{ option.descriptionText }}
              </p>
            </div>
          </button>
        </div>
      </div>

      <div class="page-settings-controls__info">
        <Icon name="i-ph-info-fill" class="h-5 w-5" />
        <div>
          <p>{{ $t('community.pageSettings.controls.logic') }}</p>
          <span>{{ logicDescription }}</span>
        </div>
      </div>

      <div class="grid gap-3 lg:grid-cols-2">
        <div
          v-for="toggle in toggleItems"
          :key="toggle.key"
          class="page-settings-controls__toggle"
        >
          <USwitch
            v-model="model[toggle.key]"
            color="primary"
            size="lg"
            :label="toggle.label"
            :description="toggle.description"
            class="items-start"
          />
        </div>
      </div>
    </div>

    <slot name="footer" />
  </CommunitySettingsSectionCard>
</template>

<script setup lang="ts">
import CommunitySettingsSectionCard from "./SettingsSectionCard.vue"
import { communityPageCtaOptions } from "../../domain/constants/community-options"
import type { CommunityPageSettingsDraft } from "../../domain/types/community.types"

const model = defineModel<CommunityPageSettingsDraft>({ required: true })
const { t } = useI18n()

const ctaOptions = computed(() =>
  communityPageCtaOptions.map(option => ({
    ...option,
    labelText: t(option.label),
    descriptionText: option.description ? t(option.description) : "",
  })),
)

const selectedCtaLabel = computed(() =>
  model.value.ctaLabel.trim() ? model.value.ctaLabel : t("community.pageSettings.basics.stats.ctaFallback"),
)

const logicDescription = computed(() =>
  t("community.pageSettings.controls.logicDesc", { cta: selectedCtaLabel.value.toLowerCase() }).replaceAll("**", ""),
)

const toggleItems = computed(() => [
  {
    key: "allowMessages" as const,
    label: t("community.pageSettings.controls.toggles.messagesLabel"),
    description: t("community.pageSettings.controls.toggles.messagesDesc"),
  },
  {
    key: "showFollowerCount" as const,
    label: t("community.pageSettings.controls.toggles.followersLabel"),
    description: t("community.pageSettings.controls.toggles.followersDesc"),
  },
  {
    key: "showLikeCount" as const,
    label: t("community.pageSettings.controls.toggles.likesLabel"),
    description: t("community.pageSettings.controls.toggles.likesDesc"),
  },
  {
    key: "showWebsite" as const,
    label: t("community.pageSettings.controls.toggles.websiteLabel"),
    description: t("community.pageSettings.controls.toggles.websiteDesc"),
  },
  {
    key: "recommendRelatedPages" as const,
    label: t("community.pageSettings.controls.toggles.relatedLabel"),
    description: t("community.pageSettings.controls.toggles.relatedDesc"),
  },
])
</script>

<style scoped>
.cta-card {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #ffffff;
  padding: 14px;
  text-align: left;
  transition: all 0.15s ease;
}

.cta-card--active {
  border-color: #2563eb;
  background: #f0f7ff;
  box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.1), 0 8px 10px -6px rgba(37, 99, 235, 0.1);
}

.cta-card--inactive:hover {
  border-color: #cbd5e1;
  background: #f8fafc;
}

.cta-card__icon-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  flex: 0 0 48px;
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 14px;
  color: #0f172a;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.cta-card--active .cta-card__icon-wrap {
  color: #2563eb;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.15);
}

.cta-card__title {
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
  margin: 0;
}

.cta-card__desc {
  font-size: 13px;
  line-height: 1.45;
  color: #64748b;
  margin: 4px 0 0;
}

.cta-card__content {
  min-width: 0;
}

.page-settings-controls__selected {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: #eff6ff;
  color: #1d4ed8;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 800;
}

.page-settings-controls__info {
  display: flex;
  gap: 12px;
  border: 1px solid #bfdbfe;
  border-radius: 16px;
  background: #eff6ff;
  color: #1d4ed8;
  padding: 14px 16px;
}

.page-settings-controls__info p {
  margin: 0;
  color: #0f172a;
  font-size: 13px;
  font-weight: 900;
}

.page-settings-controls__info span {
  display: block;
  margin-top: 3px;
  color: #475569;
  font-size: 13px;
  line-height: 1.55;
}

.page-settings-controls__toggle {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #f8fafc;
  padding: 16px;
}

.page-settings-controls :deep(label) {
  color: #0f172a;
  font-weight: 800;
}

.page-settings-controls :deep(p) {
  color: #64748b;
}
</style>
