// Description: Computes stable route progress, heading and turn prompt cadence from raw GPS fixes.
import type { MapRouteStep } from '../../domain/types/user.types';

export type NavigationCoordinate = {
  latitude: number;
  longitude: number;
};

export type NavigationManeuver =
  | 'straight'
  | 'left'
  | 'right'
  | 'slight-left'
  | 'slight-right'
  | 'uturn'
  | 'arrive';

export type NavigationTransportMode =
  | 'driving'
  | 'motorcycle'
  | 'walking'
  | 'bicycling'
  | 'transit';

export type RouteProgressCursor = {
  segmentIndex: number;
  fraction: number;
  distanceAlongMeters: number;
};

export type RouteProgress = {
  cursor: RouteProgressCursor;
  snappedCoordinate: NavigationCoordinate;
  offRouteDistanceMeters: number;
  totalDistanceMeters: number;
  remainingDistanceMeters: number;
  remainingPath: NavigationCoordinate[];
  routeHeading: number | null;
};

export type NavigationInstruction = {
  id: string;
  source: 'google_step' | 'geometry';
  stepIndex?: number;
  distanceMeters: number;
  label: string;
  detail?: string;
  maneuver: NavigationManeuver;
};

export type NavigationPromptPhase =
  | 'start'
  | 'prepare'
  | 'soon'
  | 'now'
  | 'arrive';

export type NavigationPromptKeySet = Set<string>;

export type NavigationPrompt = {
  key: string;
  phase: NavigationPromptPhase;
  shouldVibrate: boolean;
};

export type OffRouteRerouteState = {
  offRouteSince: number | null;
  lastRerouteAt: number;
};

const EARTH_RADIUS_METERS = 6371000;
const DEFAULT_MAX_BACKTRACK_METERS = 12;
const DEFAULT_MAX_FORWARD_METERS = 300;
const DEFAULT_OFF_ROUTE_CONFIRM_MS = 5000;
const DEFAULT_REROUTE_COOLDOWN_MS = 15000;

function radians(value: number) {
  return (value * Math.PI) / 180;
}

export function navigationDistanceMeters(
  left: NavigationCoordinate,
  right: NavigationCoordinate,
) {
  const latFrom = radians(left.latitude);
  const lngFrom = radians(left.longitude);
  const latTo = radians(right.latitude);
  const lngTo = radians(right.longitude);
  const latDelta = latTo - latFrom;
  const lngDelta = lngTo - lngFrom;
  const angle =
    2 *
    Math.atan2(
      Math.sqrt(
        Math.sin(latDelta / 2) ** 2 +
          Math.cos(latFrom) * Math.cos(latTo) * Math.sin(lngDelta / 2) ** 2,
      ),
      Math.sqrt(
        1 -
          (Math.sin(latDelta / 2) ** 2 +
            Math.cos(latFrom) * Math.cos(latTo) * Math.sin(lngDelta / 2) ** 2),
      ),
    );
  return EARTH_RADIUS_METERS * angle;
}

