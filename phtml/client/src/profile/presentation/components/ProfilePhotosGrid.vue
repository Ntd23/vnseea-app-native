  <div class="surface-card p-5 space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-black text-[var(--text-primary)] tracking-tight">{{ $t("pages.profilePage.photosGrid.title") }}</h3>
      <UButton
        variant="ghost"
        color="primary"
        size="xs"
        class="font-bold -mr-2"
      >
        {{ $t("pages.profilePage.photosGrid.seeAll") }}
      </UButton>
    </div>

    <div class="grid grid-cols-3 gap-2">
      <div
        v-for="i in 9"
        :key="i"
        class="group aspect-square cursor-pointer overflow-hidden rounded-2xl border-2 border-secondary-50 transition-all hover:border-primary-100 hover:scale-[1.05] shadow-sm bg-secondary-50"
      >
        <div class="flex h-full w-full items-center justify-center">
          <Icon name="i-ph-image-duotone" class="h-6 w-6 text-secondary-200 group-hover:text-primary-300 transition-colors" />
        </div>
      </div>
    </div>
  </div>
