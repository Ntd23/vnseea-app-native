<template>
  <PagesOrderDetailPage :order-id="orderId" />
</template>

<script setup lang="ts">
import PagesOrderDetailPage from "../../../src/orders/presentation/pages/OrderDetailPage.vue"

definePageMeta({
  layout: "default",
})

const route = useRoute()
const orderId = computed(() => String(route.params.id || ""))

useHead({
  title: () => `Chi tiết đơn #${orderId.value} | VNSEEA`,
})
</script>
