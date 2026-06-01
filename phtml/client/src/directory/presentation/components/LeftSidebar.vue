<!-- English description: Desktop directory sidebar navigation for category shortcuts and nearby search access. -->
<template>
  <div class="bg-white border border-[var(--border-default)] rounded-[24px] p-3.5 shadow-[0_4px_20px_-2px_rgba(0,0,100,0.02)] space-y-0.5">
    <button
      v-for="category in categories"
      :key="category.value"
      type="button"
      class="sidebar-nav-item w-full text-left"
      :class="{ active: activeTab === category.value, [category.accentClass]: activeTab === category.value }"
      @click="selectCategory(category)"
    >
      <span 
        class="sidebar-icon-box"
        :class="{ active: activeTab === category.value, [category.accentClass]: true }"
      >
        <Icon :name="category.icon" class="h-[18px] w-[18px]" />
      </span>
      <span class="font-bold text-[13px] tracking-tight">{{ category.label }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { appRoutes } from "#shared-kernel/application/constants/route-registry"
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"

const route = useRoute()
const router = useRouter()

const categories = [
  { value: "posts", label: "Nguồn cấp tin tức", icon: "i-ph-newspaper-clipping-fill", accentClass: "posts", to: appRoutes.directory },
  { value: "nearby-search", label: "Tìm kiếm gần đây", icon: "i-ph-map-pin-fill", accentClass: "nearby-search", to: appRoutes.searchNearby },
  { value: "users", label: "Người dùng", icon: "i-ph-user-circle-fill", accentClass: "users" },
  { value: "pages", label: "Các trang", icon: "i-ph-flag-fill", accentClass: "pages" },
  { value: "groups", label: "Tập đoàn", icon: "i-ph-users-three-fill", accentClass: "groups" },
  { value: "blogs", label: "Blog", icon: "i-ph-article-fill", accentClass: "blogs" },
  { value: "market", label: "Thị trường", icon: "i-ph-shopping-cart-fill", accentClass: "market" },
  { value: "events", label: "Sự kiện", icon: "i-ph-calendar-fill", accentClass: "events" },
  { value: "games", label: "Trò chơi", icon: "i-ph-game-controller-fill", accentClass: "games" },
  { value: "forums", label: "Diễn đàn", icon: "i-ph-chat-circle-dots-fill", accentClass: "forums" },
  { value: "movies", label: "Phim", icon: "i-ph-film-strip-fill", accentClass: "movies" },
  { value: "jobs", label: "Việc làm", icon: "i-ph-briefcase-fill", accentClass: "jobs" },
  { value: "funding", label: "Gây quỹ", icon: "i-ph-hand-heart-fill", accentClass: "funding" },
] as const

const activeTab = computed(() => {
  if (route.path === appRoutes.searchNearby) return "nearby-search"

  const slug = route.params.slug
  if (slug) {
    let s = String(slug).toLowerCase()
    // Map robust singular forms to active categories
    if (s === "blog") s = "blogs"
    if (s === "game") s = "games"
    if (s === "event") s = "events"
    if (s === "forum") s = "forums"
    if (s === "movie") s = "movies"
    if (s === "job") s = "jobs"
    if (categories.some(cat => cat.value === s)) return s
  }
  const t = String(route.query.tab || "posts").toLowerCase()
  return categories.some(cat => cat.value === t) ? t : "posts"
})

function selectCategory(category: any) {
  router.push(category.to ?? `${appRoutes.directory}/${category.value}`)
}
</script>

<style scoped>
/* ── Sidebar Navigation List ──────────────────────── */
.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 14px;
  font-weight: 800;
  color: #64748b;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-nav-item:hover {
  background: #f8fafc;
  color: #334155;
  transform: translateX(2px);
}

.sidebar-icon-box {
  display: flex;
  height: 30px;
  width: 30px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f1f5f9;
  color: #94a3b8;
  transition: all 0.25s ease;
}

.sidebar-nav-item:hover .sidebar-icon-box {
  background: #e2e8f0;
  color: #64748b;
}

/* Dynamic Active states matching original icons theme coloring */
.sidebar-nav-item.active {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
}

/* 1. Posts */
.sidebar-nav-item.active.posts { background-color: #fee2e2 !important; color: #ef4444 !important; }
.sidebar-icon-box.active.posts { background-color: #ef4444 !important; color: #ffffff !important; }

/* 2. Nearby search */
.sidebar-nav-item.active.nearby-search { background-color: var(--bg-surface-active) !important; color: var(--text-brand) !important; }
.sidebar-icon-box.active.nearby-search { background-color: var(--bg-brand) !important; color: var(--text-inverse) !important; }

/* 3. Users (Người dùng) */
.sidebar-nav-item.active.users { background-color: #e0f2fe !important; color: #0284c7 !important; }
.sidebar-icon-box.active.users { background-color: #0284c7 !important; color: #ffffff !important; }

/* 3. Pages (Các trang) */
.sidebar-nav-item.active.pages { background-color: #e0e7ff !important; color: #4f46e5 !important; }
.sidebar-icon-box.active.pages { background-color: #4f46e5 !important; color: #ffffff !important; }

/* 4. Groups (Tập đoàn) */
.sidebar-nav-item.active.groups { background-color: #ccfbf1 !important; color: #0d9488 !important; }
.sidebar-icon-box.active.groups { background-color: #0d9488 !important; color: #ffffff !important; }

/* 5. Blogs */
.sidebar-nav-item.active.blogs { background-color: #fce7f3 !important; color: #db2777 !important; }
.sidebar-icon-box.active.blogs { background-color: #db2777 !important; color: #ffffff !important; }

/* 6. Market (Thị trường) */
.sidebar-nav-item.active.market { background-color: #ffedd5 !important; color: #ea580c !important; }
.sidebar-icon-box.active.market { background-color: #ea580c !important; color: #ffffff !important; }

/* 7. Events (Sự kiện) */
.sidebar-nav-item.active.events { background-color: #f3e8ff !important; color: #7c3aed !important; }
.sidebar-icon-box.active.events { background-color: #7c3aed !important; color: #ffffff !important; }

/* 8. Games (Trò chơi) */
.sidebar-nav-item.active.games { background-color: #fdf2f8 !important; color: #db2777 !important; }
.sidebar-icon-box.active.games { background-color: #db2777 !important; color: #ffffff !important; }

/* 9. Forums (Diễn đàn) */
.sidebar-nav-item.active.forums { background-color: #e0f7fa !important; color: #00acc1 !important; }
.sidebar-icon-box.active.forums { background-color: #00acc1 !important; color: #ffffff !important; }

/* 10. Movies (Phim) */
.sidebar-nav-item.active.movies { background-color: #ffebee !important; color: #e53935 !important; }
.sidebar-icon-box.active.movies { background-color: #e53935 !important; color: #ffffff !important; }

/* 11. Jobs (Việc làm) */
.sidebar-nav-item.active.jobs { background-color: #f1f5f9 !important; color: #475569 !important; }
.sidebar-icon-box.active.jobs { background-color: #475569 !important; color: #ffffff !important; }

/* 12. Funding (Gây quỹ) */
.sidebar-nav-item.active.funding { background-color: #fdf2f8 !important; color: #ec4899 !important; }
.sidebar-icon-box.active.funding { background-color: #ec4899 !important; color: #ffffff !important; }
</style>
