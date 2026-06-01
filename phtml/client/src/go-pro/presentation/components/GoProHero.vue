<template>
  <section class="overflow-hidden rounded-[28px] border border-[#dbe3f2] bg-white shadow-[0_16px_36px_rgba(15,35,110,0.07)]">
    <div class="grid gap-6 p-5 sm:p-6 xl:grid-cols-[minmax(0,1fr)_460px] xl:items-stretch">
      <div class="flex min-w-0 flex-col justify-between gap-8 rounded-[24px] bg-[linear-gradient(135deg,#f8fbff_0%,#eef5ff_100%)] p-5 ring-1 ring-[#dbe3f2] sm:p-7">
        <div class="space-y-4">
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex h-8 items-center rounded-full bg-white px-3 text-[12px] font-semibold text-primary-700 ring-1 ring-primary-100">
              {{ t("pages.goProPage.heroEyebrow") }}
            </span>
            <span class="inline-flex h-8 items-center rounded-full bg-primary-600 px-3 text-[12px] font-semibold text-white">
              {{ billingLabel }}
            </span>
            <span
              v-if="selectedPlanName"
              class="inline-flex h-8 items-center rounded-full bg-white px-3 text-[12px] font-semibold text-[var(--text-primary)] ring-1 ring-secondary-100"
            >
              {{ t("pages.goProPage.selectedPlanBadgeShort", { plan: selectedPlanName }) }}
            </span>
          </div>

          <div class="space-y-3">
            <h1 class="max-w-[680px] text-[34px] font-extrabold leading-tight text-[var(--text-primary)] sm:text-[48px]">
              {{ t("pages.goProPage.heroShortTitle") }}
            </h1>
            <p class="max-w-xl text-[15px] font-medium leading-7 text-slate-600">
              {{ t("pages.goProPage.heroShortDescription") }}
            </p>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-[auto_auto_1fr] sm:items-center">
          <button
            class="inline-flex h-12 items-center justify-center rounded-[12px] bg-primary-600 px-5 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(0,0,255,0.2)] transition hover:bg-primary-700 active:scale-95"
            type="button"
            @click="emit('selectFeatured')"
          >
            <Icon name="i-ph-crown-simple-duotone" class="mr-2 h-5 w-5 shrink-0" />
            {{ t("pages.goProPage.heroPrimaryCta") }}
          </button>

          <a
            class="inline-flex h-12 items-center justify-center rounded-[12px] border border-secondary-200 bg-white px-5 text-[14px] font-semibold text-[var(--text-primary)] transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 active:scale-95"
            href="#go-pro-plans"
          >
            <Icon name="i-ph-chart-bar-duotone" class="mr-2 h-5 w-5 shrink-0" />
            {{ t("pages.goProPage.heroSecondaryCta") }}
          </a>

          <button
            v-if="hasActiveSelection"
            class="inline-flex h-12 items-center justify-center rounded-[12px] px-4 text-[13px] font-semibold text-slate-500 transition hover:bg-white hover:text-primary-700 active:scale-95"
            type="button"
            @click="emit('reset')"
          >
            {{ t("pages.goProPage.resetSelection") }}
          </button>
        </div>
      </div>

      <div class="grid gap-3">
        <div class="rounded-[24px] border border-[#dbe3f2] bg-[#0f172a] p-5 text-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-[11px] font-semibold uppercase tracking-[0.06em] text-white/52">
                {{ t("pages.goProPage.currentPlanShort") }}
              </p>
              <h2 class="mt-2 text-[28px] font-extrabold leading-none">
                {{ subscription.plan }}
              </h2>
              <p class="mt-2 text-[13px] font-semibold text-white/68">
                {{ subscription.status }}
              </p>
            </div>

            <div class="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-white text-[#0f172a]">
              <Icon name="i-ph-crown-simple-fill" class="h-7 w-7" />
            </div>
          </div>

          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <div class="rounded-[18px] bg-white/10 p-3 ring-1 ring-white/10">
              <p class="text-[10px] font-extrabold uppercase text-white/48">
                {{ t("pages.goProPage.renewsAtLabel") }}
              </p>
              <p class="mt-1 text-[13px] font-extrabold">
                {{ subscription.renewsAt }}
              </p>
            </div>

            <div class="rounded-[18px] bg-white/10 p-3 ring-1 ring-white/10">
              <p class="text-[10px] font-extrabold uppercase text-white/48">
                {{ t("pages.goProPage.paymentsLabel") }}
              </p>
              <p class="mt-1 text-[13px] font-extrabold">
                {{ t("pages.goProPage.transactionCount", { count: payments.length }) }}
              </p>
            </div>
          </div>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <article
            v-for="item in stats"
            :key="item.label"
            class="rounded-[20px] border border-[#dbe3f2] bg-white p-4"
          >
              <p class="text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-400">
              {{ item.label }}
            </p>
              <p class="mt-2 text-[26px] font-extrabold leading-none text-[var(--text-primary)]">
              {{ item.value }}
            </p>
          </article>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  stats: ReadonlyArray<{ label: string; value: string | number; description: string }>
  subscription: { plan: string; status: string; renewsAt: string }
  payments: ReadonlyArray<{ id: number; plan: string; amount: string; method: string; time: string }>
  billingLabel: string
  selectedPlanName?: string
  hasActiveSelection?: boolean
}>()

const emit = defineEmits<{
  selectFeatured: []
  reset: []
}>()

const { t } = useI18n()
</script>
