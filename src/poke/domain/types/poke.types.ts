// Poke domain types
// Port từ: client/src/poke/domain/types/

export interface PokeUserData {
  user_id: string | number;
  username?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  cover?: string;
  is_following?: number;
  [key: string]: unknown;
}

export interface PokeItem {
  id: string | number;
  received_user_id: string | number;
  send_user_id: string | number;
  user_data: PokeUserData;
  time?: string;
  raw?: unknown;
}

export interface PokeListOptions {
  limit?: number;
  offset?: string | number | null;
}

export interface PokeListPage {
  items: PokeItem[];
  nextOffset: string | null;
  hasMore: boolean;
}
