// Description: Maps shared pagination input into WoWonder API payload fields.
import type {
  PaginatedResult,
  PaginationInput,
  PaginationPayload,
} from '../../domain/types/foundation.types';

export function toPaginationPayload(input: PaginationInput): PaginationPayload {
  return {
    limit: input.limit,
    offset: input.offset,
    after_post_id: input.afterPostId,
  };
}

export function createPaginatedResult<TItem>(
  items: TItem[],
  input: PaginationInput,
): PaginatedResult<TItem> {
  const nextOffset =
    typeof input.offset === 'number' && typeof input.limit === 'number'
      ? input.offset + items.length
      : undefined;

  return {
    items,
    nextOffset,
    afterPostId: input.afterPostId,
    hasMore:
      typeof input.limit === 'number' ? items.length >= input.limit : undefined,
  };
}
