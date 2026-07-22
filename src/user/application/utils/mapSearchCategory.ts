// Description: Maps common Vietnamese place searches to Google Nearby place types.
export type GoogleNearbyCategoryType =
  | 'restaurant'
  | 'cafe'
  | 'hair_care'
  | 'beauty_salon'
  | 'pharmacy'
  | 'hospital'
  | 'dentist'
  | 'gas_station'
  | 'supermarket'
  | 'gym'
  | 'lodging'
  | 'bank'
  | 'atm';

const GOOGLE_NEARBY_CATEGORY_TYPES = new Set<GoogleNearbyCategoryType>([
  'restaurant',
  'cafe',
  'hair_care',
  'beauty_salon',
  'pharmacy',
  'hospital',
  'dentist',
  'gas_station',
  'supermarket',
  'gym',
  'lodging',
  'bank',
  'atm',
]);

function normalizeMapSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLocaleLowerCase('vi')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isGoogleNearbyCategoryType(
  value: string | undefined,
): value is GoogleNearbyCategoryType {
  return Boolean(
    value &&
      GOOGLE_NEARBY_CATEGORY_TYPES.has(value as GoogleNearbyCategoryType),
  );
}

export function getGoogleCategorySearchQuery(
  value: string,
): GoogleNearbyCategoryType | undefined {
  const normalized = normalizeMapSearchText(value);

  if (
    /\b(cat toc|tiem toc|quan toc|salon toc|lam toc|toc nam|toc nu|uon toc|nhuom toc|barber|barbershop|barber shop|haircut|hair salon)\b/.test(
      normalized,
    )
  ) {
    return 'hair_care';
  }

  if (/\b(spa|tham my|lam dep|beauty salon|nail|tiem nail)\b/.test(normalized)) {
    return 'beauty_salon';
  }

  if (
    /\b(quan an|nha hang|do an|an uong|mon an|food|restaurant|com|pho|bun|lau|nuong|buffet)\b/.test(
      normalized,
    )
  ) {
    return 'restaurant';
  }

  if (/\b(caf|cafe|ca phe|coffee|tra sua|do uong)\b/.test(normalized)) {
    return 'cafe';
  }

  if (/\b(nha thuoc|hieu thuoc|pharmacy)\b/.test(normalized)) {
    return 'pharmacy';
  }

  if (/\b(benh vien|phong kham|hospital|clinic|y te)\b/.test(normalized)) {
    return 'hospital';
  }

  if (/\b(nha khoa|rang ham mat|dentist|dental)\b/.test(normalized)) {
    return 'dentist';
  }

  if (/\b(cay xang|tram xang|tram do xang|gas station|petrol)\b/.test(normalized)) {
    return 'gas_station';
  }

  if (/\b(sieu thi|tap hoa|supermarket|grocery)\b/.test(normalized)) {
    return 'supermarket';
  }

  if (/\b(phong gym|gym|fitness|the hinh)\b/.test(normalized)) {
    return 'gym';
  }

  if (/\b(khach san|nha nghi|hotel|motel|homestay)\b/.test(normalized)) {
    return 'lodging';
  }

  if (/\b(ngan hang|bank)\b/.test(normalized)) {
    return 'bank';
  }

  if (/\b(atm|cay rut tien|rut tien)\b/.test(normalized)) {
    return 'atm';
  }

  return undefined;
}
