import { computed } from "vue"
import { resolveI18nMessage } from "#shared-kernel/application/utils/resolveI18nMessage"

export type MovieCategoryKey =
  | "all"
  | "community"
  | "business"
  | "education"
  | "documentary"
  | "technology"

export type MovieCategory = {
  label: string
  value: MovieCategoryKey
  icon: string
}

export type MockMovie = {
  id: string
  title: string
  category: Exclude<MovieCategoryKey, "all">
  year: number
  runtime: string
  runtimeMinutes: number
  rating: number
  director: string
  summary: string
  cover: string
  backdrop: string
  accent: string
  tags: string[]
  genre: string
  country: string
  isPremiere: boolean
  isEditorsPick: boolean
  to: string
  companionTo: string
}

export type MovieCollection = {
  title: string
  description: string
  icon: string
  to: string
  accent: string
}

export type UpcomingMovie = {
  title: string
  dayLabel: string
  timeLabel: string
  formatLabel: string
  note: string
}

const defaultMovieCategories: MovieCategory[] = [
  { label: "Tất cả", value: "all", icon: "i-ph-squares-four-bold" },
  { label: "Cộng đồng", value: "community", icon: "i-ph-users-three-bold" },
  { label: "Kinh doanh", value: "business", icon: "i-ph-briefcase-bold" },
  { label: "Giáo dục", value: "education", icon: "i-ph-graduation-cap-bold" },
  { label: "Tài liệu", value: "documentary", icon: "i-ph-film-script-bold" },
  { label: "Công nghệ", value: "technology", icon: "i-ph-cpu-bold" },
]

const defaultMovies: MockMovie[] = [
  {
    id: "movie-community-recap",
    title: "Community Demo Day: Hậu trường buổi lên sóng",
    category: "community",
    year: 2025,
    runtime: "1h 48m",
    runtimeMinutes: 108,
    rating: 8.6,
    director: "VNSEEA Studio",
    summary: "Một bộ phim theo chân đội vận hành trước giờ phát sóng, cách họ chốt nội dung, giữ nhịp cộng đồng và biến một buổi demo thành trải nghiệm có nhịp rõ ràng hơn.",
    cover: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=900&q=80",
    backdrop: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1600&q=80",
    accent: "linear-gradient(135deg,#1d4ed8 0%,#60a5fa 100%)",
    tags: ["Community", "Backstage", "Live recap"],
    genre: "documentary",
    country: "vietnam",
    isPremiere: true,
    isEditorsPick: true,
    to: "/watch",
    companionTo: "/blogs",
  },
  {
    id: "movie-business-operators",
    title: "Operators After Midnight",
    category: "business",
    year: 2024,
    runtime: "1h 34m",
    runtimeMinutes: 94,
    rating: 8.2,
    director: "Minh Quân",
    summary: "Một câu chuyện về những quyết định nhỏ nhưng quyết định nhịp ship sản phẩm của team vận hành và founder trong những tuần nhiều áp lực.",
    cover: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80",
    backdrop: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80",
    accent: "linear-gradient(135deg,#ea580c 0%,#fb923c 100%)",
    tags: ["Business", "Execution", "Founder"],
    genre: "drama",
    country: "vietnam",
    isPremiere: false,
    isEditorsPick: true,
    to: "/watch",
    companionTo: "/blogs",
  },
  {
    id: "movie-education-notes",
    title: "Note Better, Learn Longer",
    category: "education",
    year: 2025,
    runtime: "52m",
    runtimeMinutes: 52,
    rating: 8.8,
    director: "Hải Nam",
    summary: "Theo chân một workshop học tập thực chiến, bộ phim biến những mẹo note-taking và ôn tập thành một hành trình dễ áp dụng hơn cho người học bận rộn.",
    cover: "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=900&q=80",
    backdrop: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80",
    accent: "linear-gradient(135deg,#0284c7 0%,#60a5fa 100%)",
    tags: ["Education", "Workshop", "Learning"],
    genre: "documentary",
    country: "vietnam",
    isPremiere: false,
    isEditorsPick: false,
    to: "/watch",
    companionTo: "/blogs",
  },
  {
    id: "movie-documentary-marketplace",
    title: "Marketplace Stories: Người bán phía sau khung hình",
    category: "documentary",
    year: 2024,
    runtime: "1h 12m",
    runtimeMinutes: 72,
    rating: 8.1,
    director: "Bảo Trâm",
    summary: "Từ ảnh sản phẩm đến cách trả lời khách, bộ phim tài liệu này gom lại những nhịp rất thật phía sau một listing trông tưởng như đơn giản.",
    cover: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=900&q=80",
    backdrop: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80",
    accent: "linear-gradient(135deg,#0369a1 0%,#38bdf8 100%)",
    tags: ["Documentary", "Seller", "Marketplace"],
    genre: "documentary",
    country: "vietnam",
    isPremiere: false,
    isEditorsPick: true,
    to: "/watch",
    companionTo: "/products",
  },
  {
    id: "movie-tech-shipping",
    title: "Ship Faster Without Breaking the Flow",
    category: "technology",
    year: 2025,
    runtime: "58m",
    runtimeMinutes: 58,
    rating: 8.9,
    director: "Đức Minh",
    summary: "Bộ phim công nghệ đi qua những thay đổi nhỏ trong tooling, testing và fallback contract để một app lớn bớt gãy hơn khi rollout nhiều route mới.",
    cover: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
    backdrop: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80",
    accent: "linear-gradient(135deg,#7c3aed 0%,#a78bfa 100%)",
    tags: ["Technology", "Frontend", "SSR"],
    genre: "documentary",
    country: "vietnam",
    isPremiere: true,
    isEditorsPick: true,
    to: "/watch",
    companionTo: "/blogs",
  },
]

