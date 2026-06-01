<template>
  <div class="relative z-0 flex h-full min-h-0 w-full flex-col overflow-visible">
    <div class="relative z-0 min-h-0 flex-1 overflow-visible rounded-[18px] border border-[rgba(0,0,255,0.04)] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
      <NavigationChatWidget class="h-full w-full" />
    </div>
  </div>
</template>

<script setup lang="ts">
import NavigationChatWidget from "./ChatWidget.vue"
</script>