export function navigationBearing(
  origin: NavigationCoordinate,
  destination: NavigationCoordinate,
) {
  const originLat = radians(origin.latitude);
  const destinationLat = radians(destination.latitude);
  const longitudeDelta = radians(destination.longitude - origin.longitude);
  const y = Math.sin(longitudeDelta) * Math.cos(destinationLat);
  const x =
    Math.cos(originLat) * Math.sin(destinationLat) -
    Math.sin(originLat) * Math.cos(destinationLat) * Math.cos(longitudeDelta);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function validCoordinate(point: NavigationCoordinate) {
  return Number.isFinite(point.latitude) && Number.isFinite(point.longitude);
}

function compactPath(path: NavigationCoordinate[]) {
  const result: NavigationCoordinate[] = [];
  for (const coordinate of path) {
    if (!validCoordinate(coordinate)) continue;
    const previous = result[result.length - 1];
    if (!previous || navigationDistanceMeters(previous, coordinate) > 0.5) {
      result.push(coordinate);
    }
  }
  return result;
}

function routeMeasurements(path: NavigationCoordinate[]) {
  const cumulative = [0];
  for (let index = 1; index < path.length; index += 1) {
    cumulative[index] =
      cumulative[index - 1] +
      navigationDistanceMeters(path[index - 1], path[index]);
  }
  return cumulative;
}

function projectPointOnSegment(
  point: NavigationCoordinate,
  start: NavigationCoordinate,
  end: NavigationCoordinate,
) {
  const latitudeScale = 111320;
  const longitudeScale = Math.max(
    1,
    Math.abs(
      111320 *
        Math.cos(radians((point.latitude + start.latitude + end.latitude) / 3)),
    ),
  );
  const px = point.longitude * longitudeScale;
  const py = point.latitude * latitudeScale;
  const sx = start.longitude * longitudeScale;
  const sy = start.latitude * latitudeScale;
  const ex = end.longitude * longitudeScale;
  const ey = end.latitude * latitudeScale;
  const dx = ex - sx;
  const dy = ey - sy;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared <= 0) {
    return {
      coordinate: start,
      distanceMeters: navigationDistanceMeters(point, start),
      fraction: 0,
    };
  }

  const fraction = Math.max(
    0,
    Math.min(1, ((px - sx) * dx + (py - sy) * dy) / lengthSquared),
  );
  const coordinate = {
    latitude: (sy + dy * fraction) / latitudeScale,
    longitude: (sx + dx * fraction) / longitudeScale,
  };
  return {
    coordinate,
    distanceMeters: navigationDistanceMeters(point, coordinate),
    fraction,
  };
}

type Projection = {
  coordinate: NavigationCoordinate;
  distanceAlongMeters: number;
  distanceMeters: number;
  fraction: number;
  segmentIndex: number;
};

function nearestProjection(
  path: NavigationCoordinate[],
  cumulative: number[],
  location: NavigationCoordinate,
  options: {
    minAlongMeters?: number;
    maxAlongMeters?: number;
    preferredAlongMeters?: number;
    progressionPenalty?: number;
  } = {},
) {
  let nearest: (Projection & { score: number }) | null = null;
  for (let index = 0; index < path.length - 1; index += 1) {
    const segmentLength = cumulative[index + 1] - cumulative[index];
    const segmentStart = cumulative[index];
    const segmentEnd = cumulative[index + 1];
    const allowedStart = Math.max(
      segmentStart,
      options.minAlongMeters ?? segmentStart,
    );
    const allowedEnd = Math.min(
      segmentEnd,
      options.maxAlongMeters ?? segmentEnd,
    );
    if (allowedStart > allowedEnd) continue;

    const rawProjection = projectPointOnSegment(
      location,
      path[index],
      path[index + 1],
    );
    const rawDistanceAlong =
      segmentStart + segmentLength * rawProjection.fraction;
    const distanceAlongMeters = Math.max(
      allowedStart,
      Math.min(allowedEnd, rawDistanceAlong),
    );
    const fraction =
      segmentLength > 0
        ? (distanceAlongMeters - segmentStart) / segmentLength
        : 0;
    const coordinate = {
      latitude:
        path[index].latitude +
        (path[index + 1].latitude - path[index].latitude) * fraction,
      longitude:
        path[index].longitude +
        (path[index + 1].longitude - path[index].longitude) * fraction,
    };
    const distanceMeters = navigationDistanceMeters(location, coordinate);

    const progression = Math.max(
      0,
      distanceAlongMeters - (options.preferredAlongMeters ?? 0),
    );
    const score =
      distanceMeters + progression * (options.progressionPenalty ?? 0);
    if (!nearest || score < nearest.score) {
      nearest = {
        coordinate,
        distanceAlongMeters,
        distanceMeters,
        fraction,
        segmentIndex: index,
        score,
      };
    }
  }
  return nearest;
}

