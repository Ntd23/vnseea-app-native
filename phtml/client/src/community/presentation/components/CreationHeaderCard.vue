<template>
  <section class="relative overflow-hidden rounded-[30px] border border-[#dbe3f2] bg-[linear-gradient(135deg,#ffffff_0%,#f7f9ff_52%,#eef3ff_100%)] px-5 py-5 shadow-[0_14px_34px_rgba(15,35,110,0.07)] sm:px-7">
    <div class="pointer-events-none absolute right-[-8%] top-[-20%] h-44 w-44 rounded-full bg-[#0000ff]/8 blur-3xl" />
    <div class="pointer-events-none absolute bottom-[-34%] left-[12%] h-40 w-40 rounded-full bg-[#9ad89f]/18 blur-3xl" />

    <div class="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div class="flex items-center gap-4">
        <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-[#0000ff] text-white shadow-[0_14px_28px_rgba(0,0,255,0.24)]">
          <Icon :name="icon" class="h-7 w-7" />
        </div>

        <div class="min-w-0">
          <p
            v-if="eyebrow"
            class="text-[11px] font-bold uppercase tracking-[0.24em] text-[#0000ff]/60"
          >
            {{ $t(eyebrow) }}
          </p>
          <h1 class="text-[1.9rem] font-black tracking-[-0.05em] text-[#141414] sm:text-[2.15rem]">
            {{ $t(title) }}
          </h1>
          <p
            v-if="description"
            class="mt-1 text-[14px] leading-6 text-slate-500"
          >
            {{ $t(description) }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <UBadge
          v-for="highlight in normalizedHighlights"
          :key="highlight"
          color="neutral"
          variant="soft"
          class="rounded-full border border-[#dbe3f2] bg-white/85 px-3.5 py-2 text-[12px] font-semibold text-slate-600 shadow-[0_8px_18px_rgba(15,35,110,0.04)] backdrop-blur-[8px]"
        >
          {{ $t(highlight) }}
        </UBadge>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  description?: string
  eyebrow?: string
  icon?: string
  highlights?: string[]
}>(), {
  description: "",
  eyebrow: "",
  icon: "i-ph-users-three-fill",
  highlights: () => [],
})

const { t } = useI18n()

const normalizedHighlights = computed(() =>
  props.highlights.length > 0
    ? props.highlights
    : [t("community.creation.common.quickFill"), t("community.creation.common.editLater")],
)
</script>
