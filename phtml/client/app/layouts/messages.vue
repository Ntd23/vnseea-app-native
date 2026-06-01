<template>
  <div class="phone-safe flex h-screen min-h-0 flex-col overflow-hidden bg-(--bg-base)">
    <NavigationHeaderBar />
    <div class="flex min-h-0 flex-1 overflow-hidden">
      <main class="min-h-0 min-w-0 flex-1 overflow-hidden bg-(--bg-surface)">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import NavigationHeaderBar from "../../src/navigation/presentation/components/HeaderBar.vue"
</script>