function coordinateAtDistance(
  path: NavigationCoordinate[],
  cumulative: number[],
  targetDistance: number,
) {
  if (path.length === 0) return null;
  if (path.length === 1 || targetDistance <= 0) {
    return { coordinate: path[0], fraction: 0, segmentIndex: 0 };
  }

  const total = cumulative[cumulative.length - 1] ?? 0;
  if (targetDistance >= total) {
    return {
      coordinate: path[path.length - 1],
      fraction: 1,
      segmentIndex: Math.max(0, path.length - 2),
    };
  }

  for (let index = 0; index < path.length - 1; index += 1) {
    if (cumulative[index + 1] < targetDistance) continue;
    const segmentLength = cumulative[index + 1] - cumulative[index];
    const fraction =
      segmentLength > 0
        ? (targetDistance - cumulative[index]) / segmentLength
        : 0;
    return {
      coordinate: {
        latitude:
          path[index].latitude +
          (path[index + 1].latitude - path[index].latitude) * fraction,
        longitude:
          path[index].longitude +
          (path[index + 1].longitude - path[index].longitude) * fraction,
      },
      fraction,
      segmentIndex: index,
    };
  }
  return null;
}

export function advanceRouteProgress(
  rawPath: NavigationCoordinate[],
  location: NavigationCoordinate,
  previousCursor?: RouteProgressCursor | null,
  options: {
    maxBacktrackMeters?: number;
    maxForwardMeters?: number;
  } = {},
): RouteProgress {
  const path = compactPath(rawPath);
  if (path.length < 2) {
    const coordinate = path[0] ?? location;
    return {
      cursor: { segmentIndex: 0, fraction: 0, distanceAlongMeters: 0 },
      snappedCoordinate: coordinate,
      offRouteDistanceMeters: navigationDistanceMeters(location, coordinate),
      totalDistanceMeters: 0,
      remainingDistanceMeters: 0,
      remainingPath: [coordinate],
      routeHeading: null,
    };
  }

  const cumulative = routeMeasurements(path);
  const totalDistanceMeters = cumulative[cumulative.length - 1];
  const globalProjection = nearestProjection(path, cumulative, location);
  const maxBacktrack =
    options.maxBacktrackMeters ?? DEFAULT_MAX_BACKTRACK_METERS;
  const maxForward = options.maxForwardMeters ?? DEFAULT_MAX_FORWARD_METERS;
  const constrainedProjection = previousCursor
    ? nearestProjection(path, cumulative, location, {
        minAlongMeters: Math.max(
          0,
          previousCursor.distanceAlongMeters - maxBacktrack,
        ),
        maxAlongMeters: Math.min(
          totalDistanceMeters,
          previousCursor.distanceAlongMeters + maxForward,
        ),
        preferredAlongMeters: previousCursor.distanceAlongMeters,
        progressionPenalty: 0.04,
      })
    : globalProjection;
  const candidate = constrainedProjection ?? globalProjection;
  const candidateDistance = candidate?.distanceAlongMeters ?? 0;
  const distanceAlongMeters = previousCursor
    ? Math.max(previousCursor.distanceAlongMeters, candidateDistance)
    : candidateDistance;
  const locationOnRoute = coordinateAtDistance(
    path,
    cumulative,
    distanceAlongMeters,
  );
  const snappedCoordinate = locationOnRoute?.coordinate ?? path[0];
  const segmentIndex = locationOnRoute?.segmentIndex ?? 0;
  const remainingPath = compactPath([
    snappedCoordinate,
    ...path.slice(segmentIndex + 1),
  ]);
  const lookAhead = coordinateAtDistance(
    path,
    cumulative,
    Math.min(totalDistanceMeters, distanceAlongMeters + 20),
  );
  const routeHeading =
    lookAhead &&
    navigationDistanceMeters(snappedCoordinate, lookAhead.coordinate) > 2
      ? navigationBearing(snappedCoordinate, lookAhead.coordinate)
      : null;

  return {
    cursor: {
      segmentIndex,
      fraction: locationOnRoute?.fraction ?? 0,
      distanceAlongMeters,
    },
    snappedCoordinate,
    offRouteDistanceMeters:
      candidate?.distanceMeters ??
      globalProjection?.distanceMeters ??
      navigationDistanceMeters(location, snappedCoordinate),
    totalDistanceMeters,
    remainingDistanceMeters: Math.max(
      0,
      totalDistanceMeters - distanceAlongMeters,
    ),
    remainingPath,
    routeHeading,
  };
}

