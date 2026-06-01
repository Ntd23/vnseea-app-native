<!-- English description: Full-screen map-first nearby search page for users and pages. -->

<template>
  <section ref="pageRoot" class="nearby-map-page">
    <ClientOnly v-if="canUseNearbyMap">
      <NearbySearchMap
        class="nearby-map-page__map"
        :origin="origin"
        :items="mapItems"
        :selected-item-id="selectedItemId"
        :origin-focus-key="originFocusKey"
        :route-target-item="routeTargetItem"
        :pinned-page-ids="pinnedPageIds"
        :zoom-in-key="mapZoomInKey"
        :zoom-out-key="mapZoomOutKey"
        @select="selectItem"
        @directions="requestDirections"
        @route-error="handleRouteError"
      />
      <template #fallback>
        <div class="nearby-map-page__fallback" />
      </template>
    </ClientOnly>

    <div v-if="canUseNearbyMap" class="nearby-map-page__topbar">
      <div class="nearby-map-page__search">
        <div class="nearby-map-page__search-field">
          <UIcon name="i-ph-magnifying-glass-duotone" class="nearby-map-page__search-icon" />
          <input
            v-model="searchText"
            class="nearby-map-page__search-input"
            type="search"
            :placeholder="searchPlaceholder"
            autocomplete="off"
            @focus="handleSearchFocus"
            @blur="handleSearchBlur"
            @keydown.enter.prevent="handleSearchEnter"
          >
          <UIcon
            v-if="suggestionsLoading || googlePlacesLoading"
            name="i-ph-spinner-gap-duotone"
            class="nearby-map-page__search-loading nearby-map-page__spin"
          />
        </div>

        <div v-if="showSuggestionPanel" class="nearby-map-page__suggestions">
          <button
            v-for="item in suggestionOptions"
            :key="item.id"
            type="button"
            class="nearby-map-page__suggestion"
            @mousedown.prevent="handleSuggestionSelect(item)"
          >
              <span class="nearby-map-page__suggestion-avatar">
                <img v-if="item.raw?.avatarUrl" :src="item.raw.avatarUrl" :alt="item.label">
                <UIcon v-else :name="item.kind === 'place' ? 'i-ph-map-pin-fill' : item.raw?.type === 'page' ? 'i-ph-flag-fill' : 'i-ph-user-circle-fill'" />
              </span>
              <span class="nearby-map-page__suggestion-copy">
                <span class="nearby-map-page__suggestion-title">{{ item.label }}</span>
                <span class="nearby-map-page__suggestion-meta">
                  {{ item.kind === "place" ? "Google Maps" : item.raw?.type === "page" ? "Trang" : "Người dùng" }} · {{ item.distanceLabel }}
                </span>
              </span>
          </button>
          <div v-if="suggestionOptions.length === 0" class="nearby-map-page__suggestion-empty-wrap">
            <span class="nearby-map-page__suggestion-empty">{{ suggestionEmptyText }}</span>
          </div>
        </div>
      </div>

    </div>

    <div v-if="canUseNearbyMap" class="nearby-map-page__map-controls" aria-label="Map controls">
      <button type="button" class="nearby-map-page__map-control" aria-label="Toan man hinh" @click="toggleMapFullscreen">
        <UIcon name="i-ph-corners-out-bold" />
      </button>
      <button type="button" class="nearby-map-page__map-control" aria-label="Phong to" @click="zoomMapIn">
        <UIcon name="i-ph-plus-bold" />
      </button>
      <button type="button" class="nearby-map-page__map-control" aria-label="Thu nho" @click="zoomMapOut">
        <UIcon name="i-ph-minus-bold" />
      </button>
      <button type="button" class="nearby-map-page__map-control nearby-map-page__map-control--primary" aria-label="Vi tri cua toi" @click="handleMyLocationClick">
        <UIcon name="i-ph-crosshair-fill" />
      </button>
    </div>

    <div v-if="canUseNearbyMap" class="nearby-map-page__bottom">
      <div class="nearby-map-page__panel">
        <div v-if="routeErrorMessage" class="nearby-map-page__route-error">
          <Icon name="i-ph-warning-circle-duotone" />
          <span>{{ routeErrorMessage }}</span>
          <button type="button" @click="clearRoute">Ẩn</button>
        </div>

        <div v-if="displayLoading" class="nearby-map-page__state">
          <Icon name="i-ph-spinner-gap-duotone" class="nearby-map-page__spin" />
          <span>Đang tải kết quả gần bạn...</span>
        </div>

        <div v-else-if="errorMessage" class="nearby-map-page__state nearby-map-page__state--error">
          <Icon name="i-ph-warning-circle-duotone" />
          <span>{{ errorMessage }}</span>
          <button type="button" @click="refresh">Thử lại</button>
        </div>

        <div v-else-if="!hasResults" class="nearby-map-page__empty">
          <Icon name="i-ph-map-pin-duotone" />
          <div>
            <h2>{{ emptyTitle }}</h2>
            <p>{{ emptyDescription }}</p>
          </div>
          <NuxtLink v-if="needsLocation" :to="appRoutes.settingsPage('profile')" class="nearby-map-page__empty-action">
            Cập nhật địa chỉ
          </NuxtLink>
          <button v-else type="button" class="nearby-map-page__empty-action" @click="clearSearch">
            Xóa bộ lọc
          </button>
        </div>

        <div v-else class="nearby-map-page__cards" aria-label="Nearby results">
          <NearbyResultCard
            v-for="item in cardItems"
            :key="item.id"
            :item="item"
            :active="selectedItemId === item.id || (!selectedItemId && item.id === cardItems[0]?.id)"
            @select="selectItem"
            @focus-origin="focusOrigin"
            @pin="togglePinnedPage"
            @directions="requestDirections"
          />
        </div>
      </div>
    </div>

    <div v-else class="nearby-map-page__permission">
      <div class="nearby-map-page__permission-card">
        <span class="nearby-map-page__permission-icon">
          <UIcon
            :name="locationPermissionState === 'checking'
              ? 'i-ph-spinner-gap-duotone'
              : locationPermissionState === 'denied' || locationPermissionState === 'unsupported'
                ? 'i-ph-warning-circle-duotone'
                : 'i-ph-map-pin-line-duotone'"
            :class="{ 'nearby-map-page__spin': locationPermissionState === 'checking' }"
          />
        </span>
        <h1>{{ locationPermissionTitle }}</h1>
        <p>{{ locationPermissionDescription }}</p>
        <div v-if="locationPermissionState === 'denied'" class="nearby-map-page__permission-buttons">
          <button
            type="button"
            class="nearby-map-page__permission-action"
            @click="requestLocationPermission"
          >
            <UIcon name="i-ph-arrow-counter-clockwise-bold" />
            <span>Đã bật lại quyền, Thử lại</span>
          </button>

          <button
            type="button"
            class="nearby-map-page__guide-toggle"
            :class="{ 'nearby-map-page__guide-toggle--active': showGuide }"
            @click="showGuide = !showGuide"
          >
            <UIcon :name="showGuide ? 'i-ph-eye-slash-bold' : 'i-ph-info-bold'" />
            <span>{{ showGuide ? 'Ẩn hướng dẫn bật vị trí' : 'Hướng dẫn cách bật vị trí' }}</span>
          </button>
        </div>

        <!-- Hướng dẫn chi tiết thiết kế Premium -->
        <div v-if="locationPermissionState === 'denied' && showGuide" class="nearby-map-page__guide-card">
          <!-- Guide Tabs -->
          <div class="nearby-map-page__guide-tabs">
            <button
              type="button"
              class="nearby-map-page__guide-tab"
              :class="{ 'nearby-map-page__guide-tab--active': guideTab === 'ios' }"
              @click="guideTab = 'ios'"
            >
              <UIcon name="i-ph-apple-logo-fill" />
              <span>iOS / Safari</span>
            </button>
            <button
              type="button"
              class="nearby-map-page__guide-tab"
              :class="{ 'nearby-map-page__guide-tab--active': guideTab === 'android' }"
              @click="guideTab = 'android'"
            >
              <UIcon name="i-ph-android-logo-fill" />
              <span>Android / Chrome</span>
            </button>
            <button
              type="button"
              class="nearby-map-page__guide-tab"
              :class="{ 'nearby-map-page__guide-tab--active': guideTab === 'desktop' }"
              @click="guideTab = 'desktop'"
            >
              <UIcon name="i-ph-desktop-fill" />
              <span>Máy tính</span>
            </button>
          </div>

          <!-- Guide Steps Content -->
          <div class="nearby-map-page__guide-content">
            <!-- iOS Guide -->
            <div v-if="guideTab === 'ios'" class="nearby-map-page__guide-steps">
              <div class="nearby-map-page__step">
                <div class="nearby-map-page__step-badge nearby-map-page__step-badge--ios">1</div>
                <div class="nearby-map-page__step-text">Mở ứng dụng <strong>Cài đặt (Settings)</strong> trên màn hình chính iPhone/iPad.</div>
              </div>
              <div class="nearby-map-page__step">
                <div class="nearby-map-page__step-badge nearby-map-page__step-badge--ios">2</div>
                <div class="nearby-map-page__step-text">Cuộn xuống dưới tìm và nhấp chọn <strong>Safari</strong> hoặc <strong>Chrome</strong> (trình duyệt bạn đang dùng).</div>
              </div>
              <div class="nearby-map-page__step">
                <div class="nearby-map-page__step-badge nearby-map-page__step-badge--ios">3</div>
                <div class="nearby-map-page__step-text">Tìm đến mục <strong>Vị trí (Location)</strong> -> Chuyển sang chọn <strong>Hỏi</strong> hoặc <strong>Cho phép (Allow)</strong>.</div>
              </div>
            </div>

            <!-- Android Guide -->
            <div v-if="guideTab === 'android'" class="nearby-map-page__guide-steps">
              <div class="nearby-map-page__step">
                <div class="nearby-map-page__step-badge nearby-map-page__step-badge--android">1</div>
                <div class="nearby-map-page__step-text">Vào <strong>Cài đặt (Settings)</strong> trên điện thoại -> Chọn mục <strong>Ứng dụng / Quản lý ứng dụng (Apps)</strong>.</div>
              </div>
              <div class="nearby-map-page__step">
                <div class="nearby-map-page__step-badge nearby-map-page__step-badge--android">2</div>
                <div class="nearby-map-page__step-text">Tìm kiếm và chọn ứng dụng <strong>Google</strong> hoặc trình duyệt bạn đang dùng (ví dụ: <strong>Chrome, Cốc Cốc</strong>).</div>
              </div>
              <div class="nearby-map-page__step">
                <div class="nearby-map-page__step-badge nearby-map-page__step-badge--android">3</div>
                <div class="nearby-map-page__step-text">Nhấp vào <strong>Quyền ứng dụng (Permissions)</strong> -> Chọn <strong>Vị trí (Location)</strong> -> Chọn <strong>Cho phép khi dùng ứng dụng (Allow)</strong>.</div>
              </div>
            </div>

            <!-- Desktop Guide -->
            <div v-if="guideTab === 'desktop'" class="nearby-map-page__guide-steps">
              <div class="nearby-map-page__step">
                <div class="nearby-map-page__step-badge nearby-map-page__step-badge--desktop">1</div>
                <div class="nearby-map-page__step-text">Nhấp chuột vào biểu tượng <strong>🔒 (ổ khóa)</strong> hoặc biểu tượng <strong>Cài đặt trang web</strong> ở bên trái thanh địa chỉ URL.</div>
              </div>
              <div class="nearby-map-page__step">
                <div class="nearby-map-page__step-badge nearby-map-page__step-badge--desktop">2</div>
                <div class="nearby-map-page__step-text">Tìm mục <strong>Vị trí (Location)</strong> -> Chuyển thanh gạt sang <strong>Bật</strong> hoặc chọn <strong>Cho phép (Allow)</strong>.</div>
              </div>
              <div class="nearby-map-page__step">
                <div class="nearby-map-page__step-badge nearby-map-page__step-badge--desktop">3</div>
                <div class="nearby-map-page__step-text">Sau khi thiết lập xong, nhấp nút <strong>Thử lại</strong> ở phía trên để tải lại bản đồ.</div>
              </div>
            </div>
          </div>
        </div>
        <button
          v-else-if="locationPermissionState === 'unsupported'"
          type="button"
          class="nearby-map-page__permission-action"
          disabled
        >
          <UIcon name="i-ph-x-circle-bold" />
          <span>Không hỗ trợ</span>
        </button>
        <button
          v-else
          type="button"
          class="nearby-map-page__permission-action"
          :disabled="locationPermissionState === 'checking'"
          @click="requestLocationPermission"
        >
          <UIcon name="i-ph-crosshair-fill" />
          <span>Bật quyền chia sẻ vị trí</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import NearbyResultCard from "../components/NearbyResultCard.vue"
