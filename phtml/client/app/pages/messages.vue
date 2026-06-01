<template>
  <div class="h-full min-h-0">
    <MessagesPresentationMessagesPage />
  </div>
</template>

<script setup lang="ts">
import MessagesPresentationMessagesPage from "../../src/messages/presentation/pages/MessagesPage.vue"

definePageMeta({
  layout: "messages",
})

const { t } = useI18n()
useSeoMeta({
  title: () => t('pages.messagesPage.seoTitle'),
  description: () => t('pages.messagesPage.seoDescription'),
})
</script>
