<!-- English description: Google Maps canvas for nearby user and page search markers. -->

<template>
  <div class="nearby-map">
    <div ref="mapElement" class="nearby-map__canvas" />
    <div v-if="mapError" class="nearby-map__error">
      <Icon name="i-ph-warning-circle-duotone" class="nearby-map__error-icon" />
      <span>{{ mapError }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  NearbySearchItem,
  NearbySearchOrigin,
} from "../../domain/types/search-nearby.types"

const props = defineProps<{
  origin: NearbySearchOrigin
  items: NearbySearchItem[]
  selectedItemId: string
  originFocusKey: number
  routeTargetItem: NearbySearchItem | null
  pinnedPageIds?: string[]
  zoomInKey?: number
  zoomOutKey?: number
}>()

const emit = defineEmits<{
  select: [item: NearbySearchItem]
  directions: [item: NearbySearchItem]
  routeError: [message: string]
}>()

const mapElement = ref<HTMLDivElement | null>(null)
const mapError = ref("")
const markerInstances = shallowRef<google.maps.Marker[]>([])
const mapInstance = shallowRef<google.maps.Map | null>(null)
const markerConstructor = shallowRef<typeof google.maps.Marker | null>(null)
const directionsServiceConstructor = shallowRef<typeof google.maps.DirectionsService | null>(null)
const directionsRendererConstructor = shallowRef<typeof google.maps.DirectionsRenderer | null>(null)
const directionsRenderer = shallowRef<google.maps.DirectionsRenderer | null>(null)
const placesService = shallowRef<google.maps.places.PlacesService | null>(null)
let routeRequestSequence = 0

const { load } = useScriptGoogleMaps({
  libraries: ["places"],
  trigger: "manual",
})

const defaultCenter = {
  lat: 21.0278,
  lng: 105.8342,
}

type GoogleMapsRuntime = typeof google.maps & {
  importLibrary?: (libraryName: string) => Promise<unknown>
}

const currentCenter = computed(() => ({
  lat: props.origin.lat ?? defaultCenter.lat,
  lng: props.origin.lng ?? defaultCenter.lng,
}))

async function resolveMapConstructors() {
  const mapsRuntime = window.google?.maps as GoogleMapsRuntime | undefined

  if (!mapsRuntime) {
    return null
  }

  if (typeof mapsRuntime.importLibrary === "function") {
    const mapsLibrary = await mapsRuntime.importLibrary("maps") as google.maps.MapsLibrary
    const markerLibrary = await mapsRuntime.importLibrary("marker") as google.maps.MarkerLibrary & {
      Marker?: typeof google.maps.Marker
    }
    let routesLibrary: Partial<{
      DirectionsService: typeof google.maps.DirectionsService
      DirectionsRenderer: typeof google.maps.DirectionsRenderer
    }> = {}

    try {
      routesLibrary = await mapsRuntime.importLibrary("routes") as typeof routesLibrary
    }
    catch {
      routesLibrary = {}
    }
    const Marker = markerLibrary.Marker ?? mapsRuntime.Marker
    const DirectionsService = routesLibrary.DirectionsService ?? mapsRuntime.DirectionsService ?? null
    const DirectionsRenderer = routesLibrary.DirectionsRenderer ?? mapsRuntime.DirectionsRenderer ?? null

    if (typeof mapsLibrary.Map === "function" && typeof Marker === "function") {
      return { Map: mapsLibrary.Map, Marker, DirectionsService, DirectionsRenderer }
    }
  }

  if (typeof mapsRuntime.Map === "function" && typeof mapsRuntime.Marker === "function") {
    return {
      Map: mapsRuntime.Map,
      Marker: mapsRuntime.Marker,
      DirectionsService: mapsRuntime.DirectionsService ?? null,
      DirectionsRenderer: mapsRuntime.DirectionsRenderer ?? null,
    }
  }

  return null
}

function clearMarkers() {
  markerInstances.value.forEach(marker => marker.setMap(null))
  markerInstances.value = []
}

function clearRoute() {
  routeRequestSequence += 1

  if (directionsRenderer.value) {
    directionsRenderer.value.setMap(null)
    directionsRenderer.value = null
  }
}

