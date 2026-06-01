<!-- English description: Premium single-column WoWonder directory middle content page, natively aligned with layout-level sidebar. -->
<template>
  <div class="space-y-6">
    
    <!-- ── Discover Header Banner (Full-Width of middle column) ─────── -->
    <div :class="['wo_directory_head', activeCategory.accentClass]">
      <div class="wo_directory_head_content flex items-start gap-4">
        <span class="head-icon-box shadow-md">
          <Icon :name="activeCategory.icon" class="h-7 w-7 text-white" />
        </span>
        <div class="min-w-0">
          <h1 class="text-2xl font-black text-slate-900 tracking-tight leading-tight">
            {{ activeCategory.headerTitle }}
          </h1>
          <p class="text-[13px] font-semibold text-slate-500 mt-1.5 leading-relaxed max-w-3xl">
            {{ activeCategory.longDescription }}
          </p>
        </div>
      </div>
      
      <!-- Double Wave SVGs (Sunshine Theme Trademark Accent) -->
      <svg class="wave-accent text-slate-200/50" xmlns="http://www.w3.org/2000/svg" width="231" height="16" viewBox="0 0 231 16" fill="none">
        <path d="M219.137 3.73034C192.486 10.1419 150.867 7.69945 117.645 5.40965C98.2952 4.11209 78.5808 2.58543 57.7711 2.50911C31.4852 2.4329 15.4216 6.55455 4.4691 11.0578C3.37385 11.5158 -0.642052 11.2105 0.088112 10.6762C15.4216 2.20392 46.4536 -0.391312 86.9777 1.66964C128.962 3.80679 175.692 9.8366 213.661 2.66189C217.311 1.89862 222.423 2.96719 219.137 3.73034Z" fill="currentColor"></path>
        <path d="M228.995 8.72779C201.249 16.0495 160.726 14.4749 123.122 11.8769C103.043 10.4598 82.9631 8.72779 61.4233 8.41288C36.9628 8.01924 21.2642 11.1684 11.407 15.7346C10.3118 16.2857 5.5657 15.892 6.66095 15.3409C43.8993 -6.62428 164.741 22.8988 222.79 7.54674C226.805 6.60214 232.282 7.86178 228.995 8.72779Z" fill="currentColor"></path>
      </svg>
    </div>

    <!-- ── Mobile-Only Responsive Horizontal Capsules ────────────────── -->
    <nav class="xl:hidden flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
      <button
        v-for="category in categories"
        :key="category.value"
        type="button"
        :class="[
          'px-4 py-2 rounded-full font-bold text-xs shrink-0 transition-all border',
          activeTab === category.value 
            ? 'bg-primary text-white border-primary shadow-sm' 
            : 'bg-white text-slate-600 border-[var(--border-default)] hover:bg-slate-50'
        ]"
        @click="selectCategory(category)"
      >
        {{ category.label }}
      </button>
    </nav>

    <!-- ── Dynamic Explore Feeds/Grids rendering ─────────────────────── -->
    <div class="content-wrapper min-w-0">
      
      <!-- Loading State Skeletons -->
      <div v-if="loading" class="space-y-4">
        <div v-if="activeTab === 'posts'" class="space-y-5">
          <USkeleton v-for="i in 3" :key="i" class="h-64 rounded-2xl w-full" />
        </div>
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-grid">
          <USkeleton v-for="i in 6" :key="i" class="h-44 rounded-[24px]" />
        </div>
      </div>

      <!-- Error Alert -->
      <UAlert v-else-if="error" color="error" variant="soft" :title="error" icon="i-ph-warning-circle-fill" />

      <!-- Feeds -->
      <div v-else class="content-fade-in">
        
        <!-- 1. Posts Feed -->
        <div v-if="activeTab === 'posts'" class="space-y-5">
          <div v-if="posts.length" class="space-y-5">
            <FeedPostCard v-for="post in posts" :key="post.id" :post="post" />
          </div>
          <div v-else class="empty-state">
            <Icon name="i-ph-newspaper-clipping-duotone" class="h-12 w-12 text-slate-300" />
            <h3>{{ t("pages.directoryPage.emptyPostsTitle", "Chưa có bài đăng nào") }}</h3>
            <p>{{ t("pages.directoryPage.emptyPostsDesc", "Không tìm thấy bài viết công khai nào nổi bật trên hệ thống.") }}</p>
          </div>
        </div>

        <!-- 2. Users Grid (Người dùng) -->
        <div v-else-if="activeTab === 'users'">
          <div v-if="users.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-grid">
            <article v-for="user in users" :key="user.id" class="directory-card relative overflow-hidden">
              <div class="cover-accent bg-gradient-to-tr from-sky-400 to-blue-600" />
              <div class="card-inner p-4 pt-12 flex flex-col items-center text-center">
                <UAvatar :src="user.avatarUrl" :alt="user.title" size="xl" class="border-4 border-white shadow-md relative z-10 hover-avatar" />
                
                <NuxtLink :to="user.href" class="font-extrabold text-slate-800 hover:text-blue-600 mt-3 text-base truncate max-w-full">
                  {{ user.title }}
                </NuxtLink>
                <span class="text-[11px] font-semibold text-slate-400 mt-0.5 truncate max-w-full">
                  {{ user.subtitle }}
                </span>
                
                <span class="text-xs font-bold text-slate-500 mt-2 bg-slate-100 rounded-full px-3 py-1">
                  {{ user.metricLabel || "Profile" }}
                </span>

                <div class="mt-4 w-full">
                  <UButton
                    :color="user.badge === 'Following' ? 'neutral' : 'primary'"
                    :variant="user.badge === 'Following' ? 'outline' : 'solid'"
                    size="sm"
                    class="w-full justify-center rounded-full font-bold shadow-sm"
                    :loading="actionPending[user.id]"
                    @click="toggleFollowUser(user)"
                  >
                    <Icon :name="user.badge === 'Following' ? 'i-ph-check-bold' : 'i-ph-user-plus-bold'" class="h-4 w-4 mr-1.5" />
                    {{ user.badge === 'Following' ? t("pages.directoryPage.following", "Đang theo dõi") : t("pages.directoryPage.follow", "Theo dõi") }}
                  </UButton>
                </div>
              </div>
            </article>
          </div>
          <div v-else class="empty-state">
            <Icon name="i-ph-users-duotone" class="h-12 w-12 text-slate-300" />
            <h3>Chưa có thành viên nào</h3>
            <p>Không tìm thấy thành viên nổi bật nào trên hệ thống.</p>
          </div>
        </div>

        <!-- 3. Pages Grid (Các trang) -->
        <div v-else-if="activeTab === 'pages'">
          <div v-if="pages.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-grid">
            <article v-for="page in pages" :key="page.id" class="directory-card relative overflow-hidden">
              <div class="cover-accent bg-gradient-to-tr from-violet-400 to-indigo-600" />
              <div class="card-inner p-4 pt-12 flex flex-col items-center text-center">
                <UAvatar :src="page.avatarUrl" :alt="page.title" size="xl" class="border-4 border-white shadow-md relative z-10 hover-avatar" />
                
                <NuxtLink :to="page.href" class="font-extrabold text-slate-800 hover:text-indigo-600 mt-3 text-base truncate max-w-full">
                  {{ page.title }}
                </NuxtLink>
                <span class="text-[11px] font-semibold text-slate-400 mt-0.5 truncate max-w-full">
                  {{ page.subtitle }}
                </span>
                
                <span class="text-xs font-bold text-indigo-500 mt-2 bg-indigo-50 rounded-full px-3 py-1">
                  {{ page.metricLabel || "Page" }}
                </span>

                <div class="mt-4 w-full">
                  <UButton
                    :color="page.badge === 'Liked' ? 'neutral' : 'primary'"
                    :variant="page.badge === 'Liked' ? 'outline' : 'solid'"
                    size="sm"
                    class="w-full justify-center rounded-full font-bold shadow-sm"
                    :loading="actionPending[page.id]"
                    @click="toggleLikePage(page)"
                  >
                    <Icon :name="page.badge === 'Liked' ? 'i-ph-thumbs-up-fill' : 'i-ph-thumbs-up-bold'" class="h-4 w-4 mr-1.5" />
                    {{ page.badge === 'Liked' ? t("pages.directoryPage.liked", "Đã thích") : t("pages.directoryPage.like", "Thích trang") }}
                  </UButton>
                </div>
              </div>
            </article>
          </div>
          <div v-else class="empty-state">
            <Icon name="i-ph-flag-duotone" class="h-12 w-12 text-slate-300" />
            <h3>Chưa có trang nào</h3>
            <p>Không tìm thấy trang cộng đồng nổi bật nào trên hệ thống.</p>
          </div>
        </div>

        <!-- 4. Groups Grid (Tập đoàn) -->
        <div v-else-if="activeTab === 'groups'">
          <div v-if="groups.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-grid">
            <article v-for="group in groups" :key="group.id" class="directory-card relative overflow-hidden">
              <div class="cover-accent bg-gradient-to-tr from-teal-400 to-emerald-600" />
              <div class="card-inner p-4 pt-12 flex flex-col items-center text-center">
                <UAvatar :src="group.avatarUrl" :alt="group.title" size="xl" class="border-4 border-white shadow-md relative z-10 hover-avatar" />
                
                <NuxtLink :to="group.href" class="font-extrabold text-slate-800 hover:text-emerald-600 mt-3 text-base truncate max-w-full">
                  {{ group.title }}
                </NuxtLink>
                <span class="text-[11px] font-semibold text-slate-400 mt-0.5 truncate max-w-full">
                  {{ group.subtitle }}
                </span>
                
                <span class="text-xs font-bold text-emerald-500 mt-2 bg-emerald-50 rounded-full px-3 py-1">
                  {{ group.metricLabel || "Group" }}
                </span>

                <div class="mt-4 w-full">
                  <UButton
                    :color="group.badge === 'Joined' ? 'neutral' : 'primary'"
                    :variant="group.badge === 'Joined' ? 'outline' : 'solid'"
                    size="sm"
                    class="w-full justify-center rounded-full font-bold shadow-sm"
                    :loading="actionPending[group.id]"
                    @click="toggleJoinGroup(group)"
                  >
                    <Icon :name="group.badge === 'Joined' ? 'i-ph-check-circle-fill' : 'i-ph-user-plus-bold'" class="h-4 w-4 mr-1.5" />
                    {{ group.badge === 'Joined' ? t("pages.directoryPage.joined", "Đã tham gia") : t("pages.directoryPage.join", "Tham gia nhóm") }}
                  </UButton>
                </div>
              </div>
            </article>
          </div>
          <div v-else class="empty-state">
            <Icon name="i-ph-users-three-duotone" class="h-12 w-12 text-slate-300" />
            <h3>Chưa có nhóm nào</h3>
            <p>Không tìm thấy nhóm thảo luận nổi bật nào trên hệ thống.</p>
          </div>
        </div>

        <!-- 5. Blogs Grid -->
        <div v-else-if="activeTab === 'blogs'">
          <div v-if="blogs.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-grid">
            <BlogsBlogArticleCard
              v-for="article in blogs"
              :key="article.id"
              :article="article"
              :format-compact="formatCompact"
            />
          </div>
          <div v-else class="empty-state">
            <Icon name="i-ph-article-duotone" class="h-12 w-12 text-slate-300" />
            <h3>Chưa có bài viết blog nào</h3>
            <p>Không tìm thấy bài viết blog nổi bật nào trên hệ thống.</p>
          </div>
        </div>

        <!-- 6. Market Grid (Thị trường) -->
        <div v-else-if="activeTab === 'market'">
          <div v-if="products.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-grid">
            <article v-for="product in products" :key="product.id" class="directory-card group overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm hover:shadow-md transition duration-300 flex flex-col relative">
              <div class="relative aspect-square overflow-hidden bg-slate-50">
                <NuxtLink :to="product.href" class="block h-full">
                  <NuxtImg v-if="product.imageUrl" :src="product.imageUrl" :alt="product.title" class="h-full w-full object-cover transition duration-300 group-hover:scale-105" loading="lazy" />
                  <div v-else class="flex h-full w-full items-center justify-center bg-gradient-to-tr from-orange-400 to-amber-600 text-white">
                    <Icon name="i-ph-shopping-bag-fill" class="h-16 w-16 opacity-85" />
                  </div>
                </NuxtLink>
                <div class="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-sm z-10">
                  {{ product.categoryLabel }}
                </div>
              </div>
              <div class="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <NuxtLink :to="product.href" class="line-clamp-2 text-sm font-extrabold text-slate-800 hover:text-orange-600 leading-tight">
                    {{ product.title }}
                  </NuxtLink>
                  <div class="mt-2 text-base font-black text-orange-600">
                    {{ product.priceFormat || (product.price + ' ' + (product.currency || 'VND')) }}
                  </div>
                </div>
                <div class="mt-3 flex items-center justify-between text-xs text-slate-400 font-bold border-t border-slate-50 pt-3">
                  <span class="truncate max-w-[120px]">{{ product.seller }}</span>
                  <span class="px-2 py-0.5 bg-slate-100 rounded text-slate-500 font-extrabold uppercase text-[10px]">{{ product.condition }}</span>
                </div>
              </div>
            </article>
          </div>
          <div v-else class="empty-state">
            <Icon name="i-ph-shopping-bag-duotone" class="h-12 w-12 text-slate-300" />
            <h3>Chưa có sản phẩm nào</h3>
            <p>Không tìm thấy sản phẩm nào đang rao bán trên hệ thống.</p>
          </div>
        </div>

        <!-- 7. Events Grid (Sự kiện) -->
        <div v-else-if="activeTab === 'events'">
          <div v-if="events.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-grid">
            <EventsEventCard v-for="event in events" :key="event.id" :event="event" />
          </div>
          <div v-else class="empty-state">
            <Icon name="i-ph-calendar-x-duotone" class="h-12 w-12 text-slate-300" />
            <h3>Chưa có sự kiện nào</h3>
            <p>Không tìm thấy sự kiện sắp diễn ra nào nổi bật.</p>
          </div>
        </div>

        <!-- 8. Games Grid (Trò chơi) -->
        <div v-else-if="activeTab === 'games'">
          <div v-if="games.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-grid">
            <GamesGameCard v-for="game in games" :key="game.id" :game="game" />
          </div>
          <div v-else class="empty-state">
            <Icon name="i-ph-game-controller-duotone" class="h-12 w-12 text-slate-300" />
            <h3>Chưa có trò chơi nào</h3>
            <p>Không tìm thấy tựa game giải trí nào nổi bật.</p>
          </div>
        </div>

        <!-- 9. Forums Grid (Diễn đàn) -->
        <div v-else-if="activeTab === 'forums'">
          <div v-if="forumSections.length" class="space-y-4 animate-grid w-full">
            <article v-for="section in forumSections" :key="section.id" class="border border-slate-100 rounded-2xl bg-white overflow-hidden shadow-sm">
              <header class="bg-slate-50 border-b border-slate-100 p-4">
                <h3 class="font-extrabold text-slate-800 text-sm tracking-wide">{{ section.title }}</h3>
                <p v-if="section.description" class="text-xs text-slate-400 mt-0.5">{{ section.description }}</p>
              </header>
              <div class="divide-y divide-slate-50">
                <NuxtLink v-for="forum in section.forums" :key="forum.id" :to="forum.url" class="flex items-center justify-between p-4 hover:bg-slate-50 transition">
                  <div class="flex items-center gap-3">
                    <span class="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-500">
                      <Icon name="i-ph-chat-centered-text-duotone" class="h-5 w-5" />
                    </span>
                    <div>
                      <h4 class="font-bold text-slate-700 text-sm hover:text-blue-600 transition">{{ forum.title }}</h4>
                      <p class="text-xs text-slate-400 mt-0.5 line-clamp-1">{{ forum.description }}</p>
                    </div>
                  </div>
                  <span class="text-xs font-bold text-slate-400 px-3 py-1 bg-slate-100 rounded-full shrink-0">
                    {{ forum.posts }} bài viết
                  </span>
                </NuxtLink>
              </div>
            </article>
          </div>
          <div v-else class="empty-state">
            <Icon name="i-ph-chats-circle-duotone" class="h-12 w-12 text-slate-300" />
            <h3>Chưa có diễn đàn nào</h3>
            <p>Không tìm thấy diễn đàn trao đổi nào trên hệ thống.</p>
          </div>
        </div>

        <!-- 10. Movies Grid (Phim) -->
        <div v-else-if="activeTab === 'movies'">
          <div v-if="movies.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-grid">
            <MoviesCard v-for="movie in movies" :key="movie.id" :movie="movie" genre-label="Phim" />
          </div>
          <div v-else class="empty-state">
            <Icon name="i-ph-film-strip-duotone" class="h-12 w-12 text-slate-300" />
            <h3>Chưa có phim nào</h3>
            <p>Không tìm thấy thước phim điện ảnh nổi bật nào.</p>
          </div>
        </div>

        <!-- 11. Jobs Grid (Việc làm) -->
        <div v-else-if="activeTab === 'jobs'">
          <div v-if="jobs.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-grid">
            <JobCard v-for="job in jobs" :key="job.id" :job="job" />
          </div>
          <div v-else class="empty-state">
            <Icon name="i-ph-briefcase-duotone" class="h-12 w-12 text-slate-300" />
            <h3>Chưa có việc làm nào</h3>
            <p>Không tìm thấy tin đăng tuyển dụng nổi bật nào.</p>
          </div>
        </div>

        <!-- 12. Funding Grid (Gây quỹ) -->
        <div v-else-if="activeTab === 'funding'">
          <div v-if="fundingCampaigns.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-grid">
            <FundingCard v-for="campaign in fundingCampaigns" :key="campaign.id" :campaign="campaign" @donate="navigateTo(campaign.url || '/funding')" />
          </div>
          <div v-else class="empty-state">
            <Icon name="i-ph-hand-heart-duotone" class="h-12 w-12 text-slate-300" />
            <h3>Chưa có chiến dịch gây quỹ nào</h3>
            <p>Không tìm thấy chiến dịch gây quỹ từ thiện nổi bật nào.</p>
          </div>
        </div>

      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useRoute, useRouter } from "vue-router"
