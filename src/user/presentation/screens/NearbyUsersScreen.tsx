// Description: Shows the Nearby page-and-address map search experience with route actions.
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  Keyboard,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from 'react-native';
import MapView, {
  Circle,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
  type Region,
  type UserLocationChangeEvent,
} from 'react-native-maps';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Bell,
  Compass,
  CornerUpLeft,
  CornerUpRight,
  Eye,
  Heart,
  LocateFixed,
  MapPin,
  MapPinCheck,
  MessageCircle,
  Mic,
  MoreVertical,
  Navigation as NavigationIcon,
  Search,
  Share2,
  SlidersHorizontal,
  Undo2,
  UserPlus,
  Users,
  Volume2,
  X,
  Coffee,
  Utensils,
  ShoppingBag,
  Hotel,
  GraduationCap,
  Fuel,
  Landmark,
  Activity,
  Plane,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Scissors,
} from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import { createPagesRepository } from '../../../pages/infrastructure/repositories/ApiPagesRepository';
import type {
  PageUser,
  PagesItem,
} from '../../../pages/domain/types/pages.types';
import type { ChatItem } from '../../../messages/domain/types/messages.types';
import { useUserViewModel } from '../../application/view-models/useUserViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  speakNavigationInstruction,
  stopNavigationSpeech,
} from '../../infrastructure/navigation/navigationSpeech';
import { subscribeNavigationHeading } from '../../infrastructure/navigation/navigationHeading';
import type {
  MapPlacePrediction,
  MapRoute,
  MapRouteStep,
  NearbyPlace,
} from '../../domain/types/user.types';

type NearbyNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000FF';
const ACCENT = '#EF4444';
const FALLBACK_AVATAR = 'https://v2.vnseea.vn/upload/photos/d-avatar.jpg';
const NAVIGATION_CAMERA_PITCH = 60;
const NAVIGATION_CAMERA_ZOOM = 19.25;
const NAVIGATION_CAMERA_HEADING = 0;
const ROUTE_CONNECTOR_MIN_METERS = 5;
const ROUTE_LOOKAHEAD_MIN_METERS = 14;
const ROUTE_LOOKAHEAD_MAX_METERS = 58;
const OFF_ROUTE_DISTANCE_METERS = 45;
const REROUTE_COOLDOWN_MS = 12000;
const LOCATION_RECENTER_DISTANCE_METERS = 50000;
const SEARCH_RADIUS_METERS = 3000;
const MAX_VISIBLE_PAGE_MARKERS = 64;
const IDLE_LOCATION_STATE_MIN_METERS = 8;
const NAVIGATION_LOCATION_STATE_MIN_METERS = 2;
const IDLE_LOCATION_STATE_MIN_MS = 1400;
const NAVIGATION_LOCATION_STATE_MIN_MS = 650;
const HEADING_STATE_MIN_DEGREES = 4;
const HEADING_STATE_MIN_MS = 120;
const NAVIGATION_MOVING_SPEED_MPS = 0.8;
const SHOW_APP_DISCOVERY_PLACES_ON_MAP = true;
const HIDE_GOOGLE_DISCOVERY_PLACES = false;
const pagesRepository = createPagesRepository();
const CLEAN_GOOGLE_MAP_STYLE = [
  {
    featureType: 'transit',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.neighborhood',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'administrative.land_parcel',
    elementType: 'labels',
    stylers: [{ visibility: 'off' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.icon',
    stylers: [{ visibility: 'off' }],
  },
];
const DEFAULT_REGION = {
  latitude: 16.047079,
  longitude: 108.20623,
  latitudeDelta: 0.03,
  longitudeDelta: 0.03,
};

type SuggestionItem =
  | { id: string; kind: 'page'; page: NearbyPlace }
  | { id: string; kind: 'google'; prediction: MapPlacePrediction };

type SelectedPoint = {
  id: string;
  source: 'page' | 'google' | 'self';
  title: string;
  subtitle: string;
  address?: string;
  avatarUrl?: string;
  url?: string;
  showNameBadge?: boolean;
  page?: NearbyPlace;
  coordinate: LatLng;
  distanceMeters?: number;
  types?: string[];
  icon?: string;
  iconBackgroundColor?: string;
};

type RouteOption = MapRoute & {
  id: string;
  path: LatLng[];
};

type LocationSource = 'gps' | 'profile' | null;
type RouteLoadSource = 'user' | 'auto';

type PageAvatarMapMarkerProps = {
  coordinate: LatLng;
  place: Pick<NearbyPlace, 'avatarUrl' | 'id' | 'name'>;
  selected?: boolean;
  zIndex: number;
  onPress: () => void;
};

function PageAvatarMapMarkerComponent({
  coordinate,
  place,
  selected = false,
  zIndex,
  onPress,
}: PageAvatarMapMarkerProps) {
  const avatarUri = place.avatarUrl || FALLBACK_AVATAR;
  const markerInitial = useMemo(() => {
    const trimmedName = place.name.trim();
    return trimmedName.length > 0 ? trimmedName.charAt(0).toLocaleUpperCase('vi-VN') : 'V';
  }, [place.name]);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [imageReady, setImageReady] = useState(false);
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    setImageReady(false);
    setTracksViewChanges(true);
    
    // Safety fallback: stop tracking view changes after 5 seconds to optimize performance
    const fallbackTimer = setTimeout(() => {
      setTracksViewChanges(false);
    }, 5000);

    return () => {
      clearTimeout(fallbackTimer);
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
  }, [avatarUri]);

  const handleImageLoaded = useCallback(() => {
    setImageReady(true);
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
    }
    settleTimerRef.current = setTimeout(() => {
      setTracksViewChanges(false);
      settleTimerRef.current = null;
    }, 500);
  }, []);

  const handleImageError = useCallback(() => {
    setImageReady(false);
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
    }
    settleTimerRef.current = setTimeout(() => {
      setTracksViewChanges(false);
      settleTimerRef.current = null;
    }, 120);
  }, []);

  return (
    <Marker
      anchor={{ x: 0.5, y: 1 }}
      coordinate={coordinate}
      onPress={onPress}
      tracksViewChanges={tracksViewChanges}
      zIndex={zIndex}
    >
      <View
        collapsable={false}
        renderToHardwareTextureAndroid
        style={[
          styles.pageAvatarMapMarkerRoot,
          selected && styles.selectedPageAvatarMarker,
        ]}
      >
        <View style={styles.pageAvatarMarkerStage}>
          {selected ? <View style={styles.pageAvatarSelectedHalo} /> : null}
          <View
            collapsable={false}
            renderToHardwareTextureAndroid
            style={[
              styles.pageAvatarMarker,
              selected && styles.pageAvatarMarkerSelected,
            ]}
          >
            <View style={styles.pageAvatarMarkerFallback}>
              <Text style={styles.pageAvatarMarkerFallbackText}>{markerInitial}</Text>
            </View>
            <Image
              key={avatarUri}
              source={{ uri: avatarUri }}
              resizeMode="cover"
              fadeDuration={0}
              onLoadEnd={handleImageLoaded}
              onError={handleImageError}
              style={[
                styles.pageAvatarMarkerImage,
                !imageReady && styles.pageAvatarMarkerImageLoading,
              ]}
            />
          </View>
        </View>
        <View
          collapsable={false}
          style={[
            styles.pageAvatarNameBadge,
            selected && styles.pageAvatarNameBadgeSelected,
          ]}
        >
          <Text
            style={[
              styles.pageAvatarNameBadgeText,
              selected && styles.pageAvatarNameBadgeTextSelected,
            ]}
            numberOfLines={1}
          >
            {place.name}
          </Text>
        </View>
      </View>
    </Marker>
  );
}

const PageAvatarMapMarker = React.memo(
  PageAvatarMapMarkerComponent,
  (previous, next) =>
    previous.place.id === next.place.id &&
    previous.place.name === next.place.name &&
    previous.place.avatarUrl === next.place.avatarUrl &&
    previous.coordinate.latitude === next.coordinate.latitude &&
    previous.coordinate.longitude === next.coordinate.longitude &&
    previous.selected === next.selected &&
    previous.zIndex === next.zIndex,
);

type TurnInstruction = {
  distanceMeters: number;
  label: string;
  detail?: string;
  maneuver: 'straight' | 'left' | 'right' | 'slight-left' | 'slight-right' | 'uturn' | 'arrive';
};

function distanceMeters(left: LatLng, right: LatLng) {
  const earthRadius = 6371000;
  const latFrom = (left.latitude * Math.PI) / 180;
  const lngFrom = (left.longitude * Math.PI) / 180;
  const latTo = (right.latitude * Math.PI) / 180;
  const lngTo = (right.longitude * Math.PI) / 180;
  const latDelta = latTo - latFrom;
  const lngDelta = lngTo - lngFrom;
  const angle =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin(latDelta / 2) ** 2 +
          Math.cos(latFrom) * Math.cos(latTo) * Math.sin(lngDelta / 2) ** 2,
      ),
    );
  return earthRadius * angle;
}