function createPinIcon(color: string, selected = false): google.maps.Icon {
  const width = selected ? 42 : 38
  const height = selected ? 54 : 48
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 38 48">
      <path d="M19 46S3 28.5 3 17.5C3 8.4 10.2 1 19 1s16 7.4 16 16.5C35 28.5 19 46 19 46Z" fill="${color}" stroke="#fff" stroke-width="3"/>
      <circle cx="19" cy="17" r="8" fill="#fff"/>
    </svg>
  `.trim()

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(width, height),
    anchor: new window.google.maps.Point(width / 2, height),
    labelOrigin: new window.google.maps.Point(width + 34, 17),
  }
}

function createOriginIcon(selected = false): google.maps.Icon {
  const size = selected ? 50 : 46
  const arrowScale = selected ? 1 : 0.94
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 50 50">
      <circle cx="25" cy="25" r="22" fill="#2563eb" fill-opacity="0.18"/>
      <circle cx="25" cy="25" r="16" fill="#ffffff" stroke="#2563eb" stroke-width="4"/>
      <g transform="translate(25 25) scale(${arrowScale}) rotate(45) translate(-25 -25)">
        <path d="M25 12 36 36 25 31 14 36 25 12Z" fill="#2563eb"/>
      </g>
    </svg>
  `.trim()

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new window.google.maps.Size(size, size),
    anchor: new window.google.maps.Point(size / 2, size / 2),
  }
}

function isMobileViewport() {
  return import.meta.client && window.matchMedia("(max-width: 760px)").matches
}