import { createApiFeedRepository } from "../../../feed/infrastructure/repositories/ApiFeedRepository"
import { createApiSearchRepository } from "../../../search/infrastructure/repositories/ApiSearchRepository"
import FeedPostCard from "../../../feed/presentation/components/PostCard.vue"

// Import Repositories động cho từng domain
import { createApiBlogRepository } from "../../../blogs/infrastructure/repositories/ApiBlogRepository"
import { createApiEventsRepository } from "../../../events/infrastructure/repositories/ApiEventsRepository"
import { createApiJobsRepository } from "../../../jobs/infrastructure/repositories/ApiJobsRepository"
import { ApiGamesRepository } from "../../../games/infrastructure/repositories/ApiGamesRepository"
import { ApiForumRepository } from "../../../forum/infrastructure/repositories/ApiForumRepository"
import { createApiProductRepository } from "../../../product/infrastructure/repositories/ApiProductRepository"
import { ApiFundingRepository } from "../../../funding/infrastructure/repositories/ApiFundingRepository"
import { useMockMoviesData } from "../../../movies/application/composables/useMockMoviesData"

// Import các Card components chính hiển thị danh mục
import BlogsBlogArticleCard from "../../../blogs/presentation/components/BlogArticleCard.vue"
import EventsEventCard from "../../../events/presentation/components/EventCard.vue"
import JobCard from "../../../jobs/presentation/components/JobCard.vue"
import GamesGameCard from "../../../games/presentation/components/GameCard.vue"
import FundingCard from "../../../funding/presentation/components/FundingCard.vue"
import MoviesCard from "../../../movies/presentation/components/Card.vue"

