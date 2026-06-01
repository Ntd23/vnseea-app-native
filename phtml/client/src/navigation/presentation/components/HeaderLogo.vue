<!-- English description: Renders the header brand mark using backend branding with a resilient text fallback. -->
<template>
  <NuxtLink :to="to" class="flex items-center gap-2.5">
    <img
      v-if="displayLogoUrl && !logoFailed"
      :src="displayLogoUrl"
      :alt="logoAlt"
      class="h-9 max-w-[132px] object-contain"
      @error="logoFailed = true"
    >
    <div
      v-else
      class="flex h-9 w-9 items-center justify-center rounded-2xl text-sm font-extrabold text-white"
      :class="inverted ? 'bg-white/16 ring-1 ring-white/20' : 'bg-[var(--brand-ink)]'"
    >
      {{ fallbackInitial }}
    </div>
    <div v-if="!displayLogoUrl || logoFailed">
      <p
        class="text-[10px] font-semibold uppercase tracking-[0.06em]"
        :class="inverted ? 'text-white/70' : 'text-[var(--icon-primary)]'"
      >
        {{ $t("navigation.headerLogo.tagline") }}
      </p>
      <p class="text-sm font-extrabold leading-none" :class="inverted ? 'text-white' : 'text-slate-900'">
        {{ brandName }}
      </p>
    </div>
  </NuxtLink>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia"
import { useSiteBrandingStore } from "../../../site-branding/application/stores/useSiteBrandingStore"

const props = withDefaults(defineProps<{
  inverted?: boolean
  to?: string
}>(), {
  inverted: true,
  to: "/",
})

const siteBrandingStore = useSiteBrandingStore()
const { branding } = storeToRefs(siteBrandingStore)
const logoFailed = ref(false)

const brandName = computed(() => branding.value.siteName || "VNSEEA")
const displayLogoUrl = computed(() =>
  props.inverted && branding.value.nightLogoUrl
    ? branding.value.nightLogoUrl
    : branding.value.logoUrl,
)
const logoAlt = computed(() => `${brandName.value} Logo`)
const fallbackInitial = computed(() => brandName.value.trim().charAt(0).toUpperCase() || "V")

watch(displayLogoUrl, () => {
  logoFailed.value = false
})
</script>
