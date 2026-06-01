// English description: Shared location selection types used by Google-backed address fields.

export interface LocationSelection {
  address: string
  lat: number | null
  lng: number | null
  placeId: string
}

export const emptyLocationSelection = (): LocationSelection => ({
  address: "",
  lat: null,
  lng: null,
  placeId: "",
})

export const normalizeLocationSelection = (
  value?: Partial<LocationSelection> | null,
): LocationSelection => ({
  address: String(value?.address ?? "").trim(),
  lat: typeof value?.lat === "number" && Number.isFinite(value.lat) ? value.lat : null,
  lng: typeof value?.lng === "number" && Number.isFinite(value.lng) ? value.lng : null,
  placeId: String(value?.placeId ?? "").trim(),
})

export const hasLocationCoordinates = (value?: Partial<LocationSelection> | null) =>
  typeof value?.lat === "number"
  && Number.isFinite(value.lat)
  && typeof value.lng === "number"
  && Number.isFinite(value.lng)