import NearbySearchMap from "../components/NearbySearchMap.vue"
import { useSearchNearbyPageVM } from "../../application/view-models/useSearchNearbyPageVM"
import type { NearbySearchItem } from "../../domain/types/search-nearby.types"

type NearbySuggestionOption = {
  id: string
  label: string
  raw: NearbySearchItem | null
  distanceLabel: string
  kind: "nearby" | "place"
  placeId?: string
}

type GooglePlaceSuggestion = {
  id: string
  label: string
  secondaryText: string
  placeId: string
}

type LocationPermissionState = "checking" | "granted" | "denied" | "unsupported"

const {
  appRoutes,
  searchText,
  selectedItemId,
  routeTargetItem,
  routeErrorMessage,
  pinnedPageIds,
  originFocusKey,
  origin,
  mapItems,
  cardItems,
  suggestions,
  suggestionsLoading,
  displayLoading,
  errorMessage,
  needsLocation,
  hasResults,
  emptyTitle,
  emptyDescription,
  refresh,
  refreshSuggestions,
  selectItem,
  selectSuggestion,
  togglePinnedPage,
  requestDirections,
  clearRoute,
  handleRouteError,
  focusOrigin,
  focusDeviceLocation,
  clearSearch,
} = useSearchNearbyPageVM()