function validHeading(value: number | null | undefined): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 360
  );
}

function bearingDelta(fromBearing: number, toBearing: number) {
  return ((toBearing - fromBearing + 540) % 360) - 180;
}

function blendBearings(
  primary: number,
  secondary: number,
  secondaryWeight: number,
) {
  return (
    (primary + bearingDelta(primary, secondary) * secondaryWeight + 360) % 360
  );
}

export function resolveFusedNavigationHeading({
  routeHeading,
  gpsHeading,
  deviceHeading,
  previousHeading,
  speedMetersPerSecond,
  isOnRoute,
}: {
  routeHeading: number | null;
  gpsHeading: number | null;
  deviceHeading: number | null;
  previousHeading: number | null;
  speedMetersPerSecond: number;
  isOnRoute: boolean;
}) {
  const speed = Math.max(0, speedMetersPerSecond);
  let target: number;

  if (isOnRoute && validHeading(routeHeading)) {
    const gpsDifference = validHeading(gpsHeading)
      ? Math.abs(bearingDelta(routeHeading, gpsHeading))
      : Number.POSITIVE_INFINITY;
    target =
      speed >= 1.2 && validHeading(gpsHeading) && gpsDifference <= 65
        ? blendBearings(routeHeading, gpsHeading, 0.3)
        : routeHeading;
  } else if (speed >= 1.2 && validHeading(gpsHeading)) {
    target = gpsHeading;
  } else if (validHeading(previousHeading)) {
    target = previousHeading;
  } else if (validHeading(deviceHeading)) {
    target = deviceHeading;
  } else if (validHeading(gpsHeading)) {
    target = gpsHeading;
  } else if (validHeading(routeHeading)) {
    target = routeHeading;
  } else {
    target = 0;
  }

  if (!validHeading(previousHeading)) return target;
  const maxChange = speed >= 4 ? 32 : speed >= 1.2 ? 24 : 12;
  const delta = bearingDelta(previousHeading, target);
  return (
    (previousHeading + Math.max(-maxChange, Math.min(maxChange, delta)) + 360) %
    360
  );
}

function maneuverFromValue(value?: string): NavigationManeuver {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('uturn')) return 'uturn';
  if (normalized.includes('slight-left')) return 'slight-left';
  if (normalized.includes('slight-right')) return 'slight-right';
  if (normalized.includes('left')) return 'left';
  if (normalized.includes('right')) return 'right';
  return 'straight';
}

