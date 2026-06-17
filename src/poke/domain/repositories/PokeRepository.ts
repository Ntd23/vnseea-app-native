// Poke Repository Interface
// Port từ: client/src/poke/domain/repositories/

import type { PokeItem, PokeListOptions, PokeListPage } from '../types/poke.types';

export interface PokeCreateData {
  userId: string | number;
}

export interface PokeRepository {
  getPokes(options?: PokeListOptions): Promise<PokeListPage>;
  createPoke(data: PokeCreateData): Promise<PokeItem>;
  removePoke(pokeId: string | number): Promise<void>;
}
