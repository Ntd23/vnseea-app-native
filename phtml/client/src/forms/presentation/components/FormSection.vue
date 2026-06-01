<template>
  <UCard
    class="rounded-[28px] border border-[#dbe3f2] bg-white shadow-[0_14px_34px_rgba(15,35,110,0.07)]"
    :ui="cardUi"
    v-bind="attrs"
  >
    <div class="space-y-5">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0 flex-1">
          <div v-if="eyebrow || badge" class="flex flex-wrap items-center gap-2">
            <p
              v-if="eyebrow"
              class="text-[11px] font-bold uppercase tracking-[0.24em] text-[#0000ff]/70"
            >
              {{ eyebrow }}
            </p>

            <UBadge
              v-if="badge"
              color="primary"
              variant="subtle"
              class="rounded-full px-3 py-1 text-[11px] font-semibold"
            >
              {{ badge }}
            </UBadge>
          </div>

          <div class="mt-1 flex flex-wrap items-center gap-3">
            <div
              v-if="icon"
              class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef4ff] text-[#0000ff]"
            >
              <Icon :name="icon" class="h-5 w-5" />
            </div>

            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="text-lg font-black tracking-[-0.03em] text-[#243b63]">
                  {{ title }}
                </h3>

                <UBadge
                  v-if="required"
                  color="warning"
                  variant="subtle"
                  class="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                >
                  {{ requiredLabel }}
                </UBadge>
              </div>

              <p v-if="description" class="mt-1 text-sm leading-6 text-slate-500">
                {{ description }}
              </p>
            </div>
          </div>
        </div>

        <slot name="actions" />
      </div>

      <UAlert
        v-if="hint"
        :color="alertColor"
        variant="subtle"
        :icon="alertIcon"
        :title="hintTitle || undefined"
        :description="hint"
        class="rounded-[20px]"
      />

      <div :class="contentClass">
        <slot />
      </div>

      <slot name="footer" />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { useAttrs } from "vue"

defineOptions({ inheritAttrs: false })

type SectionTone = "neutral" | "primary" | "success" | "warning" | "error"

const attrs = useAttrs()

const props = withDefaults(defineProps<{
  title: string
  description?: string
  eyebrow?: string
  badge?: string
  icon?: string
  hint?: string
  hintTitle?: string
  tone?: SectionTone
  compact?: boolean
  required?: boolean
  requiredLabel?: string
}>(), {
  description: "",
  eyebrow: "",
  badge: "",
  icon: "",
  hint: "",
  hintTitle: "",
  tone: "primary",
  compact: false,
  required: false,
  requiredLabel: "Bắt buộc",
})

const toneMap: Record<SectionTone, { color: "primary" | "success" | "warning" | "error" | "neutral", icon: string }> = {
  neutral: {
    color: "neutral",
    icon: "i-ph-info-fill",
  },
  primary: {
    color: "primary",
    icon: "i-ph-info-fill",
  },
  success: {
    color: "success",
    icon: "i-ph-check-circle-fill",
  },
  warning: {
    color: "warning",
    icon: "i-ph-warning-circle-fill",
  },
  error: {
    color: "error",
    icon: "i-ph-warning-octagon-fill",
  },
}

const cardUi = computed(() => ({
  body: props.compact ? "p-4 sm:p-5" : "p-5 sm:p-6",
}))

const contentClass = computed(() => (props.compact ? "space-y-4" : "space-y-5"))
const alertColor = computed(() => toneMap[props.tone].color)
const alertIcon = computed(() => toneMap[props.tone].icon)
</script>
