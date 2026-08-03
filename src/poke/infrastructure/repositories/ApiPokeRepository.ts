// Poke API Repository (Infrastructure)
// Port từ: client/src/poke/infrastructure/repositories/

import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { normalizeConfiguredUrl } from '../../../shared-kernel/infrastructure/config/url';
import { languageStorage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getPokeCopy } from '../../application/i18n/pokeCopy';
import type { PokeRepository, PokeCreateData } from '../../domain/repositories/PokeRepository';
import type { PokeItem, PokeListOptions, PokeListPage, PokeUserData } from '../../domain/types/poke.types';

type RawRecord = Record<string, unknown>;

type PokesResponse = {
  api_status: number | string;
  data?: RawRecord[];
  message?: string;
  errors?: {
    error_text?: string;
  };
};

type PokeCreateResponse = {
  api_status: number | string;
  message_data?: string;
  data?: RawRecord;
  errors?: {
    error_text?: string;
  };
};

type PokeRemoveResponse = {
  api_status: number | string;
  message_data?: string;
  errors?: {
    error_text?: string;
  };
};

function readString(raw: RawRecord | undefined, ...keys: string[]) {
  for (const key of keys) {
    const value = raw?.[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (typeof value === 'number') return String(value);
  }
  return '';
}

function readNumber(raw: RawRecord | undefined, ...keys: string[]) {
  for (const key of keys) {
    const number = Number(raw?.[key]);
    if (Number.isFinite(number)) return number;
  }
  return undefined;
}

function normalizeUrl(url: string) {
  return normalizeConfiguredUrl(url) ?? '';
}

function mapUserData(raw: RawRecord | undefined): PokeUserData {
  const firstName = readString(raw, 'first_name');
  const lastName = readString(raw, 'last_name');
  const username = readString(raw, 'username');
  const name =
    [firstName, lastName].filter(Boolean).join(' ').trim() ||
    readString(raw, 'name') ||
    username ||
    'Người dùng';

  return {
    user_id: readString(raw, 'user_id', 'id'),
    username: username || undefined,
    name,
    first_name: firstName || undefined,
    last_name: lastName || undefined,
    avatar: normalizeUrl(readString(raw, 'avatar')) || undefined,
    cover: normalizeUrl(readString(raw, 'cover')) || undefined,
    is_following: readNumber(raw, 'is_following') ?? 0,
    ...raw,
  };
}

function mapPokeItem(raw: RawRecord | undefined): PokeItem {
  const userData = (raw?.user_data as RawRecord | undefined) ?? {};
  
  return {
    id: readString(raw, 'id'),
    received_user_id: readString(raw, 'received_user_id'),
    send_user_id: readString(raw, 'send_user_id'),
    user_data: mapUserData(userData),
    time: readString(raw, 'time') || undefined,
    raw,
  };
}

function isSuccess(status: number | string | undefined) {
  return status === 200 || status === '200';
}

function mapError(error: unknown, language: AppLanguage) {
  const message = error instanceof Error ? error.message : String(error);
  const copy = getPokeCopy(language);

  if (message.includes('you can not poke your self')) return String(copy.cannotPokeSelf);
  if (message.includes('this user is poked')) return String(copy.alreadyPoked);
  if (message.includes('poke not found')) return String(copy.pokeNotFound);
  if (message.includes('you are not the poke owner')) return String(copy.notPokeOwner);
  return message || String(copy.genericError);
}

export function createPokeRepository(): PokeRepository {
  return {
    async getPokes(options = {}) {
      const limit = options.limit ?? 20;

      try {
        console.log('[ApiPokeRepository] getPokes called with:', options);
        const response = await apiBridge.post<PokesResponse>(
          apiRoutes.social.poke,
          {
            type: 'fetch',
            limit,
            offset: options.offset ? String(options.offset) : undefined,
          },
        );
        console.log('[ApiPokeRepository] getPokes response:', response);

        if (!isSuccess(response.api_status)) {
          throw new Error(
            response.errors?.error_text ||
              response.message ||
              'Không thể tải danh sách chọc.',
          );
        }

        const rawPokes = Array.isArray(response.data) ? response.data : [];
        const items = rawPokes.map(mapPokeItem).filter(poke => poke.id);
        const lastPoke = items[items.length - 1];

        return {
          items,
          nextOffset: lastPoke?.id ? String(lastPoke.id) : null,
          hasMore: rawPokes.length >= limit && Boolean(lastPoke?.id),
        };
      } catch (error) {
        console.warn('[ApiPokeRepository] get pokes failed', error);
        const language = languageStorage.getLanguage();
        throw new Error(mapError(error, language));
      }
    },

    async createPoke(data: PokeCreateData): Promise<PokeItem> {
      try {
        console.log('[ApiPokeRepository] createPoke called with:', data);
        const response = await apiBridge.post<PokeCreateResponse>(
          apiRoutes.social.poke,
          {
            type: 'create',
            user_id: String(data.userId),
          },
        );

        console.log('[ApiPokeRepository] createPoke response:', response);

        if (!isSuccess(response.api_status) || !response.data) {
          throw new Error(
            response.errors?.error_text ||
              response.message_data ||
              'Không thể chọc người dùng.',
          );
        }

        return mapPokeItem(response.data);
      } catch (error) {
        console.warn('[ApiPokeRepository] create poke failed', error);
        const language = languageStorage.getLanguage();
        throw new Error(mapError(error, language));
      }
    },

    async removePoke(pokeId: string | number): Promise<void> {
      try {
        console.log('[ApiPokeRepository] removePoke called with:', pokeId);
        const response = await apiBridge.post<PokeRemoveResponse>(
          apiRoutes.social.poke,
          {
            type: 'remove',
            poke_id: String(pokeId),
          },
        );

        console.log('[ApiPokeRepository] removePoke response:', response);

        if (!isSuccess(response.api_status)) {
          throw new Error(
            response.errors?.error_text ||
              response.message_data ||
              'Không thể xóa chọc.',
          );
        }
      } catch (error) {
        console.warn('[ApiPokeRepository] remove poke failed', error);
        const language = languageStorage.getLanguage();
        throw new Error(mapError(error, language));
      }
    },
  };
}
