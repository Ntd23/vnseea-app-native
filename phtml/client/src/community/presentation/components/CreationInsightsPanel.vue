<template>
  <div class="space-y-6 xl:sticky xl:top-[84px]">
    <section class="overflow-hidden rounded-[32px] border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-[var(--shadow-md)]">
      <!-- Premium Header with Refined Gradient -->
      <div class="bg-[linear-gradient(135deg,var(--color-primary-900)_0%,var(--color-primary-700)_40%,var(--color-primary-500)_100%)] p-6 text-white">
        <p class="text-[10px] font-black uppercase tracking-[0.25em] text-white/60">
          {{ $t("community.creation.insights.preview") }}
        </p>
        <div class="mt-5 rounded-[24px] border border-white/20 bg-white/10 p-5 backdrop-blur-xl ring-1 ring-white/10">
          <div class="flex items-start gap-4">
            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-white text-primary-600 shadow-xl shadow-black/20 transition-transform hover:scale-105">
              <Icon :name="previewIcon" class="h-7 w-7" />
            </div>

            <div class="min-w-0 space-y-1">
              <p class="truncate text-[17px] font-black tracking-tight">
                {{ previewTitle }}
              </p>
              <p class="truncate text-[12px] font-bold text-white/70">
                {{ previewUrl }}
              </p>
            </div>
          </div>

          <div class="mt-5 flex flex-wrap gap-2.5">
            <div
              v-if="showPrivacy"
              class="inline-flex items-center rounded-full bg-white/15 px-3.5 py-1.5 text-[11px] font-black tracking-wide text-white ring-1 ring-white/10"
            >
              <Icon name="i-ph-shield-check-fill" class="mr-2 h-4 w-4" />
              {{ privacyLabel }}
            </div>
            <div class="inline-flex items-center rounded-full bg-white/15 px-3.5 py-1.5 text-[11px] font-black tracking-wide text-white ring-1 ring-white/10">
              <Icon name="i-ph-tag-fill" class="mr-2 h-4 w-4" />
              {{ categoryLabel }}
            </div>
          </div>

          <p class="mt-5 text-[13px] font-medium leading-relaxed text-white/80 line-clamp-3">
            {{ resolvedPreviewDescription }}
          </p>
        </div>
      </div>

      <div class="space-y-6 p-6">
        <!-- Readiness Section -->
        <div class="rounded-[28px] border border-primary-100/50 bg-primary-50/20 p-5 ring-1 ring-primary-50">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500/80">
                {{ $t("community.creation.insights.readiness") }}
              </p>
              <p class="mt-1 text-[16px] font-bold text-[var(--text-primary)]">
                {{ $t("community.creation.insights.completionStatus", { count: completionCount, total: completionTotal }) }}
              </p>
            </div>
            <div
              class="flex h-12 w-12 items-center justify-center rounded-[18px] transition-all duration-500"
              :class="progressValue === 100 ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-white text-primary-500 shadow-sm'"
            >
              <Icon :name="progressValue === 100 ? 'i-ph-check-fat-fill' : 'i-ph-rocket-launch-fill'" class="h-6 w-6" />
            </div>
          </div>

          <UProgress
            :model-value="progressValue"
            color="primary"
            size="md"
            class="mt-5 h-2"
          />

          <div class="mt-6 space-y-3">
            <div
              v-for="item in readinessItems"
              :key="item.label"
              class="flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3 shadow-sm ring-1 ring-slate-100/50 transition-all hover:ring-primary-100"
            >
              <div
                class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors duration-300"
                :class="item.done ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20' : 'bg-slate-50 text-slate-300'"
              >
                <Icon :name="item.done ? 'i-ph-check-bold' : 'i-ph-circle-bold'" class="h-4 w-4" />
              </div>
              <div class="min-w-0">
                <p class="truncate text-[13px] font-bold text-[var(--text-primary)]">
                  {{ item.label }}
                </p>
                <p class="truncate text-[11px] font-medium text-slate-400">
                  {{ item.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Privacy Insight -->
        <div
          v-if="showPrivacy"
          class="rounded-[24px] border border-[var(--border-default)] bg-white p-5 shadow-sm"
        >
          <div class="flex items-center gap-2">
            <Icon name="i-ph-info-fill" class="h-4 w-4 text-primary-500" />
            <p class="text-[10px] font-black uppercase tracking-[0.2em] text-primary-500/80">
              {{ $t("community.creation.insights.privacy") }}
            </p>
          </div>
          <p class="mt-3 text-[14px] font-bold text-[var(--text-primary)]">
            {{ privacyLabel }}
          </p>
          <p class="mt-1.5 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
            {{ privacyDescription }}
          </p>
        </div>

        <!-- Next Steps Section -->
        <div class="space-y-4">
          <p class="ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
            {{ $t("community.creation.insights.afterCreation") }}
          </p>
          <div class="space-y-3">
            <div
              v-for="step in resolvedNextSteps"
              :key="step.title"
              class="group relative overflow-hidden rounded-[24px] bg-[var(--bg-surface-sunken)] p-4 ring-1 ring-[var(--border-default)] transition-all hover:bg-white hover:shadow-md hover:ring-primary-100"
            >
              <div class="relative z-10 space-y-1">
                <p class="text-[13px] font-bold text-[var(--text-primary)] transition-colors group-hover:text-primary-600">
                  {{ step.title }}
                </p>
                <p class="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                  {{ step.description }}
                </p>
              </div>
              <div class="absolute -right-2 -top-2 opacity-[0.03] transition-opacity group-hover:opacity-[0.08]">
                <Icon name="i-ph-sparkle-fill" class="h-16 w-16" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

const props = withDefaults(defineProps<{
  entityLabel: string
  completionCount: number
  completionTotal: number
  previewTitle: string
  previewUrl: string
  previewDescription: string
  privacyLabel?: string
  privacyDescription?: string
  categoryLabel: string
  showPrivacy?: boolean
  previewIcon?: string
  nextSteps?: Array<{ title: string; description: string }>
  nameReady?: boolean
  urlReady?: boolean
  descriptionReady?: boolean
  privacyReady?: boolean
  categoryReady?: boolean
}>(), {
  privacyLabel: "",
  privacyDescription: "",
  showPrivacy: true,
  previewIcon: "i-ph-users-three-fill",
  nextSteps: () => [],
  nameReady: false,
  urlReady: false,
  descriptionReady: false,
  privacyReady: false,
  categoryReady: false,
})

const resolvedPreviewDescription = computed(() => {
  const entity = t(props.entityLabel)
  const capitalizedEntity = entity.charAt(0).toUpperCase() + entity.slice(1)
  return props.previewDescription.trim()
    || t("community.creation.common.previewDescDefault", { entity: capitalizedEntity })
})

const progressValue = computed(() => {
  if (!props.completionTotal) {
    return 0
  }

  return (props.completionCount / props.completionTotal) * 100
})

const readinessItems = computed(() => {
  const entity = t(props.entityLabel)

  const items = [
    {
      label: t("community.creation.readiness.nameLabel", { entity }),
      description: t("community.creation.readiness.nameDesc", { entity }),
      done: props.nameReady,
    },
    {
      label: t("community.creation.readiness.urlLabel"),
      description: t("community.creation.readiness.urlDesc", { entity }),
      done: props.urlReady,
    },
    {
      label: t("community.creation.readiness.descLabel"),
      description: t("community.creation.readiness.descDesc", { entity }),
      done: props.descriptionReady,
    },
    {
      label: t("community.creation.readiness.categoryLabel"),
      description: t("community.creation.readiness.categoryDesc", { entity }),
      done: props.categoryReady,
    },
  ]

  if (props.showPrivacy) {
    items.splice(3, 0, {
      label: t("community.creation.readiness.privacyLabel"),
      description: t("community.creation.readiness.privacyDesc", { entity }),
      done: props.privacyReady,
    })
  }

  return items
})

const resolvedNextSteps = computed(() => {
  if (props.nextSteps.length > 0) {
    return props.nextSteps
  }

  const entity = t(props.entityLabel)

  return [
    {
      title: t("community.creation.insights.finishTitle", { entity }),
      description: t("community.creation.insights.finishDesc", { entity }),
    },
    {
      title: t("community.creation.insights.inviteTitle"),
      description: props.showPrivacy
        ? t("community.creation.insights.inviteDescGroup")
        : t("community.creation.insights.inviteDescPage"),
    },
    {
      title: t("community.creation.insights.introPostTitle"),
      description: t("community.creation.insights.introPostDesc"),
    },
  ]
})
</script>