const searchPlaceholder = "Tìm theo tên, địa chỉ Google hoặc place_id..."

const googlePlaceSuggestions = ref<GooglePlaceSuggestion[]>([])
const googlePlacesLoading = ref(false)
const autocompleteService = shallowRef<google.maps.places.AutocompleteService | null>(null)
const placesService = shallowRef<google.maps.places.PlacesService | null>(null)
const googlePlaceRequestId = ref(0)
const isSuggestionPanelOpen = ref(false)
const pageRoot = ref<HTMLElement | null>(null)
const mapZoomInKey = ref(0)
const mapZoomOutKey = ref(0)
const locationPermissionState = ref<LocationPermissionState>("checking")
const showGuide = ref(false)
const guideTab = ref<"ios" | "android" | "desktop">("ios")
let searchBlurTimer: ReturnType<typeof setTimeout> | null = null

const { load: loadGoogleMaps } = useScriptGoogleMaps({
  libraries: ["places"],
  trigger: "manual",
})

const suggestionOptions = computed<NearbySuggestionOption[]>(() =>
  [
    ...suggestions.value.map(item => ({
      id: item.id,
      label: item.title,
      raw: item,
      distanceLabel: formatDistance(item.distanceMeters),
      kind: "nearby" as const,
    })),
    ...googlePlaceSuggestions.value.map(item => ({
      id: item.id,
      label: item.label,
      raw: null,
      distanceLabel: item.secondaryText,
      kind: "place" as const,
      placeId: item.placeId,
    })),
  ],
)

