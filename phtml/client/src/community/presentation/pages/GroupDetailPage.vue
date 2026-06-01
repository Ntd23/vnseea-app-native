<!-- Description: Renders the backend-backed community group detail route with a tabbed feed and sidebar layout. -->
<template>
  <div class="mx-auto max-w-[1280px] pb-10">
    <!-- ── Loading skeleton ──────────────────────────────── -->
    <template v-if="status === 'pending' && !group">
      <div class="space-y-5">
        <!-- Hero Skeleton -->
        <div class="overflow-hidden rounded-[26px] border border-[#dbe3f2] bg-white shadow-[0_12px_28px_rgba(15,35,110,0.06)]">
          <USkeleton class="h-[280px] w-full sm:h-[350px]" />
          <div class="px-6 py-8 sm:px-10">
            <div class="flex flex-col items-start gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div class="space-y-4">
                <USkeleton class="h-10 w-64 rounded-full" />
                <div class="flex gap-3">
                  <USkeleton class="h-5 w-24 rounded-full" />
                  <USkeleton class="h-5 w-24 rounded-full" />
                </div>
              </div>
              <div class="flex gap-3">
                <USkeleton class="h-12 w-32 rounded-[16px]" />
                <USkeleton class="h-12 w-12 rounded-[16px]" />
              </div>
            </div>
          </div>
        </div>

        <!-- Tabs Skeleton -->
        <div class="flex gap-6 border-b border-[#dbe3f2] px-6">
          <USkeleton v-for="i in 2" :key="i" class="h-10 w-20 rounded-t-lg" />
        </div>

        <!-- Body Skeleton -->
        <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.24fr)_320px]">
          <div class="space-y-4">
            <USkeleton class="h-[120px] w-full rounded-[24px]" />
            <USkeleton class="h-[400px] w-full rounded-[24px]" />
          </div>
          <div class="space-y-4">
            <USkeleton class="h-[200px] w-full rounded-[24px]" />
            <USkeleton class="h-[260px] w-full rounded-[24px]" />
          </div>
        </div>
      </div>
    </template>

    <!-- ── Main Content ──────────────────────────────────── -->
    <div v-else-if="group" class="space-y-5" :class="{ 'opacity-50 pointer-events-none': status === 'pending' }">
      <CommunityGroupHeroBanner
        :group="group"
        :member-count-label="memberCountLabel"
        :online-count-label="onlineCountLabel"
        :privacy-label="privacyLabel"
        :category-label="categoryLabel"
        :join-state="joinState"
        :invite-state="inviteState"
        :joined="joined"
        :requested="requested"
        @join="handleJoinGroup"
        @delete="handleDeleteGroup"
        @invite="handleInviteMembers"
      />

      <CommunityGroupTabsBar
        v-model="activeTab"
        :aria-label="t('pages.groupDetailPage.tabsAriaLabel')"
      />

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.24fr)_320px]">
        <section class="min-w-0 space-y-4">
          <!-- Tab: Posts (Instant) -->
          <div v-show="activeTab === 'posts'">
            <CommunityGroupFeedSection
              v-if="group"
              :group="group"
              :posts="groupPosts"
              @created="handlePostCreated"
            />
          </div>

          <!-- Tab: About (Instant) -->
          <div v-show="activeTab === 'about'" class="flex flex-col gap-4">
            <CommunityGroupAboutCard
              v-if="group"
              :group="group"
              :privacy-label="privacyLabel"
              :privacy-description="privacyDescription"
              :category-label="categoryLabel"
              :member-count-label="memberCountLabel"
            />

            <CommunityGroupTopicsCard
              v-if="group"
              :group="group"
              :category-label="categoryLabel"
              :privacy-description="privacyDescription"
            />
          </div>
        </section>

        <aside class="flex flex-col gap-4">
          <CommunityGroupAboutCard
            v-if="group && activeTab !== 'posts'"
            :group="group"
            :privacy-label="privacyLabel"
            :privacy-description="privacyDescription"
            :category-label="categoryLabel"
            :member-count-label="memberCountLabel"
            compact
          />

          <CommunityGroupMembersCard
            v-if="activeTab !== 'posts'"
            :members="members"
            :member-count-label="memberCountLabel"
            :invite-state="inviteState"
            @invite="handleInviteMembers"
          />

          <CommunityGroupAdminCard
            v-if="group && group.canManage && activeTab !== 'posts'"
            :slug="group.slug"
          />
        </aside>
      </div>
    </div>

    <!-- ── Empty State ───────────────────────────────────── -->
    <div v-else class="mx-auto max-w-[960px] pt-4">
      <section class="rounded-[30px] border border-[#dbe3f2] bg-white px-6 py-10 text-center shadow-[0_14px_34px_rgba(15,35,110,0.06)] sm:px-8 sm:py-16">
        <FoundationEmptyState
          icon="i-ph-users-three-fill"
          :title="t('pages.groupDetailPage.emptyTitle')"
          :description="t('pages.groupDetailPage.emptyDescription')"
        />

        <div class="mt-6 flex justify-center">
          <UButton
            :to="emptyBackPath"
            color="primary"
            variant="solid"
            size="xl"
            class="rounded-[16px] px-5 text-[14px] font-extrabold shadow-[0_12px_24px_rgba(0,0,255,0.24)]"
          >
            {{ t("pages.groupDetailPage.backToGroups") }}
          </UButton>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import FoundationEmptyState from "../../../foundation/presentation/components/EmptyState.vue"
import CommunityGroupAboutCard from "../components/GroupAboutCard.vue"
import CommunityGroupAdminCard from "../components/GroupAdminCard.vue"
import CommunityGroupFeedSection from "../components/GroupFeedSection.vue"
import CommunityGroupHeroBanner from "../components/GroupHeroBanner.vue"
import CommunityGroupMembersCard from "../components/GroupMembersCard.vue"
import CommunityGroupTabsBar from "../components/GroupTabsBar.vue"
import CommunityGroupTopicsCard from "../components/GroupTopicsCard.vue"
import { useCommunityGroupDetailPageVM } from "../../application/view-models/useCommunityGroupDetailPageVM"

const { t } = useI18n()
const {
  activeTab,
  joinState,
  inviteState,
  joined,
  requested,
  group,
  members,
  privacyLabel,
  privacyDescription,
  categoryLabel,
  memberCountLabel,
  onlineCountLabel,
  groupPosts,
  refreshGroupPosts,
  handleJoinGroup,
  handleDeleteGroup,
  handleInviteMembers,
  emptyBackPath,
  status,
} = useCommunityGroupDetailPageVM()

function handlePostCreated() {
  refreshGroupPosts()
}
</script>
