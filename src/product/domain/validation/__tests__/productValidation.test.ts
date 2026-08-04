import {
  assertPositiveProductUnits,
  parsePositiveProductUnits,
  PRODUCT_UNITS_ERROR,
} from '../productValidation';

describe('product quantity validation', () => {
  it.each([1, 2, 100, '1', ' 25 '])(
    'accepts positive integer quantity %p',
    value => {
      expect(parsePositiveProductUnits(value)).toBe(Number(value));
    },
  );

  it.each([
    undefined,
    null,
    true,
    false,
    '',
    '   ',
    0,
    '0',
    -1,
    '-2',
    1.5,
    '1.5',
    'abc',
  ])('rejects invalid quantity %p', value => {
    expect(parsePositiveProductUnits(value)).toBeNull();
    expect(() => assertPositiveProductUnits(value)).toThrow(
      PRODUCT_UNITS_ERROR,
    );
  });
});
