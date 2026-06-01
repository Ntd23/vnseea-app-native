// English description: Re-exports API-backed poke types for the poke presentation layer after removing mock catalogs.

export type {
  FeedPokeActionResult as PokeActionResult,
  FeedPokeRecord as PokeRecord,
} from "../../feed/domain/types/feed.types"
