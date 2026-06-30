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
  type UserLocationChangeEvent,
} from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  MapRoute,
  MapRouteStep,
  MapPlacePrediction,
  NearbyPlace,
} from '../../domain/types/user.types';

type NearbyNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000FF';
const ACCENT = '#EF4444';
const FALLBACK_AVATAR = 'https://v2.vnseea.vn/upload/photos/d-avatar.jpg';
const NAVIGATION_CAMERA_PITCH = 60;
const NAVIGATION_CAMERA_ZOOM = 19.25;
const ROUTE_CONNECTOR_MIN_METERS = 5;
const ROUTE_LOOKAHEAD_MIN_METERS = 14;
const ROUTE_LOOKAHEAD_MAX_METERS = 58;
const LOCATION_RECENTER_DISTANCE_METERS = 50000;
const SHOW_APP_DISCOVERY_PLACES_ON_MAP = true;
const HIDE_GOOGLE_DISCOVERY_PLACES = true;
const pagesRepository = createPagesRepository();
const CLEAN_GOOGLE_MAP_STYLE = [
  {
    featureType: 'poi',
    elementType: 'all',
    stylers: [{ visibility: 'off' }],
  },
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
  latitudeDelta: 0.009,
  longitudeDelta: 0.009,
};

type SuggestionItem =
  | { id: string; kind: 'page'; page: NearbyPlace }
  | { id: string; kind: 'google'; prediction: MapPlacePrediction };

