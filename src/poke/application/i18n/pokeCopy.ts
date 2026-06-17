// Description: Centralized i18n copy for the poke bounded context.

import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';

type PokeCopyValue = string | ((name: string) => string);

export const POKE_COPY: Record<AppLanguage, Record<string, PokeCopyValue>> = {
  vi: {
    // Poke Screen
    pokeTitle: 'Chọc',
    pokesReceived: 'Đã nhận được chọc',
    noPokes: 'Chưa có chọc nào',
    noPokesDesc: 'Bạn chưa nhận được chọc nào.',
    loading: 'Đang tải...',
    error: 'Có lỗi xảy ra',
    // Poke Item
    pokeBack: 'Chọc lại',
    removePoke: 'Xóa chọc',
    removeConfirm: 'Bạn có chắc chắn muốn xóa chọc này?',
    removeSuccess: 'Đã xóa chọc thành công.',
    pokeSuccess: 'Đã chọc thành công!',
    pokeError: 'Không thể chọc người dùng.',
    // Profile Screen
    pokeSuccessTitle: 'Đã chọc',
    pokeSuccessMessage: (name: string) => `Bạn đã chọc ${name}.`,
    profilePokeError: 'Không thể chọc người dùng này lúc này.',
    // API Errors
    cannotPokeSelf: 'Bạn không thể chọc chính mình.',
    alreadyPoked: 'Người dùng này đã được chọc.',
    pokeNotFound: 'Không tìm thấy chọc.',
    notPokeOwner: 'Bạn không phải chủ sở hữu của chọc này.',
    genericError: 'Không thể thực hiện thao tác. Vui lòng thử lại.',
    // User Info
    timeAgo: 'vài giây trước',
  },
  en: {
    // Poke Screen
    pokeTitle: 'Poke',
    pokesReceived: 'Pokes Received',
    noPokes: 'No pokes yet',
    noPokesDesc: 'You haven\'t received any pokes yet.',
    loading: 'Loading...',
    error: 'An error occurred',
    // Poke Item
    pokeBack: 'Poke Back',
    removePoke: 'Remove Poke',
    removeConfirm: 'Are you sure you want to remove this poke?',
    removeSuccess: 'Poke removed successfully.',
    pokeSuccess: 'Poked successfully!',
    pokeError: 'Could not poke user.',
    // Profile Screen
    pokeSuccessTitle: 'Poked',
    pokeSuccessMessage: (name: string) => `You poked ${name}.`,
    profilePokeError: 'Could not poke this user right now.',
    // API Errors
    cannotPokeSelf: 'You cannot poke yourself.',
    alreadyPoked: 'This user has already been poked.',
    pokeNotFound: 'Poke not found.',
    notPokeOwner: 'You are not the owner of this poke.',
    genericError: 'Cannot perform action. Please try again.',
    // User Info
    timeAgo: 'a few seconds ago',
  },
};

export type PokeCopyKey = keyof typeof POKE_COPY.vi;

export function getPokeCopy(
  language: AppLanguage,
): Record<PokeCopyKey, PokeCopyValue> {
  return POKE_COPY[language] as Record<PokeCopyKey, PokeCopyValue>;
}

// Helper function to get copy as strings only (for components that don't need functions)
export function getPokeCopyAsString(
  language: AppLanguage,
): Record<string, string> {
  const copy = POKE_COPY[language];
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(copy)) {
    result[key] = typeof value === 'function' ? '' : String(value);
  }
  return result;
}
