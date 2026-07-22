import { parseMapCoordinate } from '../mapCoordinate';

describe('parseMapCoordinate', () => {
  it.each([
    [null, null],
    [undefined, undefined],
    ['', ''],
    [' ', ' '],
    [false, false],
    [0, 0],
    ['0', '0'],
  ])('rejects missing or placeholder coordinates (%p, %p)', (lat, lng) => {
    expect(parseMapCoordinate(lat, lng)).toBeNull();
  });

  it('parses numeric strings returned by Google place details', () => {
    expect(parseMapCoordinate('21.038514', '105.763481')).toEqual({
      latitude: 21.038514,
      longitude: 105.763481,
    });
  });

  it('rejects coordinates outside valid map bounds', () => {
    expect(parseMapCoordinate(105.763481, 21.038514)).toBeNull();
    expect(parseMapCoordinate(21.038514, 181)).toBeNull();
  });

  it('keeps valid coordinates located on one zero-valued axis', () => {
    expect(parseMapCoordinate(0, 105)).toEqual({
      latitude: 0,
      longitude: 105,
    });
  });
});
