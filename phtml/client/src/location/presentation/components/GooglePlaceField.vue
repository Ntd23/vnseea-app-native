<!-- English description: Cost-conscious Google Places address select menu powered by Nuxt Scripts. -->

<template>
  <div class="google-place-field">
    <div class="google-place-field__shell">
      <div
        class="google-place-field__control"
        :class="{
          'google-place-field__control--disabled': disabled,
          'google-place-field__control--open': dropdownOpen,
          'google-place-field__control--selected': hasSelectedLocation,
        }"
      >
        <UIcon
          :name="hasSelectedLocation ? 'i-ph-check-circle-duotone' : 'i-ph-map-pin-duotone'"
          class="google-place-field__icon"
          :class="{ 'google-place-field__icon--selected': hasSelectedLocation }"
        />
        <input
          v-model="searchText"
          type="text"
          class="google-place-field__input"
          :placeholder="selectedLocation.address || placeholder"
          :disabled="disabled"
          autocomplete="off"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown.down.prevent="moveActiveSuggestion(1)"
          @keydown.up.prevent="moveActiveSuggestion(-1)"
          @keydown.enter.prevent="confirmActiveSuggestion"
          @keydown.esc.prevent="closeDropdown"
        >
        <button
          v-if="hasSelectedLocation && !isLoading && !disabled"
          type="button"
          class="google-place-field__clear"
          aria-label="Clear selected address"
          @mousedown.prevent
          @click="clearSelection"
        >
          <UIcon name="i-ph-x-bold" class="google-place-field__clear-icon" />
        </button>
        <UIcon
          v-else
          :name="isLoading ? 'i-ph-circle-notch-bold' : 'i-ph-magnifying-glass-duotone'"
          class="google-place-field__icon"
          :class="{ 'google-place-field__icon--spin': isLoading }"
        />
      </div>

      <div v-if="dropdownOpen" class="google-place-field__menu">
        <button
          v-for="(item, index) in suggestions"
          :key="item.placeId"
          type="button"
          class="google-place-field__option"
          :class="{ 'google-place-field__option--active': index === activeSuggestionIndex }"
          @mousedown.prevent="handleSelectedItem(item)"
        >
          <UIcon :name="item.icon" class="google-place-field__option-icon" />
          <span>{{ item.label }}</span>
        </button>
        <p v-if="suggestions.length === 0" class="google-place-field__empty">
          {{ emptyText }}
        </p>
      </div>
    </div>

    <p v-if="helperText" class="google-place-field__help">
      {{ helperText }}
    </p>
    <p v-if="errorText" class="google-place-field__error">
      {{ errorText }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { refDebounced } from "@vueuse/core"
import {
  emptyLocationSelection,
  normalizeLocationSelection,
  type LocationSelection,
} from "../../domain/types/location.types"

type PlaceSuggestionItem = {
  label: string
  placeId: string
  icon: string
}

const props = withDefaults(defineProps<{
  modelValue?: LocationSelection | string | null
  placeholder?: string
  helperText?: string
  disabled?: boolean
  requireCoordinates?: boolean
}>(), {
  modelValue: null,
  placeholder: "",
  helperText: "",
  disabled: false,
  requireCoordinates: false,
})

const emit = defineEmits<{
  "update:modelValue": [value: LocationSelection]
}>()

const searchText = ref("")
const suggestions = ref<PlaceSuggestionItem[]>([])
const dropdownOpen = ref(false)
const activeSuggestionIndex = ref(-1)
const errorText = ref("")
const isLoading = ref(false)
const isSyncingSelection = ref(false)
const isSelectingSuggestion = ref(false)
const syncedSearchText = ref("")
const autocompleteService = shallowRef<google.maps.places.AutocompleteService | null>(null)
const placesService = shallowRef<google.maps.places.PlacesService | null>(null)
const lastPredictionRequest = ref(0)
const searchTextDebounced = refDebounced(searchText, 250)
const predictionTimeoutMs = 8000

const { load } = useScriptGoogleMaps({
  libraries: ["places"],
  trigger: "manual",
})

const selectedLocation = computed(() => {
  if (typeof props.modelValue === "string") {
    return normalizeLocationSelection({ address: props.modelValue })
  }

  return normalizeLocationSelection(props.modelValue)
})

const hasSelectedLocation = computed(() =>
  Boolean(selectedLocation.value.address && (selectedLocation.value.placeId || selectedLocation.value.lat !== null || selectedLocation.value.lng !== null)),
)

const emptyText = computed(() => {
  if (isLoading.value) return "Searching addresses..."
  if ((searchText.value || "").trim().length < 3) return "Type at least 3 characters."

  return "No address suggestions found."
})

watch(
  selectedLocation,
  (value) => {
    isSyncingSelection.value = true
    syncedSearchText.value = value.address
    searchText.value = value.address
    nextTick(() => {
      isSyncingSelection.value = false
    })
  },
  { immediate: true },
)

watch(searchTextDebounced, (value) => {
  if (value.trim() === syncedSearchText.value.trim()) {
    isLoading.value = false
    suggestions.value = []
    activeSuggestionIndex.value = -1
    return
  }

  void fetchSuggestions(value)
})

async function ensurePlacesServices() {
  if (autocompleteService.value && placesService.value) {
    return true
  }

  if (!import.meta.client) {
    return false
  }

  try {
    await load()
  }
  catch {
    errorText.value = "Google Maps rejected this domain. Add this site URL to the API key referrer restrictions."
    return false
  }

  const maps = window.google?.maps

  if (!maps?.places?.AutocompleteService || !maps.places.PlacesService) {
    errorText.value = "Google Places is not available for this API key and domain."
    return false
  }

  autocompleteService.value = new maps.places.AutocompleteService()
  placesService.value = new maps.places.PlacesService(document.createElement("div"))

  return true
}

async function fetchSuggestions(input: string) {
  const query = input.trim()

  if (props.disabled || query.length < 3) {
    suggestions.value = []
    activeSuggestionIndex.value = -1
    isLoading.value = false
    return
  }

  try {
    isLoading.value = true
    errorText.value = ""

    const ready = await ensurePlacesServices()
    if (!ready || !autocompleteService.value) {
      suggestions.value = []
      isLoading.value = false
      return
    }

    const requestId = lastPredictionRequest.value + 1
    lastPredictionRequest.value = requestId
    const timeoutId = window.setTimeout(() => {
      if (requestId !== lastPredictionRequest.value) {
        return
      }

      isLoading.value = false
      suggestions.value = []
      errorText.value = "Google Places did not respond. Try again."
    }, predictionTimeoutMs)

    autocompleteService.value.getPlacePredictions(
      { input: query },
      (predictions, status) => {
        if (requestId !== lastPredictionRequest.value) {
          window.clearTimeout(timeoutId)
          return
        }

        window.clearTimeout(timeoutId)
        const okStatus = window.google?.maps?.places?.PlacesServiceStatus?.OK
        const zeroResultsStatus = window.google?.maps?.places?.PlacesServiceStatus?.ZERO_RESULTS
        suggestions.value = status === okStatus
          ? (predictions ?? []).map(prediction => ({
              label: prediction.description,
              placeId: prediction.place_id || prediction.description,
              icon: "i-ph-map-pin-duotone",
            }))
          : []
        activeSuggestionIndex.value = suggestions.value.length > 0 ? 0 : -1
        dropdownOpen.value = true
        errorText.value = status && status !== okStatus && status !== zeroResultsStatus
          ? `Google Places returned ${status}.`
          : ""
        isLoading.value = false
      },
    )
  }
  catch {
    isLoading.value = false
    suggestions.value = []
    activeSuggestionIndex.value = -1
    errorText.value = "Unable to load Google address suggestions."
  }
}

async function selectSuggestion(item: PlaceSuggestionItem) {
  if (item.placeId.startsWith("manual:")) {
    return
  }

  try {
    isSelectingSuggestion.value = true
    isLoading.value = true
    errorText.value = ""

    const ready = await ensurePlacesServices()
    if (!ready || !placesService.value) {
      isLoading.value = false
      isSelectingSuggestion.value = false
      return
    }

    placesService.value.getDetails(
      {
        placeId: item.placeId,
        fields: ["formatted_address", "geometry", "place_id", "name"],
      },
      (place, status) => {
        const okStatus = window.google?.maps?.places?.PlacesServiceStatus?.OK
        isLoading.value = false
        isSelectingSuggestion.value = false

        if (status !== okStatus) {
          errorText.value = "Unable to read the selected address."
          return
        }

        const geometry = place?.geometry?.location
        const nextValue: LocationSelection = {
          address: String(place?.formatted_address || place?.name || item.label || "").trim(),
          lat: geometry ? geometry.lat() : null,
          lng: geometry ? geometry.lng() : null,
          placeId: String(place?.place_id || item.placeId || ""),
        }

        searchText.value = nextValue.address
        suggestions.value = []
        activeSuggestionIndex.value = -1
        dropdownOpen.value = false
        errorText.value = ""
        emit("update:modelValue", nextValue)
        requestAnimationFrame(() => {
          const activeElement = document.activeElement
          if (activeElement instanceof HTMLElement && activeElement.classList.contains("google-place-field__input")) {
            activeElement.blur()
          }
        })
      },
    )
  }
  catch {
    isLoading.value = false
    isSelectingSuggestion.value = false
    errorText.value = "Unable to read the selected address."
  }
}

function handleSelectedItem(item: PlaceSuggestionItem | null) {
  if (!item || isSyncingSelection.value) {
    return
  }

  void selectSuggestion(item)
}

function handleFocus() {
  dropdownOpen.value = true
  void fetchSuggestions(searchText.value)
}

function handleBlur() {
  window.setTimeout(() => {
    dropdownOpen.value = false
    syncManualAddress()
  }, 120)
}

function closeDropdown() {
  dropdownOpen.value = false
}

function clearSelection() {
  searchText.value = ""
  suggestions.value = []
  activeSuggestionIndex.value = -1
  dropdownOpen.value = false
  errorText.value = ""
  emit("update:modelValue", emptyLocationSelection())
}

function moveActiveSuggestion(delta: number) {
  if (!dropdownOpen.value) {
    dropdownOpen.value = true
  }

  if (suggestions.value.length === 0) {
    activeSuggestionIndex.value = -1
    return
  }

  activeSuggestionIndex.value = (activeSuggestionIndex.value + delta + suggestions.value.length) % suggestions.value.length
}

function confirmActiveSuggestion() {
  const item = suggestions.value[activeSuggestionIndex.value]

  if (item) {
    handleSelectedItem(item)
    return
  }

  syncManualAddress()
}

function syncManualAddress() {
  if (isLoading.value || isSelectingSuggestion.value) {
    return
  }

  const address = searchText.value.trim()

  if (!address) {
    errorText.value = ""
    emit("update:modelValue", emptyLocationSelection())
    return
  }

  const current = selectedLocation.value

  if (address !== current.address) {
    emit("update:modelValue", {
      address,
      lat: null,
      lng: null,
      placeId: "",
    })
  }

  const latest = normalizeLocationSelection(address === current.address ? current : { address })
  errorText.value = props.requireCoordinates && (latest.lat === null || latest.lng === null)
    ? "Select an address suggestion so nearby search can store coordinates."
    : ""
}
</script>

<style scoped>
.google-place-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  min-width: 0;
}