type SelectedPoint = {
  id: string;
  source: 'page' | 'google' | 'self';
  title: string;
  subtitle: string;
  avatarUrl?: string;
  url?: string;
  showNameBadge?: boolean;
  page?: NearbyPlace;
  coordinate: LatLng;
  distanceMeters?: number;
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

function PageAvatarMapMarker({
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
  const [imageReady, setImageReady] = useState(false);
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let settleTimer: ReturnType<typeof setTimeout> | null = null;

    setImageReady(false);
    setTracksViewChanges(true);
    Image.prefetch(avatarUri)
      .then(() => {
        if (!isMounted) return;
        setImageReady(true);
        setTracksViewChanges(true);
        settleTimer = setTimeout(
          () => {
            if (isMounted) {
              setTracksViewChanges(false);
            }
          },
          Platform.OS === 'android' ? 1200 : 800,
        );
      })
      .catch(() => {
        if (!isMounted) return;
        setImageReady(false);
        if (Platform.OS !== 'android') {
          setTracksViewChanges(false);
        }
      });

    return () => {
      isMounted = false;
      if (settleTimer) {
        clearTimeout(settleTimer);
      }
    };
  }, [avatarUri]);

  const handleImageLoaded = useCallback(() => {
    setImageReady(true);
    setTracksViewChanges(true);
    setTimeout(() => {
      setTracksViewChanges(false);
    }, Platform.OS === 'android' ? 1200 : 800);
  }, []);

  const handleImageError = useCallback(() => {
    setImageReady(false);
    if (Platform.OS !== 'android') {
      setTracksViewChanges(false);
    }
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
              onLoad={handleImageLoaded}
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
  const startsNearDestination =
    distanceMeters(start, destination) < distanceMeters(start, origin);
  const endsNearOrigin =
    distanceMeters(end, origin) < distanceMeters(start, origin);

  return startsNearDestination || endsNearOrigin
    ? [...normalized].reverse()
    : normalized;
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

function suggestionSubtitle(item: SuggestionItem) {
  if (item.kind === 'google') {
    return item.prediction.secondaryText || item.prediction.description;
  }
  const distance = formatDistance(item.page.distanceMeters);
  return [item.page.location, distance].filter(Boolean).join(' · ');
}

function SearchSuggestionRow({
  item,
  onPress,
}: {
  item: SuggestionItem;
  onPress: () => void;
}) {
  const isGoogle = item.kind === 'google';
  const title = isGoogle ? item.prediction.mainText : item.page.name;
  const subtitle = suggestionSubtitle(item);

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      className="flex-row items-center border-b border-slate-100 px-4 py-3"
      onPress={onPress}
    >
      {isGoogle ? (
        <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
          <MapPin size={18} color="#64748B" />
        </View>
      ) : (
        <Image
          source={{ uri: item.page.avatarUrl || FALLBACK_AVATAR }}
          className="h-10 w-10 rounded-full bg-slate-100"
          resizeMode="cover"
        />
      )}
      <View className="ml-3 flex-1">
        <Text className="text-sm font-bold text-slate-900" numberOfLines={1}>
          {title}
        </Text>
        <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NearbyUsersScreen() {
  const navigation = useNavigation<NearbyNav>();
  const {
    clearPlacePredictions,
    currentUser,
    error,
    getPlaceDetails,
    getRoutes,
    isLoading,
    loadNearbyPages,
    loadCurrentUser,
    nearbyPlaces,
    placePredictions,
    searchNearbyPagesAndPlaces,
  } = useUserViewModel();
  const mapRef = useRef<MapView>(null);
  const currentLocationRef = useRef<LatLng | null>(null);
  const hasLoadedNearbyPagesRef = useRef(false);
  const activeDestinationRef = useRef<LatLng | null>(null);
  const isNavigatingRef = useRef(false);
  const lastRoutedOriginRef = useRef<LatLng | null>(null);
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

  const suggestions = useMemo<SuggestionItem[]>(() => {
    if (query.trim().length < 3) return [];

    const pageSuggestions = nearbyPlaces.map(page => ({
      id: page.id,
      kind: 'page' as const,
      page,
    }));
    const googleSuggestions = placePredictions.map(prediction => ({
      id: `google:${prediction.placeId}`,
      kind: 'google' as const,
      prediction,
    }));

    return [...pageSuggestions, ...googleSuggestions].sort((left, right) => {
      if (left.kind === 'page' && right.kind === 'page') {
        const leftNear = (left.page.distanceMeters ?? Infinity) <= 1000;
        const rightNear = (right.page.distanceMeters ?? Infinity) <= 1000;
        if (leftNear !== rightNear) return leftNear ? -1 : 1;
        return (
          (left.page.distanceMeters ?? Infinity) -
          (right.page.distanceMeters ?? Infinity)
        );
      }
      if (left.kind === 'page') return -1;
      if (right.kind === 'page') return 1;
      return 0;
    });
  }, [nearbyPlaces, placePredictions, query]);

  const shouldShowSuggestionPanel =
    isSearchFocused &&
    query.trim().length >= 3 &&
    (isLoading || suggestions.length > 0 || Boolean(searchMessage || error));

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
  const visiblePageMarkers = SHOW_APP_DISCOVERY_PLACES_ON_MAP
    ? pageMarkers
    : [];

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
    const origin = currentLocationRef.current;
    if (!origin || !shouldShowRoute) {
      return selectedDistance;
    }
    return routeDistance(buildNavigationPath(origin, activeRoute));
  }, [activeRoute, currentLocation, selectedDistance, shouldShowRoute]);
  const currentUserMarkerHeading =
    deviceHeading ??
    (shouldShowRoute && routeHeading !== null ? routeHeading : currentHeading);
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

  const resetRouteState = useCallback(() => {
    routeRequestIdRef.current += 1;
    activeDestinationRef.current = null;
    isNavigatingRef.current = false;
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
        heading: 0,
      },
      { duration: 450 },
    );
  }, []);

  useEffect(
    () =>
      subscribeNavigationHeading(heading => {
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

    lastNavigationCameraHeadingRef.current = {
      heading: routeHeading,
      center: location,
      updatedAt: now,
    };
    const cameraCenter = navigationCameraCenter(location, activeRoute);
    const nextHeading =
      activeDestination !== null
        ? initialRouteHeading(
            buildNavigationPath(location, activeRoute),
            location,
            activeDestination,
          )
        : routeHeading ?? currentHeading;
    setRouteHeading(nextHeading);
    mapRef.current?.animateCamera(
      {
        center: cameraCenter,
        heading: nextHeading,
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
      mapRef.current?.animateCamera(
        {
          center: cameraCenter,
          heading: routeHeading ?? currentHeading,
          pitch: NAVIGATION_CAMERA_PITCH,
          zoom: NAVIGATION_CAMERA_ZOOM,
        },
        { duration: 400 },
      );
    } else {
      mapRef.current?.animateToRegion(
        {
          ...location,
          latitudeDelta: 0.009,
          longitudeDelta: 0.009,
        },
        350,
      );
    }
  }, [activeRoute, currentHeading, isNavigating, routeHeading, shouldShowRoute]);

  const resetMapHeading = useCallback(() => {
    mapRef.current?.animateCamera(
      {
        heading: 0,
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
        const routeBearing = initialRouteHeading(
          navigationPath,
          origin,
          destination,
        );
        const heading = routeBearing;
        const cameraCenter = navigationCameraCenter(origin, routePath);
        const navigationCamera = {
          center: cameraCenter,
          heading,
          pitch: NAVIGATION_CAMERA_PITCH,
          zoom: NAVIGATION_CAMERA_ZOOM,
        };

        setRouteHeading(routeBearing);
        lastNavigationCameraHeadingRef.current = {
          heading,
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
    [deviceHeading, voiceGuidanceEnabled],
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
      setIsLoadingRoutes(true);
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
        setIsLoadingRoutes(false);
        resetRouteState();
        Alert.alert(
          'Không tải được lộ trình',
          'VNSEEA chưa lấy được đường đi trong app. Bạn thử lại sau nhé.',
        );
      } finally {
        if (routeRequestIdRef.current === requestId) {
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

  const selectGooglePrediction = useCallback(
    async (prediction: MapPlacePrediction) => {
      Keyboard.dismiss();
      setIsSearchFocused(false);
      const place = await getPlaceDetails(prediction.placeId);
      if (!place?.coordinate) return;

      selectPoint({
        id: place.id,
        source: 'google',
        title: place.name,
        subtitle: place.location || prediction.description,
        url: place.url,
        coordinate: place.coordinate,
      });
    },
    [getPlaceDetails, selectPoint],
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
        coordinate,
      });
    },
    [selectPoint],
  );

  const handleSelectSuggestion = useCallback(
    (item: SuggestionItem) => {
      setQuery(
        item.kind === 'google' ? item.prediction.mainText : item.page.name,
      );
      if (item.kind === 'page') {
        selectPage(item.page);
        return;
      }
      selectGooglePrediction(item.prediction).catch(() => undefined);
    },
    [selectGooglePrediction, selectPage],
  );

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
      setCurrentLocation(location);
      setLocationSource('gps');
      
      const speed = coordinate.speed ?? 0;
      setUserSpeed(speed);

      const gpsHeading = Number(coordinate.heading);
      if (
        Number.isFinite(gpsHeading) &&
        gpsHeading >= 0 &&
        gpsHeading <= 360
      ) {
        setCurrentHeading(gpsHeading);
      }

      if (!hasCenteredOnUser || wasUsingProfileLocation || movedVeryFar) {
        setHasCenteredOnUser(true);
        mapRef.current?.animateToRegion(
          {
            ...location,
            latitudeDelta: 0.009,
            longitudeDelta: 0.009,
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
      const lastOrigin = lastRoutedOriginRef.current;
      if (!lastOrigin || distanceMeters(lastOrigin, location) > 30) {
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
        lat: current?.latitude,
        lng: current?.longitude,
        limit: 20,
      })
        .then(result => {
          if (result.pages.length === 0 && result.predictions.length === 0) {
            setSearchMessage(
              'Không tìm thấy Page hoặc địa chỉ Google phù hợp.',
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
              latitudeDelta: 0.009,
              longitudeDelta: 0.009,
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
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
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
        onUserLocationChange={handleUserLocationChange}
        onPanDrag={() => {
          if (isNavigating) {
            setIsAutoCentering(false);
          }
        }}
        style={StyleSheet.absoluteFill}
      >
        {currentLocation ? (
          <Circle
            center={currentLocation}
            radius={1000}
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
            rotation={userSpeed > 0.8 ? currentUserMarkerHeading : 0}
            zIndex={20}
            onPress={selectCurrentUser}
          >
            <View style={styles.currentUserMarker}>
              {userSpeed > 0.8 ? (
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
              onPress={() => selectPage(place)}
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
            tracksViewChanges
            zIndex={30}
          >
            <View
              style={[
                styles.selectedMarker,
                selectedPoint.showNameBadge && styles.pageMarkerWithBadge,
              ]}
            >
              <View
                style={[
                  styles.selectedPin,
                  selectedPoint.source === 'google' && styles.googleMarker,
                ]}
              >
                <View style={styles.selectedPinTail} />
                <View style={styles.selectedPinHead}>
                  <View style={styles.selectedPinCore} />
                </View>
              </View>
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
      </MapView>

      {!isNavigating && !isRoutePreview ? (
        <View style={styles.exploreTopControls}>
          <View style={styles.exploreSearchRow}>
            <TouchableOpacity
              activeOpacity={0.86}
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <ArrowLeft size={22} color="#0F172A" />
            </TouchableOpacity>

            <View style={styles.searchBox}>
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
                }}
                onFocus={() => setIsSearchFocused(true)}
              />
              {query.length > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setQuery('');
                    setSearchMessage('');
                    setIsSearchFocused(false);
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
            </View>
          </View>

          {SHOW_APP_DISCOVERY_PLACES_ON_MAP ? (
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
                  onPress={() => selectPage(place)}
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
          ) : null}

          {locationSource === 'profile' ? (
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
        <View style={styles.routePreviewCard}>
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
        <View style={styles.navigationBanner}>
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
        <View style={styles.suggestionPanel}>
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

      <TouchableOpacity
        activeOpacity={0.86}
        style={[
          styles.locateButton,
          selectedPoint && !isSheetCollapsed && styles.locateWithSheet,
        ]}
        onPress={centerOnUser}
      >
        <LocateFixed size={21} color={BRAND} />
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.86}
        style={[
          styles.compassButton,
          selectedPoint && !isSheetCollapsed && styles.compassWithSheet,
        ]}
        onPress={resetMapHeading}
      >
        <Compass size={21} color={BRAND} />
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

      {selectedPoint && !isSheetCollapsed && !isRoutePreview ? (
        <View style={styles.sheet}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.sheetClose}
            onPress={() => setIsSheetCollapsed(true)}
          >
            <X size={18} color="#64748B" />
          </TouchableOpacity>

          <View className="flex-row items-center pr-7">
            <Image
              source={{ uri: selectedPoint.avatarUrl || FALLBACK_AVATAR }}
              className="h-14 w-14 rounded-2xl bg-slate-100"
            />
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
            numberOfLines={1}
          >
            {formatCoordinate(selectedPoint.coordinate)}
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
            <TouchableOpacity
              activeOpacity={0.86}
              className="flex-1 items-center rounded-xl border border-slate-200 bg-white px-2 py-3"
              onPress={handleViewDetails}
            >
              <Text className="text-xs font-extrabold text-slate-900">
                Chi tiết
              </Text>
            </TouchableOpacity>
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
    top: Platform.OS === 'android' ? 26 : 10,
    right: 14,
    left: 14,
    zIndex: 31,
  },
  exploreSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    top: Platform.OS === 'android' ? 28 : 12,
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
    backgroundColor: '#EEF2FF',
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
  },
  locateWithSheet: {
    bottom: 232,
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
    marginLeft: 10,
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
    top: 12,
    right: 12,
    zIndex: 2,
    width: 30,
    height: 30,
    borderRadius: 15,
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
    top: Platform.OS === 'android' ? 22 : 12,
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
    top: Platform.OS === 'android' ? 144 : 128,
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
});
