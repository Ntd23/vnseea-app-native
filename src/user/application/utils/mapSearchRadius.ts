export const MAP_TYPEAHEAD_SEARCH_RADIUS_METERS = 5000;
export const MAP_COMMITTED_SEARCH_RADIUS_METERS = 20000;

export function resolveMapSearchScopeRadius(input: {
  globalSearch?: boolean;
  lat?: number;
  lng?: number;
  radius?: number;
}) {
  if (input.globalSearch) return undefined;

  return typeof input.lat === 'number' &&
    Number.isFinite(input.lat) &&
    typeof input.lng === 'number' &&
    Number.isFinite(input.lng)
    ? input.radius
    : undefined;
}

export function filterDistanceScopedResults<T>(
  items: T[],
  radiusMeters: number | undefined,
  getDistanceMeters: (item: T) => number | undefined,
) {
  if (
    typeof radiusMeters !== 'number' ||
    !Number.isFinite(radiusMeters) ||
    radiusMeters <= 0
  ) {
    return items;
  }

  return items.filter(item => {
    const distanceMeters = getDistanceMeters(item);
    return (
      typeof distanceMeters === 'number' &&
      Number.isFinite(distanceMeters) &&
      distanceMeters >= 0 &&
      distanceMeters <= radiusMeters
    );
  });
}
