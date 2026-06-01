<template>
  <div class="space-y-6">
    <FeedPostCard v-for="post in posts" :key="post.id" :post="post" />
  </div>
</template>

<script setup lang="ts">
import FeedPostCard from "../../../feed/presentation/components/PostCard.vue"

defineProps<{
  posts: {
    id: number
    author: string
    role: string
    audience: string
    time: string
    text: string
    tags: string[]
    stats: { likes: number; comments: number; shares: number }
    media?: 'double' | 'single'
    comments: { id: number; author: string; role: string; text: string }[]
  }[]
}>()
</script>