const showSuggestionPanel = computed(() =>
  isSuggestionPanelOpen.value
  && (searchText.value.trim().length > 0 || suggestionOptions.value.length > 0),
)
const canUseNearbyMap = computed(() => locationPermissionState.value === "granted")
const locationPermissionTitle = computed(() => {
  if (locationPermissionState.value === "checking") return "Đang xin quyền chia sẻ vị trí"
  if (locationPermissionState.value === "denied") return "Quyền vị trí đang bị chặn"
  if (locationPermissionState.value === "unsupported") return "Trình duyệt không hỗ trợ"
  return "Vui lòng bật quyền chia sẻ vị trí"
})
const locationPermissionDescription = computed(() => {
  if (locationPermissionState.value === "unsupported") {
    return "Trình duyệt này không hỗ trợ lấy vị trí hiện tại, nên chưa thể dùng chức năng tìm kiếm quanh bạn."
  }

  if (locationPermissionState.value === "checking") {
    return "VNSEEA cần vị trí hiện tại để hiển thị bản đồ và những người, trang ở gần bạn."
  }

  if (locationPermissionState.value === "denied") {
    return "Bạn đã chặn quyền vị trí của trang web này. Vui lòng cấp lại quyền để có thể tiếp tục trải nghiệm tính năng tìm kiếm xung quanh."
  }

  return "VNSEEA cần vị trí hiện tại để hiển thị bản đồ và những người, trang ở gần bạn. Nhấn nút bên dưới để cấp quyền."
})

const suggestionEmptyText = computed(() => {
  if (suggestionsLoading.value) return "Đang tìm gợi ý..."
  if (searchText.value.trim().length < 3) return "Nhập tối thiểu 3 ký tự."

  return "Không có user/page gần bạn."
})

