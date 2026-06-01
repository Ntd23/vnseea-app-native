  <div class="surface-card p-5 space-y-4">
    <div class="flex items-center justify-between">
      <div class="space-y-0.5">
        <h3 class="text-sm font-black text-[var(--text-primary)] tracking-tight">{{ t("pages.profilePage.friendsGrid.title") }} ({friendCount})</h3>
      </div>
      <UButton
        variant="ghost"
        color="primary"
        size="xs"
        class="font-bold -mr-2"
      >
        {{ t("pages.profilePage.friendsGrid.seeAll") }}
      </UButton>
    </div>

    <div class="grid grid-cols-3 gap-4">
      <div
        v-for="friend in friends"
        :key="friend.name"
        class="group cursor-pointer text-center space-y-2"
      >
        <div class="relative aspect-square overflow-hidden rounded-2xl border-4 border-secondary-50 transition-all group-hover:border-primary-100 group-hover:scale-[1.05] shadow-sm">
          <UAvatar
            :text="friend.avatar"
            size="3xl"
            class="h-full w-full"
            :ui="{ 
              rounded: 'rounded-none',
              background: 'bg-secondary-50',
              text: 'text-[var(--text-primary)] font-bold text-lg'
            }"
          />
        </div>
        <p class="truncate text-[11px] font-black text-[var(--text-primary)] group-hover:text-secondary-900 transition-colors leading-none pb-1">{{ friend.name }}</p>
      </div>
    </div>
  </div>

<script setup lang="ts">
const { t } = useI18n()
const friendCount = 342

const friends = [
  { name: "Thu Hà", avatar: "TH" },
  { name: "Bảo Trần", avatar: "BT" },
  { name: "Nam Phạm", avatar: "NP" },
  { name: "Linh Đào", avatar: "LĐ" },
  { name: "Quỳnh Lê", avatar: "QL" },
  { name: "Xu Nguyễn", avatar: "XN" },
  { name: "Minh Anh", avatar: "MA" },
  { name: "Khánh Vũ", avatar: "KV" },
  { name: "Thanh Hà", avatar: "TH" },
]
</script>