const { t } = useI18n()

const categories = [
  { 
    value: "posts", 
    label: "Posts", 
    icon: "i-ph-newspaper-clipping-fill", 
    headerTitle: "Phát hiện bài viết",
    longDescription: "Khám phá nội dung hấp dẫn và quan điểm đa dạng trên trang Khám phá của chúng tôi. Khám phá những ý tưởng mới và tham gia vào các cuộc trò chuyện có ý nghĩa.",
    accentClass: "posts" 
  },
  { 
    value: "users", 
    label: "Người dùng", 
    icon: "i-ph-user-circle-fill", 
    headerTitle: "Kết nối thành viên", 
    longDescription: "Khám phá và kết nối với những thành viên năng động, đa dạng trong mạng lưới. Xây dựng mối quan hệ mới ngay hôm nay.",
    accentClass: "users" 
  },
  { 
    value: "pages", 
    label: "Các trang", 
    icon: "i-ph-flag-fill", 
    headerTitle: "Theo dõi Fanpage", 
    longDescription: "Tìm hiểu và theo dõi những trang fanpage, thương hiệu, nghệ sĩ nổi tiếng và các hội nhóm sở thích lớn nhất trên mạng xã hội.",
    accentClass: "pages" 
  },
  { 
    value: "groups", 
    label: "Tập đoàn", 
    icon: "i-ph-users-three-fill", 
    headerTitle: "Tham gia hội nhóm", 
    longDescription: "Tham gia các cộng đồng thảo luận chuyên sâu, chia sẻ đam mê chung và cùng nhau giải đáp thắc mắc trong từng chủ đề.",
    accentClass: "groups" 
  },
  { 
    value: "blogs", 
    label: "Blog", 
    icon: "i-ph-article-fill", 
    headerTitle: "Bài viết chuyên sâu", 
    longDescription: "Đọc những câu chuyện dài bổ ích, chia sẻ chuyên môn sâu sắc và tin tức được biên soạn cẩn thận từ các tác giả uy tín.",
    redirectUrl: "/blogs", 
    accentClass: "blogs" 
  },
  { 
    value: "market", 
    label: "Thị trường", 
    icon: "i-ph-shopping-cart-fill", 
    headerTitle: "Sản phẩm & Chợ thương mại", 
    longDescription: "Khám phá những mặt hàng độc đáo, trao đổi mua bán sản phẩm tiện lợi trực tiếp trong trung tâm mua sắm cộng đồng.",
    redirectUrl: "/market", 
    accentClass: "market" 
  },
  { 
    value: "events", 
    label: "Sự kiện", 
    icon: "i-ph-calendar-fill", 
    headerTitle: "Sự kiện cộng đồng", 
    longDescription: "Đăng ký tham gia các hoạt động cộng đồng, sự kiện văn hóa, hội thảo trực tuyến và giao lưu kết nối thiết thực.",
    redirectUrl: "/events", 
    accentClass: "events" 
  },
  { 
    value: "games", 
    label: "Trò chơi", 
    icon: "i-ph-game-controller-fill", 
    headerTitle: "Giải trí & Mini-Games", 
    longDescription: "Tận hưởng những giây phút giải trí sảng khoái với các tựa game mini thú vị được tích hợp sẵn trên hệ thống.",
    redirectUrl: "/games", 
    accentClass: "games" 
  },
  { 
    value: "forums", 
    label: "Diễn đàn", 
    icon: "i-ph-chat-circle-dots-fill", 
    headerTitle: "Chuyên mục trao đổi", 
    longDescription: "Nơi trao đổi ý kiến, hỏi đáp kinh nghiệm, lưu giữ tri thức cộng đồng thông qua các chuyên mục phân cấp rõ ràng.",
    redirectUrl: "/forum", 
    accentClass: "forums" 
  },
  { 
    value: "movies", 
    label: "Phim", 
    icon: "i-ph-film-strip-fill", 
    headerTitle: "Điện ảnh & Video chất lượng cao", 
    longDescription: "Trải nghiệm thế giới điện ảnh phong phú, các thước phim giới thiệu độc quyền và thước phim ngắn sắc nét, chất lượng cao.",
    redirectUrl: "/movies", 
    accentClass: "movies" 
  },
  { 
    value: "jobs", 
    label: "Việc làm", 
    icon: "i-ph-briefcase-fill", 
    headerTitle: "Tuyển dụng & Việc làm", 
    longDescription: "Tìm kiếm vị trí tuyển dụng lý tưởng hoặc đăng tin tìm kiếm nhân tài phù hợp một cách nhanh chóng, hiệu quả nhất.",
    redirectUrl: "/jobs", 
    accentClass: "jobs" 
  },
  { 
    value: "funding", 
    label: "Gây quỹ", 
    icon: "i-ph-hand-heart-fill", 
    headerTitle: "Quỹ đóng góp xã hội", 
    longDescription: "Chung tay chia sẻ khó khăn, tài trợ cho các ý tưởng sáng tạo hoặc dự án nhân văn, mang lại giá trị tốt đẹp cho xã hội.",
    redirectUrl: "/funding", 
    accentClass: "funding" 
  },
] as const

