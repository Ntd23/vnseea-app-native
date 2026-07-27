import {
  filterDistanceScopedResults,
  MAP_COMMITTED_SEARCH_RADIUS_METERS,
  MAP_TYPEAHEAD_SEARCH_RADIUS_METERS,
} from '../mapSearchRadius';

describe('map search radius', () => {
  it('uses the confirmed typeahead and committed search radii', () => {
    expect(MAP_TYPEAHEAD_SEARCH_RADIUS_METERS).toBe(5000);
    expect(MAP_COMMITTED_SEARCH_RADIUS_METERS).toBe(20000);
  });

  it('keeps only results within the requested hard radius', () => {
    const results = filterDistanceScopedResults(
      [
        { id: 'near', distanceMeters: 4999 },
        { id: 'edge', distanceMeters: 5000 },
        { id: 'far', distanceMeters: 5001 },
        { id: 'unknown' },
      ],
      5000,
      item => item.distanceMeters,
    );

    expect(results.map(item => item.id)).toEqual(['near', 'edge']);
  });

  it('does not filter when no valid radius is requested', () => {
    const items = [{ id: 'unknown' }, { id: 'far', distanceMeters: 50000 }];

    expect(
      filterDistanceScopedResults(items, undefined, item => item.distanceMeters),
    ).toEqual(items);
  });
});