function cleanInstruction(value?: string) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.max(1, Math.round(meters))} m`;
  const kilometers = meters / 1000;
  return `${
    kilometers >= 10 ? Math.round(kilometers) : kilometers.toFixed(1)
  } km`;
}

function turnLabel(maneuver: NavigationManeuver) {
  switch (maneuver) {
    case 'left':
      return 'Rẽ trái';
    case 'right':
      return 'Rẽ phải';
    case 'slight-left':
      return 'Chếch trái';
    case 'slight-right':
      return 'Chếch phải';
    case 'uturn':
      return 'Quay đầu';
    case 'arrive':
      return 'Sắp đến nơi';
    default:
      return 'Đi thẳng';
  }
}

function locateRouteSteps(
  routePath: NavigationCoordinate[],
  routeSteps: MapRouteStep[],
) {
  const path = compactPath(routePath);
  const cumulative = routeMeasurements(path);
  let minimumAlong = 0;
  return routeSteps
    .map((step, stepIndex) => {
      const anchor = step.startLocation ?? step.path?.[0];
      if (!anchor || path.length < 2) return null;
      const projection = nearestProjection(path, cumulative, anchor, {
        minAlongMeters: Math.max(0, minimumAlong - 5),
      });
      if (!projection) return null;
      minimumAlong = Math.max(minimumAlong, projection.distanceAlongMeters);
      return { projection, step, stepIndex };
    })
    .filter(Boolean) as Array<{
    projection: Projection;
    step: MapRouteStep;
    stepIndex: number;
  }>;
}

function geometryInstruction(
  progress: RouteProgress,
  destinationTitle?: string,
): NavigationInstruction | null {
  const path = progress.remainingPath;
  if (progress.remainingDistanceMeters <= 40) {
    return {
      id: 'geometry:arrival',
      source: 'geometry',
      distanceMeters: progress.remainingDistanceMeters,
      label: `Sắp đến ${destinationTitle || 'điểm đến'}`,
      maneuver: 'arrive',
    };
  }

  let distanceAhead = 0;
  for (let index = 1; index < path.length - 1; index += 1) {
    distanceAhead += navigationDistanceMeters(path[index - 1], path[index]);
    const incoming = navigationBearing(path[index - 1], path[index]);
    const outgoing = navigationBearing(path[index], path[index + 1]);
    const delta = bearingDelta(incoming, outgoing);
    const absolute = Math.abs(delta);
    const maneuver: NavigationManeuver =
      absolute >= 145
        ? 'uturn'
        : absolute < 32
        ? 'straight'
        : absolute < 70
        ? delta > 0
          ? 'slight-right'
          : 'slight-left'
        : delta > 0
        ? 'right'
        : 'left';
    if (maneuver !== 'straight' && distanceAhead >= 12) {
      const coordinate = path[index];
      return {
        id: `geometry:${coordinate.latitude.toFixed(
          5,
        )}:${coordinate.longitude.toFixed(5)}`,
        source: 'geometry',
        distanceMeters: distanceAhead,
        label: `${formatDistance(distanceAhead)} nữa`,
        detail: turnLabel(maneuver),
        maneuver,
      };
    }
  }

  return {
    id: 'geometry:continue',
    source: 'geometry',
    distanceMeters: progress.remainingDistanceMeters,
    label: `Tiếp tục ${formatDistance(
      Math.min(progress.remainingDistanceMeters, 500),
    )}`,
    detail: 'Đi theo tuyến đã chọn',
    maneuver: 'straight',
  };
}

export function resolveRouteInstruction({
  routePath,
  progress,
  routeSteps,
  destinationTitle,
}: {
  routePath: NavigationCoordinate[];
  progress: RouteProgress;
  routeSteps?: MapRouteStep[];
  destinationTitle?: string;
}): NavigationInstruction | null {
  if (progress.remainingDistanceMeters <= 40) {
    return geometryInstruction(progress, destinationTitle);
  }

  if (routeSteps?.length) {
    const locatedSteps = locateRouteSteps(routePath, routeSteps);
    const next = locatedSteps.find(
      item =>
        item.projection.distanceAlongMeters >=
        progress.cursor.distanceAlongMeters - 8,
    );
    if (next) {
      const distanceMeters = Math.max(
        1,
        next.projection.distanceAlongMeters -
          progress.cursor.distanceAlongMeters,
      );
      const maneuver = maneuverFromValue(next.step.maneuver);
      const anchor = next.projection.coordinate;
      return {
        id: `step:${next.stepIndex}:${anchor.latitude.toFixed(
          5,
        )}:${anchor.longitude.toFixed(5)}`,
        source: 'google_step',
        stepIndex: next.stepIndex,
        distanceMeters,
        label:
          distanceMeters <= 8
            ? 'Bắt đầu'
            : `${formatDistance(distanceMeters)} nữa`,
        detail: cleanInstruction(next.step.instruction) || turnLabel(maneuver),
        maneuver,
      };
    }
  }

  return geometryInstruction(progress, destinationTitle);
}

function promptThresholds(mode: NavigationTransportMode) {
  if (mode === 'walking') return { prepare: 100, soon: 40, now: 12 };
  if (mode === 'bicycling') return { prepare: 180, soon: 65, now: 20 };
  return { prepare: 300, soon: 100, now: 30 };
}

export function buildNavigationPrompt(
  instruction: NavigationInstruction,
  mode: NavigationTransportMode,
  announcedKeys: NavigationPromptKeySet,
): NavigationPrompt | null {
  const thresholds = promptThresholds(mode);
  let phase: NavigationPromptPhase | null = null;

  if (instruction.maneuver === 'arrive') {
    phase = instruction.distanceMeters <= 40 ? 'arrive' : null;
  } else if (instruction.maneuver === 'straight') {
    phase =
      instruction.stepIndex === 0 && instruction.distanceMeters <= 8
        ? 'start'
        : null;
  } else if (instruction.distanceMeters <= thresholds.now) {
    phase = 'now';
  } else if (instruction.distanceMeters <= thresholds.soon) {
    phase = 'soon';
  } else if (instruction.distanceMeters <= thresholds.prepare) {
    phase = 'prepare';
  }

  if (!phase) return null;
  const key = `${instruction.id}:${phase}`;
  if (announcedKeys.has(key)) return null;
  return {
    key,
    phase,
    shouldVibrate:
      phase === 'arrive' ||
      (phase === 'now' && instruction.maneuver !== 'straight'),
  };
}

export function offRouteThresholdMeters(horizontalAccuracyMeters?: number) {
  const accuracy = Number(horizontalAccuracyMeters);
  if (!Number.isFinite(accuracy) || accuracy <= 0) return 30;
  return Math.max(30, Math.min(80, accuracy * 1.5));
}

export function evaluateOffRouteReroute({
  offRouteDistanceMeters,
  horizontalAccuracyMeters,
  now,
  state,
  confirmationMs = DEFAULT_OFF_ROUTE_CONFIRM_MS,
  cooldownMs = DEFAULT_REROUTE_COOLDOWN_MS,
}: {
  offRouteDistanceMeters: number;
  horizontalAccuracyMeters?: number;
  now: number;
  state: OffRouteRerouteState | null;
  confirmationMs?: number;
  cooldownMs?: number;
}) {
  const currentState: OffRouteRerouteState = state ?? {
    offRouteSince: null,
    lastRerouteAt: 0,
  };
  if (
    offRouteDistanceMeters <= offRouteThresholdMeters(horizontalAccuracyMeters)
  ) {
    return {
      shouldReroute: false,
      state: { ...currentState, offRouteSince: null },
    };
  }

  const offRouteSince = currentState.offRouteSince ?? now;
  const cooldownElapsed =
    currentState.lastRerouteAt === 0 ||
    now - currentState.lastRerouteAt >= cooldownMs;
  const shouldReroute =
    now - offRouteSince >= confirmationMs && cooldownElapsed;
  return {
    shouldReroute,
    state: {
      offRouteSince: shouldReroute ? now : offRouteSince,
      lastRerouteAt: shouldReroute ? now : currentState.lastRerouteAt,
    },
  };
}

export function estimateRemainingDuration(
  totalDurationSeconds: number | null | undefined,
  progress: Pick<
    RouteProgress,
    'totalDistanceMeters' | 'remainingDistanceMeters'
  > | null,
) {
  const duration = Number(totalDurationSeconds);
  if (!Number.isFinite(duration) || duration <= 0) return null;
  if (!progress || progress.totalDistanceMeters <= 0) return duration;
  return Math.max(
    0,
    Math.round(
      duration *
        Math.min(
          1,
          progress.remainingDistanceMeters / progress.totalDistanceMeters,
        ),
    ),
  );
}
