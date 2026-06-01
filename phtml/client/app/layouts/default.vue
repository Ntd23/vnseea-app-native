<!-- English description: Default authenticated layout with header, sidebars, and a fixed mobile chat shortcut. -->
<template>
  <div class="phone-safe min-h-screen bg-[#f1f4fb]" :class="isReelsPage ? 'overflow-hidden bg-black' : ''">
    <ClientOnly>
      <HeaderSearchContent />
    </ClientOnly>

    <NavigationHeaderBar />

    <div class="w-full" :class="isReelsPage ? 'h-[calc(100dvh-65px)] overflow-hidden xl:h-[calc(100dvh-73px)]' : ''">
      <div
        class="mx-auto grid w-full grid-cols-1 gap-4 xl:items-start"
        :class="shellClass"
      >
        <aside
          v-if="showLeftSidebar && !isReelsPage"
          class="hidden min-w-0 xl:sticky xl:top-[74px] xl:z-10 xl:block xl:h-[calc(100dvh-98px)] xl:overflow-hidden"
        >
          <NavigationLeftSidebar v-if="!isDirectoryPage" />
          <DirectoryLeftSidebar v-else />
        </aside>

        <main class="relative z-0 min-w-0 w-full" :class="mainClass">
          <div v-if="showHeaderIconNav" class="sticky top-[56px] z-20 mb-4 mt-2 xl:hidden">
            <div class="overflow-hidden rounded-[1.4rem] border border-[#dbe3f2] bg-white shadow-[0_12px_28px_rgba(13,38,76,0.05)]">
              <NavigationHeaderIconNav />
            </div>
          </div>
          <slot />
        </main>

        <aside v-if="showRightSidebar" class="hidden min-w-0 xl:sticky xl:top-[74px] xl:z-50 xl:block xl:h-[calc(100dvh-90px)] xl:overflow-visible">
          <NavigationRightSidebar />
        </aside>
      </div>
    </div>

  </div>
</template>

<script setup>
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import NavigationHeaderBar from "../../src/navigation/presentation/components/HeaderBar.vue"
import HeaderSearchContent from "../../src/navigation/presentation/components/HeaderSearchContent.client.vue"
import NavigationHeaderIconNav from "../../src/navigation/presentation/components/HeaderIconNav.vue"
import NavigationLeftSidebar from "../../src/navigation/presentation/components/LeftSidebar.vue"
import NavigationRightSidebar from "../../src/navigation/presentation/components/RightSidebar.vue"
import DirectoryLeftSidebar from "../../src/directory/presentation/components/LeftSidebar.vue"

const route = useRoute()
const isReelsPage = computed(() => route.path === appRoutes.reels)
const isCheckoutPage = computed(() => route.path === appRoutes.checkout)
const isSearchPage = computed(() => route.path === appRoutes.search)
const isPageDetailPage = computed(() => route.path.startsWith("/p/"))
const isBlogDetailPage = computed(() => route.path.startsWith("/read-blog/"))
const isDirectoryPage = computed(() => route.path.startsWith("/directory"))
const isCreateBlogPage = computed(() => route.path === appRoutes.createBlog)
const isLivePage = computed(() => route.path === appRoutes.live)
const isFundingPage = computed(() =>
  route.path === appRoutes.funding
  || route.path === appRoutes.createFunding
  || route.path.startsWith("/show_fund/")
  || route.path.startsWith("/edit_fund/")
)
const isForumPage = computed(() => route.path === appRoutes.forum)
const isHomeFeedPage = computed(() => route.path === appRoutes.home || route.path === appRoutes.feed)
const isCommunityComposerPage = computed(() =>
  route.path === appRoutes.createGroup || route.path === appRoutes.createPage,
)
const showLeftSidebar = computed(() =>
  !route.path.startsWith('/@')
  && !isCheckoutPage.value
  && !isSearchPage.value
  && !isPageDetailPage.value
  && !isBlogDetailPage.value
  && !isFundingPage.value
  && !isForumPage.value
  && !isCreateBlogPage.value
  && !isLivePage.value
)
const showRightSidebar = computed(() => !isReelsPage.value && !isLivePage.value)
// HeaderIconNav (Home/Photos/Reels/Video/Music) only makes sense on content-feed pages.
// Using a whitelist to avoid it leaking onto Groups, Events, Jobs, etc.
const iconNavPages = new Set([
  appRoutes.home,
  appRoutes.feed,
  appRoutes.photos,
  appRoutes.watch,
])
const showHeaderIconNav = computed(() => iconNavPages.has(route.path))

const shellClass = computed(() => {
  if (isReelsPage.value) {
    return 'h-full max-w-none grid-cols-1 gap-0 px-0 xl:grid-cols-1'
  }

  if (isCheckoutPage.value) {
    return 'max-w-[1880px] px-4 md:px-6 xl:px-8 xl:grid-cols-[minmax(0,1fr)_275px]'
  }

  if (isLivePage.value) {
    return 'max-w-[1880px] px-0 md:px-0 xl:grid-cols-1'
  }

  // All content pages share same sidebar widths → no layout shift on navigation
  return showLeftSidebar.value
    ? 'max-w-[1880px] px-4 md:px-6 xl:px-8 xl:grid-cols-[220px_minmax(0,1fr)_260px] 2xl:grid-cols-[256px_minmax(0,1fr)_280px]'
    : 'max-w-[1880px] px-4 md:px-6 xl:px-8 xl:grid-cols-[minmax(0,1fr)_260px]'
})

const mainClass = computed(() => {
  if (isReelsPage.value) {
    return 'h-full min-h-0 overflow-hidden'
  }

  if (isCheckoutPage.value) {
    return 'pb-6'
  }

  if (isCommunityComposerPage.value) {
    return 'pb-8'
  }

  if (isSearchPage.value) {
    return 'pb-8'
  }

  if (isLivePage.value) {
    return 'pb-0'
  }

  return 'pb-10'
})

</script>