.google-place-field__shell {
  position: relative;
  width: 100%;
  min-width: 0;
}

.google-place-field__control {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 48px;
  width: 100%;
  min-width: 0;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #fafbfe;
  padding: 0 14px;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.google-place-field__control--open {
  border-color: rgba(0, 0, 255, 0.25);
  background: #fff;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
}

.google-place-field__control--selected {
  border-color: #bfdbfe;
  background: #f8fbff;
}

.google-place-field__control--disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.google-place-field__input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.google-place-field__input::placeholder {
  color: #94a3b8;
}

.google-place-field__icon {
  height: 18px;
  width: 18px;
  flex-shrink: 0;
  color: #64748b;
}

.google-place-field__icon--spin {
  animation: google-place-field-spin 0.8s linear infinite;
}

.google-place-field__icon--selected {
  color: #2563eb;
}

.google-place-field__clear {
  display: inline-flex;
  height: 28px;
  width: 28px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  color: #64748b;
  transition: background 0.18s ease, color 0.18s ease;
}

.google-place-field__clear:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.google-place-field__clear-icon {
  height: 13px;
  width: 13px;
}

.google-place-field__menu {
  position: absolute;
  z-index: 80;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #fff;
  box-shadow: 0 18px 46px rgba(15, 23, 42, 0.14);
  padding: 6px;
}

.google-place-field__option {
  display: flex;
  min-height: 40px;
  width: 100%;
  align-items: center;
  gap: 10px;
  border-radius: 10px;
  padding: 8px 10px;
  color: #334155;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
}

.google-place-field__option:hover,
.google-place-field__option--active {
  background: #f1f5f9;
}

.google-place-field__option-icon {
  height: 16px;
  width: 16px;
  flex-shrink: 0;
  color: #64748b;
}

.google-place-field__option span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.google-place-field__empty {
  padding: 8px 10px;
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
}

.google-place-field__help,
.google-place-field__error {
  font-size: 12px;
  font-weight: 500;
  line-height: 1.45;
}

.google-place-field__help {
  color: #64748b;
}

.google-place-field__error {
  color: #dc2626;
}

@keyframes google-place-field-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}
</style>
