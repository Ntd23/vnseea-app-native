  <div class="surface-card p-5 space-y-5">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-black text-[var(--text-primary)] tracking-tight">{{ t("pages.profilePage.introCard.title") }}</h3>
      <UButton
        variant="ghost"
        color="primary"
        size="xs"
        class="font-bold -mr-2"
      >
        {{ t("pages.profilePage.introCard.edit") }}
      </UButton>
    </div>

    <p class="text-body-secondary text-xs font-medium leading-relaxed">
      {{ t("pages.profilePage.introCard.headline") }}
    </p>

    <div class="space-y-4">
      <div v-for="item in infoItems" :key="item.label" class="flex items-center gap-4 group cursor-default">
        <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-50 text-[var(--text-primary)] group-hover:bg-primary-50 group-hover:text-secondary-900 transition-colors">
          <Icon :name="item.icon" class="h-5 w-5" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-[10px] font-bold uppercase tracking-widest text-[var(--text-primary)]">{{ item.label }}</p>
          <p class="truncate text-sm font-black text-[var(--text-primary)] group-hover:text-secondary-900 transition-colors">{{ item.value }}</p>
        </div>
      </div>
    </div>
  </div>

<script setup lang="ts">
const { t } = useI18n()

const infoItems = computed(() => [
  {
    icon: "i-ph-briefcase",
    label: t("pages.profilePage.introCard.items.work.label"),
    value: t("pages.profilePage.introCard.items.work.value"),
  },
  {
    icon: "i-ph-graduation-cap",
    label: t("pages.profilePage.introCard.items.education.label"),
    value: t("pages.profilePage.introCard.items.education.value"),
  },
  {
    icon: "i-ph-map-pin",
    label: t("pages.profilePage.introCard.items.livesIn.label"),
    value: t("pages.profilePage.introCard.items.livesIn.value"),
  },
  {
    icon: "i-ph-heart",
    label: t("pages.profilePage.introCard.items.relationship.label"),
    value: t("pages.profilePage.introCard.items.relationship.value"),
  },
  {
    icon: "i-ph-calendar-blank",
    label: t("pages.profilePage.introCard.items.joined.label"),
    value: t("pages.profilePage.introCard.items.joined.value"),
  },
  {
    icon: "i-ph-globe-simple",
    label: t("pages.profilePage.introCard.items.website.label"),
    value: t("pages.profilePage.introCard.items.website.value"),
  },
])
</script>
