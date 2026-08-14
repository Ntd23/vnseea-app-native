import { buildMapPageSearchRequest } from '../mapPageSearchRequest';

describe('map Page search request', () => {
  it('searches Page names nationwide while keeping the user origin for ranking', () => {
    expect(
      buildMapPageSearchRequest({
        keyword: ' h ',
        distance: 20,
        limit: 20,
        lat: 10.7769,
        lng: 106.7009,
        fast: true,
        globalSearch: true,
      }),
    ).toEqual({
      type: 'page_suggestions',
      query: 'h',
      distance: undefined,
      limit: 20,
      origin_lat: 10.7769,
      origin_lng: 106.7009,
      fast: 1,
      global_search: 1,
    });
  });

  it('keeps viewport distance constraints for ordinary nearby discovery', () => {
    expect(
      buildMapPageSearchRequest({
        keyword: 'cafe',
        distance: 5,
        lat: 21.0285,
        lng: 105.8542,
      }),
    ).toMatchObject({
      query: 'cafe',
      distance: 5,
      origin_lat: 21.0285,
      origin_lng: 105.8542,
      global_search: undefined,
    });
  });
});