function formatDistance(meters: number | null) {
  if (meters === null) return "-- km"
  if (meters < 1000) return `${meters} m`

  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`
}

function calculateDistanceMeters(lat: number, lng: number) {
  if (origin.value.lat === null || origin.value.lng === null) {
    return null
  }

  const earthRadiusMeters = 6371000
  const toRad = (value: number) => value * Math.PI / 180
  const latFrom = toRad(origin.value.lat)
  const lngFrom = toRad(origin.value.lng)
  const latTo = toRad(lat)
  const lngTo = toRad(lng)
  const latDelta = latTo - latFrom
  const lngDelta = lngTo - lngFrom
  const angle = 2 * Math.asin(Math.sqrt(
    Math.sin(latDelta / 2) ** 2
    + Math.cos(latFrom) * Math.cos(latTo) * Math.sin(lngDelta / 2) ** 2,
  ))

  return Math.round(earthRadiusMeters * angle)
}

function handleSuggestionSelect(option: NearbySuggestionOption | null) {
  if (!option) {
    return
  }

  isSuggestionPanelOpen.value = false

  if (option.kind === "place" && option.placeId) {
    void selectGooglePlace(option)
    return
  }

  if (option.raw) {
    selectSuggestion(option.raw)
  }
}

function handleSearchFocus() {
  if (searchBlurTimer) {
    clearTimeout(searchBlurTimer)
    searchBlurTimer = null
  }

  isSuggestionPanelOpen.value = true
  void refreshSuggestions()
  void refreshGooglePlaceSuggestions()
}

function handleSearchBlur() {
  searchBlurTimer = setTimeout(() => {
    isSuggestionPanelOpen.value = false
  }, 120)
}

function handleSearchEnter() {
  const firstOption = suggestionOptions.value[0]

  if (firstOption) {
    handleSuggestionSelect(firstOption)
  }
}

function zoomMapIn() {
  mapZoomInKey.value += 1
}

function zoomMapOut() {
  mapZoomOutKey.value += 1
}

async function toggleMapFullscreen() {
  if (!import.meta.client || !pageRoot.value) {
    return
  }

  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }

    await pageRoot.value.requestFullscreen()
  }
  catch {
    handleRouteError("Khong the bat che do toan man hinh cho ban do.")
  }
}

async function requestLocationPermission() {
  if (!import.meta.client || !navigator.geolocation) {
    locationPermissionState.value = "unsupported"
    return
  }

  try {
    const permission = await navigator.permissions?.query?.({ name: "geolocation" as PermissionName })

    if (permission?.state === "denied") {
      locationPermissionState.value = "denied"
    }
  }
  catch {
    // Some mobile browsers do not support the Permissions API; getCurrentPosition will still trigger the prompt.
  }

  if (locationPermissionState.value !== "granted") {
    locationPermissionState.value = "checking"
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      locationPermissionState.value = "granted"
      focusDeviceLocation(position.coords.latitude, position.coords.longitude)
    },
    () => {
      locationPermissionState.value = "denied"
    },
    {
      enableHighAccuracy: true,
      maximumAge: 30000,
      timeout: 10000,
    },
  )
}

function handleMyLocationClick() {
  void requestLocationPermission()
}

async function ensureGooglePlacesServices() {
  if (autocompleteService.value && placesService.value) {
    return true
  }

  if (!import.meta.client) {
    return false
  }

  await loadGoogleMaps()

  const maps = window.google?.maps
  if (!maps?.places?.AutocompleteService || !maps.places.PlacesService) {
    return false
  }

  autocompleteService.value = new maps.places.AutocompleteService()
  placesService.value = new maps.places.PlacesService(document.createElement("div"))

  return true
}

async function refreshGooglePlaceSuggestions() {
  const query = searchText.value.trim()
  const requestId = googlePlaceRequestId.value + 1
  googlePlaceRequestId.value = requestId

  if (query.length < 3) {
    googlePlaceSuggestions.value = []
    googlePlacesLoading.value = false
    return
  }

  try {
    googlePlacesLoading.value = true
    const ready = await ensureGooglePlacesServices()
    if (!ready || !autocompleteService.value) {
      googlePlaceSuggestions.value = []
      return
    }

    autocompleteService.value.getPlacePredictions(
      {
        input: query,
        location: origin.value.lat !== null && origin.value.lng !== null
          ? new window.google.maps.LatLng(origin.value.lat, origin.value.lng)
          : undefined,
        radius: origin.value.lat !== null && origin.value.lng !== null ? 25000 : undefined,
      },
      (predictions, status) => {
        if (requestId !== googlePlaceRequestId.value) {
          return
        }

        const okStatus = window.google?.maps?.places?.PlacesServiceStatus?.OK
        const predictedPlaces = status === okStatus
          ? (predictions ?? []).slice(0, 5).map(prediction => ({
              id: `place-${prediction.place_id || prediction.description}`,
              label: prediction.structured_formatting?.main_text || prediction.description,
              secondaryText: prediction.structured_formatting?.secondary_text || prediction.description,
              placeId: prediction.place_id || prediction.description,
            }))
          : []
        const looksLikePlaceId = query.length >= 8 && !/\s/.test(query)
        googlePlaceSuggestions.value = looksLikePlaceId && !predictedPlaces.some(item => item.placeId === query)
          ? [
              {
                id: `place-${query}`,
                label: query,
                secondaryText: "Google place_id",
                placeId: query,
              },
              ...predictedPlaces,
            ].slice(0, 5)
          : predictedPlaces
      },
    )
  }
  catch {
    googlePlaceSuggestions.value = []
  }
  finally {
    if (requestId === googlePlaceRequestId.value) {
      googlePlacesLoading.value = false
    }
  }
}

async function selectGooglePlace(option: NearbySuggestionOption) {
  if (!option.placeId) {
    return
  }

  try {
    googlePlacesLoading.value = true
    const ready = await ensureGooglePlacesServices()
    if (!ready || !placesService.value) {
      googlePlacesLoading.value = false
      return
    }

    placesService.value.getDetails(
      {
        placeId: option.placeId,
        fields: ["formatted_address", "geometry", "place_id", "name"],
      },
      (place, status) => {
        const okStatus = window.google?.maps?.places?.PlacesServiceStatus?.OK
        googlePlacesLoading.value = false

        if (status !== okStatus || !place?.geometry?.location) {
          return
        }

        const title = String(place.name || option.label || place.formatted_address || "").trim()
        const address = String(place.formatted_address || option.distanceLabel || title).trim()
        const lat = place.geometry.location.lat()
        const lng = place.geometry.location.lng()
        const placeItem: NearbySearchItem = {
          id: `place-${place.place_id || option.placeId}`,
          backendId: 0,
          type: "place",
          title,
          subtitle: "Google Maps",
          description: "",
          locationLabel: address,
          avatarUrl: "",
          href: `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(String(place.place_id || option.placeId))}&query=${encodeURIComponent(address)}`,
          lat,
          lng,
          distanceMeters: calculateDistanceMeters(lat, lng),
        }

        googlePlaceSuggestions.value = []
        selectSuggestion(placeItem)
        requestDirections(placeItem)
      },
    )
  }
  catch {
    googlePlacesLoading.value = false
  }
}

watch(
  () => searchText.value.trim(),
  () => {
    void refreshGooglePlaceSuggestions()
  },
)

onMounted(() => {
  void requestLocationPermission()
})

onBeforeUnmount(() => {
  if (searchBlurTimer) {
    clearTimeout(searchBlurTimer)
  }
})
</script>

<style scoped>
.nearby-map-page {
  position: relative;
  min-height: calc(100dvh - 64px);
  overflow: hidden;
  background: var(--color-secondary-200);
}

.nearby-map-page:fullscreen {
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  background: var(--color-secondary-200);
}

.nearby-map-page__map,
.nearby-map-page__fallback {
  position: absolute;
  inset: 0;
}

.nearby-map-page__permission {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  overflow-y: auto;
  background:
    linear-gradient(color-mix(in srgb, var(--color-secondary-400) 16%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--color-secondary-400) 16%, transparent) 1px, transparent 1px),
    var(--bg-base);
  background-size: 44px 44px;
  padding: 40px 20px;
}

.nearby-map-page__permission-card {
  display: grid;
  width: min(100%, 520px);
  justify-items: center;
  gap: 14px;
  border: 1px solid var(--border-default);
  border-radius: 28px;
  background: #fff;
  box-shadow: var(--shadow-xl);
  padding: 34px 28px;
  text-align: center;
}

.nearby-map-page__permission-icon {
  display: inline-flex;
  width: 62px;
  height: 62px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--bg-surface-active);
  color: var(--text-link);
}

.nearby-map-page__permission-icon svg {
  width: 30px;
  height: 30px;
}

.nearby-map-page__permission-card h1 {
  color: var(--text-primary);
  font-size: 22px;
  font-weight: var(--weight-extrabold);
  line-height: 1.2;
}

.nearby-map-page__permission-card p {
  max-width: 430px;
  color: var(--text-secondary);
  font-size: var(--text-body);
  font-weight: var(--weight-semibold);
  line-height: 1.55;
}

.nearby-map-page__permission-action {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 0;
  border-radius: 999px;
  background: var(--bg-brand);
  color: var(--text-inverse);
  cursor: pointer;
  font-size: var(--text-body);
  font-weight: var(--weight-extrabold);
  padding: 0 20px;
}

.nearby-map-page__permission-action:disabled {
  cursor: wait;
  opacity: 0.7;
}

.nearby-map-page__permission-action svg {
  width: 19px;
  height: 19px;
}

.nearby-map-page__fallback {
  background:
    linear-gradient(color-mix(in srgb, var(--color-secondary-400) 18%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--color-secondary-400) 18%, transparent) 1px, transparent 1px),
    var(--bg-base);
  background-size: 44px 44px;
}

.nearby-map-page__topbar {
  position: absolute;
  left: 50%;
  top: 18px;
  z-index: 30;
  display: flex;
  width: min(100% - 32px, 720px);
  transform: translateX(-50%);
  gap: 12px;
}

.nearby-map-page__search {
  position: relative;
  z-index: 31;
  min-width: 0;
  flex: 1;
}

.nearby-map-page__search-field {
  display: flex;
  width: 100%;
  min-width: 0;
  height: 58px;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border-default);
  border-radius: 999px;
  background: #fff;
  box-shadow: var(--shadow-lg);
  padding: 0 18px;
}

.nearby-map-page__search-input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font-size: var(--text-body);
  font-weight: var(--weight-extrabold);
}

.nearby-map-page__search-input::placeholder {
  color: var(--text-secondary);
}

.nearby-map-page__search-input::-webkit-search-cancel-button {
  display: none;
}

.nearby-map-page__search-icon,
.nearby-map-page__search-loading {
  flex: 0 0 auto;
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
}

.nearby-map-page__suggestions {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 40;
  display: grid;
  max-height: min(360px, calc(100dvh - 116px));
  overflow-y: auto;
  border: 1px solid var(--border-default);
  border-radius: 22px;
  background: #fff;
  box-shadow: var(--shadow-xl);
  padding: 8px;
}

.nearby-map-page__suggestion {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  min-width: 0;
  border: 0;
  border-radius: 16px;
  background: transparent;
  cursor: pointer;
  font: inherit;
  padding: 8px;
  text-align: left;
}

.nearby-map-page__suggestion:hover {
  background: var(--bg-surface-active);
}

.nearby-map-page__suggestion-avatar {
  display: inline-flex;
  width: 38px;
  height: 38px;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  background: var(--bg-surface-active);
  color: var(--text-link);
}

.nearby-map-page__suggestion-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.nearby-map-page__suggestion-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}

.nearby-map-page__suggestion-title,
.nearby-map-page__suggestion-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nearby-map-page__suggestion-title {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: var(--weight-extrabold);
}

.nearby-map-page__suggestion-meta {
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: var(--weight-semibold);
}

.nearby-map-page__suggestion-empty {
  display: inline-flex;
  padding: 8px 10px;
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: var(--weight-semibold);
}

.nearby-map-page__suggestion-empty-wrap {
  display: flex;
}

.nearby-map-page__location-button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--bg-surface) 94%, transparent);
  box-shadow: var(--shadow-lg);
  color: var(--text-link);
  cursor: pointer;
  font-size: var(--text-body);
  font-weight: var(--weight-extrabold);
  padding: 0 20px;
}

.nearby-map-page__location-icon {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
}

.nearby-map-page__map-controls {
  position: absolute;
  top: 50%;
  right: 18px;
  z-index: 20;
  display: grid;
  gap: 10px;
  transform: translateY(-50%);
}

.nearby-map-page__map-control {
  display: inline-flex;
  width: 46px;
  height: 46px;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-default);
  border-radius: 999px;
  background: #fff;
  box-shadow: var(--shadow-lg);
  color: var(--text-primary);
  cursor: pointer;
}

.nearby-map-page__map-control:hover {
  color: var(--text-link);
}

.nearby-map-page__map-control svg {
  width: 20px;
  height: 20px;
}

.nearby-map-page__map-control--primary {
  background: var(--bg-brand);
  color: var(--text-inverse);
}

.nearby-map-page__map-control--primary:hover {
  color: var(--text-inverse);
}

.nearby-map-page__bottom {
  position: absolute;
  bottom: 20px;
  left: 50%;
  z-index: 8;
  width: min(100% - 32px, 1320px);
  transform: translateX(-50%);
}

.nearby-map-page__panel {
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xl);
  background: color-mix(in srgb, var(--bg-muted) 88%, transparent);
  box-shadow: var(--shadow-xl);
  padding: 18px;
}

.nearby-map-page__filters {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 260px) auto;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.nearby-map-page__tabs {
  display: flex;
  min-width: 0;
  gap: 8px;
  overflow-x: auto;
}

.nearby-map-page__tab,
.nearby-map-page__count,
.nearby-map-page__distance {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--bg-surface) 90%, transparent);
  color: var(--color-secondary-600);
  font-size: var(--text-caption);
  font-weight: var(--weight-extrabold);
}

.nearby-map-page__tab {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  padding: 9px 12px;
  white-space: nowrap;
}

.nearby-map-page__tab--active {
  border-color: var(--border-strong);
  background: var(--bg-surface-active);
  color: var(--text-link);
}

.nearby-map-page__distance {
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
}

.nearby-map-page__distance input {
  min-width: 0;
  accent-color: var(--bg-brand);
}

.nearby-map-page__count {
  padding: 10px 14px;
  white-space: nowrap;
}

.nearby-map-page__cards {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  padding: 2px;
  scroll-snap-type: x proximity;
}

.nearby-map-page__cards > * {
  flex: 0 0 100%;
  scroll-snap-align: center;
}

.nearby-map-page__state,
.nearby-map-page__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 130px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--bg-surface) 86%, transparent);
  color: var(--color-secondary-600);
  font-size: var(--text-body);
  font-weight: var(--weight-extrabold);
  padding: 18px;
  text-align: center;
}

.nearby-map-page__route-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  border: 1px solid color-mix(in srgb, var(--text-danger) 22%, transparent);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--bg-surface) 92%, transparent);
  color: var(--text-danger);
  font-size: 13px;
  font-weight: var(--weight-bold);
  padding: 10px 12px;
}

.nearby-map-page__route-error button {
  margin-left: auto;
  border: 0;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--text-danger) 8%, transparent);
  color: var(--text-danger);
  cursor: pointer;
  font-size: 12px;
  font-weight: var(--weight-extrabold);
  padding: 6px 10px;
}

.nearby-map-page__state--error {
  color: var(--text-danger);
}

.nearby-map-page__state button,

.nearby-map-page__state,
.nearby-map-page__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 130px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--bg-surface) 86%, transparent);
  color: var(--color-secondary-600);
  font-size: var(--text-body);
  font-weight: var(--weight-extrabold);
  padding: 18px;
  text-align: center;
}

.nearby-map-page__route-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  border: 1px solid color-mix(in srgb, var(--text-danger) 22%, transparent);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--bg-surface) 92%, transparent);
  color: var(--text-danger);
  font-size: 13px;
  font-weight: var(--weight-bold);
  padding: 10px 12px;
}

.nearby-map-page__route-error button {
  margin-left: auto;
  border: 0;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--text-danger) 8%, transparent);
  color: var(--text-danger);
  cursor: pointer;
  font-size: 12px;
  font-weight: var(--weight-extrabold);
  padding: 6px 10px;
}

.nearby-map-page__state--error {
  color: var(--text-danger);
}

.nearby-map-page__state button,
.nearby-map-page__empty-action {
  border: 0;
  border-radius: var(--radius-full);
  background: var(--bg-brand);
  color: var(--text-inverse);
  cursor: pointer;
  font-size: 13px;
  font-weight: var(--weight-extrabold);
  padding: 10px 14px;
  text-decoration: none;
}

.nearby-map-page__empty h2 {
  color: var(--text-primary);
  font-size: 16px;
  font-weight: var(--weight-extrabold);
}

.nearby-map-page__empty p {
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: var(--weight-semibold);
}

.nearby-map-page__spin {
  animation: nearby-spin 1s linear infinite;
}

@keyframes nearby-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 760px) {
  .nearby-map-page {
    min-height: calc(100dvh - 58px);
  }

  .nearby-map-page__topbar {
    top: 12px;
    flex-direction: row;
    align-items: stretch;
    width: calc(100% - 20px);
    gap: 8px;
  }

  .nearby-map-page__permission {
    padding: 24px 14px;
  }

  .nearby-map-page__permission-card {
    border-radius: 24px;
    padding: 28px 18px;
  }

  .nearby-map-page__search {
    flex: 1 1 auto;
  }

  .nearby-map-page__search-field {
    height: 48px;
    padding: 0 14px;
  }

  .nearby-map-page__location-button {
    width: 48px;
    min-height: 48px;
    padding: 0;
    border-radius: 999px;
    background: #fff;
  }

  .nearby-map-page__location-button span {
    display: none;
  }

  .nearby-map-page__map-controls {
    right: 10px;
    gap: 8px;
  }

  .nearby-map-page__map-control {
    width: 42px;
    height: 42px;
  }

  .nearby-map-page__bottom {
    bottom: 10px;
    width: calc(100% - 16px);
  }

  .nearby-map-page__panel {
    border-radius: 22px;
    padding: 12px;
  }

  .nearby-map-page__filters {
    grid-template-columns: 1fr;
  }

  .nearby-map-page__distance {
    grid-template-columns: 54px minmax(0, 1fr);
  }

  .nearby-map-page__count {
    justify-self: start;
  }
}

/* Premium Location Guide Styles */
.nearby-map-page__permission-buttons {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
  max-width: 320px;
  margin-top: 10px;
}

.nearby-map-page__permission-buttons .nearby-map-page__permission-action {
  width: 100%;
}

.nearby-map-page__guide-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  min-height: 44px;
  border: 1px solid var(--border-default);
  border-radius: 999px;
  background: color-mix(in srgb, var(--bg-surface) 60%, transparent);
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 13px;
  font-weight: var(--weight-bold);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.nearby-map-page__guide-toggle:hover {
  background: var(--bg-surface-active);
  color: var(--text-primary);
  border-color: var(--border-strong);
}

.nearby-map-page__guide-toggle--active {
  border-color: var(--border-strong);
  background: var(--bg-surface-active);
  color: var(--text-link);
}

.nearby-map-page__guide-card {
  width: 100%;
  max-width: 460px;
  margin-top: 20px;
  border: 1px solid var(--border-default);
  border-radius: 20px;
  background: color-mix(in srgb, var(--bg-muted) 40%, transparent);
  backdrop-filter: blur(10px);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1), var(--shadow-md);
  padding: 16px;
  overflow: hidden;
  text-align: left;
}

.nearby-map-page__guide-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg-surface-active) 80%, transparent);
  padding: 4px;
  margin-bottom: 16px;
}

.nearby-map-page__guide-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 52px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  font-size: 11px;
  font-weight: var(--weight-extrabold);
  transition: all 0.2s ease;
}

.nearby-map-page__guide-tab svg {
  width: 18px;
  height: 18px;
}

.nearby-map-page__guide-tab:hover {
  color: var(--text-primary);
  background: color-mix(in srgb, var(--bg-surface) 40%, transparent);
}

.nearby-map-page__guide-tab--active {
  background: #fff;
  box-shadow: var(--shadow-sm);
  color: var(--text-link);
}

/* iOS active style override */
.nearby-map-page__guide-tab--active:has(.i-ph-apple-logo-fill) {
  color: #0f172a;
}

/* Android active style override */
.nearby-map-page__guide-tab--active:has(.i-ph-android-logo-fill) {
  color: #16a34a;
}

.nearby-map-page__guide-steps {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.nearby-map-page__step {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.nearby-map-page__step-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  color: #fff;
  font-size: 12px;
  font-weight: var(--weight-extrabold);
}

.nearby-map-page__step-badge--ios {
  background: linear-gradient(135deg, #94a3b8, #475569);
  box-shadow: 0 2px 6px rgba(71, 85, 105, 0.25);
}

.nearby-map-page__step-badge--android {
  background: linear-gradient(135deg, #4ade80, #16a34a);
  box-shadow: 0 2px 6px rgba(22, 163, 74, 0.25);
}

.nearby-map-page__step-badge--desktop {
  background: linear-gradient(135deg, #60a5fa, #2563eb);
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
}

.nearby-map-page__step-text {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: var(--weight-medium);
  line-height: 1.5;
}

.nearby-map-page__step-text strong {
  font-weight: var(--weight-extrabold);
  color: var(--text-link);
}

@media (max-width: 480px) {
  .nearby-map-page__guide-tabs {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  
  .nearby-map-page__guide-tab {
    flex-direction: row;
    height: 38px;
    gap: 8px;
    font-size: 12px;
  }
}
</style>
