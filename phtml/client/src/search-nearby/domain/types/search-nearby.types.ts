// English description: Domain types for map-based nearby user and page discovery.

export type NearbySearchType = "all" | "user" | "page"
export type NearbySearchStatus = "ready" | "needs_location"
export type NearbySearchItemType = Exclude<NearbySearchType, "all"> | "place"

export interface NearbySearchQuery {
  q: string
  type: NearbySearchType
  distanceKm: number
  limit: number
}

export interface NearbySearchOrigin {
  address: string
  lat: number | null
  lng: number | null
}

export interface NearbySearchItem {
  id: string
  backendId: number
  type: NearbySearchItemType
  title: string
  subtitle: string
  description: string
  locationLabel: string
  avatarUrl: string
  href: string
  lat: number | null
  lng: number | null
  distanceMeters: number | null
  pinned?: boolean
}

export interface NearbySearchResponse {
  status: NearbySearchStatus
  origin: NearbySearchOrigin
  items: NearbySearchItem[]
}
