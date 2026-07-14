import {
  encodePointsQrPayload,
  parsePointsQrPayload,
  parsePositivePoints,
} from '../pointsTransfer';

describe('VNSEEA points transfer protocol', () => {
  test('encodes the canonical POINTS QR payload', () => {
    expect(encodePointsQrPayload({recipientUserId: 42, points: 15})).toBe(
      'POINTS|to=42|points=15|amount=15',
    );
    expect(encodePointsQrPayload({recipientUserId: 42})).toBe('POINTS|to=42');
  });

  test.each([1, '1', 999, '999'])('accepts positive integer %p', value => {
    expect(parsePositivePoints(value)).toBe(Number(value));
  });

  test.each([0, '0', -1, '-1', 1.5, '1.5', '1e3', '+1', true, '', null])(
    'rejects non-canonical points value %p',
    value => {
      expect(parsePositivePoints(value)).toBeNull();
    },
  );

  test('enforces the supported points column limit', () => {
    expect(parsePositivePoints('2147483647')).toBe(2147483647);
    expect(parsePositivePoints('2147483648')).toBeNull();
  });

  test('parses canonical POINTS QR and requires matching points/amount', () => {
    expect(parsePointsQrPayload('POINTS|to=42|points=15|amount=15')).toEqual({
      userId: '42',
      username: '',
      points: 15,
      legacy: false,
    });
    expect(parsePointsQrPayload('POINTS|to=42|points=15|amount=14')).toBeNull();
    expect(parsePointsQrPayload('POINTS|to=42|amount=15')).toBeNull();
  });

  test('keeps WALLET QR read compatibility only for integer VNSEEA values', () => {
    expect(parsePointsQrPayload('WALLET|to=42|amount=15')).toEqual({
      userId: '42',
      username: '',
      points: 15,
      legacy: true,
    });
    expect(parsePointsQrPayload('WALLET|to=42|amount=15.5')).toBeNull();
  });
});