const route = useRoute()
const router = useRouter()

const activeTab = computed(() => {
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

const activeCategory = computed(() => {
  return categories.find(cat => cat.value === activeTab.value) || categories[0]
})

function selectCategory(category: any) {
  if (category.value === "posts") {
    router.push("/directory")
  } else {
    router.push(`/directory/${category.value}`)
  }
}

// Data loaders
const posts = ref<any[]>([])
const users = ref<any[]>([])
const pages = ref<any[]>([])
const groups = ref<any[]>([])
const blogs = ref<any[]>([])
const products = ref<any[]>([])
const events = ref<any[]>([])
const games = ref<any[]>([])
const forumSections = ref<any[]>([])
const movies = ref<any[]>([])
const jobs = ref<any[]>([])
const fundingCampaigns = ref<any[]>([])

const loading = ref(false)
const error = ref<string | null>(null)
const actionPending = ref<Record<string, boolean>>({})

// Khởi tạo các repository services
const postsRepository = createApiFeedRepository()
const searchRepository = createApiSearchRepository()
const blogsRepository = createApiBlogRepository()
const productsRepository = createApiProductRepository()
const eventsRepository = createApiEventsRepository()
const gamesRepository = new ApiGamesRepository()
const forumRepository = new ApiForumRepository()
const jobsRepository = createApiJobsRepository()
const fundingRepository = new ApiFundingRepository()

// Hàm định dạng số gọn (formatCompact) dùng cho Blog article card views count
const formatCompact = (value: number) => {
  if (value >= 1000000) return (value / 1000000).toFixed(1) + "M"
  if (value >= 1000) return (value / 1000).toFixed(1) + "K"
  return String(value)
}

async function loadData() {
  const tab = activeTab.value
  loading.value = true
  error.value = null

  try {
    if (tab === "posts" && !posts.value.length) {
      const res = await postsRepository.getExplore({ limit: 15 })
      posts.value = res.posts ?? []
    } else if (tab === "users" && !users.value.length) {
      const res = await searchRepository.search("", { type: "users" }, 24)
      users.value = res.users ?? []
    } else if (tab === "pages" && !pages.value.length) {
      const res = await searchRepository.search("", { type: "pages" }, 24)
      pages.value = res.pages ?? []
    } else if (tab === "groups" && !groups.value.length) {
      const res = await searchRepository.search("", { type: "groups" }, 24)
      groups.value = res.groups ?? []
    } else if (tab === "blogs" && !blogs.value.length) {
      const res = await blogsRepository.getBlogs({ limit: 12 })
      blogs.value = res.map(article => ({
        ...article,
        href: article.href || `/read-blog/${article.slug}`
      }))
    } else if (tab === "market" && !products.value.length) {
      const res = await productsRepository.list({ limit: 12 })
      products.value = res.items ?? []
    } else if (tab === "events" && !events.value.length) {
      const res = await eventsRepository.getCatalog()
      events.value = res.browse ?? []
    } else if (tab === "games" && !games.value.length) {
      const res = await gamesRepository.getCatalog({ tab: "latest" })
      games.value = res.items ?? []
    } else if (tab === "forums" && !forumSections.value.length) {
      const res = await forumRepository.getCatalog({})
      forumSections.value = res.sections ?? []
    } else if (tab === "movies" && !movies.value.length) {
      const mockMovies = useMockMoviesData()
      movies.value = mockMovies.movies.value ?? []
    } else if (tab === "jobs" && !jobs.value.length) {
      const res = await jobsRepository.getCatalog({ limit: 12 })
      jobs.value = res.items ?? []
    } else if (tab === "funding" && !fundingCampaigns.value.length) {
      const res = await fundingRepository.getCatalog({ tab: "browse" })
      fundingCampaigns.value = res.items ?? []
    }
  } catch (err: any) {
    error.value = err?.message || "Không thể tải dữ liệu."
  } finally {
    loading.value = false
  }
}

watch(activeTab, () => {
  loadData()
}, { immediate: true })

// Follow User
async function toggleFollowUser(user: any) {
  const userId = user.id.replace("user-", "")
  if (actionPending.value[user.id]) return
  actionPending.value[user.id] = true

  try {
    const res = await $fetch<any>("/_api/profile/action", {
      method: "POST",
      body: { action: "follow", userId },
    })
    
    const isFollowing = res.status === "followed" || res.status === "requested"
    user.badge = isFollowing ? "Following" : undefined
  } catch (err) {
    console.error("Follow error:", err)
  } finally {
    actionPending.value[user.id] = false
  }
}

// Like Page
async function toggleLikePage(page: any) {
  const slug = page.subtitle.replace("/p/", "")
  if (actionPending.value[page.id]) return
  actionPending.value[page.id] = true

  try {
    const res = await $fetch<any>(`/_api/community/pages/${slug}/like`, {
      method: "POST",
    })
    
    const isLiked = res.liked === true
    page.badge = isLiked ? "Liked" : undefined
  } catch (err) {
    console.error("Like error:", err)
  } finally {
    actionPending.value[page.id] = false
  }
}

// Join Group
async function toggleJoinGroup(group: any) {
  const slug = group.subtitle.replace("/g/", "")
  if (actionPending.value[group.id]) return
  actionPending.value[group.id] = true

  try {
    const res = await $fetch<any>(`/_api/community/groups/${slug}/join`, {
      method: "POST",
    })
    
    const isJoined = res.joined === true
    group.badge = isJoined ? "Joined" : undefined
  } catch (err) {
    console.error("Join error:", err)
  } finally {
    actionPending.value[group.id] = false
  }
}
</script>

<style scoped>
/* ── WoWonder Parity Header Banner ────────────────── */
.wo_directory_head {
  padding: 28px;
  border-radius: 28px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 255, 0.02);
  box-shadow: 0 4px 20px -2px rgba(0, 0, 100, 0.02), 0 2px 8px -2px rgba(0, 0, 0, 0.01);
  transition: all 0.3s ease;
}

.head-icon-box {
  display: flex;
  height: 54px;
  width: 54px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
}

/* Header Banner dynamic backgrounds matching categories */
.wo_directory_head.posts { background: linear-gradient(to right, #fff1f2, #ffe4e6); }
.wo_directory_head.posts .head-icon-box { background: linear-gradient(135deg, #f87171 0%, #ef4444 100%); }
.wo_directory_head.posts h1 { color: #991b1b; }

.wo_directory_head.users { background: linear-gradient(to right, #f0f9ff, #e0f2fe); }
.wo_directory_head.users .head-icon-box { background: linear-gradient(135deg, #38bdf8 0%, #0284c7 100%); }
.wo_directory_head.users h1 { color: #075985; }

.wo_directory_head.pages { background: linear-gradient(to right, #f5f3ff, #e0e7ff); }
.wo_directory_head.pages .head-icon-box { background: linear-gradient(135deg, #818cf8 0%, #4f46e5 100%); }
.wo_directory_head.pages h1 { color: #3730a3; }

.wo_directory_head.groups { background: linear-gradient(to right, #f0fdfa, #ccfbf1); }
.wo_directory_head.groups .head-icon-box { background: linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%); }
.wo_directory_head.groups h1 { color: #115e59; }

.wo_directory_head.blogs { background: linear-gradient(to right, #fdf2f8, #fce7f3); }
.wo_directory_head.blogs .head-icon-box { background: linear-gradient(135deg, #f472b6 0%, #db2777 100%); }
.wo_directory_head.blogs h1 { color: #86198f; }

.wo_directory_head.market { background: linear-gradient(to right, #fff7ed, #ffedd5); }
.wo_directory_head.market .head-icon-box { background: linear-gradient(135deg, #fb923c 0%, #ea580c 100%); }
.wo_directory_head.market h1 { color: #9a3412; }

.wo_directory_head.events { background: linear-gradient(to right, #faf5ff, #f3e8ff); }
.wo_directory_head.events .head-icon-box { background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%); }
.wo_directory_head.events h1 { color: #5b21b6; }

.wo_directory_head.games { background: linear-gradient(to right, #fdf2f8, #fce7f3); }
.wo_directory_head.games .head-icon-box { background: linear-gradient(135deg, #f472b6 0%, #db2777 100%); }
.wo_directory_head.games h1 { color: #86198f; }

.wo_directory_head.forums { background: linear-gradient(to right, #e0f7fa, #b2ebf2); }
.wo_directory_head.forums .head-icon-box { background: linear-gradient(135deg, #26c6da 0%, #00acc1 100%); }
.wo_directory_head.forums h1 { color: #006064; }

.wo_directory_head.movies { background: linear-gradient(to right, #ffebee, #ffcdd2); }
.wo_directory_head.movies .head-icon-box { background: linear-gradient(135deg, #ef5350 0%, #e53935 100%); }
.wo_directory_head.movies h1 { color: #b71c1c; }

.wo_directory_head.jobs { background: linear-gradient(to right, #f8fafc, #f1f5f9); }
.wo_directory_head.jobs .head-icon-box { background: linear-gradient(135deg, #94a3b8 0%, #475569 100%); }
.wo_directory_head.jobs h1 { color: #1e293b; }

.wo_directory_head.funding { background: linear-gradient(to right, #fdf2f8, #fce7f3); }
.wo_directory_head.funding .head-icon-box { background: linear-gradient(135deg, #f472b6 0%, #ec4899 100%); }
.wo_directory_head.funding h1 { color: #86198f; }

.wave-accent {
  position: absolute;
  right: 20px;
  bottom: -4px;
  width: 200px;
  height: auto;
  pointer-events: none;
}

/* ── Content Grid Cards ───────────────────────────── */
.directory-card {
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.05);
  border-radius: 28px;
  box-shadow: 0 4px 18px -2px rgba(0, 0, 100, 0.02), 0 2px 6px -1px rgba(0, 0, 0, 0.02);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.directory-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 30px -4px rgba(0, 0, 100, 0.06), 0 4px 12px -2px rgba(0, 0, 0, 0.03);
}

.cover-accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 80px;
  z-index: 0;
}

.hover-avatar {
  transition: transform 0.3s ease;
}

.directory-card:hover .hover-avatar {
  transform: scale(1.05);
}

/* Empty State styling */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: #ffffff;
  border: 1px solid rgba(0, 0, 0, 0.04);
  border-radius: 28px;
  text-align: center;
}

.empty-state h3 {
  margin-top: 16px;
  font-size: 16px;
  font-weight: 800;
  color: #1e293b;
}

.empty-state p {
  margin-top: 6px;
  font-size: 13px;
  color: #94a3b8;
  max-width: 24rem;
  line-height: 1.6;
}

/* Shortcut redirect widget styling */
.shortcut-icon {
  display: inline-flex;
  height: 52px;
  width: 52px;
  align-items: center;
  justify-content: center;
  border-radius: 18px;
}

.shortcut-icon.blogs { background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%); }
.shortcut-icon.market { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); }
.shortcut-icon.events { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); }
.shortcut-icon.games { background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); }
.shortcut-icon.forums { background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); }
.shortcut-icon.movies { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
.shortcut-icon.jobs { background: linear-gradient(135deg, #64748b 0%, #475569 100%); }
.shortcut-icon.funding { background: linear-gradient(135deg, #f472b6 0%, #ec4899 100%); }

.hover-scale {
  transition: transform 0.2s ease;
}

.hover-scale:hover {
  transform: scale(1.03);
}

/* Micro-Animations & Page entry effects */
.content-fade-in {
  animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

.animate-grid {
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
