// Description: Parses external map coordinates without converting null values into Null Island (0, 0).
export type MapCoordinate = {
  latitude: number;
  longitude: number;
};

function parseCoordinatePart(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== 'string' || value.trim() === '') return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseMapCoordinate(
  latitude: unknown,
  longitude: unknown,
): MapCoordinate | null {
  const nextLatitude = parseCoordinatePart(latitude);
  const nextLongitude = parseCoordinatePart(longitude);

  if (
    nextLatitude === null ||
    nextLongitude === null ||
    nextLatitude < -90 ||
    nextLatitude > 90 ||
    nextLongitude < -180 ||
    nextLongitude > 180 ||
    (nextLatitude === 0 && nextLongitude === 0)
  ) {
    return null;
  }

  return {
    latitude: nextLatitude,
    longitude: nextLongitude,
  };
}
