<!-- English description: Nuxt route wrapper for the wallet bounded-context page. -->
<template>
  <WalletPresentationWalletPage />
</template>

<script setup lang="ts">
import WalletPresentationWalletPage from "../../src/wallet/presentation/pages/WalletPage.vue"
import { appRoutes } from "../../src/shared-kernel/application/constants/route-registry"

definePageMeta({
  layout: "default",
})

const { t } = useI18n()
const requestURL = useRequestURL()
const canonicalUrl = computed(() => new URL(appRoutes.wallet, requestURL.origin).toString())

useSeoMeta({
  title: () => t("pages.walletPage.seoTitle"),
  description: () => t("pages.walletPage.seoDescription"),
  ogTitle: () => t("pages.walletPage.seoTitle"),
  ogDescription: () => t("pages.walletPage.seoDescription"),
  ogUrl: () => canonicalUrl.value,
})

useHead({
  link: [
    {
      rel: "canonical",
      href: canonicalUrl,
    },
  ],
})
</script>
