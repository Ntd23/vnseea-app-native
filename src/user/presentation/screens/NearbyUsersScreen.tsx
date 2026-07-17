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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import {
  ArrowLeft,
  ArrowUp,
  ArrowUpDown,
  Bell,
  Bike,
  Car,
  Compass,
  CornerUpLeft,
  CornerUpRight,
  Eye,
  Footprints,
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
import { useMessagesViewModel } from '../../../messages';
import { createFeedRepository } from '../../../feed/infrastructure/repositories/ApiFeedRepository';
import { postCreatedEvents } from '../../../feed/application/events/postCreatedEvents';
import { useUserViewModel } from '../../application/view-models/useUserViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { showSnackbar } from '../../../shared-kernel/presentation/components/Snackbar';
import {
  speakNavigationInstruction,
  stopNavigationSpeech,
} from '../../infrastructure/navigation/navigationSpeech';
import { subscribeNavigationHeading } from '../../infrastructure/navigation/navigationHeading';
import type {
  MapPlacePrediction,
  MapRouteInput,
  MapRoute,
  MapRouteStep,
  NearbyPlace,
} from '../../domain/types/user.types';
import {
  buildMapSharePreview,
  buildMapShareText,
  type SharedMapLocation,
} from '../../application/utils/mapShare';

type NearbyNav = NativeStackNavigationProp<RootStackParamList>;
type NearbyRoute = RouteProp<RootStackParamList, typeof ROUTES.NEARBY_USERS>;

const BRAND = '#0000FF';
const ACCENT = '#EF4444';
const FALLBACK_AVATAR = 'https://v2.vnseea.vn/upload/photos/d-avatar.jpg';
const feedRepository = createFeedRepository();
const NAVIGATION_CAMERA_PITCH = 60;
const NAVIGATION_CAMERA_ZOOM = 19.25;
const NAVIGATION_CAMERA_HEADING = 0;
const ROUTE_CONNECTOR_MIN_METERS = 5;
const ROUTE_CAMERA_LOOKAHEAD_MIN_METERS = 12;
const ROUTE_CAMERA_LOOKAHEAD_MAX_METERS = 72;
const ROUTE_CAMERA_LOOKAHEAD_DISTANCE_RATIO = 0.16;
const ROUTE_HEADING_LOOKAHEAD_MIN_METERS = 8;
const ROUTE_HEADING_LOOKAHEAD_MAX_METERS = 28;
const ROUTE_HEADING_LOOKAHEAD_DISTANCE_RATIO = 0.1;
const OFF_ROUTE_DISTANCE_METERS = 24;
const OFF_ROUTE_CONFIRM_MS = 0;
const REROUTE_COOLDOWN_MS = 1500;
const NAVIGATION_ARRIVAL_DISTANCE_METERS = 24;
const LOCATION_RECENTER_DISTANCE_METERS = 50000;
const SEARCH_RADIUS_METERS = 3000;
const MAX_VISIBLE_PAGE_MARKERS = 64;
const IDLE_LOCATION_STATE_MIN_METERS = 8;
const NAVIGATION_LOCATION_STATE_MIN_METERS = 1;
const IDLE_LOCATION_STATE_MIN_MS = 1400;
const NAVIGATION_LOCATION_STATE_MIN_MS = 280;
const HEADING_STATE_MIN_DEGREES = 2;
const HEADING_STATE_MIN_MS = 80;
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
const ADDRESS_PLACE_MARKER_COLOR = '#0EA5A4';
const ADDRESS_PLACE_MARKER_DARK = '#0F766E';
const ADDRESS_PLACE_MARKER_LIGHT = '#E6FFFA';
const ADDRESS_PLACE_LABEL_COLOR = '#0F4C5C';
const ADDRESS_PLACE_LABEL_BACKGROUND = 'rgba(255, 255, 255, 0.94)';
const ADDRESS_PLACE_LABEL_BORDER = 'rgba(20, 184, 166, 0.24)';
const ADDRESS_LABEL_DELTA_HIDDEN = 0.018;
const ADDRESS_LABEL_DELTA_MEDIUM = 0.009;
const ADDRESS_LABEL_LIMIT_MEDIUM = 4;
const ADDRESS_LABEL_LIMIT_CLOSE = 8;
const SHARED_LOCATION_EXACT_PAGE_MATCH_METERS = 35;
const SHARED_LOCATION_NEAR_PAGE_MATCH_METERS = 260;
const HEALTH_PLACE_TYPE_SET = new Set([
  'hospital',
  'doctor',
  'health',
  'pharmacy',
  'dentist',
]);

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
type TransportMode = 'walking' | 'motorcycle' | 'driving';
type TransportRouteMode = Extract<NonNullable<MapRouteInput['mode']>, TransportMode>;

type TransportOption = {
  mode: TransportMode;
  routeMode: TransportRouteMode;
  title: string;
  label: string;
  description: string;
};

const TRANSPORT_OPTIONS: TransportOption[] = [
  {
    mode: 'walking',
    routeMode: 'walking',
    title: 'Đi bộ',
    label: 'Đi bộ',
    description: 'Tuyến phù hợp để đi bộ',
  },
  {
    mode: 'motorcycle',
    routeMode: 'motorcycle',
    title: 'Xe máy',
    label: 'Xe máy',
    description: 'Tuyến ưu tiên cho xe máy',
  },
  {
    mode: 'driving',
    routeMode: 'driving',
    title: 'Lái xe',
    label: 'Ô tô',
    description: 'Tuyến phù hợp cho ô tô',
  },
];

function getTransportOption(mode: TransportMode) {
  return (
    TRANSPORT_OPTIONS.find(option => option.mode === mode) ??
    TRANSPORT_OPTIONS[2]
  );
}

function TransportModeIcon({
  mode,
  size,
  color,
}: {
  mode: TransportMode;
  size: number;
  color: string;
}) {
  if (mode === 'walking') {
    return <Footprints size={size} color={color} />;
  }

  if (mode === 'motorcycle') {
    return <Bike size={size} color={color} />;
  }

  return <Car size={size} color={color} />;
}

type RouteTrafficInfo = {
  level: NonNullable<MapRoute['trafficLevel']>;
  label: string;
  delaySeconds: number;
  detail: string;
};

function getRouteTrafficInfo(route: Pick<
  MapRoute,
  | 'durationSeconds'
  | 'durationWithoutTrafficSeconds'
  | 'durationInTrafficSeconds'
  | 'trafficDelaySeconds'
  | 'trafficLabel'
  | 'trafficLevel'
>): RouteTrafficInfo | null {
  const baseDuration = route.durationWithoutTrafficSeconds;
  const trafficDuration = route.durationInTrafficSeconds ?? route.durationSeconds;
  const computedDelay =
    typeof baseDuration === 'number' && baseDuration > 0
      ? Math.max(0, trafficDuration - baseDuration)
      : 0;
  const delaySeconds = Math.max(
    0,
    route.trafficDelaySeconds ?? computedDelay,
  );

  let level = route.trafficLevel;
  if (!level && baseDuration && trafficDuration) {
    const ratio = trafficDuration / baseDuration;
    if (delaySeconds >= 240 || ratio >= 1.22) {
      level = 'heavy';
    } else if (delaySeconds <= 60 || ratio <= 1.06) {
      level = 'clear';
    } else {
      level = 'normal';
    }
  }

  if (!level) {
    return null;
  }

  const label =
    route.trafficLabel ||
    (level === 'heavy'
      ? 'Tắc đường'
      : level === 'clear'
        ? 'Vắng vẻ'
        : 'Bình thường');
  const detail =
    level === 'heavy' && delaySeconds >= 60
      ? `${label} +${formatDuration(delaySeconds)}`
      : label;

  return {
    level,
    label,
    delaySeconds,
    detail,
  };
}

function trafficBadgeStyle(level: NonNullable<MapRoute['trafficLevel']>) {
  if (level === 'heavy') {
    return (styles as any).routeTrafficBadgeHeavy;
  }

  if (level === 'clear') {
    return (styles as any).routeTrafficBadgeClear;
  }

  return (styles as any).routeTrafficBadgeNormal;
}

function trafficBadgeTextStyle(level: NonNullable<MapRoute['trafficLevel']>) {
  if (level === 'heavy') {
    return (styles as any).routeTrafficBadgeTextHeavy;
  }

  if (level === 'clear') {
    return (styles as any).routeTrafficBadgeTextClear;
  }

  return (styles as any).routeTrafficBadgeTextNormal;
}

type AddressPlaceMapMarkerProps = {
  coordinate: LatLng;
  title: string;
  badgeText?: string;
  compact?: boolean;
  selected?: boolean;
  zIndex: number;
  onPress: () => void;
};

function AddressPlaceMapMarker({
  coordinate,
  title,
  badgeText = '',
  compact = false,
  selected = false,
  zIndex,
  onPress,
}: AddressPlaceMapMarkerProps) {
  const showLabel = selected || !compact;

  return (
    <Marker
      anchor={selected ? { x: 0.9, y: 1 } : compact ? { x: 0.5, y: 1 } : { x: 0.88, y: 1 }}
      coordinate={coordinate}
      onPress={onPress}
      tracksViewChanges={false}
      zIndex={zIndex}
    >
      <View
        collapsable={false}
        renderToHardwareTextureAndroid
        style={[
          styles.healthPlaceMarkerRoot,
          compact && styles.healthPlaceMarkerRootCompact,
          selected && styles.healthPlaceMarkerRootSelected,
        ]}
      >
        {showLabel ? (
          <View
            style={[
              styles.healthPlaceMarkerLabelCard,
              selected && styles.healthPlaceMarkerLabelCardSelected,
            ]}
          >
            <Text
              numberOfLines={2}
              style={[
                styles.healthPlaceMarkerLabel,
                selected && styles.healthPlaceMarkerLabelSelected,
              ]}
            >
              {title}
            </Text>
          </View>
        ) : null}

        {selected ? (
          <View style={styles.healthPlaceSelectedPin}>
            <MapPin
              size={33}
              color="#FFFFFF"
              fill={ADDRESS_PLACE_MARKER_DARK}
              strokeWidth={2.35}
            />
            {badgeText ? (
              <Text style={styles.healthPlaceSelectedPinText}>{badgeText}</Text>
            ) : (
              <View style={styles.healthPlaceSelectedPinDot} />
            )}
          </View>
        ) : (
          <View style={styles.healthPlaceBadgePin}>
            <MapPin
              size={48}
              color="#FFFFFF"
              fill={ADDRESS_PLACE_MARKER_COLOR}
              strokeWidth={2.2}
            />
            {badgeText ? (
              <Text style={styles.healthPlaceBadgeText}>{badgeText}</Text>
            ) : (
              <View style={styles.healthPlaceBadgeDot} />
            )}
          </View>
        )}
      </View>
    </Marker>
  );
}

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

function normalizeLocationMatchText(value?: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasUsefulTextOverlap(left?: string, right?: string) {
  const normalizedLeft = normalizeLocationMatchText(left);
  const normalizedRight = normalizeLocationMatchText(right);

  if (!normalizedLeft || !normalizedRight) return false;
  if (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  ) {
    return true;
  }

  const leftWords = new Set(
    normalizedLeft.split(' ').filter(word => word.length >= 3),
  );
  const rightWords = normalizedRight
    .split(' ')
    .filter(word => word.length >= 3);
  if (leftWords.size === 0 || rightWords.length === 0) return false;

  const overlap = rightWords.filter(word => leftWords.has(word)).length;
  return overlap >= Math.min(2, rightWords.length);
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

function selectedPointFromNearbyPage(page: NearbyPlace): SelectedPoint | null {
  if (!page.coordinate) return null;

  return {
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
  };
}

function findPageForSharedLocation(
  sharedLocation: SharedMapLocation,
  pages: NearbyPlace[],
) {
  if (sharedLocation.pageId) {
    const exactPage = pages.find(
      page =>
        page.pageId === sharedLocation.pageId ||
        page.id === `page:${sharedLocation.pageId}`,
    );
    if (exactPage?.coordinate) {
      return exactPage;
    }
  }

  const targetCoordinate = {
    latitude: sharedLocation.latitude,
    longitude: sharedLocation.longitude,
  };
  const targetTitle = sharedLocation.title;
  const targetAddress = sharedLocation.address || sharedLocation.subtitle;

  const candidates = pages
    .map(page => {
      if (!page.coordinate) return null;

      const distance = distanceMeters(targetCoordinate, page.coordinate);
      if (distance > SHARED_LOCATION_NEAR_PAGE_MATCH_METERS) {
        return null;
      }

      const textMatched =
        hasUsefulTextOverlap(targetTitle, page.name) ||
        hasUsefulTextOverlap(targetTitle, page.username) ||
        hasUsefulTextOverlap(targetAddress, page.location);

      if (
        distance > SHARED_LOCATION_EXACT_PAGE_MATCH_METERS &&
        !textMatched
      ) {
        return null;
      }

      return {
        page,
        distance,
        score:
          distance +
          (hasUsefulTextOverlap(targetTitle, page.name) ? -40 : 0) +
          (textMatched ? -12 : 0),
      };
    })
    .filter(
      (
        candidate,
      ): candidate is { page: NearbyPlace; distance: number; score: number } =>
        candidate !== null,
    )
    .sort((left, right) => left.score - right.score);

  return candidates[0]?.page ?? null;
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

function compactRoutePath(path: LatLng[]) {
  const compacted: LatLng[] = [];
  path.forEach(point => {
    if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) {
      return;
    }

    const previous = compacted[compacted.length - 1];
    if (!previous || distanceMeters(previous, point) > 0.75) {
      compacted.push(point);
    }
  });
  return compacted;
}

function projectPointOnRouteSegment(
  point: LatLng,
  start: LatLng,
  end: LatLng,
) {
  const latitudeScale = 111320;
  const longitudeScale = Math.max(
    1,
    Math.abs(
      111320 *
        Math.cos(((point.latitude + start.latitude + end.latitude) / 3 * Math.PI) / 180),
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
      distanceMeters: distanceMeters(point, start),
      fraction: 0,
      point: start,
    };
  }

  const fraction = Math.max(
    0,
    Math.min(1, ((px - sx) * dx + (py - sy) * dy) / lengthSquared),
  );
  const projection = {
    latitude: (sy + dy * fraction) / latitudeScale,
    longitude: (sx + dx * fraction) / longitudeScale,
  };

  return {
    distanceMeters: distanceMeters(point, projection),
    fraction,
    point: projection,
  };
}

function nearestRouteProjection(path: LatLng[], location: LatLng) {
  if (path.length === 0) return null;
  if (path.length === 1) {
    return {
      distanceMeters: distanceMeters(location, path[0]),
      fraction: 0,
      point: path[0],
      segmentEndIndex: 0,
      segmentStartIndex: 0,
    };
  }

  let nearest:
    | {
        distanceMeters: number;
        fraction: number;
        point: LatLng;
        segmentEndIndex: number;
        segmentStartIndex: number;
      }
    | null = null;

  for (let index = 1; index < path.length; index += 1) {
    const projection = projectPointOnRouteSegment(
      location,
      path[index - 1],
      path[index],
    );
    if (!nearest || projection.distanceMeters < nearest.distanceMeters) {
      nearest = {
        ...projection,
        segmentEndIndex: index,
        segmentStartIndex: index - 1,
      };
    }
  }

  return nearest;
}

function buildNavigationPath(origin: LatLng, routePath: LatLng[]) {
  if (routePath.length === 0) {
    return [origin];
  }

  if (routePath.length === 1) {
    const firstPoint = routePath[0];
    return distanceMeters(origin, firstPoint) <= ROUTE_CONNECTOR_MIN_METERS
      ? [firstPoint]
      : [origin, firstPoint];
  }

  const projection = nearestRouteProjection(routePath, origin);
  if (!projection) {
    return [origin, ...routePath];
  }

  const remainingTail = routePath.slice(projection.segmentEndIndex);
  const nextPath = [origin];
  if (distanceMeters(origin, projection.point) > 1.5) {
    nextPath.push(projection.point);
  }
  nextPath.push(...remainingTail);
  return compactRoutePath(nextPath);
}

function routeConnectorFromLocation(origin: LatLng, routePath: LatLng[]) {
  const navigationPath = buildNavigationPath(origin, routePath);
  if (navigationPath.length < 2) return [];
  return distanceMeters(navigationPath[0], navigationPath[1]) >
    ROUTE_CONNECTOR_MIN_METERS
    ? [navigationPath[0], navigationPath[1]]
    : [];
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

type NavigationLookAheadConfig = {
  minMeters: number;
  maxMeters: number;
  ratio: number;
};

function navigationLookAheadPoint(
  origin: LatLng,
  routePath: LatLng[],
  { minMeters, maxMeters, ratio }: NavigationLookAheadConfig,
) {
  const path = buildNavigationPath(origin, routePath);
  const remainingDistance = routeDistance(path);
  if (remainingDistance <= minMeters) {
    return origin;
  }

  const lookAheadDistance = Math.min(
    Math.max(remainingDistance * ratio, minMeters),
    maxMeters,
  );

  return pointAlongRoute(path, lookAheadDistance) || origin;
}

function navigationCameraCenter(origin: LatLng, routePath: LatLng[]) {
  return navigationLookAheadPoint(origin, routePath, {
    minMeters: ROUTE_CAMERA_LOOKAHEAD_MIN_METERS,
    maxMeters: ROUTE_CAMERA_LOOKAHEAD_MAX_METERS,
    ratio: ROUTE_CAMERA_LOOKAHEAD_DISTANCE_RATIO,
  });
}

function navigationRouteHeading(
  origin: LatLng,
  routePath: LatLng[],
  destination: LatLng,
) {
  const headingPoint = navigationLookAheadPoint(origin, routePath, {
    minMeters: ROUTE_HEADING_LOOKAHEAD_MIN_METERS,
    maxMeters: ROUTE_HEADING_LOOKAHEAD_MAX_METERS,
    ratio: ROUTE_HEADING_LOOKAHEAD_DISTANCE_RATIO,
  });

  if (distanceMeters(origin, headingPoint) > 2) {
    return bearingBetween(origin, headingPoint);
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
  preferRouteHeading = false,
}: {
  deviceHeading: number | null;
  gpsHeading: number | null;
  routeHeading: number | null;
  userSpeed: number;
  preferRouteHeading?: boolean;
}) {
  if (preferRouteHeading && validHeading(routeHeading)) {
    return routeHeading;
  }

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
  return projectPointOnRouteSegment(point, start, end).distanceMeters;
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

function cleanRoadNameCandidate(value?: string) {
  return cleanRouteInstruction(value)
    .replace(/\s+(?:toward|towards|for|then)\b.*$/i, '')
    .replace(/\s+(?:về|hướng|trong|rồi|để)\b.*$/i, '')
    .replace(/^[,.;:\-\s]+|[,.;:\-\s]+$/g, '')
    .trim();
}

function roadNameFromRouteSummary(summary?: string) {
  const cleaned = cleanRoadNameCandidate(summary);
  if (!cleaned) return '';

  const [firstPart] = cleaned
    .split(/\s+(?:and|và)\s+|\/|,/i)
    .map(part => cleanRoadNameCandidate(part))
    .filter(Boolean);

  return firstPart || cleaned;
}

function roadNameFromInstruction(instruction?: string) {
  const cleaned = cleanRouteInstruction(instruction);
  if (!cleaned) return '';

  const patterns: RegExp[] = [
    /\b(?:onto|on)\s+(.+?)(?:\s+(?:toward|towards|for|then)\b|,|$)/i,
    /\bcontinue\s+on\s+(.+?)(?:\s+(?:toward|towards|for|then)\b|,|$)/i,
    /\bhead\s+.+?\s+on\s+(.+?)(?:\s+(?:toward|towards|for|then)\b|,|$)/i,
    /\bmerge\s+onto\s+(.+?)(?:\s+(?:toward|towards|for|then)\b|,|$)/i,
    /(?:trên|vào|lên|theo)\s+(.+?)(?:\s+(?:về|hướng|trong|rồi|để)\b|,|$)/i,
  ];

  for (const pattern of patterns) {
    const match = cleaned.match(pattern);
    const candidate = cleanRoadNameCandidate(match?.[1]);
    if (candidate.length >= 2) {
      return candidate;
    }
  }

  return '';
}

function currentRouteStep(
  routePath: LatLng[],
  current: LatLng | null,
  routeSteps?: MapRouteStep[],
) {
  if (!current || !routeSteps?.length || routePath.length < 2) {
    return null;
  }

  const currentIndex = nearestRouteIndex(routePath, current);
  let fallback: MapRouteStep | null = null;
  let fallbackDistance = Number.POSITIVE_INFINITY;

  for (const step of routeSteps) {
    const stepStart = step.startLocation ?? step.path?.[0];
    const stepEnd =
      step.endLocation ??
      (step.path && step.path.length > 0
        ? step.path[step.path.length - 1]
        : undefined);

    if (!stepStart) continue;

    const startIndex = nearestRouteIndex(routePath, stepStart);
    const endIndex = stepEnd ? nearestRouteIndex(routePath, stepEnd) : startIndex;
    const rangeStart = Math.min(startIndex, endIndex);
    const rangeEnd = Math.max(startIndex, endIndex);

    if (currentIndex >= rangeStart - 1 && currentIndex <= rangeEnd + 1) {
      return step;
    }

    const distanceToStart = Math.abs(currentIndex - startIndex);
    if (startIndex <= currentIndex && distanceToStart < fallbackDistance) {
      fallback = step;
      fallbackDistance = distanceToStart;
    }
  }

  return fallback;
}

function currentNavigationRoadName({
  routePath,
  current,
  routeSteps,
  routeSummary,
}: {
  routePath: LatLng[];
  current: LatLng | null;
  routeSteps?: MapRouteStep[];
  routeSummary?: string;
}) {
  const step = currentRouteStep(routePath, current, routeSteps);
  return (
    roadNameFromInstruction(step?.instruction) ||
    roadNameFromRouteSummary(routeSummary)
  );
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

function geometryTurnInstruction(
  routePath: LatLng[],
  current: LatLng,
  destinationTitle?: string,
): TurnInstruction | null {
  const path = buildNavigationPath(current, routePath);
  if (path.length < 2) return null;

  if (path.length < 3) {
    const remaining = routeDistance(path);
    return {
      distanceMeters: remaining,
      label:
        remaining <= 60
          ? `Sắp đến ${destinationTitle || 'điểm đến'}`
          : `Tiếp tục ${formatDistance(remaining)}`,
      detail: remaining <= 60 ? undefined : 'Đi theo tuyến đã chọn',
      maneuver: remaining <= 60 ? 'arrive' : 'straight',
    };
  }

  const connectorDistance = distanceMeters(path[0], path[1]);
  const scanStartIndex =
    connectorDistance > ROUTE_CONNECTOR_MIN_METERS ? 2 : 1;
  let distanceAhead =
    scanStartIndex > 1 ? connectorDistance : 0;

  for (let index = scanStartIndex; index < path.length - 1; index += 1) {
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
        label: `${formatDistance(distanceAhead)} nữa`,
        detail: turnLabel(maneuver),
        maneuver,
      };
    }
  }

  const remaining = routeDistance(path);
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
    detail: 'Đi theo tuyến đã chọn',
    maneuver: 'straight',
  };
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
  const geometryInstruction = geometryTurnInstruction(
    routePath,
    current,
    destinationTitle,
  );

  if (geometryInstruction) {
    if (
      stepInstruction &&
      stepInstruction.maneuver === geometryInstruction.maneuver &&
      Math.abs(
        stepInstruction.distanceMeters - geometryInstruction.distanceMeters,
      ) <= 45
    ) {
      const roadName = roadNameFromInstruction(stepInstruction.detail);
      if (roadName) {
        return {
          ...geometryInstruction,
          detail: `${turnLabel(geometryInstruction.maneuver)} vào ${roadName}`,
        };
      }
    }

    return geometryInstruction;
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

function isHealthPlace(types?: string[], ...labels: Array<string | undefined | null>) {
  if (types?.some(type => HEALTH_PLACE_TYPE_SET.has(type))) {
    return true;
  }

  const normalized = labels.map(normalizeSearchText).filter(Boolean).join(' ');
  if (!normalized) {
    return false;
  }

  return /\b(benh vien|phong kham|y te|huyet hoc|truyen mau|nha thuoc|hospital|clinic|doctor|health|pharmacy|dentist)\b/.test(
    normalized,
  );
}

function addressMarkerBadgeText(
  types?: string[],
  ...labels: Array<string | undefined | null>
) {
  return isHealthPlace(types, ...labels) ? 'H' : '';
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
  const route = useRoute<NearbyRoute>();
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
  const messagesVm = useMessagesViewModel();
  const mapRef = useRef<MapView>(null);
  const currentLocationRef = useRef<LatLng | null>(null);
  const hasLoadedNearbyPagesRef = useRef(false);
  const activeDestinationRef = useRef<LatLng | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const currentRegionRef = useRef<Region>(DEFAULT_REGION);
  const [mapRegion, setMapRegion] = useState<Region>(DEFAULT_REGION);
  const [searchResults, setSearchResults] = useState<SuggestionItem[]>([]);
  const [isSearchResultsVisible, setIsSearchResultsVisible] = useState(false);
  const searchResultsScrollRef = useRef<ScrollView>(null);
  const itemOffsets = useRef<{ [key: string]: number }>({});
  const isNavigatingRef = useRef(false);
  const lastRoutedOriginRef = useRef<LatLng | null>(null);
  const activeRoutePathRef = useRef<LatLng[]>([]);
  const lastRerouteAtRef = useRef(0);
  const offRouteStartedAtRef = useRef(0);
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
  const [isAutoRerouting, setIsAutoRerouting] = useState(false);
  const [transportMode, setTransportMode] = useState<TransportMode>('driving');
  const [isTransportPickerOpen, setIsTransportPickerOpen] = useState(false);
  const [isMapShareSheetOpen, setIsMapShareSheetOpen] = useState(false);
  const [isPostingMapShare, setIsPostingMapShare] = useState(false);
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

  const selectedTransportOption = useMemo(
    () => getTransportOption(transportMode),
    [transportMode],
  );
  const selectedTransportRouteMode = selectedTransportOption.routeMode;

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

  const addressLabelLimit = useMemo(() => {
    if (mapRegion.longitudeDelta > ADDRESS_LABEL_DELTA_HIDDEN) {
      return 0;
    }

    if (mapRegion.longitudeDelta > ADDRESS_LABEL_DELTA_MEDIUM) {
      return ADDRESS_LABEL_LIMIT_MEDIUM;
    }

    return ADDRESS_LABEL_LIMIT_CLOSE;
  }, [mapRegion.longitudeDelta]);

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
  const selectedMapShareLocation = useMemo<SharedMapLocation | null>(() => {
    if (!selectedPoint) return null;

    return {
      title: selectedPoint.title,
      subtitle: selectedPoint.subtitle,
      address: selectedPoint.address || selectedPoint.subtitle,
      pageId: selectedPoint.page?.pageId || undefined,
      imageUrl:
        selectedPoint.page?.coverUrl ||
        selectedPoint.page?.avatarUrl ||
        selectedPoint.avatarUrl ||
        undefined,
      latitude: selectedPoint.coordinate.latitude,
      longitude: selectedPoint.coordinate.longitude,
    };
  }, [selectedPoint]);
  const selectedMapShareText = useMemo(
    () =>
      selectedMapShareLocation
        ? buildMapShareText(selectedMapShareLocation)
        : '',
    [selectedMapShareLocation],
  );
  const selectedMapSharePreview = useMemo(
    () =>
      selectedMapShareLocation
        ? buildMapSharePreview(
            selectedMapShareLocation,
            selectedPoint?.page?.coverUrl ||
              selectedPoint?.page?.avatarUrl ||
              selectedPoint?.avatarUrl,
          )
        : null,
    [selectedMapShareLocation, selectedPoint],
  );
  const mapShareChats = useMemo(
    () => messagesVm.chats.filter(chat => chat.chatType === 'user'),
    [messagesVm.chats],
  );
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
  const distanceToActiveDestination = useMemo(() => {
    if (!currentLocation || !activeDestination) return undefined;
    return distanceMeters(currentLocation, activeDestination);
  }, [activeDestination, currentLocation]);
  const hasArrivedAtDestination = Boolean(
    isNavigating &&
      activeDestination &&
      distanceToActiveDestination !== undefined &&
      distanceToActiveDestination <= NAVIGATION_ARRIVAL_DISTANCE_METERS,
  );
  const currentUserMarkerHeading = resolveNavigationHeading({
    deviceHeading,
    gpsHeading: lastHeadingStateRef.current === null ? null : currentHeading,
    routeHeading: shouldShowRoute ? routeHeading : null,
    userSpeed,
    preferRouteHeading: false,
  });
  const shouldShowNavigationPuck = isNavigating && shouldShowRoute;
  const shouldShowHeadingPuck =
    shouldShowNavigationPuck || userSpeed > NAVIGATION_MOVING_SPEED_MPS;
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
  const navigationRoadName = useMemo(
    () =>
      shouldShowNavigationPuck
        ? currentNavigationRoadName({
            routePath: activeRoute,
            current: currentLocation,
            routeSteps: selectedRoute?.steps,
            routeSummary: selectedRoute?.summary,
          })
        : '',
    [
      activeRoute,
      currentLocation,
      selectedRoute?.steps,
      selectedRoute?.summary,
      shouldShowNavigationPuck,
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
    offRouteStartedAtRef.current = 0;
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
    setIsAutoRerouting(false);
    setIsTransportPickerOpen(false);
    setIsMapShareSheetOpen(false);
    setIsPostingMapShare(false);
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

  const clearSelectedPoint = useCallback(() => {
    setSelectedPoint(null);
    setIsSheetCollapsed(false);
    resetRouteState();
  }, [resetRouteState]);

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
    const cameraCenter = navigationCameraCenter(location, activeRoute);
    const nextRouteHeading =
      activeDestination !== null
        ? navigationRouteHeading(
            location,
            activeRoute,
            activeDestination,
          )
        : routeHeading ?? currentHeading;
    const nextCameraHeading = resolveNavigationHeading({
      deviceHeading,
      gpsHeading: lastHeadingStateRef.current === null ? null : currentHeading,
      routeHeading: nextRouteHeading,
      userSpeed,
      preferRouteHeading: true,
    });
    const headingChanged =
      last.heading === null
        ? Infinity
        : Math.abs(normalizeBearingDelta(last.heading, nextCameraHeading));

    if (movedMeters < 1 && headingChanged < 2 && now - last.updatedAt < 800) {
      return;
    }
    lastNavigationCameraHeadingRef.current = {
      heading: nextCameraHeading,
      center: location,
      updatedAt: now,
    };
    setRouteHeading(nextRouteHeading);
    mapRef.current?.animateCamera(
      {
        center: cameraCenter,
        heading: nextCameraHeading,
        pitch: NAVIGATION_CAMERA_PITCH,
        zoom: NAVIGATION_CAMERA_ZOOM,
      },
      { duration: 180 },
    );
  }, [
    activeDestination,
    activeRoute,
    currentHeading,
    deviceHeading,
    currentLocation,
    isNavigating,
    isAutoCentering,
    routeHeading,
    shouldShowRoute,
    userSpeed,
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
          ? (() => {
              const nextRouteHeading = navigationRouteHeading(
                location,
                activeRoute,
                activeDestination,
              );
              setRouteHeading(nextRouteHeading);
              return resolveNavigationHeading({
                deviceHeading,
                gpsHeading:
                  lastHeadingStateRef.current === null ? null : currentHeading,
                routeHeading: nextRouteHeading,
                userSpeed,
                preferRouteHeading: true,
              });
            })()
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
    deviceHeading,
    isNavigating,
    routeHeading,
    shouldShowRoute,
    userSpeed,
  ]);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    currentRegionRef.current = region;
    setMapRegion(region);
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
    const location = currentLocationRef.current;
    const nextRouteHeading =
      isNavigating &&
      shouldShowRoute &&
      location &&
      activeDestination !== null &&
      activeRoute.length > 1
        ? navigationRouteHeading(location, activeRoute, activeDestination)
        : NAVIGATION_CAMERA_HEADING;
    const nextHeading =
      nextRouteHeading !== NAVIGATION_CAMERA_HEADING
        ? resolveNavigationHeading({
            deviceHeading,
            gpsHeading:
              lastHeadingStateRef.current === null ? null : currentHeading,
            routeHeading: nextRouteHeading,
            userSpeed,
            preferRouteHeading: true,
          })
        : NAVIGATION_CAMERA_HEADING;
    if (nextRouteHeading !== NAVIGATION_CAMERA_HEADING) {
      setRouteHeading(nextRouteHeading);
    }
    mapRef.current?.animateCamera(
      {
        heading: nextHeading,
        pitch: isNavigating && shouldShowRoute ? NAVIGATION_CAMERA_PITCH : 0,
      },
      { duration: 320 },
    );
  }, [
    activeDestination,
    activeRoute,
    currentHeading,
    deviceHeading,
    isNavigating,
    shouldShowRoute,
    userSpeed,
  ]);

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
      cameraDurationMs = 650,
    ) => {
      const origin = currentLocationRef.current;
      if (!origin) return;

      const routePath = normalizeRoutePath(route.path, origin, destination);
      const navigationPath = buildNavigationPath(origin, routePath);
      const routeConnector = routeConnectorFromLocation(origin, routePath);

      activeDestinationRef.current = destination;
      isNavigatingRef.current = navigating;
      activeRoutePathRef.current = routePath;
      offRouteStartedAtRef.current = 0;
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
          heading,
          pitch: NAVIGATION_CAMERA_PITCH,
          zoom: NAVIGATION_CAMERA_ZOOM,
        };

        setRouteHeading(heading);
        lastNavigationCameraHeadingRef.current = {
          heading,
          center: origin,
          updatedAt: Date.now(),
        };
        mapRef.current?.animateCamera(navigationCamera, {
          duration: cameraDurationMs,
        });
        if (cameraDurationMs >= 500) {
          setTimeout(() => {
            mapRef.current?.animateCamera(navigationCamera, { duration: 220 });
          }, 700);
        }
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

  const selectRouteOption = useCallback(
    (route: RouteOption, navigating = isNavigating) => {
      if (!selectedPoint) return;
      focusRoute(
        route,
        selectedPoint.coordinate,
        navigating,
        selectedPoint.title,
      );
    },
    [focusRoute, isNavigating, selectedPoint],
  );

  const routeMapLabels = useMemo(
    () =>
      isRoutePreview && shouldShowRoute
        ? routeOptions
            .map(route => {
              const path =
                route.id === selectedRouteId && activeRoute.length > 1
                  ? activeRoute
                  : route.path;
              if (path.length < 2) return null;
              const coordinate =
                pointAlongRoute(path, routeDistance(path) * 0.5) ||
                path[Math.floor(path.length / 2)];
              return {
                route,
                coordinate,
                isActive: route.id === selectedRouteId,
              };
            })
            .filter(
              (
                item,
              ): item is {
                route: RouteOption;
                coordinate: LatLng;
                isActive: boolean;
              } => item !== null,
            )
        : [],
    [
      activeRoute,
      isRoutePreview,
      routeOptions,
      selectedRouteId,
      shouldShowRoute,
    ],
  );
  const routePreviewAlternativeSlots = useMemo(
    () =>
      Array.from(
        { length: 4 },
        (_, index) =>
          isRoutePreview && shouldShowRoute
            ? alternativeRoutes[index] ?? null
            : null,
      ),
    [alternativeRoutes, isRoutePreview, shouldShowRoute],
  );

  const loadRouteOptions = useCallback(
    async (
      destination: LatLng,
      navigating: boolean,
      destinationTitle?: string,
      source: RouteLoadSource = 'user',
      routeModeOverride?: TransportRouteMode,
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

      const requestMode = routeModeOverride ?? selectedTransportRouteMode;
      const requestId = routeRequestIdRef.current + 1;
      routeRequestIdRef.current = requestId;
      if (source === 'auto') {
        setIsAutoRerouting(true);
      } else {
        setIsAutoRerouting(false);
        setIsLoadingRoutes(true);
      }
      try {
        const routes = await getRoutes({
          originLat: origin.latitude,
          originLng: origin.longitude,
          destinationLat: destination.latitude,
          destinationLng: destination.longitude,
          mode: requestMode,
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
        if (source === 'auto') {
          const latestLocation = currentLocationRef.current;
          const activePath = activeRoutePathRef.current;
          if (
            latestLocation &&
            activePath.length > 1 &&
            distanceToRoutePath(latestLocation, activePath) <=
              OFF_ROUTE_DISTANCE_METERS
          ) {
            return;
          }
        }
        setRouteOptions(navigating ? [nextOptions[0]] : nextOptions);
        focusRoute(
          nextOptions[0],
          destination,
          navigating,
          destinationTitle,
          source === 'auto' ? 220 : 650,
        );
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
        if (routeRequestIdRef.current === requestId) {
          if (source === 'auto') {
            setIsAutoRerouting(false);
          } else {
            setIsLoadingRoutes(false);
          }
        }
      }
    },
    [focusRoute, getRoutes, resetRouteState, selectedTransportRouteMode],
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

  const handledInitialLocationRef = useRef('');
  const pendingSharedRoutePointRef = useRef<SelectedPoint | null>(null);
  useEffect(() => {
    let cancelled = false;
    const sharedLocation = route.params?.initialLocation;
    if (!sharedLocation) return;

    const latitude = Number(sharedLocation.latitude);
    const longitude = Number(sharedLocation.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    const locationKey = `${latitude.toFixed(6)}:${longitude.toFixed(6)}:${sharedLocation.title}`;
    if (handledInitialLocationRef.current === locationKey) {
      return;
    }
    handledInitialLocationRef.current = locationKey;

    setQuery('');
    setSearchResults([]);
    setIsSearchResultsVisible(false);
    const sharedPoint: SelectedPoint = {
      id: `shared-map:${locationKey}`,
      source: 'google',
      title: sharedLocation.title || 'Địa điểm đã chia sẻ',
      subtitle:
        sharedLocation.subtitle ||
        sharedLocation.address ||
        'Địa điểm đã chia sẻ',
      address: sharedLocation.address || sharedLocation.subtitle,
      avatarUrl: sharedLocation.imageUrl,
      coordinate: { latitude, longitude },
    };
    const shouldRoute = Boolean(route.params?.autoRoute);
    const selectResolvedPoint = (point: SelectedPoint) => {
      if (cancelled) return;
      pendingSharedRoutePointRef.current =
        shouldRoute && !currentLocationRef.current ? point : null;
      selectPoint(point, Boolean(shouldRoute && currentLocationRef.current));
    };
    const existingPage = findPageForSharedLocation(
      sharedLocation,
      nearbyPlaces,
    );
    const existingPagePoint = existingPage
      ? selectedPointFromNearbyPage(existingPage)
      : null;

    selectResolvedPoint(existingPagePoint ?? sharedPoint);
    navigation.setParams({
      initialLocation: undefined,
      autoRoute: undefined,
    } as never);

    if (!existingPagePoint) {
      loadNearbyPages({
        lat: latitude,
        lng: longitude,
        limit: 30,
      })
        .then(async pages => {
          if (cancelled) return;
          hasLoadedNearbyPagesRef.current = true;
          setHasLoadedNearbyPages(true);

          const matchedPage = findPageForSharedLocation(
            sharedLocation,
            pages,
          );
          const matchedPoint = matchedPage
            ? selectedPointFromNearbyPage(matchedPage)
            : null;
          if (matchedPoint) {
            selectResolvedPoint(matchedPoint);
            return;
          }

          const sharedTitle = sharedLocation.title.trim();
          if (sharedTitle.length < 3) {
            return;
          }

          const searchResult = await searchNearbyPagesAndPlaces({
            query: sharedTitle,
            googleQuery: sharedTitle,
            lat: latitude,
            lng: longitude,
            radius: SEARCH_RADIUS_METERS,
            limit: 20,
          });
          if (cancelled) return;

          const searchedPage = findPageForSharedLocation(
            sharedLocation,
            searchResult.pages,
          );
          const searchedPoint = searchedPage
            ? selectedPointFromNearbyPage(searchedPage)
            : null;
          if (searchedPoint) {
            selectResolvedPoint(searchedPoint);
          }
        })
        .catch(() => undefined);
    }

    return () => {
      cancelled = true;
    };
  }, [
    loadNearbyPages,
    navigation,
    nearbyPlaces,
    route.params?.autoRoute,
    route.params?.initialLocation,
    searchNearbyPagesAndPlaces,
    selectPoint,
  ]);

  useEffect(() => {
    const pendingPoint = pendingSharedRoutePointRef.current;
    if (!currentLocation || !pendingPoint) return;

    pendingSharedRoutePointRef.current = null;
    loadRouteOptions(
      pendingPoint.coordinate,
      false,
      pendingPoint.title,
    ).catch(() => undefined);
  }, [currentLocation, loadRouteOptions]);

  const selectPage = useCallback(
    (page: NearbyPlace) => {
      const pagePoint = selectedPointFromNearbyPage(page);
      if (!pagePoint) return;

      selectPoint(pagePoint);
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
      clearSelectedPoint();
    }
  }, [
    clearSelectedPoint,
    dismissSearchInput,
    isNavigating,
    isRoutePreview,
    selectedPoint,
  ]);

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
      if (
        distanceMeters(location, latestActiveDestination) <=
        NAVIGATION_ARRIVAL_DISTANCE_METERS
      ) {
        offRouteStartedAtRef.current = 0;
        return;
      }
      const activePath = activeRoutePathRef.current;
      const offRouteDistance = distanceToRoutePath(location, activePath);
      const shouldReroute =
        activePath.length < 2 ||
        offRouteDistance > OFF_ROUTE_DISTANCE_METERS;

      if (!shouldReroute) {
        offRouteStartedAtRef.current = 0;
        return;
      }

      if (offRouteStartedAtRef.current === 0) {
        offRouteStartedAtRef.current = now;
      }

      const offRouteLongEnough =
        now - offRouteStartedAtRef.current >= OFF_ROUTE_CONFIRM_MS;
      if (
        offRouteLongEnough &&
        now - lastRerouteAtRef.current >= REROUTE_COOLDOWN_MS
      ) {
        lastRerouteAtRef.current = now;
        offRouteStartedAtRef.current = 0;
        setIsAutoCentering(true);
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
    if (!selectedMapShareLocation) return;

    setIsMapShareSheetOpen(true);
    messagesVm.loadChats(true).catch(() => undefined);
  }, [messagesVm, selectedMapShareLocation]);

  const handleCloseMapShareSheet = useCallback(() => {
    setIsMapShareSheetOpen(false);
  }, []);

  const handleShareMapOutside = useCallback(() => {
    if (!selectedMapShareLocation) return;

    Share.share({
      message: selectedMapShareText,
      title: selectedMapShareLocation.title,
    }).catch(() => undefined);
    setIsMapShareSheetOpen(false);
  }, [selectedMapShareLocation, selectedMapShareText]);

  const handleShareMapToPost = useCallback(() => {
    if (!selectedMapSharePreview || isPostingMapShare) return;

    setIsPostingMapShare(true);
    feedRepository
      .createPost({
        text: '',
        photos: [],
        privacy: 'public',
        linkPreview: selectedMapSharePreview,
      })
      .then(result => {
        const createdPost =
          result.post.kind === 'text' || result.post.kind === 'video'
            ? {
                ...result.post,
                linkPreview: {
                  ...selectedMapSharePreview,
                  ...(result.post.linkPreview ?? {}),
                  image:
                    result.post.linkPreview?.image ||
                    selectedMapSharePreview.image,
                },
              }
            : result.post;
        postCreatedEvents.emit({
          ...createdPost,
          postedAt: createdPost.postedAt || Math.floor(Date.now() / 1000),
        });
        setIsMapShareSheetOpen(false);
        showSnackbar({
          message: 'Đã đăng địa điểm lên bài viết',
          type: 'success',
        });
      })
      .catch(caught => {
        Alert.alert(
          'Không đăng được bài',
          caught instanceof Error
            ? caught.message
            : 'Vui lòng thử lại sau.',
        );
      })
      .finally(() => {
        setIsPostingMapShare(false);
      });
  }, [isPostingMapShare, selectedMapSharePreview]);

  const handleShareMapToChat = useCallback(
    (chat: ChatItem) => {
      if (!selectedMapShareLocation) return;

      setIsMapShareSheetOpen(false);
      navigation.navigate(ROUTES.CHAT, {
        chat,
        sharedMapLocation: selectedMapShareLocation,
      });
    },
    [navigation, selectedMapShareLocation],
  );

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

  const handleOpenTransportPicker = useCallback(() => {
    setIsTransportPickerOpen(true);
  }, []);

  const handleCloseTransportPicker = useCallback(() => {
    setIsTransportPickerOpen(false);
  }, []);

  const handleSelectTransportMode = useCallback(
    (nextMode: TransportMode) => {
      const nextOption = getTransportOption(nextMode);
      const shouldReloadRoute = nextMode !== transportMode;
      setTransportMode(nextMode);
      setIsTransportPickerOpen(false);

      if (!shouldReloadRoute || !currentLocationRef.current) {
        return;
      }

      const destination =
        activeDestinationRef.current ??
        (selectedPoint && selectedPoint.source !== 'self'
          ? selectedPoint.coordinate
          : null);

      if (!destination) {
        return;
      }

      Keyboard.dismiss();
      setIsSearchFocused(false);
      loadRouteOptions(
        destination,
        isNavigatingRef.current,
        selectedPointTitleRef.current ?? selectedPoint?.title,
        'user',
        nextOption.routeMode,
      ).catch(() => undefined);
    },
    [loadRouteOptions, selectedPoint, transportMode],
  );

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
        showsTraffic
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
            rotation={shouldShowHeadingPuck ? currentUserMarkerHeading : 0}
            tracksViewChanges={shouldShowHeadingPuck}
            zIndex={20}
            onPress={selectCurrentUser}
          >
            <View style={styles.currentUserMarker}>
              {shouldShowHeadingPuck ? (
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

        {currentLocation && shouldShowNavigationPuck && navigationRoadName ? (
          <Marker
            anchor={{ x: 0.5, y: 0 }}
            coordinate={currentLocation}
            tracksViewChanges={shouldShowNavigationPuck}
            zIndex={19}
          >
            <View style={styles.currentUserRoadLabelMarker}>
              <View style={styles.currentUserRoadLabelPill}>
                <Text
                  numberOfLines={1}
                  style={styles.currentUserRoadLabelText}
                >
                  {navigationRoadName}
                </Text>
              </View>
            </View>
          </Marker>
        ) : null}

        {visiblePageMarkers.map(({ place, coordinate }, markerIndex) => {
          if (
            selectedPoint?.source === 'page' &&
            selectedPoint.id === place.id
          ) {
            return null;
          }

          return (
            <AddressPlaceMapMarker
              key={`${place.id}:address-place:${markerIndex < addressLabelLimit ? 'label' : 'pin'}`}
              coordinate={coordinate}
              title={place.name}
              compact={markerIndex >= addressLabelLimit}
              badgeText={addressMarkerBadgeText(
                undefined,
                place.name,
                place.category,
                place.location,
              )}
              zIndex={markerIndex < addressLabelLimit ? 13 : 12}
              onPress={() => {
                setIsSearchResultsVisible(false);
                setSearchResults([]);
                selectPage(place);
              }}
            />
          );
        })}

        {selectedPoint?.source === 'page' ? (
          <AddressPlaceMapMarker
            key={`selected-address-page:${selectedPoint.id}:${selectedPoint.title}`}
            coordinate={selectedPoint.coordinate}
            title={selectedPoint.title}
            badgeText={addressMarkerBadgeText(
              undefined,
              selectedPoint.title,
              selectedPoint.subtitle,
              selectedPoint.address,
              selectedPoint.page?.category,
            )}
            selected
            zIndex={30}
            onPress={() => {
              setIsSheetCollapsed(false);
            }}
          />
        ) : selectedPoint?.source === 'google' &&
        isHealthPlace(
          selectedPoint.types,
          selectedPoint.title,
          selectedPoint.subtitle,
          selectedPoint.address,
          query,
        ) ? (
          <AddressPlaceMapMarker
            key={`selected-health-google:${selectedPoint.id}:${selectedPoint.title}`}
            coordinate={selectedPoint.coordinate}
            title={selectedPoint.title}
            badgeText="H"
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
        {routePreviewAlternativeSlots.map((route, index) => (
          <React.Fragment key={`alt-route-slot:${index}`}>
            <Polyline
              coordinates={route ? route.path : []}
              lineCap="round"
              lineJoin="round"
              strokeColor="rgba(255, 255, 255, 0.95)"
              strokeWidth={8}
              zIndex={12}
            />
            <Polyline
              coordinates={route ? route.path : []}
              lineCap="round"
              lineJoin="round"
              strokeColor="#466CFF"
              strokeWidth={4}
              zIndex={13}
              tappable={Boolean(route)}
              onPress={route ? () => selectRouteOption(route, false) : undefined}
            />
            <Polyline
              coordinates={route ? route.path : []}
              lineCap="round"
              lineJoin="round"
              strokeColor="rgba(70, 108, 255, 0.01)"
              strokeWidth={24}
              zIndex={14}
              tappable={Boolean(route)}
              onPress={route ? () => selectRouteOption(route, false) : undefined}
            />
          </React.Fragment>
        ))}

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
          strokeWidth={11}
          zIndex={16}
        />
        <Polyline
          coordinates={shouldShowRoute ? activeRoute : []}
          lineCap="round"
          lineJoin="round"
          strokeColor={isRoutePreview ? '#2D00D7' : '#1A73E8'}
          strokeWidth={7}
          zIndex={17}
        />

        {routeMapLabels.map(({ route, coordinate, isActive }) => {
          const trafficInfo = getRouteTrafficInfo(route);
          return (
          <Marker
            key={`route-label:${route.id}:${isActive ? 'active' : 'alt'}`}
            coordinate={coordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={isActive ? 26 : 25}
            onPress={() => selectRouteOption(route, false)}
          >
            <View
              style={[
                styles.routeMapDurationPill,
                isActive && styles.routeMapDurationPillActive,
              ]}
            >
              <Text
                style={[
                  styles.routeMapDurationText,
                  isActive && styles.routeMapDurationTextActive,
                ]}
              >
                {formatDuration(route.durationSeconds)}
              </Text>
              {trafficInfo ? (
                <View
                  style={[
                    (styles as any).routeMapTrafficDot,
                    trafficInfo.level === 'heavy'
                      ? (styles as any).routeMapTrafficDotHeavy
                      : trafficInfo.level === 'clear'
                        ? (styles as any).routeMapTrafficDotClear
                        : (styles as any).routeMapTrafficDotNormal,
                  ]}
                />
              ) : null}
            </View>
          </Marker>
          );
        })}

      {/* Render search results markers on the map */}
      {isSearchResultsVisible &&
        searchResults.map((item, markerIndex) => {
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

          const isHealthSearchMarker =
            item.kind === 'google'
              ? isHealthPlace(
                  item.prediction.types,
                  title,
                  item.prediction.secondaryText,
                  item.prediction.description,
                  query,
                )
              : isHealthPlace(undefined, title, item.page.category, item.page.location);

          if (item.kind === 'page' || isHealthSearchMarker) {
            return (
              <AddressPlaceMapMarker
                key={`search-address-marker:${item.id}:${markerIndex < addressLabelLimit ? 'label' : 'pin'}`}
                coordinate={coordinate}
                title={title}
                compact={markerIndex >= addressLabelLimit}
                badgeText={
                  item.kind === 'google'
                    ? 'H'
                    : addressMarkerBadgeText(
                        undefined,
                        title,
                        item.page.category,
                        item.page.location,
                      )
                }
                zIndex={markerIndex < addressLabelLimit ? 26 : 25}
                onPress={() => handleSelectSearchResult(item)}
              />
            );
          }

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
                    clearSelectedPoint();
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
                    clearSelectedPoint();
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
              maneuver={
                hasArrivedAtDestination
                  ? 'arrive'
                  : turnInstruction?.maneuver ?? 'straight'
              }
              size={52}
              color="#FFFFFF"
            />
          </View>
          <View style={styles.navigationBannerCopy}>
            <Text style={styles.navigationBannerTitle} numberOfLines={1}>
              {hasArrivedAtDestination
                ? 'Đã đến nơi'
                : isAutoRerouting
                  ? 'Đang tìm tuyến'
                  : turnInstruction
                ? formatDistance(turnInstruction.distanceMeters)
                : activeRouteDistance !== undefined
                  ? formatDistance(activeRouteDistance)
                  : 'Đang dẫn đường'}
            </Text>
            <Text style={styles.navigationBannerSubtitle} numberOfLines={2}>
              {hasArrivedAtDestination
                ? selectedPoint?.title || 'Bạn đã đến điểm đến'
                : isAutoRerouting
                  ? 'Đang cập nhật chỉ dẫn theo vị trí mới...'
                  : turnInstruction
                ? turnInstruction.detail || turnLabel(turnInstruction.maneuver)
                : selectedPoint?.title || 'Đi theo tuyến đường đã chọn'}
            </Text>
          </View>
          <View style={styles.navigationSparkButton}>
            <Compass size={34} color="#4285F4" />
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
            <Text style={styles.routeActionTitle}>
              {selectedTransportOption.title}
            </Text>
            <View style={styles.routeActionHeaderButtons}>
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
                const trafficInfo = getRouteTrafficInfo(route);
                return (
                  <TouchableOpacity
                    key={`route-dock-chip:${route.id}`}
                    activeOpacity={0.86}
                    style={[
                      styles.routeOptionChip,
                      isActive && styles.routeOptionChipActive,
                    ]}
                    onPress={() => selectRouteOption(route, false)}
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
                    {trafficInfo ? (
                      <View
                        style={[
                          (styles as any).routeTrafficBadge,
                          trafficBadgeStyle(trafficInfo.level),
                        ]}
                      >
                        <Text
                          style={[
                            (styles as any).routeTrafficBadgeText,
                            trafficBadgeTextStyle(trafficInfo.level),
                          ]}
                          numberOfLines={1}
                        >
                          {trafficInfo.detail}
                        </Text>
                      </View>
                    ) : null}
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
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.secondaryRouteButton}
              onPress={handleOpenTransportPicker}
            >
              <TransportModeIcon
                mode={transportMode}
                size={18}
                color="#006B64"
              />
              <Text style={styles.secondaryRouteButtonText} numberOfLines={1}>
                {selectedTransportOption.label}
              </Text>
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

      {isTransportPickerOpen ? (
        <View style={styles.transportPickerOverlay} pointerEvents="box-none">
          <TouchableOpacity
            activeOpacity={1}
            style={styles.transportPickerBackdrop}
            onPress={handleCloseTransportPicker}
          />
          <View
            style={[
              styles.transportPickerCard,
              { paddingBottom: Math.max(insets.bottom + 14, 24) },
            ]}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.transportPickerTitle}>Chọn phương tiện</Text>
            <Text style={styles.transportPickerSubtitle}>
              Tuyến đường sẽ cập nhật theo phương tiện bạn chọn.
            </Text>
            <View style={styles.transportPickerOptions}>
              {TRANSPORT_OPTIONS.map(option => {
                const isActive = option.mode === transportMode;
                return (
                  <TouchableOpacity
                    key={option.mode}
                    activeOpacity={0.86}
                    style={[
                      styles.transportPickerOption,
                      isActive && styles.transportPickerOptionActive,
                    ]}
                    onPress={() => handleSelectTransportMode(option.mode)}
                  >
                    <View
                      style={[
                        styles.transportPickerOptionIcon,
                        isActive && styles.transportPickerOptionIconActive,
                      ]}
                    >
                      <TransportModeIcon
                        mode={option.mode}
                        size={22}
                        color={isActive ? '#FFFFFF' : '#2563EB'}
                      />
                    </View>
                    <View style={styles.transportPickerOptionCopy}>
                      <Text
                        style={[
                          styles.transportPickerOptionTitle,
                          isActive && styles.transportPickerOptionTitleActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text style={styles.transportPickerOptionDescription}>
                        {option.description}
                      </Text>
                    </View>
                    {isActive ? (
                      <View style={styles.transportPickerActiveBadge}>
                        <Text style={styles.transportPickerActiveBadgeText}>
                          Đang chọn
                        </Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      ) : null}

      <Modal
        visible={isMapShareSheetOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCloseMapShareSheet}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.mapShareBackdrop}
          onPress={handleCloseMapShareSheet}
        />
        <View style={styles.mapShareSheetWrap}>
          <View
            style={[
              styles.mapShareSheet,
              { paddingBottom: Math.max(insets.bottom + 14, 24) },
            ]}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.mapShareHeader}>
              <View style={styles.mapShareHeaderIcon}>
                <MapPin size={22} color="#2563EB" />
              </View>
              <View style={styles.mapShareHeaderCopy}>
                <Text style={styles.mapShareTitle}>Chia sẻ địa chỉ</Text>
                <Text style={styles.mapShareSubtitle} numberOfLines={2}>
                  {selectedMapShareLocation?.title || 'Địa điểm đã chọn'}
                </Text>
              </View>
              <TouchableOpacity
                activeOpacity={0.82}
                style={styles.mapShareCloseButton}
                onPress={handleCloseMapShareSheet}
              >
                <X size={20} color="#334155" />
              </TouchableOpacity>
            </View>

            {selectedMapSharePreview ? (
              <View style={styles.mapSharePreviewCard}>
                {selectedMapSharePreview.image ? (
                  <Image
                    source={{ uri: selectedMapSharePreview.image }}
                    style={styles.mapSharePreviewImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.mapSharePreviewFallback}>
                    <MapPin size={26} color="#2563EB" />
                  </View>
                )}
                <View style={styles.mapSharePreviewCopy}>
                  <Text style={styles.mapSharePreviewEyebrow}>
                    Địa điểm sẽ chia sẻ
                  </Text>
                  <Text style={styles.mapSharePreviewTitle} numberOfLines={1}>
                    {selectedMapSharePreview.title || 'Địa điểm đã chọn'}
                  </Text>
                  <Text style={styles.mapSharePreviewDesc} numberOfLines={2}>
                    {selectedMapSharePreview.description ||
                      (selectedMapShareLocation
                        ? `${selectedMapShareLocation.latitude.toFixed(6)}, ${selectedMapShareLocation.longitude.toFixed(6)}`
                        : '')}
                  </Text>
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              activeOpacity={0.86}
              style={[
                styles.mapSharePrimaryAction,
                isPostingMapShare && styles.mapShareActionDisabled,
              ]}
              onPress={handleShareMapToPost}
              disabled={isPostingMapShare}
            >
              <View style={styles.mapShareActionIcon}>
                {isPostingMapShare ? (
                  <ActivityIndicator size="small" color="#2563EB" />
                ) : (
                  <Share2 size={19} color="#2563EB" />
                )}
              </View>
              <View style={styles.mapShareActionCopy}>
                <Text style={styles.mapShareActionTitle}>
                  {isPostingMapShare ? 'Đang đăng bài...' : 'Đăng thành bài viết'}
                </Text>
                <Text style={styles.mapShareActionDesc}>
                  Bài viết sẽ hiển thị card địa điểm và mở lại bản đồ khi bấm.
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.mapShareSectionHeader}>
              <MessageCircle size={16} color="#64748B" />
              <Text style={styles.mapShareSectionTitle}>Gửi vào tin nhắn</Text>
            </View>
            {messagesVm.isLoadingChats && mapShareChats.length === 0 ? (
              <View style={styles.mapShareLoadingRow}>
                <ActivityIndicator color="#2563EB" />
                <Text style={styles.mapShareLoadingText}>Đang tải cuộc trò chuyện...</Text>
              </View>
            ) : mapShareChats.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mapShareChatList}
              >
                {mapShareChats.slice(0, 12).map(chat => (
                  <TouchableOpacity
                    key={`map-share-chat:${chat.id}:${chat.userId}`}
                    activeOpacity={0.86}
                    style={styles.mapShareChatItem}
                    onPress={() => handleShareMapToChat(chat)}
                  >
                    <Image
                      source={{ uri: chat.avatar || FALLBACK_AVATAR }}
                      style={styles.mapShareChatAvatar}
                    />
                    <Text style={styles.mapShareChatName} numberOfLines={1}>
                      {chat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.mapShareEmptyText}>
                Bạn chưa có cuộc trò chuyện nào để chia sẻ.
              </Text>
            )}

            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.mapShareOutsideButton}
              onPress={handleShareMapOutside}
            >
              <Share2 size={18} color="#006B64" />
              <Text style={styles.mapShareOutsideText}>Chia sẻ ngoài ứng dụng</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {isNavigating && shouldShowRoute ? (
        <View style={styles.navigationEtaDock}>
          <TouchableOpacity
            activeOpacity={0.86}
            style={
              hasArrivedAtDestination
                ? styles.navigationFinishButton
                : styles.navigationRoundButton
            }
            onPress={resetRouteState}
          >
            {hasArrivedAtDestination ? (
              <>
                <MapPinCheck size={21} color="#FFFFFF" />
                <Text style={styles.navigationFinishText}>Kết thúc</Text>
              </>
            ) : (
              <X size={31} color="#334155" />
            )}
          </TouchableOpacity>
          <View style={styles.navigationEtaCopy}>
            <View style={styles.sheetHandle} />
            <Text style={styles.navigationEtaTitle}>
              {hasArrivedAtDestination
                ? 'Đã đến nơi'
                : activeRouteDuration && activeRouteDuration > 0
                ? formatDuration(activeRouteDuration)
                : 'Đang cập nhật'}
            </Text>
            <Text style={styles.navigationEtaSubtitle}>
              {hasArrivedAtDestination
                ? 'Chạm Kết thúc để dừng dẫn đường'
                : [
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
            onPress={clearSelectedPoint}
          >
            <X size={18} color="#64748B" />
          </TouchableOpacity>

          <View className="flex-row items-center pr-7">
            {selectedPoint.avatarUrl ? (
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
                const trafficInfo = getRouteTrafficInfo(route);
                return (
                  <TouchableOpacity
                    key={`route-chip:${route.id}`}
                    activeOpacity={0.86}
                    style={[
                      styles.routeOptionChip,
                      isActive && styles.routeOptionChipActive,
                    ]}
                    onPress={() => selectRouteOption(route, isNavigating)}
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
                    {trafficInfo ? (
                      <View
                        style={[
                          (styles as any).routeTrafficBadge,
                          trafficBadgeStyle(trafficInfo.level),
                        ]}
                      >
                        <Text
                          style={[
                            (styles as any).routeTrafficBadgeText,
                            trafficBadgeTextStyle(trafficInfo.level),
                          ]}
                          numberOfLines={1}
                        >
                          {trafficInfo.detail}
                        </Text>
                      </View>
                    ) : null}
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
                clearSelectedPoint();
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

              const routePoint: SelectedPoint | null = coordinate
                ? item.kind === 'page'
                  ? {
                      id: item.page.id,
                      source: 'page',
                      title: item.page.name,
                      subtitle: item.page.username
                        ? `@${item.page.username}`
                        : item.page.location || 'Page',
                      address: item.page.location,
                      avatarUrl: item.page.avatarUrl,
                      url: item.page.url,
                      showNameBadge: true,
                      page: item.page,
                      coordinate,
                      distanceMeters: item.page.distanceMeters,
                    }
                  : {
                      id: item.prediction.placeId,
                      source: 'google',
                      title: item.prediction.mainText,
                      subtitle:
                        item.prediction.secondaryText ||
                        item.prediction.description,
                      address:
                        item.prediction.secondaryText ||
                        item.prediction.description,
                      coordinate,
                      distanceMeters: item.prediction.distanceMeters,
                      types: item.prediction.types,
                      icon: item.prediction.icon,
                      iconBackgroundColor: item.prediction.iconBackgroundColor,
                    }
                : null;
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
                if (!routePoint) return;
                selectPoint(routePoint, true);
              };

              const onStartNavigation = () => {
                if (!routePoint) return;
                selectPoint(routePoint);
                loadRouteOptions(
                  routePoint.coordinate,
                  true,
                  routePoint.title,
                ).catch(() => undefined);
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
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  currentUserPuck: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.22,
    shadowRadius: 9,
    elevation: 10,
  },
  currentUserArrow: {
    width: 34,
    height: 40,
    alignItems: 'center',
  },
  currentUserArrowTail: {
    position: 'absolute',
    top: 25,
    width: 11,
    height: 14,
    borderRadius: 6,
    backgroundColor: BRAND,
  },
  currentUserArrowHead: {
    position: 'absolute',
    top: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 17,
    borderRightWidth: 17,
    borderBottomWidth: 30,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: BRAND,
  },
  currentUserRoadLabelMarker: {
    width: 190,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 64,
  },
  currentUserRoadLabelPill: {
    maxWidth: 178,
    minHeight: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.97)',
    paddingHorizontal: 11,
    paddingVertical: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 7,
  },
  currentUserRoadLabelText: {
    color: BRAND,
    fontSize: 16,
    fontWeight: '900',
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
  healthPlaceMarkerRoot: {
    width: 248,
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 0,
  },
  healthPlaceMarkerRootCompact: {
    width: 54,
    minHeight: 58,
    justifyContent: 'center',
  },
  healthPlaceMarkerRootSelected: {
    width: 190,
    minHeight: 48,
    paddingRight: 0,
  },
  healthPlaceMarkerLabelCard: {
    maxWidth: 186,
    marginRight: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: ADDRESS_PLACE_LABEL_BORDER,
    backgroundColor: ADDRESS_PLACE_LABEL_BACKGROUND,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  healthPlaceMarkerLabelCardSelected: {
    maxWidth: 142,
    marginRight: 5,
    borderRadius: 10,
    borderColor: 'rgba(14, 165, 164, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    paddingHorizontal: 7,
    paddingVertical: 4,
    shadowOpacity: 0.06,
    elevation: 2,
  },
  healthPlaceMarkerLabel: {
    color: ADDRESS_PLACE_LABEL_COLOR,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  healthPlaceMarkerLabelSelected: {
    color: ADDRESS_PLACE_MARKER_DARK,
    fontSize: 9.5,
    fontWeight: '700',
    lineHeight: 12.5,
    textAlign: 'right',
  },
  healthPlaceBadgePin: {
    width: 50,
    height: 58,
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: ADDRESS_PLACE_MARKER_DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 7,
  },
  healthPlaceBadgeText: {
    position: 'absolute',
    top: 11,
    left: 0,
    right: 0,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 18,
    textAlign: 'center',
  },
  healthPlaceBadgeDot: {
    position: 'absolute',
    top: 18,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ADDRESS_PLACE_MARKER_LIGHT,
  },
  healthPlaceSelectedPin: {
    width: 34,
    height: 39,
    alignItems: 'center',
    justifyContent: 'flex-start',
    shadowColor: ADDRESS_PLACE_MARKER_DARK,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  healthPlaceSelectedPinText: {
    position: 'absolute',
    top: 7,
    left: 0,
    right: 0,
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    lineHeight: 12,
    textAlign: 'center',
  },
  healthPlaceSelectedPinDot: {
    position: 'absolute',
    top: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ADDRESS_PLACE_MARKER_LIGHT,
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
  transportPickerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 42,
    justifyContent: 'flex-end',
  },
  transportPickerBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.18)',
  },
  transportPickerCard: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  transportPickerTitle: {
    marginTop: 14,
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  transportPickerSubtitle: {
    marginTop: 5,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  transportPickerOptions: {
    marginTop: 16,
  },
  transportPickerOption: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  transportPickerOptionActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  transportPickerOptionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  transportPickerOptionIconActive: {
    backgroundColor: '#2563EB',
  },
  transportPickerOptionCopy: {
    flex: 1,
    marginLeft: 12,
  },
  transportPickerOptionTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },
  transportPickerOptionTitleActive: {
    color: '#1D4ED8',
  },
  transportPickerOptionDescription: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  transportPickerActiveBadge: {
    marginLeft: 10,
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  transportPickerActiveBadgeText: {
    color: '#1D4ED8',
    fontSize: 11,
    fontWeight: '900',
  },
  mapShareBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.32)',
  },
  mapShareSheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  mapShareSheet: {
    marginHorizontal: 14,
    marginBottom: 12,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 16,
  },
  mapShareHeader: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapShareHeaderIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  mapShareHeaderCopy: {
    flex: 1,
    marginLeft: 12,
  },
  mapShareTitle: {
    color: '#0F172A',
    fontSize: 21,
    fontWeight: '900',
  },
  mapShareSubtitle: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  mapShareCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  mapSharePreviewCard: {
    marginTop: 16,
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  mapSharePreviewImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
  },
  mapSharePreviewFallback: {
    width: 72,
    height: 72,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
  },
  mapSharePreviewCopy: {
    flex: 1,
    marginLeft: 12,
  },
  mapSharePreviewEyebrow: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  mapSharePreviewTitle: {
    marginTop: 4,
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
  },
  mapSharePreviewDesc: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  mapSharePrimaryAction: {
    marginTop: 18,
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
  },
  mapShareActionDisabled: {
    opacity: 0.72,
  },
  mapShareActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DBEAFE',
  },
  mapShareActionCopy: {
    flex: 1,
    marginLeft: 12,
  },
  mapShareActionTitle: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '900',
  },
  mapShareActionDesc: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  mapShareSectionHeader: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapShareSectionTitle: {
    marginLeft: 7,
    color: '#334155',
    fontSize: 13,
    fontWeight: '900',
  },
  mapShareLoadingRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mapShareLoadingText: {
    marginLeft: 10,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  mapShareChatList: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  mapShareChatItem: {
    width: 72,
    alignItems: 'center',
    marginRight: 12,
  },
  mapShareChatAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E2E8F0',
  },
  mapShareChatName: {
    marginTop: 6,
    color: '#334155',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  mapShareEmptyText: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
  mapShareOutsideButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: '#CFFAFE',
  },
  mapShareOutsideText: {
    marginLeft: 8,
    color: '#006B64',
    fontSize: 13,
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
  navigationFinishButton: {
    minWidth: 112,
    height: 58,
    borderRadius: 29,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#008B8B',
    paddingHorizontal: 16,
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  navigationFinishText: {
    marginLeft: 7,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
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
    maxHeight: 96,
  },
  routeOptionChip: {
    minWidth: 148,
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
  routeTrafficBadge: {
    alignSelf: 'flex-start',
    marginTop: 7,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  routeTrafficBadgeClear: {
    backgroundColor: '#DCFCE7',
  },
  routeTrafficBadgeNormal: {
    backgroundColor: '#FEF3C7',
  },
  routeTrafficBadgeHeavy: {
    backgroundColor: '#FEE2E2',
  },
  routeTrafficBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  routeTrafficBadgeTextClear: {
    color: '#15803D',
  },
  routeTrafficBadgeTextNormal: {
    color: '#B45309',
  },
  routeTrafficBadgeTextHeavy: {
    color: '#B91C1C',
  },
  routeMapDurationPill: {
    minWidth: 72,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.95)',
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 6,
    elevation: 5,
  },
  routeMapDurationPillActive: {
    borderColor: '#123CFF',
    backgroundColor: '#123CFF',
  },
  routeMapDurationText: {
    color: '#475569',
    fontSize: 15,
    fontWeight: '900',
  },
  routeMapDurationTextActive: {
    color: '#FFFFFF',
  },
  routeMapEcoText: {
    marginLeft: 5,
    color: '#D9F99D',
    fontSize: 13,
    fontWeight: '900',
  },
  routeMapTrafficDot: {
    marginLeft: 6,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.95)',
  },
  routeMapTrafficDotClear: {
    backgroundColor: '#22C55E',
  },
  routeMapTrafficDotNormal: {
    backgroundColor: '#F59E0B',
  },
  routeMapTrafficDotHeavy: {
    backgroundColor: '#EF4444',
  },
  navigationBanner: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 18 : 0,
    right: 18,
    left: 18,
    zIndex: 28,
    minHeight: 126,
    borderRadius: 22,
    backgroundColor: '#006B64',
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  navigationBannerIcon: {
    width: 82,
    height: 82,
    borderRadius: 20,
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
    fontSize: 36,
    fontWeight: '900',
  },
  navigationBannerSubtitle: {
    marginTop: 3,
    color: '#E0F2FE',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 25,
  },
  navigationSparkButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
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
