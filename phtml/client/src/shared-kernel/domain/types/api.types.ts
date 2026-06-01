export type ApiPrimitive = string | number | boolean | null | undefined

export type ApiQueryValue = ApiPrimitive | ApiPrimitive[]

export type ApiQuery = Record<string, ApiQueryValue>

export interface PaginatedCursorQuery {
  after_id?: string | number
  limit?: number
}

export interface ApiListMeta {
  total?: number
  nextCursor?: string | number | null
}

export interface ApiCollectionResponse<TItem> {
  items: TItem[]
  meta?: ApiListMeta
}

export interface ApiMutationResponse {
  success: boolean
  message?: string
}

export interface ApiSessionPayload {
  user_session_id?: string
}