const defaultCollections: MovieCollection[] = [
  {
    title: "Từ phim sang Watch",
    description: "Mở tiếp khu video để xem các phiên nội dung gần với tuyển tập phim hiện tại.",
    icon: "i-ph-play-circle-bold",
    to: "/watch",
    accent: "linear-gradient(135deg,#2563eb 0%,#60a5fa 100%)",
  },
  {
    title: "Đọc thêm hậu trường",
    description: "Sang blog để xem các phân tích dài hơn đứng sau mỗi tựa phim nổi bật.",
    icon: "i-ph-newspaper-bold",
    to: "/blogs",
    accent: "linear-gradient(135deg,#7c3aed 0%,#c084fc 100%)",
  },
  {
    title: "Theo nhịp live",
    description: "Chuyển sang live để bắt các phiên đang phát và nối mạch từ phim sang trò chuyện trực tiếp.",
    icon: "i-ph-broadcast-bold",
    to: "/live",
    accent: "linear-gradient(135deg,#0369a1 0%,#38bdf8 100%)",
  },
]

const defaultUpcoming: UpcomingMovie[] = [
  {
    title: "Phiên biên tập cộng đồng",
    dayLabel: "Thứ Sáu",
    timeLabel: "20:00",
    formatLabel: "Premiere · 4K",
    note: "Buổi chiếu tập trung vào hậu trường community demo và phần hỏi đáp sau suất chiếu.",
  },
  {
    title: "Góc nhìn founder sau sản phẩm",
    dayLabel: "Thứ Bảy",
    timeLabel: "19:30",
    formatLabel: "Screening · Live Q&A",
    note: "Một suất kết hợp phim ngắn và thảo luận trực tiếp về quyết định vận hành sản phẩm.",
  },
  {
    title: "Tech review cuối tuần",
    dayLabel: "Chủ Nhật",
    timeLabel: "21:00",
    formatLabel: "Watch party",
    note: "Phiên xem chung cho các tựa phim thiên về tooling, frontend và nhịp ship sản phẩm.",
  },
]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)

const isMovieCategory = (value: unknown): value is MovieCategory =>
  isRecord(value)
  && typeof value.label === "string"
  && typeof value.value === "string"
  && typeof value.icon === "string"

const isMockMovie = (value: unknown): value is MockMovie =>
  isRecord(value)
  && typeof value.id === "string"
  && typeof value.title === "string"
  && typeof value.category === "string"
  && typeof value.year === "number"
  && typeof value.runtime === "string"
  && typeof value.runtimeMinutes === "number"
  && typeof value.rating === "number"
  && typeof value.director === "string"
  && typeof value.summary === "string"
  && typeof value.cover === "string"
  && typeof value.backdrop === "string"
  && typeof value.accent === "string"
  && Array.isArray(value.tags)
  && value.tags.every(tag => typeof tag === "string")
  && typeof value.genre === "string"
  && typeof value.country === "string"
  && typeof value.isPremiere === "boolean"
  && typeof value.isEditorsPick === "boolean"
  && typeof value.to === "string"
  && typeof value.companionTo === "string"

const isMovieCollection = (value: unknown): value is MovieCollection =>
  isRecord(value)
  && typeof value.title === "string"
  && typeof value.description === "string"
  && typeof value.icon === "string"
  && typeof value.to === "string"
  && typeof value.accent === "string"

const isUpcomingMovie = (value: unknown): value is UpcomingMovie =>
  isRecord(value)
  && typeof value.title === "string"
  && typeof value.dayLabel === "string"
  && typeof value.timeLabel === "string"
  && typeof value.formatLabel === "string"
  && typeof value.note === "string"

export const useMockMoviesData = () => {
  const { tm, rt } = useI18n()
  const localized = <T>(key: string) =>
    resolveI18nMessage(tm(key), message => rt(message as never)) as T

  const categories = computed<MovieCategory[]>(() => {
    const value = localized<unknown>("pages.moviesPage.categories")
    return Array.isArray(value) && value.length > 0 && value.every(isMovieCategory)
      ? value
      : defaultMovieCategories
  })

  const movies = computed<MockMovie[]>(() => {
    const value = localized<unknown>("pages.moviesPage.movies")
    return Array.isArray(value) && value.length > 0 && value.every(isMockMovie)
      ? value
      : defaultMovies
  })

  const collections = computed<MovieCollection[]>(() => {
    const value = localized<unknown>("pages.moviesPage.collections")
    return Array.isArray(value) && value.length > 0 && value.every(isMovieCollection)
      ? value
      : defaultCollections
  })

  const upcoming = computed<UpcomingMovie[]>(() => {
    const value = localized<unknown>("pages.moviesPage.upcoming")
    return Array.isArray(value) && value.length > 0 && value.every(isUpcomingMovie)
      ? value
      : defaultUpcoming
  })

  return {
    categories,
    movies,
    collections,
    upcoming,
  }
}

export const formatMovieNumber = (value: number, locale = "vi-VN") =>
  new Intl.NumberFormat(locale, { notation: value >= 10000 ? "compact" : "standard" }).format(value)
