<!-- English description: Nuxt route wrapper for the withdrawal bounded-context page. -->
<template>
  <PagesWithdrawalPage />
</template>

<script setup lang="ts">
import PagesWithdrawalPage from "../../src/withdrawal/presentation/pages/WithdrawalPage.vue"
definePageMeta({
  layout: "default",
})
</script>
