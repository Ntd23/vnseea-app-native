<template>
  <PagesOrdersPage active-section="orders" />
</template>

<script setup lang="ts">
import PagesOrdersPage from "../../src/orders/presentation/pages/OrdersPage.vue"
definePageMeta({
  layout: "default",
})

const { t } = useI18n()

useHead({
  title: t("orders.page.title"),
})
</script>
