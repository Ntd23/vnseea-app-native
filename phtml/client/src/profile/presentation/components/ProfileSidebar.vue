<template>
  <aside class="min-w-0 space-y-6">
    <ProfileInfoCard :title="t('pages.profilePage.sidebarInfoTitle')" icon="i-ph-info-duotone" :rows="infoRows" />

    <div class="surface-card p-4 space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-sm font-extrabold text-[var(--text-primary)] tracking-tight">{{ t("pages.profilePage.sidebarMutualFriendsTitle") }}</p>
        <UButton
          variant="ghost"
          color="primary"
          size="xs"
          class="font-semibold -mr-2"
        >
          {{ t("pages.profilePage.sidebarSeeAll") }}
        </UButton>
      </div>
      <div class="grid grid-cols-2 gap-3">
        <div v-for="item in mutualFriends" :key="item.name" class="rounded-2xl bg-secondary-50 p-3 text-center transition-colors hover:bg-secondary-100/50">
          <UAvatar
            :text="item.initials"
            size="md"
            class="mx-auto"
            :ui="{ 
              rounded: 'rounded-xl',
              background: 'bg-primary-600',
              text: 'text-white font-extrabold'
            }"
          />
          <p class="mt-2 truncate text-xs font-extrabold text-[var(--text-primary)]">{{ item.name }}</p>
          <p class="text-[10px] font-medium text-slate-500">{{ item.meta }}</p>
        </div>
      </div>
    </div>

    <ProfileMediaGrid
      :title="t('pages.profilePage.sidebarHighlightPhotos')"
      :action-label="t('pages.profilePage.sidebarSeeAll')"
      :items="highlightPhotos"
      tile-class="bg-gradient-to-br from-[#e8eeff] to-[#cfd9ff]"
    />
    <ProfileMediaGrid
      :title="t('pages.profilePage.sidebarVideos')"
      :action-label="t('pages.profilePage.sidebarSeeAll')"
      :items="videoTiles"
      tile-class="bg-gradient-to-br from-slate-900 to-slate-700"
    />
    <ProfileMediaGrid
      :title="t('pages.profilePage.sidebarProducts')"
      :action-label="t('pages.profilePage.sidebarSeeAll')"
      :items="productTiles"
      tile-class="bg-gradient-to-br from-[#f5f3ff] to-[#dbeafe]"
    />
  </aside>
</template>

<script setup lang="ts">
import ProfileInfoCard from "./ProfileInfoCard.vue"
import ProfileMediaGrid from "./ProfileMediaGrid.vue"

const { t } = useI18n()

defineProps<{
  mutualFriends: { initials: string; name: string; meta: string }[]
  highlightPhotos: number[]
}>()

const infoRows = computed(() => [
  { label: "online", icon: "i-ph-eye", right: t("pages.profilePage.infoOnlineStatus"), rightClass: "text-[#0000ff]" },
  { label: "posts", icon: "i-ph-notepad", center: "20", right: t("pages.profilePage.infoPostsCountLabel") },
  { label: "gender", icon: "i-ph-gender-male", right: t("pages.profilePage.infoGenderMale") },
  { label: "location", icon: "i-ph-map-pin", left: t("pages.profilePage.infoLocationValue") },
])
const videoTiles = [0, 1]
const productTiles = [0, 1, 2, 3]
</script>