function formatDistance(value?: number) {
  if (value === undefined || !Number.isFinite(value)) return '';
  if (value < 1000) return `${Math.max(1, Math.round(value))} m`;
  return `${(value / 1000).toFixed(value < 10000 ? 1 : 0)} km`;
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return 'Dưới 1 phút';
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours} giờ ${remainingMinutes} phút` : `${hours} giờ`;
}

function formatCoordinate(coordinate: LatLng) {
  return `${coordinate.latitude.toFixed(14)},${coordinate.longitude.toFixed(
    14,
  )}`;
}

function formatCompactCount(value?: number) {
  if (value === undefined || !Number.isFinite(value)) return '0';
  if (value < 1000) return `${Math.max(0, Math.round(value))}`;
  if (value < 1000000) {
    return `${(value / 1000).toFixed(value < 10000 ? 1 : 0)}K`;
  }
  return `${(value / 1000000).toFixed(value < 10000000 ? 1 : 0)}M`;
}

function pageOwnerFromNearbyPlace(place: NearbyPlace): PageUser | undefined {
  if (!place.ownerId) return undefined;

  return {
    id: place.ownerId,
    name: place.ownerName || place.ownerUsername || 'Chủ trang',
    username: place.ownerUsername || '',
    avatarUrl: place.ownerAvatarUrl,
    role: 'owner',
  };
}

function pageFromNearbyPlace(place: NearbyPlace): PagesItem {
  const pageId = String(place.pageId || place.id.replace(/^page:/, ''));

  return {
    id: pageId,
    pageId,
    pageName: place.username || pageId,
    pageTitle: place.name,
    pageDescription: place.description,
    pageCategory: place.category,
    address: place.location,
    placeId: place.placeId,
    lat: place.coordinate?.latitude,
    lng: place.coordinate?.longitude,
    mapPinStatus: place.mapPinStatus,
    mapPinApproved: place.mapPinApproved,
    avatar: place.avatarUrl,
    cover: place.coverUrl,
    url: place.url,
    likes: place.likes,
    followersCount: place.followersCount,
    postCount: place.postCount,
    isFollowing: place.isFollowing,
    isLiked: place.isLiked,
    ownerId: place.ownerId,
    owner: pageOwnerFromNearbyPlace(place),
  };
}

function chatFromPageOwner(page: PagesItem): ChatItem | null {
  const owner = page.owner;
  const ownerId = owner?.id || page.ownerId;
  if (!ownerId) return null;

  return {
    id: `user:${ownerId}`,
    chatId: ownerId,
    chatType: 'user',
    participantId: ownerId,
    userId: ownerId,
    username: owner?.username || '',
    name: owner?.name || owner?.username || 'Chủ trang',
    avatar: owner?.avatarUrl || FALLBACK_AVATAR,
    lastMessage: '',
    lastMessageTime: 0,
    unreadCount: 0,
    isOnline: false,
    isVerified: false,
  };
}

function bearingBetween(origin: LatLng, destination: LatLng) {
  const originLat = (origin.latitude * Math.PI) / 180;
  const destinationLat = (destination.latitude * Math.PI) / 180;
  const longitudeDelta =
    ((destination.longitude - origin.longitude) * Math.PI) / 180;
  const y = Math.sin(longitudeDelta) * Math.cos(destinationLat);
  const x =
    Math.cos(originLat) * Math.sin(destinationLat) -
    Math.sin(originLat) * Math.cos(destinationLat) * Math.cos(longitudeDelta);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

function normalizeRoutePath(
  path: LatLng[],
  origin: LatLng,
  destination: LatLng,
) {
  const normalized = path.filter(
    point =>
      Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
  );

  if (normalized.length < 2) {
    return normalized;
  }

  const start = normalized[0];
  const end = normalized[normalized.length - 1];
  const forwardScore =
    distanceMeters(start, origin) + distanceMeters(end, destination);
  const reverseScore =
    distanceMeters(start, destination) + distanceMeters(end, origin);

  return reverseScore < forwardScore ? [...normalized].reverse() : normalized;
}

function buildNavigationPath(origin: LatLng, routePath: LatLng[]) {
  if (routePath.length === 0) {
    return [origin];
  }

  const firstPoint = routePath[0];
  if (distanceMeters(origin, firstPoint) <= ROUTE_CONNECTOR_MIN_METERS) {
    return routePath;
  }

  return [origin, ...routePath];
}

function routeDistance(path: LatLng[]) {
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    total += distanceMeters(path[index - 1], path[index]);
  }
  return total;
}

function interpolatePoint(start: LatLng, end: LatLng, fraction: number) {
  return {
    latitude: start.latitude + (end.latitude - start.latitude) * fraction,
    longitude: start.longitude + (end.longitude - start.longitude) * fraction,
  };
}

function pointAlongRoute(path: LatLng[], targetDistance: number) {
  if (path.length === 0) return null;
  if (path.length === 1 || targetDistance <= 0) return path[0];

  let traveled = 0;
  for (let index = 1; index < path.length; index += 1) {
    const start = path[index - 1];
    const end = path[index];
    const segmentDistance = distanceMeters(start, end);

    if (segmentDistance <= 0) {
      continue;
    }

    if (traveled + segmentDistance >= targetDistance) {
      return interpolatePoint(
        start,
        end,
        (targetDistance - traveled) / segmentDistance,
      );
    }

    traveled += segmentDistance;
  }

  return path[path.length - 1];
}

function navigationCameraCenter(origin: LatLng, routePath: LatLng[]) {
  const path = buildNavigationPath(origin, routePath);
  const remainingDistance = routeDistance(path);
  if (remainingDistance <= ROUTE_LOOKAHEAD_MIN_METERS) {
    return origin;
  }

  const lookAheadDistance = Math.min(
    Math.max(remainingDistance * 0.22, ROUTE_LOOKAHEAD_MIN_METERS),
    ROUTE_LOOKAHEAD_MAX_METERS,
  );

  return pointAlongRoute(path, lookAheadDistance) || origin;
}

function navigationRouteHeading(
  origin: LatLng,
  routePath: LatLng[],
  destination: LatLng,
) {
  const cameraCenter = navigationCameraCenter(origin, routePath);
  if (distanceMeters(origin, cameraCenter) > 2) {
    return bearingBetween(origin, cameraCenter);
  }

  return initialRouteHeading(
    buildNavigationPath(origin, routePath),
    origin,
    destination,
  );
}

function initialRouteHeading(
  path: LatLng[],
  origin: LatLng,
  destination: LatLng,
) {
  if (path.length < 2) {
    return bearingBetween(origin, destination);
  }

  let startIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  path.forEach((point, index) => {
    const distance = distanceMeters(point, origin);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      startIndex = index;
    }
  });

  for (let index = startIndex; index < path.length - 1; index += 1) {
    if (distanceMeters(path[index], path[index + 1]) > 2) {
      return bearingBetween(path[index], path[index + 1]);
    }
  }

  return bearingBetween(origin, destination);
}

function validHeading(heading: number | null | undefined): heading is number {
  return (
    typeof heading === 'number' &&
    Number.isFinite(heading) &&
    heading >= 0 &&
    heading <= 360
  );
}

function resolveNavigationHeading({
  deviceHeading,
  gpsHeading,
  routeHeading,
  userSpeed,
}: {
  deviceHeading: number | null;
  gpsHeading: number | null;
  routeHeading: number | null;
  userSpeed: number;
}) {
  if (userSpeed > NAVIGATION_MOVING_SPEED_MPS && validHeading(gpsHeading)) {
    return gpsHeading;
  }

  if (validHeading(deviceHeading)) {
    return deviceHeading;
  }

  if (validHeading(gpsHeading)) {
    return gpsHeading;
  }

  if (validHeading(routeHeading)) {
    return routeHeading;
  }

  return 0;
}

function normalizeBearingDelta(fromBearing: number, toBearing: number) {
  return ((toBearing - fromBearing + 540) % 360) - 180;
}

function maneuverFromDelta(delta: number): TurnInstruction['maneuver'] {
  const absolute = Math.abs(delta);
  if (absolute >= 145) return 'uturn';
  if (absolute < 32) return 'straight';
  if (absolute < 70) return delta > 0 ? 'slight-right' : 'slight-left';
  return delta > 0 ? 'right' : 'left';
}

function turnLabel(maneuver: TurnInstruction['maneuver']) {
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

function ManeuverIcon({
  maneuver,
  size,
  color,
}: {
  maneuver: TurnInstruction['maneuver'];
  size: number;
  color: string;
}) {
  switch (maneuver) {
    case 'left':
    case 'slight-left':
      return <CornerUpLeft size={size} color={color} />;
    case 'right':
    case 'slight-right':
      return <CornerUpRight size={size} color={color} />;
    case 'uturn':
      return <Undo2 size={size} color={color} />;
    case 'arrive':
      return <MapPinCheck size={size} color={color} />;
    default:
      return <ArrowUp size={size} color={color} />;
  }
}

function nearestRouteIndex(path: LatLng[], location: LatLng) {
  let nearestIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  path.forEach((point, index) => {
    const distance = distanceMeters(point, location);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestIndex = index;
    }
  });
  return nearestIndex;
}

function distanceToRouteSegment(point: LatLng, start: LatLng, end: LatLng) {
  const latitudeScale = 111320;
  const longitudeScale =
    111320 * Math.cos(((point.latitude + start.latitude + end.latitude) / 3 * Math.PI) / 180);
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
    return distanceMeters(point, start);
  }

  const t = Math.max(0, Math.min(1, ((px - sx) * dx + (py - sy) * dy) / lengthSquared));
  const projection = {
    latitude: (sy + dy * t) / latitudeScale,
    longitude: (sx + dx * t) / longitudeScale,
  };

  return distanceMeters(point, projection);
}

function distanceToRoutePath(point: LatLng, path: LatLng[]) {
  if (path.length === 0) return Number.POSITIVE_INFINITY;
  if (path.length === 1) return distanceMeters(point, path[0]);

  let nearestDistance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < path.length; index += 1) {
    nearestDistance = Math.min(
      nearestDistance,
      distanceToRouteSegment(point, path[index - 1], path[index]),
    );
  }

  return nearestDistance;
}

function routeDistanceFromIndex(path: LatLng[], startIndex: number) {
  if (path.length < 2) return 0;
  const safeStart = Math.max(0, Math.min(startIndex, path.length - 1));
  let total = 0;
  for (let index = safeStart + 1; index < path.length; index += 1) {
    total += distanceMeters(path[index - 1], path[index]);
  }
  return total;
}

function routeDistanceBetweenIndexes(
  path: LatLng[],
  startIndex: number,
  endIndex: number,
) {
  if (path.length < 2) return 0;
  const safeStart = Math.max(0, Math.min(startIndex, path.length - 1));
  const safeEnd = Math.max(0, Math.min(endIndex, path.length - 1));
  if (safeEnd <= safeStart) return 0;

  let total = 0;
  for (let index = safeStart + 1; index <= safeEnd; index += 1) {
    total += distanceMeters(path[index - 1], path[index]);
  }
  return total;
}

function isSameCoordinate(
  left: LatLng | null | undefined,
  right: LatLng | null | undefined,
  toleranceMeters = 3,
) {
  return Boolean(
    left &&
      right &&
      distanceMeters(left, right) <= toleranceMeters,
  );
}

function stepManeuver(maneuver?: string): TurnInstruction['maneuver'] {
  const normalized = String(maneuver || '').toLowerCase();
  if (normalized.includes('uturn')) return 'uturn';
  if (normalized.includes('slight-left')) return 'slight-left';
  if (normalized.includes('slight-right')) return 'slight-right';
  if (normalized.includes('left')) return 'left';
  if (normalized.includes('right')) return 'right';
  if (normalized.includes('straight')) return 'straight';
  return 'straight';
}

function cleanRouteInstruction(value?: string) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nextStepInstruction(
  routePath: LatLng[],
  current: LatLng,
  destinationTitle: string | undefined,
  routeSteps: MapRouteStep[] | undefined,
) {
  if (!routeSteps?.length || routePath.length < 2) {
    return null;
  }

  const currentIndex = nearestRouteIndex(routePath, current);
  const candidates = routeSteps
    .map(step => {
      const stepStart = step.startLocation ?? step.path?.[0];
      if (!stepStart) return null;
      const stepIndex = nearestRouteIndex(routePath, stepStart);
      const distanceAhead =
        stepIndex > currentIndex
          ? routeDistanceBetweenIndexes(routePath, currentIndex, stepIndex)
          : distanceMeters(current, stepStart);
      return { step, stepIndex, distanceAhead };
    })
    .filter(Boolean) as Array<{
    step: MapRouteStep;
    stepIndex: number;
    distanceAhead: number;
  }>;

  const nextStep =
    candidates.find(
      candidate =>
        candidate.stepIndex > currentIndex &&
        candidate.distanceAhead >= 8,
    ) ??
    candidates.find(
      candidate =>
        candidate.stepIndex >= currentIndex &&
        candidate.distanceAhead <= 45 &&
        stepManeuver(candidate.step.maneuver) !== 'straight',
    ) ??
    candidates.find(
      candidate =>
        candidate.stepIndex <= currentIndex + 1 &&
        candidate.distanceAhead <= 60 &&
        cleanRouteInstruction(candidate.step.instruction).length > 0,
    );

  if (!nextStep) {
    return null;
  }

  const maneuver = stepManeuver(nextStep.step.maneuver);
  const instruction = cleanRouteInstruction(nextStep.step.instruction);
  const distanceAhead = Math.max(1, nextStep.distanceAhead);

  return {
    distanceMeters: distanceAhead,
    label:
      distanceAhead <= 8
        ? 'Bắt đầu'
        : distanceAhead <= 60 && maneuver === 'arrive'
        ? `Sắp đến ${destinationTitle || 'điểm đến'}`
        : `${formatDistance(distanceAhead)} nữa`,
    detail: instruction || turnLabel(maneuver),
    maneuver,
  } satisfies TurnInstruction;
}

function navigationSpeechText(instruction: TurnInstruction) {
  return [instruction.label, instruction.detail || turnLabel(instruction.maneuver)]
    .filter(Boolean)
    .join('. ');
}

function navigationInstructionKey(instruction: TurnInstruction) {
  return `${instruction.maneuver}:${
    instruction.detail || instruction.label
  }:${Math.round(instruction.distanceMeters / 10)}`;
}

function nextTurnInstruction(
  routePath: LatLng[],
  current: LatLng | null,
  destinationTitle?: string,
  routeSteps?: MapRouteStep[],
): TurnInstruction | null {
  if (!current || routePath.length < 2) {
    return null;
  }

  const stepInstruction = nextStepInstruction(
    routePath,
    current,
    destinationTitle,
    routeSteps,
  );
  if (stepInstruction) {
    return stepInstruction;
  }

  const path = buildNavigationPath(current, routePath);
  if (path.length < 3) {
    const remaining = routeDistance(path);
    return {
      distanceMeters: remaining,
      label:
        remaining <= 60
          ? `Sắp đến ${destinationTitle || 'điểm đến'}`
          : `Tiếp tục ${formatDistance(remaining)}`,
      maneuver: remaining <= 60 ? 'arrive' : 'straight',
    };
  }

  const startIndex = nearestRouteIndex(path, current);
  let distanceAhead = 0;
  const scanStart = Math.max(1, startIndex + 1);

  for (let index = scanStart; index < path.length - 1; index += 1) {
    distanceAhead += distanceMeters(path[index - 1], path[index]);
    const previous = path[index - 1];
    const point = path[index];
    const next = path[index + 1];
    const incoming = bearingBetween(previous, point);
    const outgoing = bearingBetween(point, next);
    const delta = normalizeBearingDelta(incoming, outgoing);
    const maneuver = maneuverFromDelta(delta);

    if (maneuver !== 'straight' && distanceAhead >= 12) {
      return {
        distanceMeters: distanceAhead,
        label: `${formatDistance(distanceAhead)} nữa ${turnLabel(maneuver).toLowerCase()}`,
        maneuver,
      };
    }
  }

  const remaining = routeDistanceFromIndex(path, startIndex);
  if (remaining <= 60) {
    return {
      distanceMeters: remaining,
      label: `Sắp đến ${destinationTitle || 'điểm đến'}`,
      maneuver: 'arrive',
    };
  }

  return {
    distanceMeters: remaining,
    label: `Tiếp tục ${formatDistance(Math.min(remaining, 500))}`,
    maneuver: 'straight',
  };
}

function parseGeoInfo(value: unknown): LatLng | null {
  if (typeof value !== 'string') {
    return null;
  }

  const [rawLatitude, rawLongitude] = value.split(',');
  const latitude = Number(rawLatitude);
  const longitude = Number(rawLongitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    (latitude === 0 && longitude === 0)
  ) {
    return null;
  }

  return { latitude, longitude };
}

function normalizeSearchText(value: string | undefined | null) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('vi-VN')
    .trim();
}

function getGoogleCategorySearchQuery(value: string) {
  const normalized = normalizeSearchText(value);

  if (
    /\b(quan an|nha hang|do an|an uong|mon an|food|restaurant|com|pho|bun|lau|nuong|buffet)\b/.test(
      normalized,
    )
  ) {
    return 'restaurant';
  }

  if (
    /\b(cafe|ca phe|coffee|tra sua|tra|nuoc|do uong|uong)\b/.test(
      normalized,
    )
  ) {
    return 'cafe';
  }

  return undefined;
}

function getSuggestionDistanceMeters(item: SuggestionItem) {
  if (item.kind === 'page') {
    return item.page.distanceMeters ?? Number.POSITIVE_INFINITY;
  }

  return item.prediction.distanceMeters ?? Number.POSITIVE_INFINITY;
}

function getSuggestionGroupPriority(item: SuggestionItem) {
  if (item.kind === 'page') {
    return item.page.isPinned || item.page.mapPinApproved ? 1 : 2;
  }

  return 3;
}

function sortSearchSuggestions(left: SuggestionItem, right: SuggestionItem) {
  const priorityLeft = getSuggestionGroupPriority(left);
  const priorityRight = getSuggestionGroupPriority(right);

  if (priorityLeft !== priorityRight) {
    return priorityLeft - priorityRight;
  }

  return getSuggestionDistanceMeters(left) - getSuggestionDistanceMeters(right);
}

function findClosestSuggestion(items: SuggestionItem[]) {
  return items.reduce<SuggestionItem | null>((closest, item) => {
    if (!closest) {
      return item;
    }

    return getSuggestionDistanceMeters(item) < getSuggestionDistanceMeters(closest)
      ? item
      : closest;
  }, null);
}

const DefaultPlaceDotIcon = (props: { size: number; color: string }) => {
  return (
    <View
      style={{
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: props.color || '#FFFFFF',
      }}
    />
  );
};

function getGooglePlaceIcon(types?: string[]) {
  if (!types || !Array.isArray(types)) {
    return { Icon: DefaultPlaceDotIcon, color: '#64748B', bg: '#F1F5F9' };
  }

  // 1. Cafe / Coffee
  if (types.some(t => ['cafe', 'coffee'].includes(t))) {
    return { Icon: Coffee, color: '#8B4513', bg: '#FDF5E6' };
  }

  // 2. Restaurant / Food / Bakery / Bar / Meal / Dining
  if (types.some(t => ['restaurant', 'food', 'bakery', 'bar', 'meal_takeaway', 'meal_delivery', 'cafe'].includes(t))) {
    return { Icon: Utensils, color: '#1E70E6', bg: '#EFF6FF' };
  }

  // 3. Store / Shopping / Supermarket
  if (types.some(t => ['store', 'shopping_mall', 'clothing_store', 'supermarket', 'grocery_or_supermarket'].includes(t))) {
    return { Icon: ShoppingBag, color: '#D97706', bg: '#FEF3C7' };
  }

  // 4. Hotel / Lodging / Motel
  if (types.some(t => ['lodging', 'hotel', 'motel'].includes(t))) {
    return { Icon: Hotel, color: '#0D9488', bg: '#F0FDFA' };
  }

  // 5. School / University
  if (types.some(t => ['school', 'university', 'library'].includes(t))) {
    return { Icon: GraduationCap, color: '#4F46E5', bg: '#EEF2FF' };
  }

  // 6. Gas station / Fuel
  if (types.some(t => ['gas_station'].includes(t))) {
    return { Icon: Fuel, color: '#DC2626', bg: '#FEF2F2' };
  }

  // 7. Bank / ATM / Landmark
  if (types.some(t => ['bank', 'atm', 'local_government_office', 'city_hall', 'courthouse'].includes(t))) {
    return { Icon: Landmark, color: '#059669', bg: '#ECFDF5' };
  }

  // 8. Hospital / Doctor / Health
  if (types.some(t => ['hospital', 'doctor', 'health', 'pharmacy', 'dentist'].includes(t))) {
    return { Icon: Activity, color: '#BE185D', bg: '#FDF2F8' };
  }

  // 9. Airport
  if (types.some(t => ['airport'].includes(t))) {
    return { Icon: Plane, color: '#2563EB', bg: '#EFF6FF' };
  }

  // 10. Beauty salon / Hair care / Spa
  if (types.some(t => ['beauty_salon', 'hair_care', 'spa'].includes(t))) {
    return { Icon: Scissors, color: '#D946EF', bg: '#FDF4FF' };
  }

  return { Icon: DefaultPlaceDotIcon, color: '#64748B', bg: '#F1F5F9' };
}

function getPlaceIconAndColor(types?: string[], searchKeyword?: string) {
  if (searchKeyword) {
    const clean = normalizeSearchText(searchKeyword);
    const words = clean.split(/\s+/);

    const isCafe =
      clean.includes('ca phe') ||
      words.some(w =>
        ['cafe', 'coffee', 'tra', 'sua', 'nuoc', 'uong'].includes(w),
      );
    if (isCafe) {
      return { Icon: Coffee, color: '#8B4513', bg: '#FDF5E6' };
    }

    const isFood = words.some(w => ['an', 'hang', 'food', 'restaurant', 'com', 'pho', 'bun', 'lau', 'nuong', 'banh', 'buffet', 'nha hang'].includes(w));
    if (isFood) {
      return { Icon: Utensils, color: '#ff9c40ff', bg: '#EFF6FF' };
    }

    const isSalon = words.some(w => ['toc', 'salon', 'barber', 'spa', 'cat toc'].includes(w));
    if (isSalon) {
      return { Icon: Scissors, color: '#D946EF', bg: '#FDF4FF' };
    }
  }

  const googleStyle = getGooglePlaceIcon(types);
  if (googleStyle.Icon !== DefaultPlaceDotIcon) {
    return googleStyle;
  }

  return googleStyle;
}

function suggestionSubtitle(item: SuggestionItem) {
  if (item.kind === 'page') {
    const distance = formatDistance(item.page.distanceMeters);
    return [item.page.location, distance].filter(Boolean).join(' · ');
  }
  return item.prediction.secondaryText || item.prediction.description;
}

function SearchSuggestionRow({
  item,
  onPress,
}: {
  item: SuggestionItem;
  onPress: () => void;
}) {
  const title = item.kind === 'page' ? item.page.name : item.prediction.mainText;
  const subtitle = suggestionSubtitle(item);
  const distanceLabel = item.kind === 'page' ? formatDistance(item.page.distanceMeters) : undefined;

  let googlePlaceStyle: { Icon: any; color: string; bg: string } = { Icon: DefaultPlaceDotIcon, color: '#64748B', bg: '#F1F5F9' };
  if (item.kind === 'google') {
    googlePlaceStyle = getPlaceIconAndColor(item.prediction.types, item.prediction.mainText);
  }

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      className="flex-row items-center border-b border-slate-100 px-4 py-3"
      onPress={onPress}
    >
      {item.kind === 'page' ? (
        <Image
          source={{ uri: item.page.avatarUrl || FALLBACK_AVATAR }}
          className="h-10 w-10 rounded-full bg-slate-100"
          resizeMode="cover"
        />
      ) : (
        <View
          className="h-10 w-10 rounded-full items-center justify-center"
          style={{ backgroundColor: googlePlaceStyle.bg }}
        >
          <googlePlaceStyle.Icon size={18} color={googlePlaceStyle.color} />
        </View>
      )}
      <View className="ml-3 flex-1">
        <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
          {title}
        </Text>
        <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {distanceLabel ? (
        <View className="ml-2 rounded-full bg-blue-50 px-2.5 py-1">
          <Text className="text-xs font-extrabold text-blue-700">
            {distanceLabel}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

export default function NearbyUsersScreen() {
  const navigation = useNavigation<NearbyNav>();
  const insets = useSafeAreaInsets();
  const {
    clearPlacePredictions,
    currentUser,
    error,
    getRoutes,
    isLoading,
    loadNearbyPages,
    loadCurrentUser,
    nearbyPlaces,
    placePredictions,
    searchNearbyPagesAndPlaces,
    getPlaceDetails,
  } = useUserViewModel();
  const mapRef = useRef<MapView>(null);
  const currentLocationRef = useRef<LatLng | null>(null);
  const hasLoadedNearbyPagesRef = useRef(false);
  const activeDestinationRef = useRef<LatLng | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const currentRegionRef = useRef<Region>(DEFAULT_REGION);
  const [searchResults, setSearchResults] = useState<SuggestionItem[]>([]);
  const [isSearchResultsVisible, setIsSearchResultsVisible] = useState(false);
  const searchResultsScrollRef = useRef<ScrollView>(null);
  const itemOffsets = useRef<{ [key: string]: number }>({});
  const isNavigatingRef = useRef(false);
  const lastRoutedOriginRef = useRef<LatLng | null>(null);
  const activeRoutePathRef = useRef<LatLng[]>([]);
  const lastRerouteAtRef = useRef(0);
  const lastSpokenInstructionRef = useRef('');
  const selectedPointTitleRef = useRef<string | undefined>(undefined);
  const lastNavigationCameraHeadingRef = useRef<{
    heading: number | null;
    center: LatLng | null;
    updatedAt: number;
  }>({ heading: null, center: null, updatedAt: 0 });
  const routeRequestIdRef = useRef(0);
  const pageDetailRequestIdRef = useRef(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchModeAnim = useRef(new Animated.Value(0)).current;
  const searchLayoutAnim = useRef(new Animated.Value(0)).current;
  const lastLocationStateRef = useRef<LatLng | null>(null);
  const lastLocationStateUpdatedAtRef = useRef(0);
  const lastHeadingStateRef = useRef<number | null>(null);
  const lastHeadingStateUpdatedAtRef = useRef(0);
  const lastSpeedStateRef = useRef<number | null>(null);
  const lastSpeedStateUpdatedAtRef = useRef(0);
  const lastDeviceHeadingStateRef = useRef<number | null>(null);
  const lastDeviceHeadingUpdatedAtRef = useRef(0);
  const [locationAllowed, setLocationAllowed] = useState(Platform.OS === 'ios');
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [isAutoCentering, setIsAutoCentering] = useState(true);
  const [userSpeed, setUserSpeed] = useState(0);
  const [locationSource, setLocationSource] = useState<LocationSource>(null);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(
    null,
  );
  const [pageDetailPlace, setPageDetailPlace] = useState<NearbyPlace | null>(
    null,
  );
  const [pageDetail, setPageDetail] = useState<PagesItem | null>(null);
  const [isPageDetailLoading, setIsPageDetailLoading] = useState(false);
  const [isPageActionLoading, setIsPageActionLoading] = useState(false);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [activeDestination, setActiveDestination] = useState<LatLng | null>(
    null,
  );
  const [activeRouteConnector, setActiveRouteConnector] = useState<LatLng[]>(
    [],
  );
  const [activeRoute, setActiveRoute] = useState<LatLng[]>([]);
  const [activeRouteDuration, setActiveRouteDuration] = useState<number | null>(
    null,
  );
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [voiceGuidanceEnabled, setVoiceGuidanceEnabled] = useState(true);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [routeHeading, setRouteHeading] = useState<number | null>(null);
  const [hasCenteredOnUser, setHasCenteredOnUser] = useState(false);
  const [hasLoadedNearbyPages, setHasLoadedNearbyPages] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const googleMapId = apiConfig.googleMapsMapId.trim();
  const hasGoogleMapId = googleMapId.length > 0;

  const exploreTopControlsStyle = useMemo(
    () => [
      styles.exploreTopControls,
      Platform.OS === 'ios' ? { top: insets.top + 8 } : null,
    ],
    [insets.top],
  );

  const routePreviewCardStyle = useMemo(
    () => [
      styles.routePreviewCard,
      Platform.OS === 'ios' ? { top: insets.top + 10 } : null,
    ],
    [insets.top],
  );

  const suggestionPanelStyle = useMemo(
    () => [
      styles.suggestionPanel,
      isSearchFocused ? styles.suggestionPanelFocused : null,
      Platform.OS === 'ios'
        ? { top: insets.top + (isSearchFocused ? 72 : 124) }
        : null,
    ],
    [insets.top, isSearchFocused],
  );

  const navigationBannerStyle = useMemo(
    () => [
      styles.navigationBanner,
      Platform.OS === 'ios' ? { top: insets.top + 10 } : null,
    ],
    [insets.top],
  );

  const suggestions = useMemo<SuggestionItem[]>(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (normalizedQuery.length < 3) return [];

    // Filter local Pages matching search keyword
    const pageSuggestions = nearbyPlaces
      .filter(page => {
        const haystack = normalizeSearchText(
          [
            page.name,
            page.username,
            page.location,
          ]
            .filter(Boolean)
            .join(' '),
        );
        return haystack.includes(normalizedQuery);
      })
      .map(page => ({
        id: page.id,
        kind: 'page' as const,
        page,
      }));

    // Map Google map autocomplete predictions
    const googleSuggestions: SuggestionItem[] = placePredictions.map(pred => ({
      id: pred.placeId,
      kind: 'google' as const,
      prediction: pred,
    }));

    return [...pageSuggestions, ...googleSuggestions]
      .sort(sortSearchSuggestions)
      .slice(0, 15);
  }, [nearbyPlaces, placePredictions, query]);

  const shouldShowSuggestionPanel =
    isSearchFocused &&
    query.trim().length >= 3 &&
    (isLoading || suggestions.length > 0 || Boolean(searchMessage || error));

  useEffect(() => {
    const toValue = isSearchFocused ? 1 : 0;

    Animated.parallel([
      Animated.timing(searchModeAnim, {
        toValue,
        duration: isSearchFocused ? 260 : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(searchLayoutAnim, {
        toValue,
        duration: isSearchFocused ? 260 : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [isSearchFocused, searchLayoutAnim, searchModeAnim]);

  const searchBackAnimatedStyle = useMemo(
    () => ({
      opacity: searchModeAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      }),
      transform: [
        {
          translateX: searchModeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -14],
          }),
        },
        {
          scale: searchModeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.88],
          }),
        },
      ],
    }),
    [searchModeAnim],
  );
  const searchBoxAnimatedStyle = useMemo(
    () => ({
      marginLeft: searchLayoutAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [52, 0],
      }),
    }),
    [searchLayoutAnim],
  );
  const quickPlacesAnimatedStyle = useMemo(
    () => ({
      maxHeight: searchLayoutAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [66, 0],
      }),
      overflow: 'hidden' as const,
      opacity: searchModeAnim.interpolate({
        inputRange: [0, 0.7, 1],
        outputRange: [1, 0.2, 0],
      }),
      transform: [
        {
          translateY: searchModeAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -10],
          }),
        },
      ],
    }),
    [searchLayoutAnim, searchModeAnim],
  );

  const pageMarkers = useMemo(
    () =>
      nearbyPlaces
        .filter(place => place.coordinate)
        .map(place => ({
          place,
          coordinate: place.coordinate as LatLng,
        })),
    [nearbyPlaces],
  );
  const visiblePageMarkers = useMemo(() => {
    if (!SHOW_APP_DISCOVERY_PLACES_ON_MAP) return [];

    const anchor = currentLocation ?? selectedPoint?.coordinate ?? null;
    if (!anchor) {
      return pageMarkers.slice(0, MAX_VISIBLE_PAGE_MARKERS);
    }

    return pageMarkers
      .map(item => ({
        ...item,
        distanceFromAnchor: distanceMeters(anchor, item.coordinate),
      }))
      .sort((left, right) => {
        const leftSelected =
          selectedPoint?.source === 'page' && selectedPoint.id === left.place.id;
        const rightSelected =
          selectedPoint?.source === 'page' && selectedPoint.id === right.place.id;
        if (leftSelected !== rightSelected) return leftSelected ? -1 : 1;
        return left.distanceFromAnchor - right.distanceFromAnchor;
      })
      .slice(0, MAX_VISIBLE_PAGE_MARKERS)
      .map(({ distanceFromAnchor: _distanceFromAnchor, ...item }) => item);
  }, [
    currentLocation,
    pageMarkers,
    selectedPoint?.coordinate,
    selectedPoint?.id,
    selectedPoint?.source,
  ]);

  const nearbyQuickPlaces = useMemo(
    () =>
      pageMarkers
        .map(({ place, coordinate }) => {
          const distance =
            currentLocation !== null
              ? distanceMeters(currentLocation, coordinate)
              : Number(place.distanceMeters);
          return {
            place,
            coordinate,
            distanceMeters: Number.isFinite(distance) ? distance : undefined,
          };
        })
        .filter(item => item.distanceMeters !== undefined)
        .sort(
          (left, right) =>
            (left.distanceMeters ?? Infinity) -
            (right.distanceMeters ?? Infinity),
        )
        .slice(0, 8),
    [currentLocation, pageMarkers],
  );
  const visibleNearbyQuickPlaces = SHOW_APP_DISCOVERY_PLACES_ON_MAP
    ? nearbyQuickPlaces
    : [];

  useEffect(() => {
    visiblePageMarkers.slice(0, 32).forEach(({ place }) => {
      if (place.avatarUrl) {
        Image.prefetch(place.avatarUrl).catch(() => undefined);
      }
    });
  }, [visiblePageMarkers]);

  const selectedDistance = useMemo(() => {
    if (!selectedPoint) return undefined;
    if (currentLocation) {
      return distanceMeters(currentLocation, selectedPoint.coordinate);
    }
    return selectedPoint.distanceMeters;
  }, [currentLocation, selectedPoint]);
  const currentViewerId = useMemo(
    () => currentUser?.id || sessionStorage.getSession()?.userId,
    [currentUser?.id],
  );
  const activePageDetail = pageDetail ?? (pageDetailPlace ? pageFromNearbyPlace(pageDetailPlace) : null);
  const isOwnPageDetail =
    Boolean(activePageDetail?.ownerId) &&
    Boolean(currentViewerId) &&
    String(activePageDetail?.ownerId) === String(currentViewerId);
  const canFollowPageDetail =
    Boolean(activePageDetail) &&
    !isOwnPageDetail &&
    activePageDetail?.isFollowing !== true;
  const routeMatchesSelectedPoint = useMemo(
    () => isSameCoordinate(activeDestination, selectedPoint?.coordinate),
    [activeDestination, selectedPoint?.coordinate],
  );
  const shouldShowRoute = activeRoute.length > 1 && routeMatchesSelectedPoint;
  const alternativeRoutes = useMemo(
    () => routeOptions.filter(route => route.id !== selectedRouteId),
    [routeOptions, selectedRouteId],
  );
  const selectedRoute = useMemo(
    () => routeOptions.find(route => route.id === selectedRouteId),
    [routeOptions, selectedRouteId],
  );
  const activeRouteDistance = useMemo(() => {
    const origin = currentLocation;
    if (!origin || !shouldShowRoute) {
      return selectedDistance;
    }
    return routeDistance(buildNavigationPath(origin, activeRoute));
  }, [activeRoute, currentLocation, selectedDistance, shouldShowRoute]);
  const currentUserMarkerHeading = resolveNavigationHeading({
    deviceHeading,
    gpsHeading: lastHeadingStateRef.current === null ? null : currentHeading,
    routeHeading: shouldShowRoute ? routeHeading : null,
    userSpeed,
  });
  const turnInstruction = useMemo(
    () =>
      isNavigating && shouldShowRoute
        ? nextTurnInstruction(
            activeRoute,
            currentLocation,
            selectedPoint?.title,
            selectedRoute?.steps,
          )
        : null,
    [
      activeRoute,
      currentLocation,
      isNavigating,
      selectedPoint?.title,
      selectedRoute?.steps,
      shouldShowRoute,
    ],
  );
  const isRoutePreview = shouldShowRoute && !isNavigating;
  const arrivalTimeText = useMemo(() => {
    if (!activeRouteDuration || activeRouteDuration <= 0) return '';
    const arrival = new Date(Date.now() + activeRouteDuration * 1000);
    return arrival.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [activeRouteDuration]);

  useEffect(() => {
    activeDestinationRef.current = activeDestination;
  }, [activeDestination]);

  useEffect(() => {
    isNavigatingRef.current = isNavigating;
  }, [isNavigating]);

  useEffect(() => {
    selectedPointTitleRef.current = selectedPoint?.title;
  }, [selectedPoint?.title]);

  useEffect(() => {
    if (selectedPoint && searchResultsScrollRef.current) {
      const matched = searchResults.find(item => 
        item.id === selectedPoint.id || 
        `google:${item.id}` === selectedPoint.id ||
        (selectedPoint.source === 'google' && item.kind === 'google' && selectedPoint.id.replace('google:', '') === item.prediction.placeId)
      );
      if (matched) {
        const yOffset = itemOffsets.current[matched.id];
        if (typeof yOffset === 'number') {
          searchResultsScrollRef.current.scrollTo({ y: Math.max(0, yOffset - 10), animated: true });
        }
      }
    }
  }, [selectedPoint, searchResults]);

  const resetRouteState = useCallback(() => {
    routeRequestIdRef.current += 1;
    activeDestinationRef.current = null;
    isNavigatingRef.current = false;
    activeRoutePathRef.current = [];
    lastRerouteAtRef.current = 0;
    setActiveDestination(null);
    setActiveRoute([]);
    setActiveRouteConnector([]);
    setActiveRouteDuration(null);
    setRouteOptions([]);
    setSelectedRouteId('');
    setIsNavigating(false);
    setIsAutoCentering(false);
    setRouteHeading(null);
    setIsLoadingRoutes(false);
    lastRoutedOriginRef.current = null;
    lastSpokenInstructionRef.current = '';
    lastNavigationCameraHeadingRef.current = {
      heading: null,
      center: null,
      updatedAt: 0,
    };
    stopNavigationSpeech();
    setIsSheetCollapsed(false);

    // Reset map camera to 2D North-up
    mapRef.current?.animateCamera(
      {
        pitch: 0,
        heading: NAVIGATION_CAMERA_HEADING,
      },
      { duration: 450 },
    );
  }, []);

  useEffect(
    () =>
      subscribeNavigationHeading(heading => {
        const now = Date.now();
        const lastHeading = lastDeviceHeadingStateRef.current;
        if (
          lastHeading !== null &&
          Math.abs(normalizeBearingDelta(lastHeading, heading)) <
            HEADING_STATE_MIN_DEGREES &&
          now - lastDeviceHeadingUpdatedAtRef.current < HEADING_STATE_MIN_MS
        ) {
          return;
        }

        lastDeviceHeadingStateRef.current = heading;
        lastDeviceHeadingUpdatedAtRef.current = now;
        setDeviceHeading(heading);
      }),
    [],
  );

  useEffect(() => {
    if (!isNavigating || !shouldShowRoute || !isAutoCentering) return;

    const location = currentLocationRef.current;
    if (!location) return;

    const now = Date.now();
    const last = lastNavigationCameraHeadingRef.current;
    const movedMeters =
      last.center === null ? Infinity : distanceMeters(last.center, location);
    if (movedMeters < 1 && now - last.updatedAt < 800) {
      return;
    }

    const cameraCenter = navigationCameraCenter(location, activeRoute);
    const nextRouteHeading =
      activeDestination !== null
        ? navigationRouteHeading(
            location,
            activeRoute,
            activeDestination,
          )
        : routeHeading ?? currentHeading;
    lastNavigationCameraHeadingRef.current = {
      heading: NAVIGATION_CAMERA_HEADING,
      center: location,
      updatedAt: now,
    };
    setRouteHeading(nextRouteHeading);
    mapRef.current?.animateCamera(
      {
        center: cameraCenter,
        heading: NAVIGATION_CAMERA_HEADING,
        pitch: NAVIGATION_CAMERA_PITCH,
        zoom: NAVIGATION_CAMERA_ZOOM,
      },
      { duration: 180 },
    );
  }, [
    activeDestination,
    activeRoute,
    currentHeading,
    currentLocation,
    isNavigating,
    isAutoCentering,
    routeHeading,
    shouldShowRoute,
  ]);

  useEffect(() => {
    if (!voiceGuidanceEnabled) {
      lastSpokenInstructionRef.current = '';
      stopNavigationSpeech();
      return;
    }
    if (!isNavigating || !turnInstruction) {
      return;
    }
    const key = navigationInstructionKey(turnInstruction);
    if (lastSpokenInstructionRef.current === key) {
      return;
    }
    lastSpokenInstructionRef.current = key;
    Vibration.vibrate(80);
    const speechText = navigationSpeechText(turnInstruction);
    console.log('[NavigationSpeech] speaking:', speechText);
    speakNavigationInstruction(speechText);
  }, [isNavigating, turnInstruction, voiceGuidanceEnabled]);

  useEffect(
    () => () => {
      stopNavigationSpeech();
    },
    [],
  );

  const centerOnUser = useCallback(() => {
    const location = currentLocationRef.current;
    if (!location) return;

    if (isNavigating) {
      setIsAutoCentering(true);
      const cameraCenter =
        shouldShowRoute && activeRoute.length > 1
          ? navigationCameraCenter(location, activeRoute)
          : location;
      const nextHeading =
        shouldShowRoute && activeDestination !== null
          ? NAVIGATION_CAMERA_HEADING
          : routeHeading ?? currentHeading;
      mapRef.current?.animateCamera(
        {
          center: cameraCenter,
          heading: nextHeading,
          pitch: NAVIGATION_CAMERA_PITCH,
          zoom: NAVIGATION_CAMERA_ZOOM,
        },
        { duration: 400 },
      );
    } else {
      mapRef.current?.animateToRegion(
        {
          ...location,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        },
        350,
      );
    }
  }, [
    activeDestination,
    activeRoute,
    currentHeading,
    isNavigating,
    routeHeading,
    shouldShowRoute,
  ]);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    currentRegionRef.current = region;
  }, []);

  const handleZoomIn = useCallback(() => {
    const current = currentRegionRef.current;
    mapRef.current?.animateToRegion(
      {
        ...current,
        latitudeDelta: current.latitudeDelta / 2,
        longitudeDelta: current.longitudeDelta / 2,
      },
      260,
    );
  }, []);

  const handleZoomOut = useCallback(() => {
    const current = currentRegionRef.current;
    mapRef.current?.animateToRegion(
      {
        ...current,
        latitudeDelta: current.latitudeDelta * 2,
        longitudeDelta: current.longitudeDelta * 2,
      },
      260,
    );
  }, []);

  const resetMapHeading = useCallback(() => {
    mapRef.current?.animateCamera(
      {
        heading: NAVIGATION_CAMERA_HEADING,
        pitch: isNavigating && shouldShowRoute ? NAVIGATION_CAMERA_PITCH : 0,
      },
      { duration: 320 },
    );
  }, [isNavigating, shouldShowRoute]);

  const loadPagesAroundUser = useCallback(
    async (location: LatLng) => {
      await loadNearbyPages({
        lat: location.latitude,
        lng: location.longitude,
        limit: 10,
      });
    },
    [loadNearbyPages],
  );



  const focusRoute = useCallback(
    (
      route: RouteOption,
      destination: LatLng,
      navigating: boolean,
      destinationTitle?: string,
    ) => {
      const origin = currentLocationRef.current;
      if (!origin) return;

      const routePath = normalizeRoutePath(route.path, origin, destination);
      const navigationPath = buildNavigationPath(origin, routePath);
      const routeConnector =
        navigationPath.length > routePath.length
          ? [navigationPath[0], navigationPath[1]]
          : [];

      activeDestinationRef.current = destination;
      isNavigatingRef.current = navigating;
      activeRoutePathRef.current = routePath;
      setActiveRoute(routePath);
      setActiveRouteConnector(routeConnector);
      setActiveDestination(destination);
      setActiveRouteDuration(route.durationSeconds);
      setSelectedRouteId(route.id);
      setIsNavigating(navigating);
      if (navigating) {
        setIsAutoCentering(true);
      }
      lastRoutedOriginRef.current = origin;

      if (navigationPath.length > 1 && navigating) {
        const heading = navigationRouteHeading(origin, routePath, destination);
        const cameraCenter = navigationCameraCenter(origin, routePath);
        const navigationCamera = {
          center: cameraCenter,
          heading: NAVIGATION_CAMERA_HEADING,
          pitch: NAVIGATION_CAMERA_PITCH,
          zoom: NAVIGATION_CAMERA_ZOOM,
        };

        setRouteHeading(heading);
        lastNavigationCameraHeadingRef.current = {
          heading: NAVIGATION_CAMERA_HEADING,
          center: origin,
          updatedAt: Date.now(),
        };
        mapRef.current?.animateCamera(navigationCamera, { duration: 650 });
        setTimeout(() => {
          mapRef.current?.animateCamera(navigationCamera, { duration: 220 });
        }, 700);
        if (voiceGuidanceEnabled) {
          const firstInstruction = nextTurnInstruction(
            routePath,
            origin,
            destinationTitle,
            route.steps,
          );
          if (firstInstruction) {
            lastSpokenInstructionRef.current =
              navigationInstructionKey(firstInstruction);
            Vibration.vibrate(80);
            const firstSpeechText = navigationSpeechText(firstInstruction);
            console.log('[NavigationSpeech] first instruction:', firstSpeechText);
            speakNavigationInstruction(firstSpeechText);
          }
        }
        return;
      }

      setRouteHeading(null);
      if (navigationPath.length > 1) {
        mapRef.current?.fitToCoordinates(navigationPath, {
          animated: true,
          edgePadding: {
            top: 128,
            right: 52,
            bottom: 286,
            left: 52,
          },
        });
      }
    },
    [voiceGuidanceEnabled],
  );

  const loadRouteOptions = useCallback(
    async (
      destination: LatLng,
      navigating: boolean,
      destinationTitle?: string,
      source: RouteLoadSource = 'user',
    ) => {
      const origin = currentLocationRef.current;
      if (!origin) return;
      if (source === 'auto') {
        const activeDestinationSnapshot = activeDestinationRef.current;
        if (
          !isNavigatingRef.current ||
          !activeDestinationSnapshot ||
          !isSameCoordinate(activeDestinationSnapshot, destination)
        ) {
          return;
        }
      }

      const requestId = routeRequestIdRef.current + 1;
      routeRequestIdRef.current = requestId;
      if (source !== 'auto') {
        setIsLoadingRoutes(true);
      }
      try {
        const routes = await getRoutes({
          originLat: origin.latitude,
          originLng: origin.longitude,
          destinationLat: destination.latitude,
          destinationLng: destination.longitude,
          mode: 'driving',
        });
        const nextOptions = routes
          .map((route, index): RouteOption => ({
            ...route,
            id: route.id || `route-${index + 1}`,
            path: normalizeRoutePath(route.path, origin, destination),
          }))
          .filter(route => route.path.length > 1);

        if (nextOptions.length === 0) {
          throw new Error('empty_route');
        }

        if (routeRequestIdRef.current !== requestId) {
          return;
        }
        setRouteOptions(navigating ? [nextOptions[0]] : nextOptions);
        focusRoute(nextOptions[0], destination, navigating, destinationTitle);
        setIsSheetCollapsed(navigating);
      } catch {
        if (routeRequestIdRef.current !== requestId) {
          return;
        }
        if (source === 'auto') {
          console.warn('[Navigation] auto reroute failed');
          return;
        }
        setIsLoadingRoutes(false);
        resetRouteState();
        Alert.alert(
          'Không tải được lộ trình',
          'VNSEEA chưa lấy được đường đi trong app. Bạn thử lại sau nhé.',
        );
      } finally {
        if (routeRequestIdRef.current === requestId && source !== 'auto') {
          setIsLoadingRoutes(false);
        }
      }
    },
    [focusRoute, getRoutes, resetRouteState],
  );

  const selectPoint = useCallback(
    (point: SelectedPoint, shouldRoute = false) => {
      Keyboard.dismiss();
      setIsSearchFocused(false);
      setSelectedPoint(point);
      setIsSheetCollapsed(false);
      resetRouteState();

      mapRef.current?.animateToRegion(
        {
          ...point.coordinate,
          latitudeDelta: 0.007,
          longitudeDelta: 0.007,
        },
        450,
      );

      if (shouldRoute && point.source !== 'self') {
        loadRouteOptions(point.coordinate, false, point.title).catch(() => undefined);
      }
    },
    [loadRouteOptions, resetRouteState],
  );

  const selectPage = useCallback(
    (page: NearbyPlace) => {
      if (!page.coordinate) return;

      selectPoint({
        id: page.id,
        source: 'page',
        title: page.name,
        subtitle: page.username ? `@${page.username}` : page.location || 'Page',
        address: page.location,
        avatarUrl: page.avatarUrl,
        url: page.url,
        showNameBadge: true,
        page,
        coordinate: page.coordinate,
        distanceMeters: page.distanceMeters,
      });
    },
    [selectPoint],
  );

  const selectCurrentUser = useCallback(() => {
    const location = currentLocationRef.current;
    if (!location) return;

    setActiveRoute([]);
    setActiveRouteConnector([]);
    setActiveDestination(null);
    setRouteHeading(null);
    setActiveRouteDuration(null);
    lastRoutedOriginRef.current = null;
    selectPoint(
      {
        id: 'current-user',
        source: 'self',
        title: 'Vị trí của tôi',
        subtitle: 'Bạn đang ở đây',
        coordinate: location,
        distanceMeters: 0,
      },
      false,
    );
  }, [selectPoint]);

  const handlePoiPress = useCallback(
    (event: {
      nativeEvent: {
        coordinate?: LatLng;
        name?: string;
        placeId?: string;
      };
    }) => {
      const coordinate = event.nativeEvent.coordinate;
      if (!coordinate) return;

      selectPoint({
        id: event.nativeEvent.placeId || `poi:${formatCoordinate(coordinate)}`,
        source: 'google',
        title: event.nativeEvent.name || 'Địa điểm',
        subtitle: formatCoordinate(coordinate),
        address: event.nativeEvent.name || 'Địa điểm',
        coordinate,
        types: [],
      });
    },
    [selectPoint],
  );

  const handleSelectSuggestion = useCallback(
    async (item: SuggestionItem) => {
      setIsSearchFocused(false);
      Keyboard.dismiss();

      if (item.kind === 'page') {
        setQuery(item.page.name);
        selectPage(item.page);
      } else {
        setQuery(item.prediction.description);
        try {
          setIsLoadingRoutes(true);
          const details = await getPlaceDetails(item.prediction.placeId);
          if (details && details.coordinate) {
            selectPoint({
              id: details.id,
              source: 'google',
              title: details.name,
              subtitle: details.location || item.prediction.description,
              address: details.location || item.prediction.description,
              coordinate: details.coordinate,
              types: item.prediction.types,
              icon: details.icon,
              iconBackgroundColor: details.iconBackgroundColor,
            });
          } else {
            Alert.alert('Không lấy được tọa độ', 'Không tìm thấy tọa độ của địa chỉ này.');
          }
        } catch {
          Alert.alert('Lỗi', 'Không thể lấy thông tin địa điểm.');
        } finally {
          setIsLoadingRoutes(false);
        }
      }
    },
    [selectPage, selectPoint, getPlaceDetails],
  );

  const handlePerformSearch = useCallback(
    async (keyword: string) => {
      const trimmed = keyword.trim();
      if (trimmed.length < 3) return;

      setIsSearchFocused(false);
      Keyboard.dismiss();
      setIsLoadingRoutes(true);
      setSelectedPoint(null);
      resetRouteState();

      try {
        const current = currentLocationRef.current;
        if (!current) {
          Alert.alert(
            'Chưa xác định vị trí',
            'VNSEEA cần vị trí hiện tại của bạn để tìm trong phạm vi 3km.',
          );
          return;
        }

        const searchLat = current?.latitude;
        const searchLng = current?.longitude;
        const searchOrigin =
          searchLat !== undefined && searchLng !== undefined
            ? { latitude: searchLat, longitude: searchLng }
            : null;

        const result = await searchNearbyPagesAndPlaces({
          query: trimmed,
          googleQuery: getGoogleCategorySearchQuery(trimmed),
          lat: searchLat,
          lng: searchLng,
          radius: SEARCH_RADIUS_METERS,
          limit: 30, // Get more results to show a rich list!
        });

        const pageSuggestions = result.pages
          .map(page => {
            const distance =
              searchOrigin && page.coordinate
                ? distanceMeters(searchOrigin, page.coordinate)
                : page.distanceMeters;

            return {
              id: page.id,
              kind: 'page' as const,
              page: {
                ...page,
                distanceMeters:
                  typeof distance === 'number' && Number.isFinite(distance)
                    ? distance
                    : page.distanceMeters,
              },
            };
          })
          .filter(item => {
            if (!searchOrigin) return true;
            const dist = item.page.distanceMeters;
            return dist === undefined || dist <= SEARCH_RADIUS_METERS;
          });

        // Resolve coordinates for Google predictions missing lat/lng
        const resolvedPredictions = await Promise.all(
          result.predictions.map(async pred => {
            if (typeof pred.lat === 'number' && typeof pred.lng === 'number') {
              return pred;
            }
            // Fetch place details to get coordinates
            try {
              const details = await getPlaceDetails(pred.placeId);
              if (details?.coordinate) {
                return {
                  ...pred,
                  lat: details.coordinate.latitude,
                  lng: details.coordinate.longitude,
                  icon: details.icon,
                  iconBackgroundColor: details.iconBackgroundColor,
                };
              }
            } catch {
              // ignore individual failures
            }
            return pred;
          }),
        );

        const googleSuggestions = resolvedPredictions
          .map(pred => {
            const distance =
              searchOrigin &&
              typeof pred.lat === 'number' &&
              typeof pred.lng === 'number'
                ? distanceMeters(searchOrigin, {
                    latitude: pred.lat,
                    longitude: pred.lng,
                  })
                : pred.distanceMeters;

            return {
              id: pred.placeId,
              kind: 'google' as const,
              prediction: {
                ...pred,
                distanceMeters:
                  typeof distance === 'number' && Number.isFinite(distance)
                    ? distance
                    : pred.distanceMeters,
              },
            };
          })
          .filter(item => {
            if (!searchOrigin) return true;
            const dist = item.prediction.distanceMeters;
            return dist !== undefined && dist <= SEARCH_RADIUS_METERS;
          });

        const combined = [...pageSuggestions, ...googleSuggestions].sort(
          sortSearchSuggestions,
        );
        setSearchResults(combined);
        setIsSearchResultsVisible(combined.length > 0);

        const closest = findClosestSuggestion(combined);
        if (closest) {
          if (closest.kind === 'page') {
            selectPage(closest.page);
          } else if (
            typeof closest.prediction.lat === 'number' &&
            typeof closest.prediction.lng === 'number'
          ) {
            selectPoint({
              id: closest.prediction.placeId,
              source: 'google',
              title: closest.prediction.mainText,
              subtitle:
                closest.prediction.secondaryText ||
                closest.prediction.description,
              address:
                closest.prediction.secondaryText ||
                closest.prediction.description,
              coordinate: {
                latitude: closest.prediction.lat,
                longitude: closest.prediction.lng,
              },
              distanceMeters: closest.prediction.distanceMeters,
              types: closest.prediction.types,
              icon: closest.prediction.icon,
              iconBackgroundColor: closest.prediction.iconBackgroundColor,
            });
          }
        }
      } catch {
        Alert.alert('Lỗi', 'Không thể thực hiện tìm kiếm.');
      } finally {
        setIsLoadingRoutes(false);
      }
    },
    [getPlaceDetails, searchNearbyPagesAndPlaces, selectPage, selectPoint],
  );

  const handleSelectSearchResult = useCallback(
    async (item: SuggestionItem) => {
      if (item.kind === 'page') {
        selectPage(item.page);
      } else {
        if (item.prediction.lat && item.prediction.lng) {
          selectPoint({
            id: item.prediction.placeId,
            source: 'google',
            title: item.prediction.mainText,
            subtitle: item.prediction.secondaryText || item.prediction.description,
            address: item.prediction.secondaryText || item.prediction.description,
            coordinate: {
              latitude: item.prediction.lat,
              longitude: item.prediction.lng,
            },
            types: item.prediction.types,
            icon: item.prediction.icon,
            iconBackgroundColor: item.prediction.iconBackgroundColor,
          });
        } else {
          try {
            setIsLoadingRoutes(true);
            const details = await getPlaceDetails(item.prediction.placeId);
            if (details && details.coordinate) {
              selectPoint({
                id: details.id,
                source: 'google',
                title: details.name,
                subtitle: details.location || item.prediction.description,
                address: details.location || item.prediction.description,
                coordinate: details.coordinate,
                types: item.prediction.types,
                icon: details.icon,
                iconBackgroundColor: details.iconBackgroundColor,
              });
            }
          } catch {
            Alert.alert('Lỗi', 'Không thể lấy thông tin địa điểm.');
          } finally {
            setIsLoadingRoutes(false);
          }
        }
      }
    },
    [selectPage, selectPoint, getPlaceDetails],
  );

  const dismissSearchInput = useCallback(() => {
    if (!isSearchFocused) return;

    Keyboard.dismiss();
    setIsSearchFocused(false);
  }, [isSearchFocused]);

  const handleMapPress = useCallback(() => {
    dismissSearchInput();
    if (selectedPoint && !isNavigating && !isRoutePreview) {
      setSelectedPoint(null);
      resetRouteState();
    }
  }, [dismissSearchInput, selectedPoint, isNavigating, isRoutePreview, resetRouteState]);

  const handleMapPanDrag = useCallback(() => {
    dismissSearchInput();
    if (isNavigatingRef.current) {
      setIsAutoCentering(false);
    }
  }, [dismissSearchInput]);

  const handleUserLocationChange = useCallback(
    (event: UserLocationChangeEvent) => {
      const coordinate = event.nativeEvent.coordinate;
      if (!coordinate) return;

      const location = {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      };
      if (
        !Number.isFinite(location.latitude) ||
        !Number.isFinite(location.longitude)
      ) {
        return;
      }

      const previousLocation = currentLocationRef.current;
      const wasUsingProfileLocation = locationSource === 'profile';
      const movedVeryFar =
        previousLocation !== null &&
        distanceMeters(previousLocation, location) >
          LOCATION_RECENTER_DISTANCE_METERS;
      currentLocationRef.current = location;
      const now = Date.now();
      const lastStateLocation = lastLocationStateRef.current;
      const minLocationMeters = isNavigatingRef.current
        ? NAVIGATION_LOCATION_STATE_MIN_METERS
        : IDLE_LOCATION_STATE_MIN_METERS;
      const minLocationMs = isNavigatingRef.current
        ? NAVIGATION_LOCATION_STATE_MIN_MS
        : IDLE_LOCATION_STATE_MIN_MS;
      const movedSinceState =
        lastStateLocation === null
          ? Infinity
          : distanceMeters(lastStateLocation, location);
      if (
        movedSinceState >= minLocationMeters ||
        now - lastLocationStateUpdatedAtRef.current >= minLocationMs
      ) {
        lastLocationStateRef.current = location;
        lastLocationStateUpdatedAtRef.current = now;
        setCurrentLocation(location);
      }
      if (locationSource !== 'gps') {
        setLocationSource('gps');
      }
      
      const speed = coordinate.speed ?? 0;
      const lastSpeed = lastSpeedStateRef.current;
      if (
        lastSpeed === null ||
        Math.abs(lastSpeed - speed) >= 0.35 ||
        now - lastSpeedStateUpdatedAtRef.current >= 900
      ) {
        lastSpeedStateRef.current = speed;
        lastSpeedStateUpdatedAtRef.current = now;
        setUserSpeed(speed);
      }

      const gpsHeading = Number(coordinate.heading);
      if (
        Number.isFinite(gpsHeading) &&
        gpsHeading >= 0 &&
        gpsHeading <= 360
      ) {
        const lastHeading = lastHeadingStateRef.current;
        if (
          lastHeading === null ||
          Math.abs(normalizeBearingDelta(lastHeading, gpsHeading)) >=
            HEADING_STATE_MIN_DEGREES ||
          now - lastHeadingStateUpdatedAtRef.current >= HEADING_STATE_MIN_MS
        ) {
          lastHeadingStateRef.current = gpsHeading;
          lastHeadingStateUpdatedAtRef.current = now;
          setCurrentHeading(gpsHeading);
        }
      }

      if (!hasCenteredOnUser || wasUsingProfileLocation || movedVeryFar) {
        setHasCenteredOnUser(true);
        mapRef.current?.animateToRegion(
          {
            ...location,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          },
          500,
        );
      }

      if (!hasLoadedNearbyPages || wasUsingProfileLocation || movedVeryFar) {
        hasLoadedNearbyPagesRef.current = true;
        setHasLoadedNearbyPages(true);
        loadPagesAroundUser(location).catch(() => undefined);
      }

      const latestActiveDestination = activeDestinationRef.current;
      if (!latestActiveDestination || !isNavigatingRef.current) return;
      const activePath = activeRoutePathRef.current;
      const offRouteDistance = distanceToRoutePath(location, activePath);
      const shouldReroute =
        activePath.length < 2 ||
        offRouteDistance > OFF_ROUTE_DISTANCE_METERS;

      if (shouldReroute && now - lastRerouteAtRef.current >= REROUTE_COOLDOWN_MS) {
        lastRerouteAtRef.current = now;
        loadRouteOptions(
          latestActiveDestination,
          true,
          selectedPointTitleRef.current,
          'auto',
        ).catch(() => undefined);
      }
    },
    [
      hasCenteredOnUser,
      hasLoadedNearbyPages,
      loadPagesAroundUser,
      loadRouteOptions,
      locationSource,
    ],
  );

  const handleShare = useCallback(() => {
    if (!selectedPoint) return;

    Share.share({
      message:
        selectedPoint.url ||
        `${selectedPoint.title}\n${selectedPoint.subtitle}\n${formatCoordinate(
          selectedPoint.coordinate,
        )}`,
      title: selectedPoint.title,
    }).catch(() => undefined);
  }, [selectedPoint]);

  const handleViewDetails = useCallback(() => {
    if (!selectedPoint) return;

    if (selectedPoint.source === 'page' && selectedPoint.page) {
      const initialPage = pageFromNearbyPlace(selectedPoint.page);
      const requestId = pageDetailRequestIdRef.current + 1;
      pageDetailRequestIdRef.current = requestId;

      setPageDetailPlace(selectedPoint.page);
      setPageDetail(initialPage);
      setIsPageDetailLoading(Boolean(initialPage.pageId));

      if (initialPage.pageId) {
        pagesRepository
          .getPageDetail({ pageId: initialPage.pageId })
          .then(fullPage => {
            if (pageDetailRequestIdRef.current === requestId) {
              setPageDetail(fullPage);
            }
          })
          .catch(() => undefined)
          .finally(() => {
            if (pageDetailRequestIdRef.current === requestId) {
              setIsPageDetailLoading(false);
            }
          });
      }
      return;
    }

    Alert.alert(
      selectedPoint.title,
      [
        selectedPoint.subtitle,
        selectedDistance !== undefined
          ? `Khoảng cách: ${formatDistance(selectedDistance)}`
          : null,
        `Tọa độ: ${formatCoordinate(selectedPoint.coordinate)}`,
      ]
        .filter(Boolean)
        .join('\n'),
      [
        { text: 'Đóng', style: 'cancel' },
        selectedPoint.url
          ? { text: 'Chia sẻ', onPress: handleShare }
          : { text: 'Chia sẻ', onPress: handleShare },
      ],
    );
  }, [handleShare, selectedDistance, selectedPoint]);

  const closePageDetail = useCallback(() => {
    pageDetailRequestIdRef.current += 1;
    setPageDetailPlace(null);
    setPageDetail(null);
    setIsPageDetailLoading(false);
    setIsPageActionLoading(false);
  }, []);

  const handleOpenPageDetail = useCallback(() => {
    if (!activePageDetail) return;
    closePageDetail();
    navigation.navigate(ROUTES.PAGE_DETAIL, { page: activePageDetail });
  }, [activePageDetail, closePageDetail, navigation]);

  const handleMessagePageOwner = useCallback(() => {
    if (!activePageDetail) return;

    if (isOwnPageDetail) {
      closePageDetail();
      navigation.navigate(ROUTES.PAGE_DETAIL, { page: activePageDetail });
      return;
    }

    const chat = chatFromPageOwner(activePageDetail);
    if (!chat) {
      Alert.alert(
        'Chưa có thông tin người tạo trang',
        'API chưa trả về người tạo page nên chưa thể mở đoạn chat.',
      );
      return;
    }

    closePageDetail();
    navigation.navigate(ROUTES.CHAT, { chat });
  }, [activePageDetail, closePageDetail, isOwnPageDetail, navigation]);

  const handleFollowPageDetail = useCallback(async () => {
    if (!activePageDetail?.pageId || isPageActionLoading) return;

    const previous = activePageDetail;
    setIsPageActionLoading(true);
    setPageDetail(current =>
      current
        ? {
            ...current,
            isFollowing: true,
            followersCount: Math.max(0, (current.followersCount ?? 0) + 1),
          }
        : current,
    );

    try {
      const result = await pagesRepository.toggleFollowPage(activePageDetail.pageId);
      setPageDetail(current =>
        current
          ? {
              ...current,
              isFollowing: result.isFollowing,
              followersCount: Math.max(
                0,
                (previous.followersCount ?? current.followersCount ?? 0) +
                  (result.isFollowing === previous.isFollowing
                    ? 0
                    : result.isFollowing
                      ? 1
                      : -1),
              ),
            }
          : current,
      );
    } catch (err) {
      setPageDetail(previous);
      Alert.alert(
        'Không thể theo dõi',
        err instanceof Error ? err.message : 'Vui lòng thử lại sau.',
      );
    } finally {
      setIsPageActionLoading(false);
    }
  }, [activePageDetail, isPageActionLoading]);

  const handleGetDirections = useCallback(async () => {
    if (!selectedPoint || selectedPoint.source === 'self') return;
    if (!currentLocationRef.current) {
      Alert.alert(
        'Cần vị trí của bạn',
        'Bật quyền vị trí để xem chỉ đường trực tiếp trong app.',
      );
      return;
    }
    const dest = selectedPoint.coordinate;
    Keyboard.dismiss();
    setIsSearchFocused(false);
    setIsSheetCollapsed(false);
    await loadRouteOptions(dest, false, selectedPoint.title);
  }, [loadRouteOptions, selectedPoint]);

  const handleStartNavigation = useCallback(async () => {
    if (!selectedPoint || selectedPoint.source === 'self') return;
    if (!currentLocationRef.current) {
      Alert.alert(
        'Cần vị trí của bạn',
        'Bật quyền vị trí để bắt đầu chỉ đường trực tiếp trong app.',
      );
      return;
    }

    Keyboard.dismiss();
    setIsSearchFocused(false);

    const hasRouteForSelectedPoint =
      routeMatchesSelectedPoint &&
      activeDestination !== null &&
      isSameCoordinate(activeDestination, selectedPoint.coordinate);
    const currentRoute = hasRouteForSelectedPoint
      ? routeOptions.find(route => route.id === selectedRouteId) ||
        routeOptions[0]
      : undefined;
    if (currentRoute) {
      setRouteOptions([currentRoute]);
      focusRoute(currentRoute, selectedPoint.coordinate, true, selectedPoint.title);
      setIsSheetCollapsed(true);
      return;
    }

    await loadRouteOptions(selectedPoint.coordinate, true, selectedPoint.title);
  }, [
    focusRoute,
    loadRouteOptions,
    activeDestination,
    routeOptions,
    routeMatchesSelectedPoint,
    selectedPoint,
    selectedRouteId,
  ]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Cho phép truy cập vị trí',
        message:
          'VNSEEA cần vị trí của bạn để hiển thị Page gần đây và cập nhật chỉ đường.',
        buttonPositive: 'Cho phép',
        buttonNegative: 'Để sau',
      },
    )
      .then(result =>
        setLocationAllowed(result === PermissionsAndroid.RESULTS.GRANTED),
      )
      .catch(() => setLocationAllowed(false));
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    const trimmed = query.trim();
    setSearchMessage('');
    if (trimmed.length < 3) {
      clearPlacePredictions();
      if (currentLocationRef.current && hasLoadedNearbyPages) {
        loadPagesAroundUser(currentLocationRef.current).catch(() => undefined);
      }
      return;
    }

    searchTimerRef.current = setTimeout(() => {
      const current = currentLocationRef.current;
      searchNearbyPagesAndPlaces({
        query: trimmed,
        googleQuery: getGoogleCategorySearchQuery(trimmed),
        lat: current?.latitude,
        lng: current?.longitude,
        radius: SEARCH_RADIUS_METERS,
        limit: 20,
      })
        .then(result => {
          if (result.pages.length === 0) {
            setSearchMessage(
              'Không tìm thấy Page phù hợp.',
            );
          }
        })
        .catch(caughtError => {
          const message =
            caughtError instanceof Error && caughtError.message
              ? caughtError.message
              : 'Không tải được gợi ý tìm kiếm.';
          setSearchMessage(message);
        });
    }, 300);

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [
    clearPlacePredictions,
    hasLoadedNearbyPages,
    loadPagesAroundUser,
    query,
    searchNearbyPagesAndPlaces,
  ]);

  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    loadCurrentUser()
      .then(user => {
        if (cancelled || currentLocationRef.current) return;
        const storedLocation = parseGeoInfo(user?.geoInfo);
        if (!storedLocation) return;

        fallbackTimer = setTimeout(() => {
          if (cancelled || currentLocationRef.current) return;

          currentLocationRef.current = storedLocation;
          setCurrentLocation(storedLocation);
          setLocationSource('profile');
          setHasCenteredOnUser(true);
          mapRef.current?.animateToRegion(
            {
              ...storedLocation,
              latitudeDelta: 0.03,
              longitudeDelta: 0.03,
            },
            500,
          );

          if (!hasLoadedNearbyPagesRef.current) {
            hasLoadedNearbyPagesRef.current = true;
            setHasLoadedNearbyPages(true);
            loadPagesAroundUser(storedLocation).catch(() => undefined);
          }
        }, 1200);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
    };
  }, [loadCurrentUser, loadPagesAroundUser]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        initialRegion={DEFAULT_REGION}
        googleMapId={
          hasGoogleMapId && !HIDE_GOOGLE_DISCOVERY_PLACES
            ? googleMapId
            : undefined
        }
        loadingEnabled
        mapType="standard"
        pitchEnabled
        rotateEnabled
        showsBuildings={false}
        showsCompass
        showsIndoorLevelPicker={false}
        showsIndoors={false}
        showsMyLocationButton={false}
        showsUserLocation={locationAllowed}
        toolbarEnabled={false}
        userInterfaceStyle="light"
        customMapStyle={CLEAN_GOOGLE_MAP_STYLE}
        onPoiClick={
          HIDE_GOOGLE_DISCOVERY_PLACES ? undefined : handlePoiPress
        }
        onPress={handleMapPress}
        onUserLocationChange={handleUserLocationChange}
        onPanDrag={handleMapPanDrag}
        onRegionChangeComplete={handleRegionChangeComplete}
        style={StyleSheet.absoluteFill}
      >
        {currentLocation ? (
          <Circle
            center={currentLocation}
            radius={3000}
            strokeColor="rgba(0, 0, 255, 0.28)"
            fillColor="rgba(0, 0, 255, 0.08)"
            strokeWidth={2}
          />
        ) : null}

        {currentLocation &&
        (locationSource === 'profile' || shouldShowRoute) ? (
          <Marker
            anchor={{ x: 0.5, y: 0.5 }}
            coordinate={currentLocation}
            flat
            rotation={
              userSpeed > NAVIGATION_MOVING_SPEED_MPS
                ? currentUserMarkerHeading
                : 0
            }
            tracksViewChanges={false}
            zIndex={20}
            onPress={selectCurrentUser}
          >
            <View style={styles.currentUserMarker}>
              {userSpeed > NAVIGATION_MOVING_SPEED_MPS ? (
                <View style={styles.currentUserPuck}>
                  <View style={styles.currentUserArrow}>
                    <View style={styles.currentUserArrowTail} />
                    <View style={styles.currentUserArrowHead} />
                  </View>
                </View>
              ) : (
                <View style={styles.currentUserBlueDotContainer}>
                  <View style={styles.currentUserBlueDot}>
                    <View style={styles.currentUserBlueDotCore} />
                  </View>
                </View>
              )}
            </View>
          </Marker>
        ) : null}

        {visiblePageMarkers.map(({ place, coordinate }) => {
          if (
            selectedPoint?.source === 'page' &&
            selectedPoint.id === place.id
          ) {
            return null;
          }

          return (
            <PageAvatarMapMarker
              key={`${place.id}:page-avatar:${place.avatarUrl || 'fallback'}`}
              coordinate={coordinate}
              place={place}
              zIndex={12}
              onPress={() => {
                setIsSearchResultsVisible(false);
                setSearchResults([]);
                selectPage(place);
              }}
            />
          );
        })}

        {selectedPoint?.source === 'page' ? (
          <PageAvatarMapMarker
            key={`selected:${selectedPoint.id}:${selectedPoint.avatarUrl || 'fallback'}`}
            coordinate={selectedPoint.coordinate}
            place={{
              id: selectedPoint.id,
              name: selectedPoint.title,
              avatarUrl: selectedPoint.avatarUrl,
            }}
            selected
            zIndex={30}
            onPress={() => {
              setIsSheetCollapsed(false);
            }}
          />
        ) : selectedPoint ? (
          <Marker
            key={`selected:${selectedPoint.id}:${selectedPoint.title}`}
            anchor={
              selectedPoint.showNameBadge
                ? { x: 0.13, y: 1 }
                : { x: 0.5, y: 1 }
            }
            coordinate={selectedPoint.coordinate}
            onPress={() => {
              setIsSheetCollapsed(false);
            }}
            tracksViewChanges={false}
            zIndex={30}
          >
            <View
              style={[
                styles.selectedMarker,
                selectedPoint.showNameBadge && styles.pageMarkerWithBadge,
              ]}
            >
              {(() => {
                const isGoogle = selectedPoint.source === 'google';
                const styleObj = isGoogle ? getPlaceIconAndColor(selectedPoint.types, query) : { color: '#16A34A', Icon: null };
                const shouldUseGoogleIcon =
                  isGoogle && styleObj.Icon === DefaultPlaceDotIcon;
                const categoryColor = shouldUseGoogleIcon
                  ? selectedPoint.iconBackgroundColor || styleObj.color
                  : styleObj.color;
                const Icon = styleObj.Icon;

                return (
                  <View style={[styles.selectedPin, isGoogle && styles.googleMarker]}>
                    <View style={[styles.selectedPinTail, { backgroundColor: categoryColor }]} />
                    <View style={[styles.selectedPinHead, { backgroundColor: categoryColor }]}>
                      {isGoogle && shouldUseGoogleIcon && selectedPoint.icon ? (
                        <Image
                          source={{ uri: selectedPoint.icon }}
                          style={{ width: 16, height: 16, tintColor: '#FFFFFF' }}
                          resizeMode="contain"
                        />
                      ) : isGoogle && Icon ? (
                        <Icon size={16} color="#FFFFFF" />
                      ) : (
                        <View style={styles.selectedPinCore} />
                      )}
                    </View>
                  </View>
                );
              })()}
              {selectedPoint.showNameBadge ? (
                <View
                  key={`selected-badge:${selectedPoint.id}:${selectedPoint.title}`}
                  style={styles.pageNameBadge}
                >
                  <Text style={styles.pageNameBadgeText} numberOfLines={1}>
                    {selectedPoint.title}
                  </Text>
                </View>
              ) : null}
            </View>
          </Marker>
        ) : null}

        {/* Main Route & Connector Polylines (Always mounted to prevent react-native-maps unmount render bugs on Android) */}
        <Polyline
          coordinates={
            isRoutePreview && shouldShowRoute && alternativeRoutes[0]
              ? alternativeRoutes[0].path
              : []
          }
          lineCap="round"
          lineJoin="round"
          strokeColor="rgba(100, 116, 139, 0.72)"
          strokeWidth={4}
          zIndex={14}
        />
        <Polyline
          coordinates={
            isRoutePreview && shouldShowRoute && alternativeRoutes[1]
              ? alternativeRoutes[1].path
              : []
          }
          lineCap="round"
          lineJoin="round"
          strokeColor="rgba(100, 116, 139, 0.72)"
          strokeWidth={4}
          zIndex={14}
        />
        <Polyline
          coordinates={
            isRoutePreview && shouldShowRoute && alternativeRoutes[2]
              ? alternativeRoutes[2].path
              : []
          }
          lineCap="round"
          lineJoin="round"
          strokeColor="rgba(100, 116, 139, 0.72)"
          strokeWidth={4}
          zIndex={14}
        />

        <Polyline
          coordinates={
            shouldShowRoute && activeRouteConnector.length > 1
              ? activeRouteConnector
              : []
          }
          lineCap="round"
          lineDashPattern={[2, 8]}
          strokeColor="rgba(255, 255, 255, 0.95)"
          strokeWidth={8}
          zIndex={15}
        />
        <Polyline
          coordinates={
            shouldShowRoute && activeRouteConnector.length > 1
              ? activeRouteConnector
              : []
          }
          lineCap="round"
          lineDashPattern={[2, 8]}
          strokeColor="#6B7280"
          strokeWidth={4}
          zIndex={16}
        />

        <Polyline
          coordinates={shouldShowRoute ? activeRoute : []}
          lineCap="round"
          lineJoin="round"
          strokeColor="rgba(255, 255, 255, 0.92)"
          strokeWidth={9}
          zIndex={16}
        />
        <Polyline
          coordinates={shouldShowRoute ? activeRoute : []}
          lineCap="round"
          lineJoin="round"
          strokeColor="#1A73E8"
          strokeWidth={6}
          zIndex={17}
        />

      {/* Render search results markers on the map */}
      {isSearchResultsVisible &&
        searchResults.map(item => {
          // Hide marker if it's currently selected to avoid double overlapping icons
          const isSelected = selectedPoint && (
            selectedPoint.id === item.id ||
            selectedPoint.id === `google:${item.id}` ||
            (selectedPoint.source === 'google' && item.kind === 'google' && selectedPoint.id.replace('google:', '') === item.prediction.placeId)
          );

          if (isSelected) return null;

          let coordinate: LatLng | null = null;
          let title = '';

          if (item.kind === 'page' && item.page.coordinate) {
            coordinate = item.page.coordinate;
            title = item.page.name;
          } else if (item.kind === 'google') {
            const lat = item.prediction.lat;
            const lng = item.prediction.lng;
            if (typeof lat === 'number' && typeof lng === 'number') {
              coordinate = { latitude: lat, longitude: lng };
            }
            title = item.prediction.mainText;
          }

          if (!coordinate) return null;

          const googleIconStyle = item.kind === 'google' ? getPlaceIconAndColor(item.prediction.types, query) : null;
          const MarkerIcon = googleIconStyle ? googleIconStyle.Icon : MapPin;
          const shouldUseGoogleIcon =
            item.kind === 'google' &&
            googleIconStyle?.Icon === DefaultPlaceDotIcon;

          return (
            <Marker
              key={`search-marker:${item.id}`}
              coordinate={coordinate}
              title={title}
              onPress={() => handleSelectSearchResult(item)}
            >
              {item.kind === 'page' ? (
                <PageAvatarMapMarker
                  coordinate={coordinate}
                  place={{
                    id: item.page.id,
                    name: item.page.name,
                    avatarUrl: item.page.avatarUrl,
                  }}
                  zIndex={25}
                  onPress={() => handleSelectSearchResult(item)}
                />
              ) : (
                <View
                  style={[
                    styles.googleCircleMarker,
                    {
                      backgroundColor: shouldUseGoogleIcon
                        ? item.prediction.iconBackgroundColor ||
                          googleIconStyle?.color ||
                          '#1E70E6'
                        : googleIconStyle?.color || '#1E70E6',
                    },
                  ]}
                >
                  {shouldUseGoogleIcon && item.prediction.icon ? (
                    <Image
                      source={{ uri: item.prediction.icon }}
                      style={{ width: 15, height: 15, tintColor: '#FFFFFF' }}
                      resizeMode="contain"
                    />
                  ) : (
                    <MarkerIcon size={15} color="#FFFFFF" />
                  )}
                </View>
              )}
            </Marker>
          );
        })}
      </MapView>

      {!isNavigating && !isRoutePreview && !isFullScreen ? (
        <View style={exploreTopControlsStyle}>
          <View style={styles.exploreSearchRow}>
            <Animated.View
              pointerEvents={isSearchFocused ? 'none' : 'auto'}
              style={[styles.searchBackSlot, searchBackAnimatedStyle]}
            >
              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.backButton}
                onPress={() => navigation.goBack()}
              >
                <ArrowLeft size={22} color="#0F172A" />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[styles.searchBox, searchBoxAnimatedStyle]}>
              <Search size={19} color={BRAND} />
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm ở đây"
                placeholderTextColor="#64748B"
                value={query}
                onBlur={() => {
                  if (query.trim().length === 0) {
                    setIsSearchFocused(false);
                  }
                }}
                onChangeText={text => {
                  setQuery(text);
                  setIsSearchFocused(true);
                  if (text.trim().length === 0) {
                    setSearchResults([]);
                    setIsSearchResultsVisible(false);
                    setSelectedPoint(null);
                    resetRouteState();
                  }
                }}
                onFocus={() => setIsSearchFocused(true)}
                onSubmitEditing={() => handlePerformSearch(query)}
                returnKeyType="search"
              />
              {query.length > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setQuery('');
                    setSearchMessage('');
                    setIsSearchFocused(false);
                    setSearchResults([]);
                    setIsSearchResultsVisible(false);
                    setSelectedPoint(null);
                    resetRouteState();
                    Keyboard.dismiss();
                  }}
                >
                  <X size={18} color="#94A3B8" />
                </TouchableOpacity>
              ) : isLoading ? (
                <ActivityIndicator color={BRAND} />
              ) : (
                <Mic size={19} color="#0F172A" />
              )}
            </Animated.View>
          </View>

          {SHOW_APP_DISCOVERY_PLACES_ON_MAP ? (
            <Animated.View
              pointerEvents={isSearchFocused ? 'none' : 'auto'}
              style={quickPlacesAnimatedStyle}
            >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.exploreChipRow}
          >
            {visibleNearbyQuickPlaces.length > 0 ? (
              visibleNearbyQuickPlaces.map(({ place, distanceMeters }) => (
                <TouchableOpacity
                  key={`nearby-chip:${place.id}`}
                  activeOpacity={0.86}
                  style={styles.exploreChip}
                  onPress={() => {
                    setIsSearchResultsVisible(false);
                    setSearchResults([]);
                    selectPage(place);
                  }}
                >
                  <MapPin size={17} color="#0F172A" />
                  <Text style={styles.exploreChipText} numberOfLines={1}>
                    {place.name}
                  </Text>
                  {distanceMeters !== undefined ? (
                    <Text style={styles.exploreChipMeta}>
                      {formatDistance(distanceMeters)}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.exploreChip}>
                <MapPin size={17} color="#0F172A" />
                <Text style={styles.exploreChipText}>Đang tìm gần bạn</Text>
              </View>
            )}
          </ScrollView>
            </Animated.View>
          ) : null}

          {!isSearchFocused && locationSource === 'profile' ? (
            <View style={styles.locationFallbackNotice}>
              <LocateFixed size={14} color="#1D4ED8" />
              <Text style={styles.locationFallbackText}>
                Đang lấy GPS chính xác, vị trí hiện tại chỉ là tạm thời.
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {isRoutePreview && selectedPoint ? (
        <View style={routePreviewCardStyle}>
          <View style={styles.routePreviewRows}>
            <View style={styles.routeDotColumn}>
              <View style={styles.routeOriginDot} />
              <View style={styles.routeDotLine} />
              <MapPin size={17} color="#EF4444" />
            </View>
            <View style={styles.routeTextColumn}>
              <Text style={styles.routeOriginText} numberOfLines={1}>
                Vị trí của bạn
              </Text>
              <View style={styles.routeDivider} />
              <Text style={styles.routeDestinationText} numberOfLines={1}>
                {selectedPoint.title}
              </Text>
            </View>
            <View style={styles.routePreviewActions}>
              <TouchableOpacity activeOpacity={0.82} onPress={handleShare}>
                <MoreVertical size={23} color="#334155" />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.82} onPress={handleStartNavigation}>
                <ArrowUpDown size={22} color="#334155" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : null}

      {!hasGoogleMapId ? (
        <View style={styles.mapConfigNotice}>
          <Text style={styles.mapConfigTitle}>
            Google Map ID chưa được cấu hình
          </Text>
          <Text style={styles.mapConfigText}>
            Thêm GOOGLE_MAPS_MAP_ID vào .env và rebuild app để dùng style chỉ
            đường.
          </Text>
        </View>
      ) : null}

      {isNavigating && shouldShowRoute && activeDestination ? (
        <View style={navigationBannerStyle}>
          <View style={styles.navigationBannerIcon}>
            <ManeuverIcon
              maneuver={turnInstruction?.maneuver ?? 'straight'}
              size={42}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.navigationBannerCopy}>
            <Text style={styles.navigationBannerTitle}>
              {turnInstruction
                ? formatDistance(turnInstruction.distanceMeters)
                : activeRouteDistance !== undefined
                  ? formatDistance(activeRouteDistance)
                  : 'Đang dẫn đường'}
            </Text>
            <Text style={styles.navigationBannerSubtitle} numberOfLines={1}>
              {turnInstruction
                ? turnInstruction.detail || turnLabel(turnInstruction.maneuver)
                : selectedPoint?.title || 'Đi theo tuyến đường đã chọn'}
            </Text>
          </View>
          <View style={styles.navigationSparkButton}>
            <Compass size={30} color="#4285F4" />
          </View>
        </View>
      ) : null}

      {shouldShowSuggestionPanel ? (
        <View style={suggestionPanelStyle}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={suggestions.length > 4}
          >
            {suggestions.slice(0, 10).map(item => (
              <SearchSuggestionRow
                key={item.id}
                item={item}
                onPress={() => handleSelectSuggestion(item)}
              />
            ))}
            {!isLoading && suggestions.length === 0 ? (
              <Text className="px-4 py-4 text-sm font-semibold text-slate-500">
                {searchMessage || error || 'Không có gợi ý phù hợp.'}
              </Text>
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      {isNavigating && !isAutoCentering ? (
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.recenterFloatButton}
          onPress={centerOnUser}
        >
          <LocateFixed size={18} color="#FFFFFF" />
          <Text style={styles.recenterFloatText}>Về giữa</Text>
        </TouchableOpacity>
      ) : null}

      {/* Nút Toàn màn hình */}
      <TouchableOpacity
        activeOpacity={0.86}
        style={[
          styles.mapFloatingBtn,
          styles.fullScreenButton,
          ((selectedPoint && !isSheetCollapsed && !isFullScreen) || (isSearchResultsVisible && !isFullScreen)) ? styles.fullScreenWithSheet : null,
        ]}
        onPress={() => setIsFullScreen(prev => !prev)}
      >
        {isFullScreen ? (
          <Minimize2 size={21} color={BRAND} />
        ) : (
          <Maximize2 size={21} color={BRAND} />
        )}
      </TouchableOpacity>

      {/* Nút Phóng to */}
      <TouchableOpacity
        activeOpacity={0.86}
        style={[
          styles.mapFloatingBtn,
          styles.zoomInButton,
          ((selectedPoint && !isSheetCollapsed && !isFullScreen) || (isSearchResultsVisible && !isFullScreen)) ? styles.zoomInWithSheet : null,
        ]}
        onPress={handleZoomIn}
      >
        <Plus size={21} color={BRAND} />
      </TouchableOpacity>

      {/* Nút Thu nhỏ */}
      <TouchableOpacity
        activeOpacity={0.86}
        style={[
          styles.mapFloatingBtn,
          styles.zoomOutButton,
          ((selectedPoint && !isSheetCollapsed && !isFullScreen) || (isSearchResultsVisible && !isFullScreen)) ? styles.zoomOutWithSheet : null,
        ]}
        onPress={handleZoomOut}
      >
        <Minus size={21} color={BRAND} />
      </TouchableOpacity>

      {/* Nút La bàn */}
      <TouchableOpacity
        activeOpacity={0.86}
        style={[
          styles.compassButton,
          ((selectedPoint && !isSheetCollapsed && !isFullScreen) || (isSearchResultsVisible && !isFullScreen)) ? styles.compassWithSheet : null,
        ]}
        onPress={resetMapHeading}
      >
        <Compass size={21} color={BRAND} />
      </TouchableOpacity>

      {/* Nút Vị trí của tôi */}
      <TouchableOpacity
        activeOpacity={0.86}
        style={[
          styles.locateButton,
          ((selectedPoint && !isSheetCollapsed && !isFullScreen) || (isSearchResultsVisible && !isFullScreen)) ? styles.locateWithSheet : null,
        ]}
        onPress={centerOnUser}
      >
        <LocateFixed size={21} color={BRAND} />
      </TouchableOpacity>

      {!locationAllowed ? (
        <View style={styles.permissionNotice}>
          <MapPin size={16} color="#D97706" />
          <Text className="ml-2 flex-1 text-xs font-semibold text-amber-700">
            Bật quyền vị trí để zoom quanh bạn trong phạm vi 1km và cập nhật chỉ
            đường.
          </Text>
        </View>
      ) : null}

      {isRoutePreview && selectedPoint ? (
        <View style={styles.routeActionDock}>
          <View style={styles.sheetHandle} />
          <View style={styles.routeActionHeader}>
            <Text style={styles.routeActionTitle}>Lái xe</Text>
            <View style={styles.routeActionHeaderButtons}>
              <TouchableOpacity activeOpacity={0.82} style={styles.routeIconButton}>
                <SlidersHorizontal size={18} color="#334155" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.routeIconButton}
                onPress={handleShare}
              >
                <Share2 size={18} color="#334155" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.routeIconButton}
                onPress={resetRouteState}
              >
                <X size={18} color="#334155" />
              </TouchableOpacity>
            </View>
          </View>

          {shouldShowRoute && routeOptions.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.routeOptionsRow}
            >
              {routeOptions.map((route, index) => {
                const isActive = route.id === selectedRouteId;
                return (
                  <TouchableOpacity
                    key={`route-dock-chip:${route.id}`}
                    activeOpacity={0.86}
                    style={[
                      styles.routeOptionChip,
                      isActive && styles.routeOptionChipActive,
                    ]}
                    onPress={() =>
                      focusRoute(
                        route,
                        selectedPoint.coordinate,
                        false,
                        selectedPoint.title,
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.routeOptionTitle,
                        isActive && styles.routeOptionTitleActive,
                      ]}
                    >
                      {formatDuration(route.durationSeconds)}
                    </Text>
                    <Text
                      style={[
                        styles.routeOptionMeta,
                        isActive && styles.routeOptionMetaActive,
                      ]}
                      numberOfLines={1}
                    >
                      Tuyến {index + 1} · {formatDistance(route.distanceMeters)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          <View style={styles.routeActionButtons}>
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.startNavigationButton}
              onPress={handleStartNavigation}
            >
              <NavigationIcon size={18} color="#FFFFFF" />
              <Text style={styles.startNavigationText}>Bắt đầu</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.86} style={styles.secondaryRouteButton}>
              <MapPin size={18} color="#006B64" />
              <Text style={styles.secondaryRouteButtonText}>Thêm điểm dừng</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.secondaryRouteButton}
              onPress={handleShare}
            >
              <Share2 size={18} color="#006B64" />
              <Text style={styles.secondaryRouteButtonText}>Chia sẻ</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {isNavigating && shouldShowRoute ? (
        <View style={styles.navigationEtaDock}>
          <TouchableOpacity
            activeOpacity={0.86}
            style={styles.navigationRoundButton}
            onPress={resetRouteState}
          >
            <X size={31} color="#334155" />
          </TouchableOpacity>
          <View style={styles.navigationEtaCopy}>
            <View style={styles.sheetHandle} />
            <Text style={styles.navigationEtaTitle}>
              {activeRouteDuration && activeRouteDuration > 0
                ? formatDuration(activeRouteDuration)
                : 'Đang cập nhật'}
            </Text>
            <Text style={styles.navigationEtaSubtitle}>
              {[
                activeRouteDistance !== undefined
                  ? formatDistance(activeRouteDistance)
                  : null,
                arrivalTimeText,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.86}
            style={[
              styles.navigationRoundButton,
              voiceGuidanceEnabled && styles.navigationRoundButtonActive,
            ]}
            onPress={() => setVoiceGuidanceEnabled(value => !value)}
          >
            <Volume2
              size={29}
              color={voiceGuidanceEnabled ? '#006B64' : '#334155'}
            />
          </TouchableOpacity>
        </View>
      ) : null}

      {selectedPoint && !isSheetCollapsed && !isRoutePreview && !isFullScreen ? (
        <View style={styles.sheet}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.sheetClose}
            onPress={() => setIsSheetCollapsed(true)}
          >
            <X size={18} color="#64748B" />
          </TouchableOpacity>

          <View className="flex-row items-center pr-7">
            {selectedPoint.source === 'page' ? (
              <Image
                source={{ uri: selectedPoint.avatarUrl || FALLBACK_AVATAR }}
                className="h-14 w-14 rounded-2xl bg-slate-100"
              />
            ) : (
              (() => {
                const { Icon, bg, color } = getPlaceIconAndColor(
                  selectedPoint.types,
                  query,
                );

                return (
                  <View
                    style={{
                      backgroundColor: bg,
                      width: 56,
                      height: 56,
                      borderRadius: 16,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={24} color={color} />
                  </View>
                );
              })()
            )}
            <View className="ml-3 flex-1">
              <Text
                className="text-base font-extrabold text-slate-950"
                numberOfLines={1}
              >
                {selectedPoint.title}
              </Text>
              <Text
                className="mt-0.5 text-sm font-semibold text-slate-500"
                numberOfLines={1}
              >
                {selectedPoint.subtitle}
              </Text>
            </View>
          </View>

          <View className="mt-3 flex-row flex-wrap items-center">
            {activeRouteDuration !== null && activeRouteDuration > 0 ? (
              <View style={styles.durationBadge}>
                <Text style={styles.durationText}>
                  {formatDuration(activeRouteDuration)}
                </Text>
              </View>
            ) : null}
            {selectedDistance !== undefined ? (
              <View style={styles.distanceBadge}>
                <Text style={styles.distanceText}>
                  {formatDistance(selectedDistance)}
                </Text>
              </View>
            ) : null}
            <View style={styles.coordinateBadge}>
              <MapPin size={13} color="#64748B" />
              <Text style={styles.coordinateText} numberOfLines={1}>
                {selectedPoint.subtitle ||
                  formatCoordinate(selectedPoint.coordinate)}
              </Text>
            </View>
          </View>

          <Text
            className="mt-2 text-xs font-semibold text-slate-500"
            numberOfLines={2}
          >
            {selectedPoint.address || selectedPoint.subtitle}
          </Text>

          {shouldShowRoute && routeOptions.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.routeOptionsRow}
            >
              {routeOptions.map((route, index) => {
                const isActive = route.id === selectedRouteId;
                return (
                  <TouchableOpacity
                    key={`route-chip:${route.id}`}
                    activeOpacity={0.86}
                    style={[
                      styles.routeOptionChip,
                      isActive && styles.routeOptionChipActive,
                    ]}
                    onPress={() =>
                      focusRoute(
                        route,
                        selectedPoint.coordinate,
                        isNavigating,
                        selectedPoint.title,
                      )
                    }
                  >
                    <Text
                      style={[
                        styles.routeOptionTitle,
                        isActive && styles.routeOptionTitleActive,
                      ]}
                    >
                      Tuyến {index + 1}
                    </Text>
                    <Text
                      style={[
                        styles.routeOptionMeta,
                        isActive && styles.routeOptionMetaActive,
                      ]}
                      numberOfLines={1}
                    >
                      {[
                        formatDuration(route.durationSeconds),
                        formatDistance(route.distanceMeters),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          <View className="mt-4 flex-row gap-2">
            {selectedPoint.source === 'google' ? (
              <TouchableOpacity
                activeOpacity={0.86}
                className="flex-1 items-center rounded-xl border border-slate-200 bg-white px-2 py-3"
                onPress={handleShare}
              >
                <Text className="text-xs font-extrabold text-slate-900">
                  Chia sẻ
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.86}
                className="flex-1 items-center rounded-xl border border-slate-200 bg-white px-2 py-3"
                onPress={handleViewDetails}
              >
                <Text className="text-xs font-extrabold text-slate-900">
                  Chi tiết
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              activeOpacity={0.86}
              className="flex-1 items-center rounded-xl bg-blue-700 px-2 py-3"
              onPress={handleGetDirections}
              disabled={selectedPoint.source === 'self' || isLoadingRoutes}
              style={
                selectedPoint.source === 'self' || isLoadingRoutes
                  ? { opacity: 0.45 }
                  : null
              }
            >
              {isLoadingRoutes ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="text-xs font-extrabold text-white">
                  Đường đi
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              className="flex-1 items-center rounded-xl border border-blue-200 bg-blue-50 px-2 py-3"
              onPress={handleStartNavigation}
              disabled={selectedPoint.source === 'self' || isLoadingRoutes}
              style={
                selectedPoint.source === 'self' || isLoadingRoutes
                  ? { opacity: 0.45 }
                  : null
              }
            >
              <Text className="text-xs font-extrabold text-blue-700">
                Bắt đầu
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Search results bottom container */}
      {isSearchResultsVisible && searchResults.length > 0 && !isFullScreen ? (
        <View style={styles.searchResultsPanel}>
          <View style={styles.searchResultsHeader}>
            <Text style={styles.searchResultsTitle}>
              Kết quả tìm kiếm ({searchResults.length})
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.searchResultsCloseBtn}
              onPress={() => {
                setIsSearchResultsVisible(false);
                setSearchResults([]);
              }}
            >
              <X size={16} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={searchResultsScrollRef}
            style={styles.searchResultsList}
            contentContainerStyle={styles.searchResultsListContent}
            showsVerticalScrollIndicator={true}
          >
            {searchResults.map(item => {
              const isPinned = item.kind === 'page' && (item.page.isPinned || item.page.mapPinApproved);
              
              let coordinate: LatLng | null = null;
              let title = '';
              let subtitle = '';
              let addressText = '';
              let avatarUrl = '';
              let types: string[] | undefined;

              if (item.kind === 'page') {
                coordinate = item.page.coordinate || null;
                title = item.page.name;
                subtitle = item.page.username ? `@${item.page.username}` : item.page.location || 'Page';
                addressText = item.page.location || '';
                avatarUrl = item.page.avatarUrl || '';
              } else {
                const lat = item.prediction.lat;
                const lng = item.prediction.lng;
                if (lat !== undefined && lng !== undefined) {
                  coordinate = { latitude: lat, longitude: lng };
                }
                title = item.prediction.mainText;
                subtitle = item.prediction.secondaryText || item.prediction.description;
                addressText = item.prediction.secondaryText || item.prediction.description;
                types = item.prediction.types;
              }

              const distMeters = (coordinate && currentLocation) ? distanceMeters(currentLocation, coordinate) : (item.kind === 'page' ? item.page.distanceMeters : undefined);
              const googleIconStyle = item.kind === 'google' ? getPlaceIconAndColor(types, query) : null;
              const IconComponent = googleIconStyle ? googleIconStyle.Icon : null;
              const shouldUseGoogleIcon =
                item.kind === 'google' &&
                googleIconStyle?.Icon === DefaultPlaceDotIcon;

              const onDetailsOrShare = () => {
                if (item.kind === 'page') {
                  selectPage(item.page);
                } else {
                  const shareMsg = `${title}\nĐịa chỉ: ${addressText}\nTọa độ: ${coordinate ? `${coordinate.latitude},${coordinate.longitude}` : ''}`;
                  Share.share({ message: shareMsg }).catch(() => undefined);
                }
              };

              const onGetDirections = () => {
                if (!coordinate) return;
                loadRouteOptions(coordinate, false, title).catch(() => undefined);
              };

              const onStartNavigation = () => {
                if (!coordinate) return;
                loadRouteOptions(coordinate, true, title).catch(() => undefined);
              };

              return (
                <View
                  key={`result-card:${item.id}`}
                  style={[
                    styles.resultCard,
                    isPinned && styles.resultCardPinned,
                  ]}
                  onLayout={event => {
                    itemOffsets.current[item.id] = event.nativeEvent.layout.y;
                  }}
                >
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleSelectSearchResult(item)}
                  >
                    <View style={styles.resultCardHeaderRow}>
                      {item.kind === 'page' ? (
                        <Image
                          source={{ uri: avatarUrl || FALLBACK_AVATAR }}
                          style={styles.resultCardAvatarImage}
                        />
                      ) : (
                        <View
                          style={[
                            styles.resultCardIconBg,
                            {
                              backgroundColor: shouldUseGoogleIcon
                                ? item.prediction.iconBackgroundColor ||
                                  googleIconStyle?.bg ||
                                  '#F1F5F9'
                                : googleIconStyle?.bg || '#F1F5F9',
                            },
                          ]}
                        >
                          {shouldUseGoogleIcon && item.prediction.icon ? (
                            <Image
                              source={{ uri: item.prediction.icon }}
                              style={{ width: 22, height: 22 }}
                              resizeMode="contain"
                            />
                          ) : IconComponent ? (
                            <IconComponent size={22} color={googleIconStyle?.color || '#1E70E6'} />
                          ) : null}
                        </View>
                      )}

                      <View style={styles.resultCardTextBody}>
                        <View style={styles.resultCardTitleLine}>
                          <Text style={styles.resultCardTitleText} numberOfLines={1}>
                            {title}
                          </Text>
                          {isPinned ? (
                            <View style={styles.pinnedBadge}>
                              <Text style={styles.pinnedBadgeText}>Được ghim</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={styles.resultCardSubtitleText} numberOfLines={1}>
                          {subtitle}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.resultCardBadgeRow}>
                      {distMeters !== undefined ? (
                        <View style={styles.resultCardDistanceBadge}>
                          <Text style={styles.resultCardDistanceText}>
                            {formatDistance(distMeters)}
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.resultCardCoordinateBadge}>
                        <MapPin size={13} color="#64748B" />
                        <Text style={styles.resultCardCoordinateText} numberOfLines={1}>
                          {subtitle}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.resultCardAddressText} numberOfLines={2}>
                      {addressText}
                    </Text>
                  </TouchableOpacity>

                  <View style={styles.resultCardButtonsRow}>
                    <TouchableOpacity
                      activeOpacity={0.86}
                      style={[styles.resultCardBtn, styles.resultCardBtnOutline]}
                      onPress={onDetailsOrShare}
                    >
                      <Text style={styles.resultCardBtnOutlineText}>
                        {item.kind === 'google' ? 'Chia sẻ' : 'Chi tiết'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.86}
                      style={[styles.resultCardBtn, styles.resultCardBtnSolid]}
                      onPress={onGetDirections}
                      disabled={!coordinate}
                    >
                      <Text style={styles.resultCardBtnSolidText}>Đường đi</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      activeOpacity={0.86}
                      style={[styles.resultCardBtn, styles.resultCardBtnSecondary]}
                      onPress={onStartNavigation}
                      disabled={!coordinate}
                    >
                      <Text style={styles.resultCardBtnSecondaryText}>Bắt đầu</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <Modal
        visible={Boolean(activePageDetail)}
        transparent
        animationType="fade"
        onRequestClose={closePageDetail}
      >
        <View style={styles.pageDetailModalBackdrop}>
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFill}
            onPress={closePageDetail}
          />
          {activePageDetail ? (
            <View style={styles.pageDetailModalCard}>
              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.pageDetailModalClose}
                onPress={closePageDetail}
              >
                <X size={20} color="#475569" />
              </TouchableOpacity>

              <View style={styles.pageDetailCoverWrap}>
                <Image
                  source={{
                    uri:
                      activePageDetail.cover ||
                      activePageDetail.avatar ||
                      FALLBACK_AVATAR,
                  }}
                  style={styles.pageDetailCoverImage}
                  resizeMode="cover"
                />
                <View style={styles.pageDetailCoverOverlay} />
              </View>

              <View style={styles.pageDetailAvatarRing}>
                <Image
                  source={{
                    uri: activePageDetail.avatar || FALLBACK_AVATAR,
                  }}
                  style={styles.pageDetailAvatar}
                  resizeMode="cover"
                />
              </View>

              <View style={styles.pageDetailBody}>
                <Text style={styles.pageDetailTitle} numberOfLines={2}>
                  {activePageDetail.pageTitle || activePageDetail.pageName}
                </Text>
                <Text style={styles.pageDetailHandle} numberOfLines={1}>
                  @{activePageDetail.pageName || activePageDetail.pageId}
                </Text>

                <View style={styles.pageDetailOwnerRow}>
                  <Image
                    source={{
                      uri:
                        activePageDetail.owner?.avatarUrl ||
                        activePageDetail.avatar ||
                        FALLBACK_AVATAR,
                    }}
                    style={styles.pageDetailOwnerAvatar}
                  />
                  <View style={styles.pageDetailOwnerCopy}>
                    <Text style={styles.pageDetailOwnerLabel}>
                      Người tạo trang
                    </Text>
                    <Text style={styles.pageDetailOwnerName} numberOfLines={1}>
                      {activePageDetail.owner?.name ||
                        activePageDetail.owner?.username ||
                        (activePageDetail.ownerId
                          ? `ID ${activePageDetail.ownerId}`
                          : 'Chưa có dữ liệu')}
                    </Text>
                  </View>
                </View>

                <View style={styles.pageDetailStats}>
                  <View style={styles.pageDetailStat}>
                    <Heart size={18} color="#EF4444" fill="#EF4444" />
                    <Text style={styles.pageDetailStatValue}>
                      {formatCompactCount(activePageDetail.likes)}
                    </Text>
                    <Text style={styles.pageDetailStatLabel}>Lượt thích</Text>
                  </View>
                  <View style={styles.pageDetailStatDivider} />
                  <View style={styles.pageDetailStat}>
                    <Users size={18} color="#0000FF" />
                    <Text style={styles.pageDetailStatValue}>
                      {formatCompactCount(activePageDetail.followersCount)}
                    </Text>
                    <Text style={styles.pageDetailStatLabel}>Theo dõi</Text>
                  </View>
                  <View style={styles.pageDetailStatDivider} />
                  <View style={styles.pageDetailStat}>
                    <MapPin size={18} color="#64748B" />
                    <Text style={styles.pageDetailStatValue}>
                      {pageDetailPlace?.distanceMeters
                        ? formatDistance(pageDetailPlace.distanceMeters)
                        : selectedDistance !== undefined
                          ? formatDistance(selectedDistance)
                          : '--'}
                    </Text>
                    <Text style={styles.pageDetailStatLabel}>Khoảng cách</Text>
                  </View>
                </View>

                {isPageDetailLoading ? (
                  <View style={styles.pageDetailLoading}>
                    <ActivityIndicator size="small" color="#0000FF" />
                    <Text style={styles.pageDetailLoadingText}>
                      Đang cập nhật thông tin page...
                    </Text>
                  </View>
                ) : null}

                <View style={styles.pageDetailStatusPill}>
                  <Bell
                    size={16}
                    color={
                      isOwnPageDetail || activePageDetail.isFollowing
                        ? '#0000FF'
                        : '#64748B'
                    }
                  />
                  <Text style={styles.pageDetailStatusText}>
                    {isOwnPageDetail
                      ? 'Trang của bạn'
                      : activePageDetail.isFollowing
                        ? 'Bạn đang theo dõi trang này'
                        : 'Bạn chưa theo dõi trang này'}
                  </Text>
                </View>

                <View style={styles.pageDetailActions}>
                  {canFollowPageDetail ? (
                    <TouchableOpacity
                      activeOpacity={0.86}
                      style={[
                        styles.pageDetailActionButton,
                        styles.pageDetailPrimaryButton,
                      ]}
                      disabled={isPageActionLoading}
                      onPress={handleFollowPageDetail}
                    >
                      {isPageActionLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <>
                          <Bell size={17} color="#FFFFFF" />
                          <Text style={styles.pageDetailPrimaryText}>
                            Theo dõi
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : null}
                  <TouchableOpacity
                    activeOpacity={0.86}
                    style={[
                      styles.pageDetailActionButton,
                      canFollowPageDetail
                        ? styles.pageDetailSecondaryButton
                        : styles.pageDetailPrimaryButton,
                    ]}
                    onPress={handleOpenPageDetail}
                  >
                    <Eye
                      size={17}
                      color={canFollowPageDetail ? '#0000FF' : '#FFFFFF'}
                    />
                    <Text
                      style={
                        canFollowPageDetail
                          ? styles.pageDetailSecondaryText
                          : styles.pageDetailPrimaryText
                      }
                    >
                      Xem page
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.86}
                    style={[
                      styles.pageDetailActionButton,
                      styles.pageDetailSecondaryButton,
                    ]}
                    onPress={handleMessagePageOwner}
                  >
                    {isOwnPageDetail ? (
                      <UserPlus size={17} color="#0000FF" />
                    ) : (
                      <MessageCircle size={17} color="#0000FF" />
                    )}
                    <Text style={styles.pageDetailSecondaryText}>
                      {isOwnPageDetail ? 'Mời người' : 'Nhắn tin'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 5,
  },
  exploreTopControls: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 26 : 0,
    right: 14,
    left: 14,
    zIndex: 31,
  },
  exploreSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
  },
  searchBackSlot: {
    position: 'absolute',
    top: 5,
    left: 0,
    zIndex: 2,
  },
  exploreChipRow: {
    paddingTop: 10,
    paddingRight: 20,
  },
  exploreChip: {
    marginRight: 10,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    maxWidth: 210,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 7,
    elevation: 5,
  },
  exploreChipText: {
    marginLeft: 8,
    maxWidth: 118,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  exploreChipMeta: {
    marginLeft: 7,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '800',
  },
  locationFallbackNotice: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: 'rgba(239, 246, 255, 0.96)',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  locationFallbackText: {
    marginLeft: 6,
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '800',
  },
  routePreviewCard: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 28 : 0,
    right: 14,
    left: 14,
    zIndex: 31,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 13,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 9,
  },
  routePreviewRows: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  routeDotColumn: {
    width: 30,
    alignItems: 'center',
    paddingTop: 5,
    paddingBottom: 2,
  },
  routeOriginDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 4,
    borderColor: '#DBEAFE',
    backgroundColor: '#2563EB',
  },
  routeDotLine: {
    width: 3,
    flex: 1,
    minHeight: 28,
    marginVertical: 4,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
  },
  routeTextColumn: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 5,
    paddingRight: 10,
  },
  routeOriginText: {
    color: '#2563EB',
    fontSize: 16,
    fontWeight: '900',
  },
  routeDivider: {
    height: 1,
    marginVertical: 10,
    backgroundColor: '#E2E8F0',
  },
  routeDestinationText: {
    color: '#334155',
    fontSize: 18,
    fontWeight: '800',
  },
  routePreviewActions: {
    width: 34,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 1,
  },
  currentUserMarker: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  currentUserPuck: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 7,
    elevation: 8,
  },
  currentUserArrow: {
    width: 31,
    height: 22,
    transform: [{ rotate: '-90deg' }],
  },
  currentUserArrowTail: {
    position: 'absolute',
    left: 3,
    top: 7,
    width: 16,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND,
  },
  currentUserArrowHead: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 0,
    height: 0,
    borderTopWidth: 11,
    borderBottomWidth: 11,
    borderLeftWidth: 18,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: BRAND,
  },
  compassButton: {
    position: 'absolute',
    right: 18,
    bottom: 96,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 6,
  },
  compassWithSheet: {
    bottom: 292,
  },
  coordinateBadge: {
    maxWidth: '72%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  coordinateText: {
    marginLeft: 4,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  distanceBadge: {
    marginRight: 8,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  distanceText: {
    color: BRAND,
    fontSize: 11,
    fontWeight: '800',
  },
  googleMarker: {
    borderColor: '#16A34A',
  },
  locateButton: {
    position: 'absolute',
    right: 18,
    bottom: 34,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    zIndex: 29,
  },
  locateWithSheet: {
    bottom: 232,
  },
  mapFloatingBtn: {
    position: 'absolute',
    right: 18,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    zIndex: 29,
  },
  zoomOutButton: {
    bottom: 158,
  },
  zoomOutWithSheet: {
    bottom: 356,
  },
  zoomInButton: {
    bottom: 220,
  },
  zoomInWithSheet: {
    bottom: 418,
  },
  fullScreenButton: {
    bottom: 282,
  },
  fullScreenWithSheet: {
    bottom: 480,
  },
  searchResultsPanel: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    maxHeight: 260,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 28,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#F1F5F9',
  },
  searchResultsTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
  searchResultsCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultsList: {
    flex: 1,
  },
  searchResultsListContent: {
    padding: 12,
  },
  resultCard: {
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  resultCardPinned: {
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
  },
  resultCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultCardAvatarImage: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  resultCardIconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCardTextBody: {
    flex: 1,
    marginLeft: 12,
  },
  resultCardTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultCardTitleText: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  resultCardSubtitleText: {
    marginTop: 1,
    color: '#64748B',
    fontSize: 12,
  },
  resultCardBadgeRow: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  resultCardDistanceBadge: {
    marginRight: 8,
    borderRadius: 999,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  resultCardDistanceText: {
    color: BRAND,
    fontSize: 11,
    fontWeight: '800',
  },
  resultCardCoordinateBadge: {
    maxWidth: '72%',
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  resultCardCoordinateText: {
    marginLeft: 4,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  resultCardAddressText: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  resultCardButtonsRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  resultCardBtn: {
    flex: 1,
    minHeight: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCardBtnOutline: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  resultCardBtnOutlineText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
  },
  resultCardBtnSolid: {
    backgroundColor: BRAND,
  },
  resultCardBtnSolidText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  resultCardBtnSecondary: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  resultCardBtnSecondaryText: {
    color: BRAND,
    fontSize: 11,
    fontWeight: '800',
  },
  pinnedBadge: {
    borderRadius: 4,
    backgroundColor: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  pinnedBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  searchGoogleMarkerContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleCircleMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  mapConfigNotice: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 92 : 68,
    right: 14,
    left: 14,
    zIndex: 24,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: 'rgba(255, 241, 242, 0.96)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    elevation: 5,
  },
  mapConfigText: {
    marginTop: 3,
    color: '#9F1239',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  mapConfigTitle: {
    color: '#9F1239',
    fontSize: 13,
    fontWeight: '900',
  },
  pageMarker: {
    width: 52,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pageMarkerWithBadge: {
    width: 210,
  },
  pageAvatarMapMarkerRoot: {
    width: 132,
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  pageAvatarMarkerStage: {
    width: 66,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageAvatarSelectedHalo: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(0, 0, 255, 0.14)',
    borderWidth: 2,
    borderColor: 'rgba(0, 0, 255, 0.22)',
  },
  pageAvatarMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#EEF4FF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 7,
  },
  pageAvatarMarkerSelected: {
    borderColor: BRAND,
    borderWidth: 4,
    shadowOpacity: 0.32,
    elevation: 10,
  },
  pageAvatarMarkerFallback: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
  },
  pageAvatarMarkerFallbackText: {
    color: BRAND,
    fontSize: 18,
    fontWeight: '900',
  },
  pageAvatarMarkerImage: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E2E8F0',
  },
  pageAvatarMarkerImageLoading: {
    opacity: 0,
  },
  selectedPageAvatarMarker: {
    transform: [{ scale: 1.08 }],
  },
  pageAvatarNameBadge: {
    maxWidth: 112,
    marginTop: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DDE7FF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 5,
  },
  pageAvatarNameBadgeSelected: {
    borderColor: BRAND,
    backgroundColor: BRAND,
  },
  pageAvatarNameBadgeText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
  },
  pageAvatarNameBadgeTextSelected: {
    color: '#FFFFFF',
  },
  pageNameBadge: {
    maxWidth: 144,
    marginLeft: 6,
    marginBottom: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DDE7FF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 9,
    paddingVertical: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 5,
  },
  pageNameBadgeText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: '800',
  },
  pagePinWrapper: {
    width: 44,
    height: 52,
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 6,
  },
  pagePinCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
  },
  pagePinHead: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  pagePinTail: {
    position: 'absolute',
    top: 25,
    width: 18,
    height: 18,
    backgroundColor: ACCENT,
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  selectedMarker: {
    width: 50,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  selectedPin: {
    width: 50,
    height: 58,
    alignItems: 'center',
    justifyContent: 'flex-start',
    elevation: 7,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.24,
    shadowRadius: 5,
  },
  selectedPinCore: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#FFFFFF',
  },
  selectedPinHead: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  selectedPinTail: {
    position: 'absolute',
    top: 29,
    width: 20,
    height: 20,
    backgroundColor: '#16A34A',
    borderRightWidth: 3,
    borderBottomWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
  },
  permissionNotice: {
    position: 'absolute',
    right: 14,
    bottom: 18,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FEF3C7',
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
  },
  routeActionDock: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 26,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 9,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 10,
  },
  routeActionHeader: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  routeActionTitle: {
    color: '#0F172A',
    fontSize: 27,
    fontWeight: '900',
  },
  routeActionHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  routeIconButton: {
    marginLeft: 9,
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  routeActionButtons: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  startNavigationButton: {
    minHeight: 48,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#008B8B',
    paddingHorizontal: 15,
  },
  startNavigationText: {
    marginLeft: 8,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryRouteButton: {
    minHeight: 48,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    borderRadius: 24,
    backgroundColor: '#CFFAFE',
    paddingHorizontal: 10,
  },
  secondaryRouteButtonText: {
    marginLeft: 7,
    color: '#006B64',
    fontSize: 12,
    fontWeight: '900',
  },
  navigationEtaDock: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 30,
    minHeight: 106,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 9,
  },
  navigationRoundButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  navigationRoundButtonActive: {
    borderColor: '#99F6E4',
    backgroundColor: '#ECFEFF',
  },
  navigationEtaCopy: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  navigationEtaTitle: {
    marginTop: 5,
    color: '#0F172A',
    fontSize: 30,
    fontWeight: '900',
  },
  navigationEtaSubtitle: {
    marginTop: 1,
    color: '#64748B',
    fontSize: 15,
    fontWeight: '800',
  },
  searchBox: {
    minHeight: 52,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 9,
    elevation: 7,
  },
  searchInput: {
    marginLeft: 10,
    minHeight: 40,
    flex: 1,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  sheet: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    left: 12,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    elevation: 8,
  },
  sheetClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  routeOptionsRow: {
    marginTop: 12,
    maxHeight: 72,
  },
  routeOptionChip: {
    minWidth: 132,
    marginRight: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  routeOptionChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  routeOptionTitle: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '900',
  },
  routeOptionTitleActive: {
    color: '#1D4ED8',
  },
  routeOptionMeta: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '700',
  },
  routeOptionMetaActive: {
    color: '#2563EB',
  },
  navigationBanner: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 22 : 0,
    right: 10,
    left: 10,
    zIndex: 28,
    minHeight: 112,
    borderRadius: 18,
    backgroundColor: '#006B64',
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  navigationBannerIcon: {
    width: 74,
    height: 74,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationBannerCopy: {
    flex: 1,
    marginLeft: 14,
    minWidth: 0,
  },
  navigationBannerTitle: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  navigationBannerSubtitle: {
    marginTop: 4,
    color: '#E0F2FE',
    fontSize: 18,
    fontWeight: '700',
  },
  navigationSparkButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  navigationBannerStop: {
    marginLeft: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  navigationBannerStopText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  suggestionPanel: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 144 : 0,
    right: 14,
    left: 14,
    zIndex: 30,
    maxHeight: 320,
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    elevation: 7,
  },
  suggestionPanelFocused: {
    top: Platform.OS === 'android' ? 90 : 0,
  },
  topControls: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 30 : 8,
    right: 14,
    left: 14,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  durationBadge: {
    marginRight: 8,
    borderRadius: 999,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  durationText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '800',
  },
  currentUserBlueDotContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(66, 133, 244, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentUserBlueDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  currentUserBlueDotCore: {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#4285F4',
  },
  recenterFloatButton: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    backgroundColor: '#1A73E8',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 29,
  },
  recenterFloatText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  pageDetailModalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  pageDetailModalCard: {
    overflow: 'hidden',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
    elevation: 16,
  },
  pageDetailModalClose: {
    position: 'absolute',
    right: 14,
    top: 14,
    zIndex: 5,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  pageDetailCoverWrap: {
    height: 132,
    backgroundColor: '#E8EEF9',
  },
  pageDetailCoverImage: {
    width: '100%',
    height: '100%',
  },
  pageDetailCoverOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(2, 6, 23, 0.18)',
  },
  pageDetailAvatarRing: {
    position: 'absolute',
    top: 82,
    left: 22,
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 5,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
    backgroundColor: '#EEF2FF',
    shadowColor: '#020617',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 9,
  },
  pageDetailAvatar: {
    width: '100%',
    height: '100%',
  },
  pageDetailBody: {
    paddingHorizontal: 22,
    paddingTop: 44,
    paddingBottom: 20,
  },
  pageDetailTitle: {
    color: '#020617',
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 31,
  },
  pageDetailHandle: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 15,
    fontWeight: '800',
  },
  pageDetailOwnerRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    padding: 12,
  },
  pageDetailOwnerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E2E8F0',
  },
  pageDetailOwnerCopy: {
    marginLeft: 10,
    flex: 1,
  },
  pageDetailOwnerLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '800',
  },
  pageDetailOwnerName: {
    marginTop: 1,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
  pageDetailStats: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
  },
  pageDetailStat: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  pageDetailStatDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  pageDetailStatValue: {
    marginTop: 6,
    color: '#020617',
    fontSize: 17,
    fontWeight: '900',
  },
  pageDetailStatLabel: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 11,
    fontWeight: '800',
  },
  pageDetailLoading: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    paddingVertical: 9,
  },
  pageDetailLoadingText: {
    marginLeft: 8,
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '800',
  },
  pageDetailStatusPill: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#F1F5F9',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pageDetailStatusText: {
    marginLeft: 7,
    color: '#334155',
    fontSize: 13,
    fontWeight: '900',
  },
  pageDetailActions: {
    marginTop: 14,
    flexDirection: 'row',
  },
  pageDetailActionButton: {
    minHeight: 48,
    flex: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 8,
    marginHorizontal: 4,
  },
  pageDetailPrimaryButton: {
    backgroundColor: '#0000FF',
  },
  pageDetailSecondaryButton: {
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
  },
  pageDetailPrimaryText: {
    marginLeft: 6,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  pageDetailSecondaryText: {
    marginLeft: 6,
    color: '#0000FF',
    fontSize: 13,
    fontWeight: '900',
  },
  googleMarkerPin: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 42,
  },
  googleMarkerPinHead: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  googleMarkerPinTail: {
    width: 8,
    height: 8,
    transform: [{ rotate: '45deg' }],
    marginTop: -4,
    borderBottomRightRadius: 2,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
});
