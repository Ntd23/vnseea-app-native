<template>
  <PagesCustomerOrderPage :order-id="orderId" />
</template>

<script setup lang="ts">
import PagesCustomerOrderPage from "../../../src/orders/presentation/pages/CustomerOrderPage.vue"

definePageMeta({
  layout: "default",
})

const route = useRoute()
const orderId = computed(() => String(route.params.id || ""))

useHead({
  title: () => `Đơn khách #${orderId.value} | VNSEEA`,
})
</script>
