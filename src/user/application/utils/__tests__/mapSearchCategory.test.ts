import {
  getGoogleCategorySearchQuery,
  isGoogleNearbyCategoryType,
} from '../mapSearchCategory';

describe('map search category matching', () => {
  it.each([
    ['quán cắt tóc', 'hair_care'],
    ['tóc', 'hair_care'],
    ['tiệm tóc nam', 'hair_care'],
    ['barber shop', 'hair_care'],
    ['salon tóc nữ', 'hair_care'],
    ['quán cà phê', 'cafe'],
    ['caf', 'cafe'],
    ['nhà hàng gần đây', 'restaurant'],
    ['nhà thuốc', 'pharmacy'],
    ['xăng', 'gas_station'],
    ['cây xăng', 'gas_station'],
    ['xăng dầu', 'gas_station'],
    ['trạm xăng', 'gas_station'],
    ['trạm xăng dầu gần đây', 'gas_station'],
    ['fuel station', 'gas_station'],
  ])('maps %s to %s', (query, expected) => {
    expect(getGoogleCategorySearchQuery(query)).toBe(expected);
  });

  it('does not convert a normal place name into a category search', () => {
    expect(getGoogleCategorySearchQuery('Hồ Gươm')).toBeUndefined();
  });

  it('accepts only supported Google Nearby types', () => {
    expect(isGoogleNearbyCategoryType('hair_care')).toBe(true);
    expect(isGoogleNearbyCategoryType('unknown')).toBe(false);
  });
});