function calculateDistanceMeters(lat: number, lng: number) {
  if (props.origin.lat === null || props.origin.lng === null) {
    return null
  }

  const earthRadiusMeters = 6371000
  const toRad = (value: number) => value * Math.PI / 180
  const latFrom = toRad(props.origin.lat)
  const lngFrom = toRad(props.origin.lng)
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

function handleGooglePoiClick(event: google.maps.MapMouseEvent & { placeId?: string, stop?: () => void }) {
  const placeId = event.placeId

  if (!placeId || !placesService.value) {
    return
  }

  event.stop?.()
  placesService.value.getDetails(
    {
      placeId,
      fields: ["formatted_address", "geometry", "place_id", "name"],
    },
    (place, status) => {
      const okStatus = window.google?.maps?.places?.PlacesServiceStatus?.OK

      if (status !== okStatus || !place?.geometry?.location) {
        emit("routeError", "Không đọc được địa điểm Google Maps này.")
        return
      }

      const lat = place.geometry.location.lat()
      const lng = place.geometry.location.lng()
      const title = String(place.name || place.formatted_address || "Google Maps").trim()
      const address = String(place.formatted_address || title).trim()
      const item: NearbySearchItem = {
        id: `place-${place.place_id || placeId}`,
        backendId: 0,
        type: "place",
        title,
        subtitle: "Google Maps",
        description: "",
        locationLabel: address,
        avatarUrl: "",
        href: `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(String(place.place_id || placeId))}&query=${encodeURIComponent(address)}`,
        lat,
        lng,
        distanceMeters: calculateDistanceMeters(lat, lng),
      }

      emit("select", item)
      emit("directions", item)
    },
  )
}

function fitMarkers() {
  const map = mapInstance.value

  if (!map || !window.google?.maps) {
    return
  }

  const coordinates = [
    props.origin.lat !== null && props.origin.lng !== null
      ? { lat: props.origin.lat, lng: props.origin.lng }
      : null,
    ...props.items
      .filter(item => item.lat !== null && item.lng !== null)
      .map(item => ({ lat: item.lat as number, lng: item.lng as number })),
  ].filter((point): point is { lat: number; lng: number } => Boolean(point))

  if (coordinates.length <= 1) {
    map.setCenter(currentCenter.value)
    map.setZoom(isMobileViewport() ? 15 : 13)
    return
  }

  const bounds = new window.google.maps.LatLngBounds()
  coordinates.forEach(point => bounds.extend(point))
  map.fitBounds(bounds, isMobileViewport() ? 48 : 80)

  if (isMobileViewport()) {
    window.google.maps.event.addListenerOnce(map, "idle", () => {
      map.setZoom(Math.max(map.getZoom() ?? 13, 14))
    })
  }
}

function focusSelectedItem() {
  const map = mapInstance.value
  const selected = props.items.find(item => item.id === props.selectedItemId)

  if (!map || !selected || selected.lat === null || selected.lng === null) {
    return
  }

  map.panTo({ lat: selected.lat, lng: selected.lng })
  map.setZoom(Math.max(map.getZoom() ?? 14, 15))
}

function focusOrigin() {
  const map = mapInstance.value

  if (!map || props.origin.lat === null || props.origin.lng === null) {
    return
  }

  map.panTo({ lat: props.origin.lat, lng: props.origin.lng })
  map.setZoom(Math.max(map.getZoom() ?? 14, 15))
}

function zoomIn() {
  const map = mapInstance.value

  if (!map) {
    return
  }

  map.setZoom(Math.min((map.getZoom() ?? 13) + 1, 21))
}

function zoomOut() {
  const map = mapInstance.value

  if (!map) {
    return
  }

  map.setZoom(Math.max((map.getZoom() ?? 13) - 1, 3))
}

function renderMarkers() {
  const map = mapInstance.value
  const Marker = markerConstructor.value

  if (!map || !Marker || !window.google?.maps) {
    return
  }

  clearMarkers()

  const markers: google.maps.Marker[] = []

  if (props.origin.lat !== null && props.origin.lng !== null) {
    markers.push(new Marker({
      map,
      position: { lat: props.origin.lat, lng: props.origin.lng },
      title: "Vị trí của tôi",
      icon: createOriginIcon(!props.selectedItemId),
      zIndex: 40,
    }))
  }

  props.items.forEach((item) => {
    if (item.lat === null || item.lng === null) {
      return
    }

    const pinnedPage = item.type === "page" && props.pinnedPageIds?.includes(item.id)
    const marker = new Marker({
      map,
      position: { lat: item.lat, lng: item.lng },
      title: item.title,
      icon: createPinIcon(item.type === "page" ? "#16a34a" : item.type === "place" ? "#2563eb" : "#ef4444", item.id === props.selectedItemId),
      label: pinnedPage
        ? {
            text: item.title.slice(0, 22),
            color: "#0f172a",
            fontSize: "12px",
            fontWeight: "800",
            className: "nearby-map__pin-label",
          }
        : undefined,
      zIndex: item.id === props.selectedItemId ? 30 : 10,
    })

    marker.addListener("click", () => {
      emit("select", item)
      emit("directions", item)
    })
    markers.push(marker)
  })

  markerInstances.value = markers

  if (props.selectedItemId) {
    focusSelectedItem()
    return
  }

  fitMarkers()
}

function renderRoute() {
  const map = mapInstance.value
  const target = props.routeTargetItem
  const DirectionsService = directionsServiceConstructor.value
  const DirectionsRenderer = directionsRendererConstructor.value

  if (!target) {
    clearRoute()
    return
  }

  if (
    !map
    || !DirectionsService
    || !DirectionsRenderer
    || !window.google?.maps
    || props.origin.lat === null
    || props.origin.lng === null
    || target.lat === null
    || target.lng === null
  ) {
    clearRoute()
    emit("routeError", "Khong the ve chi duong cho ket qua nay.")
    return
  }

  const requestId = ++routeRequestSequence
  const service = new DirectionsService()
  const renderer = new DirectionsRenderer({
    map,
    suppressMarkers: true,
    preserveViewport: true,
    polylineOptions: {
      strokeColor: "#2563eb",
      strokeOpacity: 0.95,
      strokeWeight: 5,
    },
  })

  directionsRenderer.value?.setMap(null)
  directionsRenderer.value = renderer

  service.route(
    {
      origin: { lat: props.origin.lat, lng: props.origin.lng },
      destination: { lat: target.lat, lng: target.lng },
      travelMode: window.google.maps.TravelMode.DRIVING,
    },
    (result, status) => {
      if (requestId !== routeRequestSequence || props.routeTargetItem?.id !== target.id) {
        renderer.setMap(null)
        return
      }

      if (status === window.google.maps.DirectionsStatus.OK && result) {
        renderer.setDirections(result)
        return
      }

      clearRoute()
      emit("routeError", `Google Directions returned ${status}.`)
    },
  )
}

async function initializeMap() {
  if (!import.meta.client || !mapElement.value) {
    return
  }

  try {
    await load()
  }
  catch {
    mapError.value = "Khong tai duoc Google Maps cho ten mien hien tai."
    return
  }

  // Đợi window.google.maps sẵn sàng (tối đa 5 giây)
  let retries = 25
  while (!window.google?.maps && retries > 0) {
    await new Promise((resolve) => setTimeout(resolve, 200))
    retries--
  }

  if (!window.google?.maps) {
    mapError.value = "Google Maps chua san sang."
    return
  }

  let constructors: Awaited<ReturnType<typeof resolveMapConstructors>> = null
  retries = 15

  // Đợi thêm để resolveMapConstructors có thể lấy đủ các libraries như maps, marker, routes
  while (retries > 0) {
    try {
      constructors = await resolveMapConstructors()
      if (constructors) {
        break
      }
    }
    catch {
      // Bỏ qua lỗi tạm thời khi các library chưa load xong
    }
    await new Promise((resolve) => setTimeout(resolve, 200))
    retries--
  }

  if (!constructors) {
    mapError.value = "Google Maps chua san sang."
    return
  }

  markerConstructor.value = constructors.Marker
  directionsServiceConstructor.value = constructors.DirectionsService
  directionsRendererConstructor.value = constructors.DirectionsRenderer
  mapInstance.value = new constructors.Map(mapElement.value, {
    center: currentCenter.value,
    zoom: isMobileViewport() ? 15 : 13,
    clickableIcons: true,
    fullscreenControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    zoomControl: false,
  })
  placesService.value = window.google?.maps?.places?.PlacesService
    ? new window.google.maps.places.PlacesService(mapInstance.value)
    : null
  mapInstance.value.addListener("click", handleGooglePoiClick)

  renderMarkers()
  renderRoute()
}

onMounted(() => {
  void initializeMap()
})

watch(
  () => [props.origin.lat, props.origin.lng, props.items, props.selectedItemId],
  () => renderMarkers(),
  { deep: true },
)

watch(
  () => props.originFocusKey,
  () => focusOrigin(),
)

watch(
  () => props.zoomInKey,
  () => zoomIn(),
)

watch(
  () => props.zoomOutKey,
  () => zoomOut(),
)

watch(
  () => [
    props.routeTargetItem?.id,
    props.routeTargetItem?.lat,
    props.routeTargetItem?.lng,
    props.origin.lat,
    props.origin.lng,
    props.pinnedPageIds?.join(","),
  ],
  () => renderRoute(),
)

onBeforeUnmount(() => {
  clearMarkers()
  clearRoute()
})
</script>

<style scoped>
.nearby-map,
.nearby-map__canvas {
  position: absolute;
  inset: 0;
  min-height: 100%;
}

.nearby-map__canvas {
  background: var(--color-secondary-200);
}

.nearby-map__error {
  position: absolute;
  left: 50%;
  top: 96px;
  display: inline-flex;
  max-width: calc(100% - 32px);
  transform: translateX(-50%);
  align-items: center;
  gap: 8px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--bg-surface) 96%, transparent);
  box-shadow: var(--shadow-lg);
  color: var(--text-danger);
  font-size: 13px;
  font-weight: var(--weight-bold);
  padding: 10px 14px;
  z-index: 4;
}

.nearby-map__error-icon {
  height: 18px;
  width: 18px;
}

:global(.nearby-map__pin-label) {
  position: relative;
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.16);
  padding: 6px 10px;
  transform: translateX(2px);
  white-space: nowrap;
}

:global(.nearby-map__pin-label::before) {
  position: absolute;
  top: 50%;
  left: -6px;
  width: 10px;
  height: 10px;
  border-bottom: 1px solid rgba(203, 213, 225, 0.9);
  border-left: 1px solid rgba(203, 213, 225, 0.9);
  background: rgba(255, 255, 255, 0.92);
  content: "";
  transform: translateY(-50%) rotate(45deg);
}
</style>
