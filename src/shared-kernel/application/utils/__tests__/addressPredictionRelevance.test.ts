import {
  filterAddressPredictions,
  isAddressPredictionRelevant,
  normalizeAddressSearchText,
} from '../addressPredictionRelevance';

describe('address prediction relevance', () => {
  it('normalizes Vietnamese accents for address matching', () => {
    expect(normalizeAddressSearchText('Ngõ 58 Nguyễn Khánh Toàn')).toBe(
      'ngo 58 nguyen khanh toan',
    );
    expect(normalizeAddressSearchText('Đường Nguyễn Khánh Toàn')).toBe(
      'duong nguyen khanh toan',
    );
  });

  it('keeps the matching Vietnamese street address', () => {
    expect(
      isAddressPredictionRelevant('10 ngách 32 ngõ 58 nguyên khánh toàn', {
        description:
          '10 Ngách 32 Ngõ 58 Nguyễn Khánh Toàn, Cầu Giấy, Hà Nội',
      }),
    ).toBe(true);
  });

  it('matches a street address when Google inserts generic road words', () => {
    expect(
      isAddressPredictionRelevant('58 nguyễn khánh toàn', {
        main_text: '58 Đường Nguyễn Khánh Toàn',
        secondary_text: 'Cầu Giấy, Hà Nội, Việt Nam',
      }),
    ).toBe(true);
  });

  it('accepts a small typo while preserving the matching house number', () => {
    expect(
      isAddressPredictionRelevant('58 nguyen khanh taon', {
        description:
          '58 Đường Nguyễn Khánh Toàn, Cầu Giấy, Hà Nội, Việt Nam',
      }),
    ).toBe(true);
  });

  it('rejects popular businesses unrelated to the typed address', () => {
    const predictions = [
      {
        main_text: 'Mun Dining',
        secondary_text: '86 P. Hàng Gai, Hoàn Kiếm, Hà Nội',
        description: 'Mun Dining, 86 P. Hàng Gai, Hoàn Kiếm, Hà Nội',
      },
      {
        main_text: 'Địa chỉ cần tìm',
        secondary_text:
          '10 Ngách 32 Ngõ 58 Nguyễn Khánh Toàn, Cầu Giấy, Hà Nội',
        description:
          '10 Ngách 32 Ngõ 58 Nguyễn Khánh Toàn, Cầu Giấy, Hà Nội',
      },
    ];

    expect(
      filterAddressPredictions(
        '10 ngách 32 ngõ 58 nguyên khánh toàn',
        predictions,
      ),
    ).toEqual([predictions[1]]);
  });

  it('requires all typed address numbers to match', () => {
    expect(
      isAddressPredictionRelevant('10 ngách 32 ngõ 58 Nguyễn Khánh Toàn', {
        description: '58 Nguyễn Khánh Toàn, Cầu Giấy, Hà Nội',
      }),
    ).toBe(false);
  });

  it('still rejects fuzzy street names when the house number differs', () => {
    expect(
      isAddressPredictionRelevant('58 nguyen khanh taon', {
        description: '86 Đường Nguyễn Khánh Toàn, Cầu Giấy, Hà Nội',
      }),
    ).toBe(false);
  });
});
