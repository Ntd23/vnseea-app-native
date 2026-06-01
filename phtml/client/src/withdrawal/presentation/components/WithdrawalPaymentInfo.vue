<template>
  <section class="surface-card p-6">
    <p class="text-label-primary text-[var(--text-primary)] uppercase tracking-widest">{{ t("pages.withdrawalPage.paymentInfoEyebrow") }}</p>
    <h2 class="mt-1 text-heading text-[var(--text-primary)]">{{ t("pages.withdrawalPage.paymentInfoTitle") }}</h2>

    <div class="mt-6 space-y-4">
      <div
        v-for="profile in profiles"
        :key="profile.label"
        class="rounded-2xl bg-secondary-50/50 p-5 border border-secondary-100/30"
      >
        <p class="text-micro font-bold text-[var(--text-primary)] uppercase tracking-wider">{{ profile.label }}</p>
        <p class="mt-1 text-body-primary font-black">{{ profile.value }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const { t } = useI18n()

defineProps<{
  profiles: ReadonlyArray<{ label: string; value: string }>
}>()
</script>
