// Description: Shows the Nearby page-and-address map search experience with route actions.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
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
  FlatList,
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
  useWindowDimensions,
  Vibration,
  View,
} from 'react-native';
import MapView, {
  Circle,
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type Details,
  type LatLng,
  type Region,
  type UserLocationChangeEvent,
} from 'react-native-maps';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Reanimated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
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
import { iosPagerSwipeLock } from '../../../navigation/iosPagerSwipeLock';
import { tabBarVisibility } from '../../../navigation/tabBarVisibility';
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
import { useAuthBranding } from '../../../auth/application/view-models/useAuthBranding';
import { useUserViewModel } from '../../application/view-models/useUserViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { showSnackbar } from '../../../shared-kernel/presentation/components/Snackbar';
import MapPlaceDetailSheet, {
  getMapPlaceDetailSheetHeights,
  type MapPlaceDetailSheetSuggestion,
  type MapPlaceDetailSheetSnap,
} from '../components/MapPlaceDetailSheet';
import { getCurrentDeviceLocation } from '../../../shared-kernel/application/utils/currentLocation';
import {
  readLastMapLocation,
  saveLastMapLocation,
} from '../../../shared-kernel/infrastructure/storage/mapLocationStorage';
import {
  speakNavigationInstruction,
  stopNavigationSpeech,
} from '../../infrastructure/navigation/navigationSpeech';
import { subscribeNavigationHeading } from '../../infrastructure/navigation/navigationHeading';
import type {
  MapPlaceReview,
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
import { getGoogleCategorySearchQuery } from '../../application/utils/mapSearchCategory';
import { compareMapSearchRankCandidates } from '../../application/utils/mapSearchRanking';
import {
  MAP_COMMITTED_SEARCH_RADIUS_METERS,
  MAP_TYPEAHEAD_SEARCH_RADIUS_METERS,
} from '../../application/utils/mapSearchRadius';
import {
  DISCOVERY_RELOAD_DISTANCE_METERS,
  isPersistedDiscoveryLocationFresh,
  mapDiscoveryDistanceMeters,
  shouldReloadNearbyPages,
  type MapDiscoveryLocationSource,
} from '../../application/utils/mapDiscoveryLocation';

type NearbyNav = NativeStackNavigationProp<RootStackParamList>;
type NearbyRoute = RouteProp<RootStackParamList, typeof ROUTES.NEARBY_USERS>;

const BRAND = APP_BRAND_COLOR;
const ACCENT = '#EF4444';
const FALLBACK_AVATAR = 'https://vnseea.vn/upload/photos/d-avatar.jpg';
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
const DISCOVERY_RADIUS_METERS = 3000;
const SEARCH_MAP_FIT_CLUSTER_METERS = 50000;
const NEARBY_RESULT_DISTANCE_METERS = 3000;
const LOCAL_RESULT_DISTANCE_METERS = 20000;
const LOCAL_SEARCH_MIN_LENGTH = 1;
const REMOTE_SEARCH_MIN_LENGTH = 2;
const CATEGORY_SEARCH_DEBOUNCE_MS = 80;
const TEXT_SEARCH_DEBOUNCE_MS = 120;
// Committed search returns at most 20 VNSEEA Pages and 20 Google places.
const MAX_COMMITTED_SEARCH_RESULTS = 40;
const MAX_VISIBLE_PAGE_MARKERS = 40;
const MAX_VISIBLE_SEARCH_MARKERS = 24;
const IDLE_LOCATION_STATE_MIN_METERS = 8;
const NAVIGATION_LOCATION_STATE_MIN_METERS = 1;
const IDLE_LOCATION_STATE_MIN_MS = 1400;
const NAVIGATION_LOCATION_STATE_MIN_MS = 280;
const HEADING_STATE_MIN_DEGREES = 2;
const HEADING_STATE_MIN_MS = 80;
const NAVIGATION_MOVING_SPEED_MPS = 0.8;
const DISCOVERY_RELOCATION_CONFIRM_MS = 1200;
const DISCOVERY_RELOCATION_CONFIRM_RADIUS_METERS = 250;
const PERSISTED_DISCOVERY_FALLBACK_DELAY_MS = 5000;
const SHOW_APP_DISCOVERY_PLACES_ON_MAP = true;
const HIDE_GOOGLE_DISCOVERY_PLACES = false;
const SHOW_LEGACY_SELECTED_PLACE_CARD: boolean = false;
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

type SearchResultSort = 'relevance' | 'distance' | 'pages';
type SearchResultsSheetSnap = 'peek' | 'half' | 'expanded';

const SEARCH_RESULTS_SHEET_SNAPS: SearchResultsSheetSnap[] = [
  'peek',
  'half',
  'expanded',
];
const SEARCH_RESULTS_SHEET_SPRING = {
  damping: 30,
  stiffness: 280,
  mass: 0.9,
  overshootClamping: true,
} as const;
const SEARCH_RESULTS_SHEET_FLING_VELOCITY = 650;
const SEARCH_RESULTS_IOS_PULL_TO_HALF_THRESHOLD = 36;

type SelectedPoint = {
  id: string;
  source: 'page' | 'google' | 'self';
  placeId?: string;
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
  rating?: number;
  ratingsTotal?: number;
  openNow?: boolean;
  photoUrls?: string[];
  reviews?: MapPlaceReview[];
  editorialSummary?: string;
  phoneNumber?: string;
  website?: string;
  weekdayText?: string[];
  businessStatus?: string;
  priceLevel?: number;
};

type RouteOption = MapRoute & {
  id: string;
  path: LatLng[];
};

type LocationSource = 'gps' | 'profile' | null;
type RouteLoadSource = 'user' | 'auto';
type TransportMode = 'walking' | 'motorcycle' | 'driving';
type TransportRouteMode = Extract<
  NonNullable<MapRouteInput['mode']>,
  TransportMode
>;

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

function getRouteTrafficInfo(
  route: Pick<
    MapRoute,
    | 'durationSeconds'
    | 'durationWithoutTrafficSeconds'
    | 'durationInTrafficSeconds'
    | 'trafficDelaySeconds'
    | 'trafficLabel'
    | 'trafficLevel'
  >,
): RouteTrafficInfo | null {
  const baseDuration = route.durationWithoutTrafficSeconds;
  const trafficDuration =
    route.durationInTrafficSeconds ?? route.durationSeconds;
  const computedDelay =
    typeof baseDuration === 'number' && baseDuration > 0
      ? Math.max(0, trafficDuration - baseDuration)
      : 0;
  const delaySeconds = Math.max(0, route.trafficDelaySeconds ?? computedDelay);

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
      anchor={
        selected
          ? { x: 0.9, y: 1 }
          : compact
          ? { x: 0.5, y: 1 }
          : { x: 0.88, y: 1 }
      }
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
  maneuver:
    | 'straight'
    | 'left'
    | 'right'
    | 'slight-left'
    | 'slight-right'
    | 'uturn'
    | 'arrive';
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

function isCoordinateNearRegion(coordinate: LatLng, region: Region) {
  const latitudeRadius = Math.max(region.latitudeDelta * 0.72, 0.004);
  const longitudeRadius = Math.max(region.longitudeDelta * 0.72, 0.004);
  return (
    Math.abs(coordinate.latitude - region.latitude) <= latitudeRadius &&
    Math.abs(coordinate.longitude - region.longitude) <= longitudeRadius
  );
}

function formatDistance(value?: number) {
  if (value === undefined || !Number.isFinite(value)) return '';
  if (value < 1000) return `${Math.max(1, Math.round(value))} m`;
  return `${(value / 1000).toFixed(value < 10000 ? 1 : 0)} km`;
}

type DistanceProximityTone = 'near' | 'local' | 'far';

function distanceProximity(value?: number): {
  label: string;
  shortLabel: string;
  tone: DistanceProximityTone;
} | null {
  if (value === undefined || !Number.isFinite(value)) return null;
  if (value <= NEARBY_RESULT_DISTANCE_METERS) {
    return { label: 'Gần bạn', shortLabel: 'Gần', tone: 'near' };
  }
  if (value <= LOCAL_RESULT_DISTANCE_METERS) {
    return { label: 'Trong khu vực', shortLabel: 'Khu vực', tone: 'local' };
  }
  return { label: 'Xa bạn', shortLabel: 'Xa', tone: 'far' };
}

function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return 'Dưới 1 phút';
  if (minutes < 60) return `${minutes} phút`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0
    ? `${hours} giờ ${remainingMinutes} phút`
    : `${hours} giờ`;
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

function isValidMapCoordinate(
  coordinate: LatLng | null | undefined,
): coordinate is LatLng {
  return Boolean(
    coordinate &&
      Number.isFinite(coordinate.latitude) &&
      Number.isFinite(coordinate.longitude) &&
      coordinate.latitude >= -90 &&
      coordinate.latitude <= 90 &&
      coordinate.longitude >= -180 &&
      coordinate.longitude <= 180 &&
      !(coordinate.latitude === 0 && coordinate.longitude === 0),
  );
}

function coordinateFromPageDetail(page: PagesItem): LatLng | null {
  const latitude = Number(page.lat);
  const longitude = Number(page.lng);
  const coordinate = { latitude, longitude };
  return isValidMapCoordinate(coordinate) ? coordinate : null;
}

function selectedPointFromNearbyPage(page: NearbyPlace): SelectedPoint | null {
  if (!isValidMapCoordinate(page.coordinate)) return null;

  return {
    id: page.id,
    source: 'page',
    placeId: page.placeId,
    title: page.name,
    subtitle: page.username ? `@${page.username}` : page.location || 'Page',
    address: page.location,
    avatarUrl: page.avatarUrl,
    url: page.url,
    showNameBadge: true,
    page,
    coordinate: page.coordinate,
    distanceMeters: page.distanceMeters,
    rating: page.rating,
    ratingsTotal: page.ratingsTotal,
    openNow: page.openNow,
    photoUrls: [page.coverUrl, page.avatarUrl].filter(Boolean) as string[],
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

      if (distance > SHARED_LOCATION_EXACT_PAGE_MATCH_METERS && !textMatched) {
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

function projectPointOnRouteSegment(point: LatLng, start: LatLng, end: LatLng) {
  const latitudeScale = 111320;
  const longitudeScale = Math.max(
    1,
    Math.abs(
      111320 *
        Math.cos(
          (((point.latitude + start.latitude + end.latitude) / 3) * Math.PI) /
            180,
        ),
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

  let nearest: {
    distanceMeters: number;
    fraction: number;
    point: LatLng;
    segmentEndIndex: number;
    segmentStartIndex: number;
  } | null = null;

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
    left && right && distanceMeters(left, right) <= toleranceMeters,
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
    const endIndex = stepEnd
      ? nearestRouteIndex(routePath, stepEnd)
      : startIndex;
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
        candidate.stepIndex > currentIndex && candidate.distanceAhead >= 8,
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
  return [
    instruction.label,
    instruction.detail || turnLabel(instruction.maneuver),
  ]
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
  const scanStartIndex = connectorDistance > ROUTE_CONNECTOR_MIN_METERS ? 2 : 1;
  let distanceAhead = scanStartIndex > 1 ? connectorDistance : 0;

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
        label: `${formatDistance(distanceAhead)} nữa ${turnLabel(
          maneuver,
        ).toLowerCase()}`,
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

function isHealthPlace(
  types?: string[],
  ...labels: Array<string | undefined | null>
) {
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

function getSuggestionDistanceMeters(item: SuggestionItem) {
  if (item.kind === 'page') {
    return item.page.distanceMeters ?? Number.POSITIVE_INFINITY;
  }

  return item.prediction.distanceMeters ?? Number.POSITIVE_INFINITY;
}

function getSuggestionTitle(item: SuggestionItem) {
  return item.kind === 'page' ? item.page.name : item.prediction.mainText;
}

function toSearchRankCandidate(item: SuggestionItem) {
  return {
    source: item.kind,
    title: getSuggestionTitle(item),
    aliases:
      item.kind === 'page' && item.page.username
        ? [item.page.username]
        : undefined,
    distanceMeters: getSuggestionDistanceMeters(item),
    pinned:
      item.kind === 'page'
        ? Boolean(item.page.isPinned || item.page.mapPinApproved)
        : false,
  } as const;
}

function sortSearchSuggestions(query: string) {
  return (left: SuggestionItem, right: SuggestionItem) =>
    compareMapSearchRankCandidates(
      query,
      toSearchRankCandidate(left),
      toSearchRankCandidate(right),
    );
}

function takeMixedSearchResults(items: SuggestionItem[], limit: number) {
  const hasPages = items.some(item => item.kind === 'page');
  const hasGooglePlaces = items.some(item => item.kind === 'google');
  if (!hasPages || !hasGooglePlaces) return items.slice(0, limit);

  const sourceLimit = Math.ceil(limit * 0.6);
  const selected: SuggestionItem[] = [];
  const deferred: SuggestionItem[] = [];
  let pageCount = 0;
  let googleCount = 0;

  items.forEach(item => {
    const sourceCount = item.kind === 'page' ? pageCount : googleCount;
    if (selected.length < limit && sourceCount < sourceLimit) {
      selected.push(item);
      if (item.kind === 'page') pageCount += 1;
      else googleCount += 1;
      return;
    }
    deferred.push(item);
  });

  deferred.forEach(item => {
    if (selected.length < limit) selected.push(item);
  });
  return selected;
}

function mergeSearchResultSets(...sets: SuggestionItem[][]) {
  const merged = new Map<string, SuggestionItem>();
  sets.forEach(items => {
    items.forEach(item => {
      merged.set(`${item.kind}:${item.id}`, item);
    });
  });
  return [...merged.values()];
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
  if (
    types.some(t =>
      [
        'restaurant',
        'food',
        'bakery',
        'bar',
        'meal_takeaway',
        'meal_delivery',
        'cafe',
      ].includes(t),
    )
  ) {
    return { Icon: Utensils, color: '#1E70E6', bg: '#EFF6FF' };
  }

  // 3. Store / Shopping / Supermarket
  if (
    types.some(t =>
      [
        'store',
        'shopping_mall',
        'clothing_store',
        'supermarket',
        'grocery_or_supermarket',
      ].includes(t),
    )
  ) {
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
  if (
    types.some(t =>
      [
        'bank',
        'atm',
        'local_government_office',
        'city_hall',
        'courthouse',
      ].includes(t),
    )
  ) {
    return { Icon: Landmark, color: '#059669', bg: '#ECFDF5' };
  }

  // 8. Hospital / Doctor / Health
  if (
    types.some(t =>
      ['hospital', 'doctor', 'health', 'pharmacy', 'dentist'].includes(t),
    )
  ) {
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

    const isFood = words.some(w =>
      [
        'an',
        'hang',
        'food',
        'restaurant',
        'com',
        'pho',
        'bun',
        'lau',
        'nuong',
        'banh',
        'buffet',
        'nha hang',
      ].includes(w),
    );
    if (isFood) {
      return { Icon: Utensils, color: '#ff9c40ff', bg: '#EFF6FF' };
    }

    const isSalon = words.some(w =>
      ['toc', 'salon', 'barber', 'spa', 'cat toc'].includes(w),
    );
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
    return (
      item.page.location ||
      (item.page.username ? `@${item.page.username}` : 'Page VNSEEA')
    );
  }
  return item.prediction.secondaryText || item.prediction.description;
}

function suggestionItemKey(item: SuggestionItem) {
  return `${item.kind}:${item.id}`;
}

function VnseeaPageBadge({
  logoUrl,
  onLogoError,
}: {
  logoUrl: string | null;
  onLogoError: () => void;
}) {
  return (
    <View accessibilityLabel="Page VNSEEA" style={styles.vnseeaPageBadge}>
      {logoUrl ? (
        <Image
          source={{ uri: logoUrl }}
          style={styles.vnseeaPageBadgeLogo}
          resizeMode="contain"
          onError={onLogoError}
        />
      ) : (
        <Text style={styles.vnseeaPageBadgeText}>VNSEEA</Text>
      )}
    </View>
  );
}

function TypeaheadSearchSkeleton({ compact }: { compact: boolean }) {
  const pulse = useRef(new Animated.Value(0.48)).current;
  const rowCount = compact ? 1 : 3;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 640,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.48,
          duration: 640,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => {
      loop.stop();
      pulse.stopAnimation();
    };
  }, [pulse]);

  return (
    <Animated.View
      accessibilityLabel="Đang tìm kiếm địa điểm"
      accessibilityLiveRegion="polite"
      style={[styles.typeaheadSkeletonGroup, { opacity: pulse }]}
    >
      {Array.from({ length: rowCount }, (_, index) => (
        <View
          key={`typeahead-skeleton:${index}`}
          style={styles.typeaheadSkeletonRow}
        >
          <View style={styles.typeaheadSkeletonLeading}>
            <View style={styles.typeaheadSkeletonIcon} />
            <View style={styles.typeaheadSkeletonDistance} />
          </View>
          <View style={styles.typeaheadSkeletonCopy}>
            <View
              style={[
                styles.typeaheadSkeletonLine,
                styles.typeaheadSkeletonTitle,
                index % 2 === 1 && styles.typeaheadSkeletonTitleShort,
              ]}
            />
            <View
              style={[
                styles.typeaheadSkeletonLine,
                styles.typeaheadSkeletonAddress,
                index % 2 === 0 && styles.typeaheadSkeletonAddressShort,
              ]}
            />
          </View>
        </View>
      ))}
    </Animated.View>
  );
}

function SearchSuggestionRow({
  item,
  query,
  vnseeaLogoUrl,
  onVnseeaLogoError,
  onPress,
}: {
  item: SuggestionItem;
  query: string;
  vnseeaLogoUrl: string | null;
  onVnseeaLogoError: () => void;
  onPress: () => void;
}) {
  const title =
    item.kind === 'page' ? item.page.name : item.prediction.mainText;
  const subtitle = suggestionSubtitle(item);
  const distanceMetersValue = getSuggestionDistanceMeters(item);
  const proximity = distanceProximity(distanceMetersValue);
  const distanceLabel = proximity
    ? `${proximity.shortLabel}\n${formatDistance(distanceMetersValue)}`
    : '';
  const placeStyle =
    item.kind === 'google'
      ? getPlaceIconAndColor(item.prediction.types, `${query} ${title}`)
      : getPlaceIconAndColor(
          undefined,
          `${query} ${title} ${item.page.category || ''}`,
        );
  const PlaceIcon =
    placeStyle.Icon === DefaultPlaceDotIcon ? MapPin : placeStyle.Icon;

  return (
    <TouchableOpacity
      activeOpacity={0.86}
      style={styles.typeaheadResultRow}
      onPress={onPress}
    >
      <View style={styles.typeaheadResultLeading}>
        <View
          style={[
            styles.typeaheadResultIcon,
            { backgroundColor: placeStyle.bg },
          ]}
        >
          <PlaceIcon size={22} color={placeStyle.color} />
        </View>
        {distanceLabel ? (
          <Text style={styles.typeaheadResultDistance} numberOfLines={2}>
            {distanceLabel}
          </Text>
        ) : null}
      </View>
      <View style={styles.typeaheadResultCopy}>
        <View style={styles.typeaheadResultTitleRow}>
          <Text style={styles.typeaheadResultTitle} numberOfLines={1}>
            {title}
          </Text>
          {item.kind === 'page' ? (
            <VnseeaPageBadge
              logoUrl={vnseeaLogoUrl}
              onLogoError={onVnseeaLogoError}
            />
          ) : null}
        </View>
        <Text style={styles.typeaheadResultAddress} numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      <CornerUpLeft size={22} color="#475569" />
    </TouchableOpacity>
  );
}

function SearchResultPhotoStrip({
  itemId,
  photoUrls,
}: {
  itemId: string;
  photoUrls: string[];
}) {
  const normalizedUrls = useMemo(
    () =>
      Array.from(
        new Set(
          photoUrls
            .map(url => String(url || '').trim())
            .filter(url => /^https?:\/\//i.test(url)),
        ),
      ).slice(0, 3),
    [photoUrls],
  );
  const normalizedUrlsKey = normalizedUrls.join('|');
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setFailedUrls(new Set());
  }, [itemId, normalizedUrlsKey]);

  const visibleUrls = normalizedUrls.filter(url => !failedUrls.has(url));
  if (visibleUrls.length === 0) return null;

  return (
    <ScrollView
      horizontal
      nestedScrollEnabled
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.resultPhotoList}
    >
      {visibleUrls.map((photoUrl, photoIndex) => (
        <Image
          key={`result-photo:${itemId}:${photoIndex}:${photoUrl}`}
          source={{ uri: photoUrl }}
          style={styles.resultPhoto}
          resizeMode="cover"
          onError={() => {
            setFailedUrls(current => {
              if (current.has(photoUrl)) return current;
              const next = new Set(current);
              next.add(photoUrl);
              return next;
            });
          }}
        />
      ))}
    </ScrollView>
  );
}

export default function NearbyUsersScreen() {
  const navigation = useNavigation<NearbyNav>();
  const route = useRoute<NearbyRoute>();
  const navigatorType = (
    navigation.getState?.() as { type?: string } | undefined
  )?.type;
  const isTabRoute = navigatorType === 'tab';
  const insets = useSafeAreaInsets();
  const { width: viewportWidth, height: viewportHeight } =
    useWindowDimensions();
  const stableViewportRef = useRef({
    width: viewportWidth,
    height: viewportHeight,
  });
  const viewportWidthChanged =
    Math.abs(stableViewportRef.current.width - viewportWidth) > 64;
  const searchSheetViewportHeight = viewportWidthChanged
    ? viewportHeight
    : Math.max(viewportHeight, stableViewportRef.current.height);

  useEffect(() => {
    if (
      viewportWidthChanged ||
      viewportHeight > stableViewportRef.current.height
    ) {
      stableViewportRef.current = {
        width: viewportWidth,
        height: viewportHeight,
      };
    }
  }, [viewportHeight, viewportWidth, viewportWidthChanged]);

  useFocusEffect(
    useCallback(() => {
      if (!isTabRoute) return undefined;
      if (Platform.OS !== 'ios') return undefined;

      tabBarVisibility.setVisible(false);
      iosPagerSwipeLock.setLocked(true);

      return () => {
        iosPagerSwipeLock.setLocked(false);
        tabBarVisibility.setVisible(true);
      };
    }, [isTabRoute]),
  );

  const handleBackPress = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.navigate(ROUTES.MAIN_TABS, {
      screen: ROUTES.MARKETPLACE,
    });
  }, [navigation]);
  const persistedMapLocation = useMemo(() => readLastMapLocation(), []);
  const persistedCoordinate = useMemo<LatLng | null>(() => {
    if (!persistedMapLocation) return null;
    return {
      latitude: persistedMapLocation.latitude,
      longitude: persistedMapLocation.longitude,
    };
  }, [persistedMapLocation]);
  const initialMapRegion = useMemo<Region>(
    () =>
      persistedCoordinate
        ? {
            ...persistedCoordinate,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          }
        : DEFAULT_REGION,
    [persistedCoordinate],
  );
  const {
    clearPlacePredictions,
    currentUser,
    getRoutes,
    isMapSearchLoading,
    loadNearbyPages,
    loadCurrentUser,
    nearbyPlaces,
    placePredictions,
    placePredictionsQuery,
    searchNearbyPagesAndPlaces,
    getPlaceDetails,
  } = useUserViewModel();
  const {
    logoUrl: vnseeaLogoUrl,
    imageErrorCount: vnseeaLogoErrorCount,
    notifyImageError: notifyVnseeaLogoError,
  } = useAuthBranding();
  const visibleVnseeaLogoUrl =
    vnseeaLogoErrorCount === 0 ? vnseeaLogoUrl : null;
  const messagesVm = useMessagesViewModel();
  const mapRef = useRef<MapView>(null);
  const currentLocationRef = useRef<LatLng | null>(persistedCoordinate);
  const hasLoadedNearbyPagesRef = useRef(false);
  const nearbyPagesOriginRef = useRef<LatLng | null>(null);
  const nearbyPagesOriginSourceRef = useRef<MapDiscoveryLocationSource | null>(
    null,
  );
  const nearbyPagesPendingOriginRef = useRef<LatLng | null>(null);
  const nearbyPagesPendingSourceRef = useRef<MapDiscoveryLocationSource | null>(
    null,
  );
  const nearbyPagesLoadedAtRef = useRef(0);
  const nearbyPagesRequestIdRef = useRef(0);
  const nearbyPagesCandidateRef = useRef<{
    coordinate: LatLng;
    observedAt: number;
  } | null>(null);
  const activeDestinationRef = useRef<LatLng | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const currentRegionRef = useRef<Region>(initialMapRegion);
  const [mapRegion, setMapRegion] = useState<Region>(initialMapRegion);
  const [searchResults, setSearchResults] = useState<SuggestionItem[]>([]);
  const [isSearchResultsVisible, setIsSearchResultsVisible] = useState(false);
  const [searchResultSort, setSearchResultSort] =
    useState<SearchResultSort>('relevance');
  const [searchResultsSheetSnap, setSearchResultsSheetSnap] =
    useState<SearchResultsSheetSnap>('peek');
  const [isSearchResultsScrollAtTop, setIsSearchResultsScrollAtTop] =
    useState(true);
  const searchResultsSheetTranslateY = useSharedValue(0);
  const searchResultsSheetDragStartTranslateY = useSharedValue(0);
  const searchResultsScrollRef = useRef<FlatList<SuggestionItem>>(null);
  const searchResultsScrollOffsetRef = useRef(0);
  const isSearchResultsScrollAtTopRef = useRef(true);
  const isSearchResultsPullCollapsingRef = useRef(false);
  // react-native-maps may dispatch the map-level press immediately after a
  // marker press. Keep the marker interaction from clearing the detail sheet
  // that was just opened.
  const lastMapMarkerPressAtRef = useRef(0);
  const itemOffsets = useRef<{ [key: string]: number }>({});
  const isNavigatingRef = useRef(false);
  const isAutoCenteringRef = useRef(true);
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
  const pageSelectionRequestIdRef = useRef(0);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchEffectRequestIdRef = useRef(0);
  const committedSearchRequestIdRef = useRef(0);
  const committedSearchQueryRef = useRef('');
  const wasSearchQueryActiveRef = useRef(false);
  const initialLocationRequestStartedRef = useRef(false);
  const prefetchedMarkerImagesRef = useRef(new Set<string>());
  const searchModeAnim = useRef(new Animated.Value(0)).current;
  const searchLayoutAnim = useRef(new Animated.Value(0)).current;
  const lastLocationStateRef = useRef<LatLng | null>(persistedCoordinate);
  const lastLocationStateUpdatedAtRef = useRef(0);
  const lastPersistedLocationAtRef = useRef(0);
  const lastHeadingStateRef = useRef<number | null>(null);
  const lastHeadingStateUpdatedAtRef = useRef(0);
  const lastSpeedStateRef = useRef<number | null>(null);
  const lastSpeedStateUpdatedAtRef = useRef(0);
  const lastDeviceHeadingStateRef = useRef<number | null>(null);
  const lastDeviceHeadingUpdatedAtRef = useRef(0);
  const [locationAllowed, setLocationAllowed] = useState(Platform.OS === 'ios');
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(
    persistedCoordinate,
  );
  const [isAutoCentering, setIsAutoCentering] = useState(true);
  const [userSpeed, setUserSpeed] = useState(0);
  const [locationSource, setLocationSource] = useState<LocationSource>(
    persistedCoordinate ? 'profile' : null,
  );
  const [currentHeading, setCurrentHeading] = useState(0);
  const [deviceHeading, setDeviceHeading] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isCommittedSearchLoading, setIsCommittedSearchLoading] =
    useState(false);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(
    null,
  );
  const [pageDetailPlace, setPageDetailPlace] = useState<NearbyPlace | null>(
    null,
  );
  const [pageDetail, setPageDetail] = useState<PagesItem | null>(null);
  const [isPageDetailLoading, setIsPageDetailLoading] = useState(false);
  const [resolvingPageId, setResolvingPageId] = useState<string | null>(null);
  const [isPageActionLoading, setIsPageActionLoading] = useState(false);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [placeDetailSheetSnap, setPlaceDetailSheetSnap] =
    useState<MapPlaceDetailSheetSnap>('peek');
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
  const [hasCenteredOnUser, setHasCenteredOnUser] = useState(
    Boolean(persistedCoordinate),
  );
  const [searchMessage, setSearchMessage] = useState('');
  const setNavigationAutoCentering = useCallback((enabled: boolean) => {
    isAutoCenteringRef.current = enabled;
    setIsAutoCentering(enabled);
  }, []);
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

  const typeaheadOverlayStyle = useMemo(
    () => [
      styles.typeaheadOverlay,
      {
        paddingTop: Platform.OS === 'ios' ? insets.top + 76 : 88,
        paddingBottom: Math.max(insets.bottom, 8),
      },
    ],
    [insets.bottom, insets.top],
  );

  const searchResultsSheetHeights = useMemo(() => {
    const expandedTopClearance = Math.max(
      insets.top + 12,
      Platform.OS === 'android' ? 44 : 56,
    );
    const expanded = Math.max(
      360,
      searchSheetViewportHeight - expandedTopClearance,
    );
    const peek = Math.min(
      Math.max(searchSheetViewportHeight * 0.36, 210),
      expanded - 140,
    );
    const half = Math.min(
      Math.max(searchSheetViewportHeight * 0.58, peek + 96),
      expanded - 72,
    );

    return { peek, half, expanded };
  }, [insets.top, searchSheetViewportHeight]);

  const commitSearchResultsSheetSnap = useCallback(
    (snap: SearchResultsSheetSnap) => {
      if (snap === 'expanded') {
        isSearchResultsPullCollapsingRef.current = false;
      }
      if (snap !== 'expanded') {
        searchResultsScrollOffsetRef.current = 0;
        if (!isSearchResultsScrollAtTopRef.current) {
          isSearchResultsScrollAtTopRef.current = true;
          setIsSearchResultsScrollAtTop(true);
        }
        searchResultsScrollRef.current?.scrollToOffset({
          offset: 0,
          animated: false,
        });
      }

      setSearchResultsSheetSnap(snap);
    },
    [],
  );

  const openSearchResultsSheet = useCallback(() => {
    searchResultsScrollOffsetRef.current = 0;
    isSearchResultsScrollAtTopRef.current = true;
    isSearchResultsPullCollapsingRef.current = false;
    setIsSearchResultsScrollAtTop(true);
    searchResultsScrollRef.current?.scrollToOffset({
      offset: 0,
      animated: false,
    });
    cancelAnimation(searchResultsSheetTranslateY);
    searchResultsSheetTranslateY.value =
      searchResultsSheetHeights.expanded - searchResultsSheetHeights.peek;
    setSearchResultsSheetSnap('peek');
  }, [
    searchResultsSheetHeights.expanded,
    searchResultsSheetHeights.peek,
    searchResultsSheetTranslateY,
  ]);

  const collapseExpandedSearchResultsFromListPull = useCallback(() => {
    if (
      Platform.OS !== 'ios' ||
      searchResultsSheetSnap !== 'expanded' ||
      isSearchResultsPullCollapsingRef.current
    ) {
      return;
    }

    isSearchResultsPullCollapsingRef.current = true;
    commitSearchResultsSheetSnap('half');
    searchResultsSheetTranslateY.value = withSpring(
      searchResultsSheetHeights.expanded - searchResultsSheetHeights.half,
      SEARCH_RESULTS_SHEET_SPRING,
    );
  }, [
    commitSearchResultsSheetSnap,
    searchResultsSheetHeights.expanded,
    searchResultsSheetHeights.half,
    searchResultsSheetSnap,
    searchResultsSheetTranslateY,
  ]);

  useEffect(
    () => () => {
      cancelAnimation(searchResultsSheetTranslateY);
    },
    [searchResultsSheetTranslateY],
  );

  const searchResultsSheetGestures = useMemo(() => {
    const snapOffsets = [
      searchResultsSheetHeights.expanded - searchResultsSheetHeights.peek,
      searchResultsSheetHeights.expanded - searchResultsSheetHeights.half,
      0,
    ];
    const currentIndex = SEARCH_RESULTS_SHEET_SNAPS.indexOf(
      searchResultsSheetSnap,
    );

    const createSheetGesture = (enabled: boolean, downwardOnly = false) => {
      const gesture = Gesture.Pan().enabled(enabled);
      if (downwardOnly) {
        gesture.activeOffsetY(6).failOffsetY(-6);
      } else {
        gesture.activeOffsetY([-6, 6]);
      }

      return gesture
        .failOffsetX([-24, 24])
        .onBegin(() => {
          'worklet';
          cancelAnimation(searchResultsSheetTranslateY);
          searchResultsSheetDragStartTranslateY.value =
            searchResultsSheetTranslateY.value;
        })
        .onUpdate(event => {
          'worklet';
          searchResultsSheetTranslateY.value = Math.max(
            0,
            Math.min(
              snapOffsets[0],
              searchResultsSheetDragStartTranslateY.value + event.translationY,
            ),
          );
        })
        .onEnd(event => {
          'worklet';
          const releasedTranslateY = searchResultsSheetTranslateY.value;
          let targetIndex = snapOffsets.reduce(
            (nearestIndex, offset, index) =>
              Math.abs(offset - releasedTranslateY) <
              Math.abs(snapOffsets[nearestIndex] - releasedTranslateY)
                ? index
                : nearestIndex,
            0,
          );

          if (event.velocityY < -SEARCH_RESULTS_SHEET_FLING_VELOCITY) {
            targetIndex = Math.max(
              targetIndex,
              Math.min(currentIndex + 1, SEARCH_RESULTS_SHEET_SNAPS.length - 1),
            );
          } else if (event.velocityY > SEARCH_RESULTS_SHEET_FLING_VELOCITY) {
            targetIndex = Math.min(targetIndex, Math.max(currentIndex - 1, 0));
          }

          if (downwardOnly) {
            targetIndex = Math.max(targetIndex, currentIndex - 1);
          }

          const targetSnap =
            targetIndex === 0
              ? 'peek'
              : targetIndex === 1
              ? 'half'
              : 'expanded';
          searchResultsSheetTranslateY.value = withSpring(
            snapOffsets[targetIndex],
            SEARCH_RESULTS_SHEET_SPRING,
          );
          runOnJS(commitSearchResultsSheetSnap)(targetSnap);
        });
    };

    return {
      header: createSheetGesture(true),
      body: createSheetGesture(
        searchResultsSheetSnap !== 'expanded' ||
          (Platform.OS !== 'ios' && isSearchResultsScrollAtTop),
        searchResultsSheetSnap === 'expanded',
      ),
    };
  }, [
    commitSearchResultsSheetSnap,
    isSearchResultsScrollAtTop,
    searchResultsSheetDragStartTranslateY,
    searchResultsSheetHeights,
    searchResultsSheetSnap,
    searchResultsSheetTranslateY,
  ]);

  const searchResultsPanelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: searchResultsSheetTranslateY.value }],
  }));

  const searchResultsPanelStyle = useMemo(
    () => [
      styles.searchResultsPanel,
      {
        height: searchResultsSheetHeights.expanded,
        paddingBottom: Math.max(insets.bottom, 10),
      },
    ],
    [insets.bottom, searchResultsSheetHeights.expanded],
  );
  const locateButtonWithSearchStyle = useMemo(
    () => ({
      bottom: Math.min(
        searchResultsSheetHeights[searchResultsSheetSnap] + 18,
        searchSheetViewportHeight - 86,
      ),
    }),
    [
      searchResultsSheetHeights,
      searchResultsSheetSnap,
      searchSheetViewportHeight,
    ],
  );
  const placeDetailSheetHeights = useMemo(
    () =>
      getMapPlaceDetailSheetHeights(viewportHeight, insets.top, insets.bottom),
    [insets.bottom, insets.top, viewportHeight],
  );
  const locateButtonWithPlaceDetailStyle = useMemo(
    () => ({
      bottom: Math.min(
        placeDetailSheetHeights[placeDetailSheetSnap] + 18,
        viewportHeight - 86,
      ),
    }),
    [placeDetailSheetHeights, placeDetailSheetSnap, viewportHeight],
  );
  const selectedPlaceMapControlStyles = useMemo(() => {
    const locateBottom = placeDetailSheetHeights.peek + 18;
    return {
      locate: { bottom: locateBottom },
      compass: { bottom: locateBottom + 62 },
      zoomOut: { bottom: locateBottom + 124 },
      zoomIn: { bottom: locateBottom + 186 },
      fullScreen: { bottom: locateBottom + 248 },
    };
  }, [placeDetailSheetHeights.peek]);
  const shouldShowSelectedPlaceMapControls =
    !selectedPoint || isSheetCollapsed || placeDetailSheetSnap === 'peek';

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
    if (normalizedQuery.length < LOCAL_SEARCH_MIN_LENGTH) return [];

    // Filter local Pages matching search keyword
    const pageSuggestions = nearbyPlaces
      .filter(page => {
        const haystack = normalizeSearchText(
          [page.name, page.username, page.location].filter(Boolean).join(' '),
        );
        return haystack.includes(normalizedQuery);
      })
      .map(page => ({
        id: page.id,
        kind: 'page' as const,
        page,
      }));

    // Map Google map autocomplete predictions
    const googleSuggestions: SuggestionItem[] =
      normalizedQuery.length >= REMOTE_SEARCH_MIN_LENGTH &&
      normalizeSearchText(placePredictionsQuery) === normalizedQuery
        ? placePredictions.map(pred => ({
            id: pred.placeId,
            kind: 'google' as const,
            prediction: pred,
          }))
        : [];

    return takeMixedSearchResults(
      [...pageSuggestions, ...googleSuggestions].sort(
        sortSearchSuggestions(query),
      ),
      15,
    );
  }, [nearbyPlaces, placePredictions, placePredictionsQuery, query]);

  const nearbyTypeaheadResults = useMemo<SuggestionItem[]>(
    () =>
      nearbyPlaces
        .filter(page => page.source !== 'google')
        .map(page => ({ id: page.id, kind: 'page' as const, page }))
        .sort(
          (left, right) =>
            getSuggestionDistanceMeters(left) -
            getSuggestionDistanceMeters(right),
        )
        .slice(0, 15),
    [nearbyPlaces],
  );

  const displayedSearchResults = useMemo(() => {
    const items =
      searchResultSort === 'pages'
        ? searchResults.filter(item => item.kind === 'page')
        : [...searchResults];

    if (searchResultSort === 'distance') {
      return items
        .sort(
          (left, right) =>
            getSuggestionDistanceMeters(left) -
            getSuggestionDistanceMeters(right),
        )
        .slice(0, MAX_COMMITTED_SEARCH_RESULTS);
    }

    return takeMixedSearchResults(
      items.sort(sortSearchSuggestions(query)),
      MAX_COMMITTED_SEARCH_RESULTS,
    );
  }, [query, searchResultSort, searchResults]);

  const selectedPlaceSuggestionItems = useMemo<SuggestionItem[]>(() => {
    if (!selectedPoint || selectedPoint.source !== 'google') return [];

    const selectedGoogleId = String(
      selectedPoint.placeId || selectedPoint.id.replace(/^google:/, ''),
    );

    return mergeSearchResultSets(
      displayedSearchResults,
      nearbyTypeaheadResults,
      suggestions,
    )
      .filter(item => {
        if (item.kind === 'google') {
          return item.prediction.placeId !== selectedGoogleId;
        }
        return item.page.id !== selectedPoint.id;
      })
      .sort(
        (left, right) =>
          getSuggestionDistanceMeters(left) -
          getSuggestionDistanceMeters(right),
      )
      .slice(0, 4);
  }, [
    displayedSearchResults,
    nearbyTypeaheadResults,
    selectedPoint,
    suggestions,
  ]);

  const selectedPlaceSuggestions = useMemo<MapPlaceDetailSheetSuggestion[]>(
    () =>
      selectedPlaceSuggestionItems.map(item => ({
        id: suggestionItemKey(item),
        source: item.kind,
        title: item.kind === 'page' ? item.page.name : item.prediction.mainText,
        subtitle: suggestionSubtitle(item),
        distanceText: formatDistance(getSuggestionDistanceMeters(item)),
        rating:
          item.kind === 'page' ? item.page.rating : item.prediction.rating,
      })),
    [selectedPlaceSuggestionItems],
  );

  const searchDistanceSummary = useMemo(() => {
    const counts = displayedSearchResults.reduce(
      (summary, item) => {
        const proximity = distanceProximity(getSuggestionDistanceMeters(item));
        if (proximity) summary[proximity.tone] += 1;
        return summary;
      },
      { near: 0, local: 0, far: 0 },
    );
    const parts = [
      counts.near > 0 ? `${counts.near} gần` : '',
      counts.local > 0 ? `${counts.local} trong khu vực` : '',
      counts.far > 0 ? `${counts.far} xa` : '',
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(' · ') : '';
  }, [displayedSearchResults]);

  const typeaheadResults = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return nearbyTypeaheadResults;

    const category = getGoogleCategorySearchQuery(query);
    const compatiblePreviousResults = searchResults.filter(item => {
      if (item.kind === 'page') {
        return normalizeSearchText(
          [item.page.name, item.page.username, item.page.location]
            .filter(Boolean)
            .join(' '),
        ).includes(normalizedQuery);
      }

      const textMatches = normalizeSearchText(
        [
          item.prediction.mainText,
          item.prediction.secondaryText,
          item.prediction.description,
        ]
          .filter(Boolean)
          .join(' '),
      ).includes(normalizedQuery);
      return (
        textMatches ||
        Boolean(category && item.prediction.types?.includes(category))
      );
    });

    return takeMixedSearchResults(
      mergeSearchResultSets(suggestions, compatiblePreviousResults).sort(
        sortSearchSuggestions(query),
      ),
      20,
    );
  }, [nearbyTypeaheadResults, query, searchResults, suggestions]);

  const isSearchMode = isSearchFocused;
  // The typeahead overlay only owns focused input. After submit, keep the
  // search chrome expanded while returning the map and the draggable results
  // sheet underneath it.
  const isSearchChromeExpanded = isSearchFocused || isSearchResultsVisible;
  const activeSearchListResults = isSearchFocused
    ? typeaheadResults
    : displayedSearchResults;
  const isSearchListLoading = isMapSearchLoading || isCommittedSearchLoading;
  const hasRetainedSearchResults =
    !isSearchMode &&
    normalizeSearchText(committedSearchQueryRef.current) ===
      normalizeSearchText(query) &&
    query.trim().length >= REMOTE_SEARCH_MIN_LENGTH &&
    searchResults.length > 0;
  const shouldShowSearchResultMarkers =
    !isSearchMode && (isSearchResultsVisible || hasRetainedSearchResults);
  const shouldShowNearbyPageMarkers =
    !isSearchMode && !shouldShowSearchResultMarkers;

  useEffect(() => {
    const toValue = isSearchChromeExpanded ? 1 : 0;

    Animated.parallel([
      Animated.timing(searchModeAnim, {
        toValue,
        duration: isSearchChromeExpanded ? 260 : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(searchLayoutAnim, {
        toValue,
        duration: isSearchChromeExpanded ? 260 : 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]).start();
  }, [isSearchChromeExpanded, searchLayoutAnim, searchModeAnim]);

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

    const markersInsideViewport = pageMarkers.filter(item =>
      isCoordinateNearRegion(item.coordinate, mapRegion),
    );
    const markerCandidates =
      markersInsideViewport.length > 0 ? markersInsideViewport : pageMarkers;
    // Preserve the API order. Re-sorting on every GPS fix changed marker
    // indexes, label modes and native marker snapshots, which looked like
    // Page pins were jumping even though their stored coordinate was stable.
    return markerCandidates.slice(0, MAX_VISIBLE_PAGE_MARKERS);
  }, [mapRegion, pageMarkers]);

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
      const avatarUrl = place.avatarUrl;
      if (!avatarUrl || prefetchedMarkerImagesRef.current.has(avatarUrl))
        return;
      prefetchedMarkerImagesRef.current.add(avatarUrl);
      Image.prefetch(avatarUrl).catch(() => {
        prefetchedMarkerImagesRef.current.delete(avatarUrl);
      });
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
        selectedPoint.photoUrls?.[0] ||
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
            selectedPoint?.photoUrls?.[0] ||
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
  const activePageDetail =
    pageDetail ??
    (pageDetailPlace ? pageFromNearbyPlace(pageDetailPlace) : null);
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
  // Search results and place details are independent sheets. A route preview
  // or active navigation temporarily takes over the bottom of the screen, but
  // the committed search session stays alive so the results sheet can return
  // when directions are closed.
  const shouldShowSearchResultsSheet =
    isSearchResultsVisible &&
    !isSearchMode &&
    !selectedPoint &&
    !isFullScreen &&
    !isRoutePreview &&
    !isNavigating;
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
    if (selectedPoint?.source !== 'google' || !selectedPoint.placeId) {
      return;
    }

    let cancelled = false;
    const selectedId = selectedPoint.id;
    getPlaceDetails(selectedPoint.placeId)
      .then(details => {
        if (cancelled || !details) return;
        setSelectedPoint(current => {
          if (!current || current.id !== selectedId) return current;

          return {
            ...current,
            title: details.name || current.title,
            subtitle: details.location || current.subtitle,
            address: details.location || current.address,
            url: details.url || current.url,
            coordinate: details.coordinate || current.coordinate,
            types: details.types?.length ? details.types : current.types,
            icon: details.icon || current.icon,
            iconBackgroundColor:
              details.iconBackgroundColor || current.iconBackgroundColor,
            rating: details.rating ?? current.rating,
            ratingsTotal: details.ratingsTotal ?? current.ratingsTotal,
            openNow: details.openNow ?? current.openNow,
            photoUrls: details.photoUrls ?? [],
            reviews: details.reviews ?? [],
            editorialSummary: details.editorialSummary,
            phoneNumber: details.phoneNumber,
            website: details.website,
            weekdayText: details.weekdayText ?? [],
            businessStatus: details.businessStatus,
            priceLevel: details.priceLevel,
          };
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [
    getPlaceDetails,
    selectedPoint?.id,
    selectedPoint?.placeId,
    selectedPoint?.source,
  ]);

  const selectedPageDetailPageId =
    selectedPoint?.source === 'page' && selectedPoint.page
      ? String(
          selectedPoint.page.pageId ||
            selectedPoint.page.id.replace(/^page:/, ''),
        ).trim()
      : '';
  const selectedPageDetailPointId =
    selectedPoint?.source === 'page' ? selectedPoint.id : '';

  useEffect(() => {
    if (!selectedPageDetailPageId || !selectedPageDetailPointId) return;

    let cancelled = false;
    const pageId = selectedPageDetailPageId;
    const selectedId = selectedPageDetailPointId;

    pagesRepository
      .getPageDetail({ pageId })
      .then(fullPage => {
        if (cancelled) return;

        const detailCoordinate = coordinateFromPageDetail(fullPage);
        setSelectedPoint(current => {
          if (
            !current ||
            current.id !== selectedId ||
            current.source !== 'page' ||
            !current.page
          ) {
            return current;
          }

          const hydratedPage: NearbyPlace = {
            ...current.page,
            pageId: fullPage.pageId || current.page.pageId,
            name: fullPage.pageTitle || current.page.name,
            username: fullPage.pageName || current.page.username,
            description: fullPage.pageDescription || current.page.description,
            category: fullPage.pageCategory || current.page.category,
            location: fullPage.address || current.page.location,
            placeId: fullPage.placeId || current.page.placeId,
            coordinate: detailCoordinate || current.page.coordinate,
            avatarUrl: fullPage.avatar || current.page.avatarUrl,
            coverUrl: fullPage.cover || current.page.coverUrl,
            url: fullPage.url || current.page.url,
            likes: fullPage.likes ?? current.page.likes,
            followersCount:
              fullPage.followersCount ?? current.page.followersCount,
            postCount: fullPage.postCount ?? current.page.postCount,
            rating: fullPage.ratingAverage ?? current.page.rating,
            ratingsTotal: fullPage.ratingCount ?? current.page.ratingsTotal,
            isFollowing: fullPage.isFollowing ?? current.page.isFollowing,
            isLiked: fullPage.isLiked ?? current.page.isLiked,
            ownerId:
              fullPage.ownerId || fullPage.owner?.id || current.page.ownerId,
            ownerName: fullPage.owner?.name || current.page.ownerName,
            ownerUsername:
              fullPage.owner?.username || current.page.ownerUsername,
            ownerAvatarUrl:
              fullPage.owner?.avatarUrl || current.page.ownerAvatarUrl,
          };
          const photoUrls = Array.from(
            new Set(
              [hydratedPage.coverUrl, hydratedPage.avatarUrl].filter(
                Boolean,
              ) as string[],
            ),
          );

          return {
            ...current,
            placeId: hydratedPage.placeId || current.placeId,
            title: hydratedPage.name || current.title,
            subtitle: hydratedPage.username
              ? `@${hydratedPage.username}`
              : hydratedPage.location || current.subtitle,
            address: hydratedPage.location || current.address,
            avatarUrl: hydratedPage.avatarUrl || current.avatarUrl,
            url: hydratedPage.url || current.url,
            coordinate: detailCoordinate || current.coordinate,
            rating: hydratedPage.rating ?? current.rating,
            ratingsTotal: hydratedPage.ratingsTotal ?? current.ratingsTotal,
            photoUrls,
            page: hydratedPage,
          };
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [selectedPageDetailPageId, selectedPageDetailPointId]);

  useEffect(() => {
    if (selectedPoint && searchResultsScrollRef.current) {
      const matched = displayedSearchResults.find(
        item =>
          item.id === selectedPoint.id ||
          `google:${item.id}` === selectedPoint.id ||
          (selectedPoint.source === 'google' &&
            item.kind === 'google' &&
            selectedPoint.id.replace('google:', '') ===
              item.prediction.placeId),
      );
      if (matched) {
        const yOffset = itemOffsets.current[matched.id];
        if (typeof yOffset === 'number') {
          searchResultsScrollRef.current.scrollToOffset({
            offset: Math.max(0, yOffset - 10),
            animated: true,
          });
        }
      }
    }
  }, [displayedSearchResults, selectedPoint]);

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
    setNavigationAutoCentering(false);
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
  }, [setNavigationAutoCentering]);

  const clearSelectedPoint = useCallback(() => {
    setSelectedPoint(null);
    setIsSheetCollapsed(false);
    setPlaceDetailSheetSnap('peek');
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
    if (
      !isNavigating ||
      !shouldShowRoute ||
      !isAutoCentering ||
      !isAutoCenteringRef.current
    ) {
      return;
    }

    const location = currentLocationRef.current;
    if (!location) return;

    const now = Date.now();
    const last = lastNavigationCameraHeadingRef.current;
    const movedMeters =
      last.center === null ? Infinity : distanceMeters(last.center, location);
    const cameraCenter = navigationCameraCenter(location, activeRoute);
    const nextRouteHeading =
      activeDestination !== null
        ? navigationRouteHeading(location, activeRoute, activeDestination)
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
      setNavigationAutoCentering(true);
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
    setNavigationAutoCentering,
    shouldShowRoute,
    userSpeed,
  ]);

  const disableNavigationAutoCentering = useCallback(() => {
    if (isNavigatingRef.current && isAutoCenteringRef.current) {
      setNavigationAutoCentering(false);
    }
  }, [setNavigationAutoCentering]);

  const handleRegionChangeStart = useCallback(
    (_region: Region, details: Details) => {
      if (details?.isGesture) {
        disableNavigationAutoCentering();
      }
    },
    [disableNavigationAutoCentering],
  );

  const handleRegionChangeComplete = useCallback(
    (region: Region, details: Details) => {
      currentRegionRef.current = region;
      setMapRegion(region);
      if (details?.isGesture) {
        disableNavigationAutoCentering();
      }
    },
    [disableNavigationAutoCentering],
  );

  const handleZoomIn = useCallback(() => {
    disableNavigationAutoCentering();
    const current = currentRegionRef.current;
    mapRef.current?.animateToRegion(
      {
        ...current,
        latitudeDelta: current.latitudeDelta / 2,
        longitudeDelta: current.longitudeDelta / 2,
      },
      260,
    );
  }, [disableNavigationAutoCentering]);

  const handleZoomOut = useCallback(() => {
    disableNavigationAutoCentering();
    const current = currentRegionRef.current;
    mapRef.current?.animateToRegion(
      {
        ...current,
        latitudeDelta: current.latitudeDelta * 2,
        longitudeDelta: current.longitudeDelta * 2,
      },
      260,
    );
  }, [disableNavigationAutoCentering]);

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
    async (
      location: LatLng,
      options?: {
        source?: MapDiscoveryLocationSource;
        accuracy?: number;
        force?: boolean;
      },
    ) => {
      const source = options?.source ?? 'gps';
      const now = Date.now();
      const currentOrigin =
        nearbyPagesPendingOriginRef.current ?? nearbyPagesOriginRef.current;
      const currentSource =
        nearbyPagesPendingSourceRef.current ??
        nearbyPagesOriginSourceRef.current;
      const shouldReload = shouldReloadNearbyPages({
        currentOrigin,
        currentSource,
        nextOrigin: location,
        nextSource: source,
        nextAccuracy: options?.accuracy,
        lastLoadedAt: nearbyPagesLoadedAtRef.current,
        now,
        force: options?.force,
      });
      if (!shouldReload) return;

      const isGpsRelocation =
        !options?.force &&
        source === 'gps' &&
        currentSource === 'gps' &&
        currentOrigin !== null &&
        mapDiscoveryDistanceMeters(currentOrigin, location) >=
          DISCOVERY_RELOAD_DISTANCE_METERS;

      if (isGpsRelocation) {
        const candidate = nearbyPagesCandidateRef.current;
        if (
          !candidate ||
          mapDiscoveryDistanceMeters(candidate.coordinate, location) >
            DISCOVERY_RELOCATION_CONFIRM_RADIUS_METERS
        ) {
          nearbyPagesCandidateRef.current = {
            coordinate: location,
            observedAt: now,
          };
          return;
        }
        if (now - candidate.observedAt < DISCOVERY_RELOCATION_CONFIRM_MS) {
          return;
        }
      }

      nearbyPagesCandidateRef.current = null;
      const requestId = ++nearbyPagesRequestIdRef.current;
      nearbyPagesPendingOriginRef.current = location;
      nearbyPagesPendingSourceRef.current = source;
      hasLoadedNearbyPagesRef.current = true;

      try {
        await loadNearbyPages({
          lat: location.latitude,
          lng: location.longitude,
          limit: 10,
        });
        if (requestId !== nearbyPagesRequestIdRef.current) return;
        nearbyPagesPendingOriginRef.current = null;
        nearbyPagesPendingSourceRef.current = null;
        nearbyPagesOriginRef.current = location;
        nearbyPagesOriginSourceRef.current = source;
        nearbyPagesLoadedAtRef.current = Date.now();
      } catch (caughtError) {
        if (requestId === nearbyPagesRequestIdRef.current) {
          nearbyPagesPendingOriginRef.current = null;
          nearbyPagesPendingSourceRef.current = null;
        }
        if (
          requestId === nearbyPagesRequestIdRef.current &&
          nearbyPagesOriginRef.current === null
        ) {
          hasLoadedNearbyPagesRef.current = false;
        }
        throw caughtError;
      }
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
      moveCamera = true,
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
      if (navigating && moveCamera) {
        setNavigationAutoCentering(true);
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
        if (moveCamera) {
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
              if (
                !isNavigatingRef.current ||
                !isAutoCenteringRef.current ||
                !activeDestinationRef.current ||
                !isSameCoordinate(activeDestinationRef.current, destination)
              ) {
                return;
              }
              mapRef.current?.animateCamera(navigationCamera, { duration: 220 });
            }, 700);
          }
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
            console.log(
              '[NavigationSpeech] first instruction:',
              firstSpeechText,
            );
            speakNavigationInstruction(firstSpeechText);
          }
        }
        return;
      }

      setRouteHeading(null);
      if (navigationPath.length > 1 && moveCamera) {
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
    [setNavigationAutoCentering, voiceGuidanceEnabled],
  );

  const selectRouteOption = useCallback(
    (route: RouteOption, navigating = isNavigating) => {
      if (!selectedPoint) return;
      const moveCamera =
        !navigating ||
        !isNavigatingRef.current ||
        isAutoCenteringRef.current;
      focusRoute(
        route,
        selectedPoint.coordinate,
        navigating,
        selectedPoint.title,
        650,
        moveCamera,
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
      Array.from({ length: 4 }, (_, index) =>
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
          .map(
            (route, index): RouteOption => ({
              ...route,
              id: route.id || `route-${index + 1}`,
              path: normalizeRoutePath(route.path, origin, destination),
            }),
          )
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
        const moveCamera =
          !navigating ||
          !isNavigatingRef.current ||
          isAutoCenteringRef.current;
        focusRoute(
          nextOptions[0],
          destination,
          navigating,
          destinationTitle,
          source === 'auto' ? 220 : 650,
          moveCamera,
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
      setPlaceDetailSheetSnap('peek');
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
        loadRouteOptions(point.coordinate, false, point.title).catch(
          () => undefined,
        );
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

    const locationKey = `${latitude.toFixed(6)}:${longitude.toFixed(6)}:${
      sharedLocation.title
    }`;
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
      photoUrls: sharedLocation.imageUrl ? [sharedLocation.imageUrl] : [],
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

          const matchedPage = findPageForSharedLocation(sharedLocation, pages);
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
            radius: MAP_COMMITTED_SEARCH_RADIUS_METERS,
            limit: 20,
            fast: true,
            globalSearch: true,
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
    loadRouteOptions(pendingPoint.coordinate, false, pendingPoint.title).catch(
      () => undefined,
    );
  }, [currentLocation, loadRouteOptions]);

  const openPageDetailForNearbyPlace = useCallback(
    (page: NearbyPlace, fullPage?: PagesItem) => {
      const requestId = pageDetailRequestIdRef.current + 1;
      pageDetailRequestIdRef.current = requestId;

      const initialPage = fullPage ?? pageFromNearbyPlace(page);
      setPageDetailPlace(page);
      setPageDetail(initialPage);
      setIsPageDetailLoading(Boolean(!fullPage && initialPage.pageId));

      if (!fullPage && initialPage.pageId) {
        pagesRepository
          .getPageDetail({ pageId: initialPage.pageId })
          .then(loadedPage => {
            if (pageDetailRequestIdRef.current === requestId) {
              setPageDetail(loadedPage);
            }
          })
          .catch(() => undefined)
          .finally(() => {
            if (pageDetailRequestIdRef.current === requestId) {
              setIsPageDetailLoading(false);
            }
          });
      }
    },
    [],
  );

  const selectPage = useCallback(
    async (
      page: NearbyPlace,
      options: { shouldRoute?: boolean } = {},
    ): Promise<SelectedPoint | null> => {
      const shouldRoute = options.shouldRoute === true;
      const requestId = pageSelectionRequestIdRef.current + 1;
      pageSelectionRequestIdRef.current = requestId;
      const existingPoint = selectedPointFromNearbyPage(page);
      if (existingPoint) {
        selectPoint(existingPoint, shouldRoute);
        setResolvingPageId(null);
        return existingPoint;
      }

      setResolvingPageId(page.id);

      let fullPage: PagesItem | undefined;
      let hydratedPage = page;

      try {
        if (page.pageId) {
          try {
            fullPage = await pagesRepository.getPageDetail({
              pageId: page.pageId,
            });
          } catch {
            fullPage = undefined;
          }

          if (requestId !== pageSelectionRequestIdRef.current) return null;

          if (fullPage) {
            const detailCoordinate = coordinateFromPageDetail(fullPage);
            hydratedPage = {
              ...page,
              name: fullPage.pageTitle || page.name,
              username: fullPage.pageName || page.username,
              location: fullPage.address || page.location,
              placeId: fullPage.placeId || page.placeId,
              avatarUrl: fullPage.avatar || page.avatarUrl,
              coverUrl: fullPage.cover || page.coverUrl,
              url: fullPage.url || page.url,
              coordinate: detailCoordinate || page.coordinate,
            };
          }
        }

        if (
          !isValidMapCoordinate(hydratedPage.coordinate) &&
          hydratedPage.placeId
        ) {
          const placeDetails = await getPlaceDetails(hydratedPage.placeId);
          if (requestId !== pageSelectionRequestIdRef.current) return null;
          if (placeDetails?.coordinate) {
            hydratedPage = {
              ...hydratedPage,
              coordinate: placeDetails.coordinate,
              location: placeDetails.location || hydratedPage.location,
            };
          }
        }

        const pagePoint = selectedPointFromNearbyPage(hydratedPage);
        if (pagePoint) {
          selectPoint(pagePoint, shouldRoute);
          return pagePoint;
        }

        openPageDetailForNearbyPlace(page, fullPage);
        if (shouldRoute) {
          Alert.alert(
            'Page chưa có vị trí chính xác',
            'Trang này chưa được ghim tọa độ hợp lệ nên chưa thể chỉ đường. Bạn vẫn có thể mở chi tiết để kiểm tra địa chỉ.',
          );
        }
        return null;
      } finally {
        if (requestId === pageSelectionRequestIdRef.current) {
          setResolvingPageId(null);
        }
      }
    },
    [getPlaceDetails, openPageDetailForNearbyPlace, selectPoint],
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
        placeId: event.nativeEvent.placeId,
        title: event.nativeEvent.name || 'Địa điểm',
        subtitle: formatCoordinate(coordinate),
        address: event.nativeEvent.name || 'Địa điểm',
        coordinate,
        types: [],
      });
    },
    [selectPoint],
  );

  const handlePerformSearch = useCallback(
    async (keyword: string) => {
      const trimmed = keyword.trim();
      if (trimmed.length < REMOTE_SEARCH_MIN_LENGTH) return;

      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
      const requestId = ++committedSearchRequestIdRef.current;
      committedSearchQueryRef.current = trimmed;
      searchEffectRequestIdRef.current += 1;
      setIsSearchFocused(false);
      Keyboard.dismiss();
      setIsCommittedSearchLoading(true);
      setSelectedPoint(null);
      resetRouteState();
      setSearchResultSort('relevance');
      setIsSearchResultsVisible(true);
      openSearchResultsSheet();
      setSearchMessage('');
      const submittedTypeaheadResults = typeaheadResults;
      setSearchResults(submittedTypeaheadResults);
      let latestCombinedResults = submittedTypeaheadResults;

      try {
        const current = currentLocationRef.current;
        const searchLat = current?.latitude;
        const searchLng = current?.longitude;
        const searchOrigin =
          searchLat !== undefined && searchLng !== undefined
            ? { latitude: searchLat, longitude: searchLng }
            : null;
        const publishCommittedSearchResults = (result: {
          pages: NearbyPlace[];
          predictions: MapPlacePrediction[];
        }) => {
          if (requestId !== committedSearchRequestIdRef.current) return [];

          const pageSuggestions: SuggestionItem[] = result.pages.map(page => {
            const distance =
              searchOrigin && page.coordinate
                ? distanceMeters(searchOrigin, page.coordinate)
                : page.distanceMeters;

            return {
              id: page.id,
              kind: 'page',
              page: {
                ...page,
                distanceMeters:
                  typeof distance === 'number' && Number.isFinite(distance)
                    ? distance
                    : page.distanceMeters,
              },
            };
          });
          const googleSuggestions: SuggestionItem[] = result.predictions.map(
            pred => {
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
                kind: 'google',
                prediction: {
                  ...pred,
                  distanceMeters:
                    typeof distance === 'number' && Number.isFinite(distance)
                      ? distance
                      : pred.distanceMeters,
                },
              };
            },
          );
          const combined = mergeSearchResultSets(
            submittedTypeaheadResults,
            pageSuggestions,
            googleSuggestions,
          ).sort(sortSearchSuggestions(trimmed));
          latestCombinedResults = combined;
          setSearchResults(combined);
          setIsSearchResultsVisible(true);
          return combined;
        };

        const result = await searchNearbyPagesAndPlaces({
          query: trimmed,
          googleQuery: getGoogleCategorySearchQuery(trimmed),
          lat: searchLat,
          lng: searchLng,
          radius: MAP_COMMITTED_SEARCH_RADIUS_METERS,
          limit: 20,
          fast: true,
          globalSearch: true,
          waitForAllSources: true,
          onPartialResults: publishCommittedSearchResults,
        });
        if (requestId !== committedSearchRequestIdRef.current) return;
        const combined = publishCommittedSearchResults(result);
        setSearchMessage(
          combined.length === 0
            ? 'Không tìm thấy địa điểm phù hợp với từ khóa này.'
            : '',
        );

        const resultCoordinates = combined
          .map(item => {
            if (item.kind === 'page') return item.page.coordinate;
            if (
              typeof item.prediction.lat === 'number' &&
              typeof item.prediction.lng === 'number'
            ) {
              return {
                latitude: item.prediction.lat,
                longitude: item.prediction.lng,
              };
            }
            return null;
          })
          .filter(Boolean) as LatLng[];
        const fitAnchor = resultCoordinates[0] || current;
        const fitCandidates = [
          ...(current &&
          fitAnchor &&
          distanceMeters(fitAnchor, current) <= SEARCH_MAP_FIT_CLUSTER_METERS
            ? [current]
            : []),
          ...resultCoordinates.filter(
            coordinate =>
              !fitAnchor ||
              distanceMeters(fitAnchor, coordinate) <=
                SEARCH_MAP_FIT_CLUSTER_METERS,
          ),
        ];
        const uniqueCoordinates = fitCandidates
          .filter(
            (coordinate, index, coordinates) =>
              coordinates.findIndex(
                candidate =>
                  Math.abs(candidate.latitude - coordinate.latitude) <
                    0.00001 &&
                  Math.abs(candidate.longitude - coordinate.longitude) <
                    0.00001,
              ) === index,
          )
          .slice(0, 13);

        if (uniqueCoordinates.length > 1) {
          requestAnimationFrame(() => {
            mapRef.current?.fitToCoordinates(uniqueCoordinates, {
              animated: true,
              edgePadding: {
                top: 112,
                right: 42,
                bottom: searchResultsSheetHeights.half + 24,
                left: 42,
              },
            });
          });
        }
      } catch {
        if (requestId === committedSearchRequestIdRef.current) {
          setIsSearchResultsVisible(true);
          setSearchMessage(
            latestCombinedResults.length === 0
              ? 'Tạm thời chưa tải được kết quả tìm kiếm. Bạn vui lòng thử lại.'
              : '',
          );
          openSearchResultsSheet();
        }
      } finally {
        if (requestId === committedSearchRequestIdRef.current) {
          setIsCommittedSearchLoading(false);
        }
      }
    },
    [
      openSearchResultsSheet,
      resetRouteState,
      searchResultsSheetHeights.half,
      searchNearbyPagesAndPlaces,
      typeaheadResults,
    ],
  );

  const handleSelectSearchResult = useCallback(
    async (
      item: SuggestionItem,
      options: { preserveSearchContext?: boolean } = {},
    ) => {
      const preserveSearchContext = options.preserveSearchContext !== false;
      const trimmedSearchQuery = query.trim();
      const hasSearchContext =
        trimmedSearchQuery.length >= REMOTE_SEARCH_MIN_LENGTH;
      lastMapMarkerPressAtRef.current = Date.now();
      const showPlaceResolutionError = () => {
        setIsSearchResultsVisible(true);
        setSearchMessage(
          'Chưa tải được thông tin địa điểm này. Bạn hãy thử lại hoặc chọn một kết quả khác.',
        );
        openSearchResultsSheet();
      };
      if (!preserveSearchContext) {
        committedSearchRequestIdRef.current += 1;
        setIsCommittedSearchLoading(false);
      }
      if (preserveSearchContext && hasSearchContext) {
        committedSearchQueryRef.current = trimmedSearchQuery;
        setIsSearchResultsVisible(true);
        if (isSearchFocused) {
          // A typeahead item can be opened before the user submits the query.
          // Snapshot the visible suggestions so closing the detail sheet brings
          // the same list back instead of an empty results sheet.
          setSearchResults(typeaheadResults);
          openSearchResultsSheet();
        }
      }
      setIsSearchFocused(false);
      setSearchMessage('');
      if (!preserveSearchContext) {
        setQuery(
          item.kind === 'page' ? item.page.name : item.prediction.description,
        );
      }
      Keyboard.dismiss();

      if (item.kind === 'page') {
        try {
          await selectPage(item.page);
        } catch {
          showPlaceResolutionError();
        }
      } else {
        if (
          typeof item.prediction.lat === 'number' &&
          typeof item.prediction.lng === 'number' &&
          isValidMapCoordinate({
            latitude: item.prediction.lat,
            longitude: item.prediction.lng,
          })
        ) {
          selectPoint({
            id: item.prediction.placeId,
            source: 'google',
            placeId: item.prediction.placeId,
            title: item.prediction.mainText,
            subtitle:
              item.prediction.secondaryText || item.prediction.description,
            address:
              item.prediction.secondaryText || item.prediction.description,
            coordinate: {
              latitude: item.prediction.lat,
              longitude: item.prediction.lng,
            },
            types: item.prediction.types,
            icon: item.prediction.icon,
            iconBackgroundColor: item.prediction.iconBackgroundColor,
            distanceMeters: item.prediction.distanceMeters,
            rating: item.prediction.rating,
            ratingsTotal: item.prediction.ratingsTotal,
            openNow: item.prediction.openNow,
            photoUrls: item.prediction.photoUrls,
          });
        } else {
          try {
            setIsLoadingRoutes(true);
            const details = await getPlaceDetails(item.prediction.placeId);
            if (details && details.coordinate) {
              selectPoint({
                id: details.id,
                source: 'google',
                placeId: details.placeId || item.prediction.placeId,
                title: details.name,
                subtitle: details.location || item.prediction.description,
                address: details.location || item.prediction.description,
                coordinate: details.coordinate,
                types: item.prediction.types,
                icon: details.icon,
                iconBackgroundColor: details.iconBackgroundColor,
                distanceMeters: item.prediction.distanceMeters,
                rating: details.rating ?? item.prediction.rating,
                ratingsTotal:
                  details.ratingsTotal ?? item.prediction.ratingsTotal,
                openNow: details.openNow ?? item.prediction.openNow,
                photoUrls: details.photoUrls ?? [],
                reviews: details.reviews ?? [],
                editorialSummary: details.editorialSummary,
                phoneNumber: details.phoneNumber,
                website: details.website,
                weekdayText: details.weekdayText ?? [],
                businessStatus: details.businessStatus,
                priceLevel: details.priceLevel,
              });
            } else {
              showPlaceResolutionError();
            }
          } catch {
            showPlaceResolutionError();
          } finally {
            setIsLoadingRoutes(false);
          }
        }
      }
    },
    [
      getPlaceDetails,
      isSearchFocused,
      openSearchResultsSheet,
      query,
      selectPage,
      selectPoint,
      typeaheadResults,
    ],
  );

  const handleSelectPlaceDetailSuggestion = useCallback(
    (suggestionId: string) => {
      const item = selectedPlaceSuggestionItems.find(
        candidate => suggestionItemKey(candidate) === suggestionId,
      );
      if (!item) return;
      handleSelectSearchResult(item, { preserveSearchContext: true }).catch(
        () => undefined,
      );
    },
    [handleSelectSearchResult, selectedPlaceSuggestionItems],
  );

  const handleExitSearchMode = useCallback(() => {
    committedSearchRequestIdRef.current += 1;
    searchEffectRequestIdRef.current += 1;
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    setIsCommittedSearchLoading(false);
    setIsSearchFocused(false);
    setIsSearchResultsVisible(false);
    setSearchMessage('');
    setSearchResults([]);
    committedSearchQueryRef.current = '';
    setQuery('');
    clearPlacePredictions();
    Keyboard.dismiss();
  }, [clearPlacePredictions]);

  const dismissSearchInput = useCallback(() => {
    if (!isSearchFocused) return;

    Keyboard.dismiss();
    setIsSearchFocused(false);
  }, [isSearchFocused]);

  const handleMapPress = useCallback(() => {
    if (Date.now() - lastMapMarkerPressAtRef.current < 450) {
      return;
    }
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
    disableNavigationAutoCentering();
  }, [disableNavigationAutoCentering, dismissSearchInput]);

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
      if (now - lastPersistedLocationAtRef.current >= 5000) {
        lastPersistedLocationAtRef.current = now;
        saveLastMapLocation({
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: coordinate.accuracy,
          timestamp: now,
        });
      }
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
      if (Number.isFinite(gpsHeading) && gpsHeading >= 0 && gpsHeading <= 360) {
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

      loadPagesAroundUser(location, {
        source: 'gps',
        accuracy: coordinate.accuracy,
      }).catch(() => undefined);

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
        activePath.length < 2 || offRouteDistance > OFF_ROUTE_DISTANCE_METERS;

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
        loadRouteOptions(
          latestActiveDestination,
          true,
          selectedPointTitleRef.current,
          'auto',
        ).catch(() => undefined);
      }
    },
    [hasCenteredOnUser, loadPagesAroundUser, loadRouteOptions, locationSource],
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
          caught instanceof Error ? caught.message : 'Vui lòng thử lại sau.',
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

  const handleOpenSelectedPage = useCallback(() => {
    if (selectedPoint?.source !== 'page' || !selectedPoint.page) return;
    navigation.navigate(ROUTES.PAGE_DETAIL, {
      page: pageFromNearbyPlace(selectedPoint.page),
    });
  }, [navigation, selectedPoint]);

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

    // Google/address details live in the draggable place sheet. Do not fall
    // back to the old native alert popup.
  }, [selectedPoint]);

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
      const result = await pagesRepository.toggleFollowPage(
        activePageDetail.pageId,
      );
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
      focusRoute(
        currentRoute,
        selectedPoint.coordinate,
        true,
        selectedPoint.title,
      );
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
      .then(async result => {
        const hasCoarseLocation = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        );
        setLocationAllowed(
          result === PermissionsAndroid.RESULTS.GRANTED || hasCoarseLocation,
        );
      })
      .catch(() => setLocationAllowed(false));
  }, []);

  useEffect(() => {
    if (!persistedCoordinate || !persistedMapLocation) return;

    if (isPersistedDiscoveryLocationFresh(persistedMapLocation)) {
      loadPagesAroundUser(persistedCoordinate, {
        source: 'persisted',
        accuracy: persistedMapLocation.accuracy,
      }).catch(() => undefined);
      return;
    }

    // A stale cached fix can still rescue the map when GPS is unavailable,
    // but it must not flash an old Page dataset before the GPS request finishes.
    const fallbackTimer = setTimeout(() => {
      if (hasLoadedNearbyPagesRef.current) return;
      loadPagesAroundUser(persistedCoordinate, {
        source: 'persisted',
        accuracy: persistedMapLocation.accuracy,
        force: true,
      }).catch(() => undefined);
    }, PERSISTED_DISCOVERY_FALLBACK_DELAY_MS);

    return () => clearTimeout(fallbackTimer);
  }, [loadPagesAroundUser, persistedCoordinate, persistedMapLocation]);

  useEffect(() => {
    if (!locationAllowed || initialLocationRequestStartedRef.current) return;

    initialLocationRequestStartedRef.current = true;
    let cancelled = false;

    getCurrentDeviceLocation(8000)
      .then(location => {
        if (cancelled) return;
        const coordinate = {
          latitude: Number(location.latitude),
          longitude: Number(location.longitude),
        };
        if (
          !Number.isFinite(coordinate.latitude) ||
          !Number.isFinite(coordinate.longitude)
        ) {
          return;
        }

        currentLocationRef.current = coordinate;
        lastLocationStateRef.current = coordinate;
        lastLocationStateUpdatedAtRef.current = Date.now();
        saveLastMapLocation({
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          accuracy: location.accuracy,
          timestamp: location.timestamp,
        });
        lastPersistedLocationAtRef.current = Date.now();
        setCurrentLocation(coordinate);
        setLocationSource('gps');
        setHasCenteredOnUser(true);
        mapRef.current?.animateToRegion(
          {
            ...coordinate,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          },
          320,
        );

        loadPagesAroundUser(coordinate, {
          source: 'gps',
          accuracy: location.accuracy,
        }).catch(() => undefined);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [loadPagesAroundUser, locationAllowed]);

  useEffect(() => {
    const requestId = ++searchEffectRequestIdRef.current;
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    const trimmed = query.trim();
    setSearchMessage('');
    if (trimmed.length < REMOTE_SEARCH_MIN_LENGTH) {
      const shouldRestoreNearbyPages = wasSearchQueryActiveRef.current;
      wasSearchQueryActiveRef.current = false;
      clearPlacePredictions();
      if (
        shouldRestoreNearbyPages &&
        currentLocationRef.current &&
        hasLoadedNearbyPagesRef.current
      ) {
        loadPagesAroundUser(currentLocationRef.current, {
          source: locationSource === 'profile' ? 'profile' : 'gps',
          force: true,
        }).catch(() => undefined);
      }
      return;
    }
    wasSearchQueryActiveRef.current = true;
    const googleCategory = getGoogleCategorySearchQuery(trimmed);

    searchTimerRef.current = setTimeout(
      () => {
        // Fresh installs may not have a persisted location yet, and the first
        // GPS fix can take several seconds. Search around the map viewport in
        // that case so external places still work instead of silently sending
        // the backend a request without an origin.
        const searchOrigin =
          currentLocationRef.current ?? currentRegionRef.current;
        searchNearbyPagesAndPlaces({
          query: trimmed,
          googleQuery: googleCategory,
          lat: searchOrigin.latitude,
          lng: searchOrigin.longitude,
          radius: MAP_TYPEAHEAD_SEARCH_RADIUS_METERS,
          limit: 20,
          fast: true,
        })
          .then(result => {
            if (requestId !== searchEffectRequestIdRef.current) return;
            if (result.pages.length === 0 && result.predictions.length === 0) {
              setSearchMessage(
                'Không tìm thấy địa điểm phù hợp với từ khóa này.',
              );
            }
          })
          .catch(() => {
            if (requestId !== searchEffectRequestIdRef.current) return;
            setSearchMessage(
              'Tạm thời chưa tải được gợi ý tìm kiếm. Bạn vui lòng thử lại.',
            );
          });
      },
      googleCategory ? CATEGORY_SEARCH_DEBOUNCE_MS : TEXT_SEARCH_DEBOUNCE_MS,
    );

    return () => {
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
    };
  }, [
    clearPlacePredictions,
    loadPagesAroundUser,
    locationSource,
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
        initialRegion={initialMapRegion}
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
        showsTraffic={shouldShowRoute}
        showsIndoorLevelPicker={false}
        showsIndoors={false}
        showsMyLocationButton={false}
        showsUserLocation={locationAllowed}
        toolbarEnabled={false}
        userInterfaceStyle="light"
        customMapStyle={CLEAN_GOOGLE_MAP_STYLE}
        onPoiClick={HIDE_GOOGLE_DISCOVERY_PLACES ? undefined : handlePoiPress}
        onPress={handleMapPress}
        onUserLocationChange={handleUserLocationChange}
        onPanDrag={handleMapPanDrag}
        onRegionChangeStart={handleRegionChangeStart}
        onRegionChangeComplete={handleRegionChangeComplete}
        style={StyleSheet.absoluteFill}
      >
        {!isSearchMode && currentLocation && !isSearchResultsVisible ? (
          <Circle
            center={currentLocation}
            radius={DISCOVERY_RADIUS_METERS}
            strokeColor="rgba(59, 130, 246, 0.28)"
            fillColor="rgba(59, 130, 246, 0.08)"
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
                <Text numberOfLines={1} style={styles.currentUserRoadLabelText}>
                  {navigationRoadName}
                </Text>
              </View>
            </View>
          </Marker>
        ) : null}

        {shouldShowNearbyPageMarkers &&
          visiblePageMarkers.map(({ place, coordinate }, markerIndex) => {
            if (
              selectedPoint?.source === 'page' &&
              selectedPoint.id === place.id
            ) {
              return null;
            }

            const compact = markerIndex >= addressLabelLimit;
            return (
              <AddressPlaceMapMarker
                key={`${place.id}:address-place:${
                  compact ? 'compact' : 'label'
                }`}
                coordinate={coordinate}
                title={place.name}
                compact={compact}
                badgeText={addressMarkerBadgeText(
                  undefined,
                  place.name,
                  place.category,
                  place.location,
                )}
                zIndex={markerIndex < addressLabelLimit ? 13 : 12}
                onPress={() => {
                  lastMapMarkerPressAtRef.current = Date.now();
                  setIsSearchResultsVisible(false);
                  setSearchResults([]);
                  selectPage(place).catch(() => undefined);
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
              lastMapMarkerPressAtRef.current = Date.now();
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
              lastMapMarkerPressAtRef.current = Date.now();
              setIsSheetCollapsed(false);
            }}
          />
        ) : selectedPoint ? (
          <Marker
            key={`selected:${selectedPoint.id}:${selectedPoint.title}`}
            anchor={
              selectedPoint.showNameBadge ? { x: 0.13, y: 1 } : { x: 0.5, y: 1 }
            }
            coordinate={selectedPoint.coordinate}
            onPress={() => {
              lastMapMarkerPressAtRef.current = Date.now();
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
                const styleObj = isGoogle
                  ? getPlaceIconAndColor(selectedPoint.types, query)
                  : { color: '#16A34A', Icon: null };
                const shouldUseGoogleIcon =
                  isGoogle && styleObj.Icon === DefaultPlaceDotIcon;
                const categoryColor = shouldUseGoogleIcon
                  ? selectedPoint.iconBackgroundColor || styleObj.color
                  : styleObj.color;
                const Icon = styleObj.Icon;

                return (
                  <View
                    style={[
                      styles.selectedPin,
                      isGoogle && styles.googleMarker,
                    ]}
                  >
                    <View
                      style={[
                        styles.selectedPinTail,
                        { backgroundColor: categoryColor },
                      ]}
                    />
                    <View
                      style={[
                        styles.selectedPinHead,
                        { backgroundColor: categoryColor },
                      ]}
                    >
                      {isGoogle && shouldUseGoogleIcon && selectedPoint.icon ? (
                        <Image
                          source={{ uri: selectedPoint.icon }}
                          style={{
                            width: 16,
                            height: 16,
                            tintColor: '#FFFFFF',
                          }}
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
              onPress={
                route ? () => selectRouteOption(route, false) : undefined
              }
            />
            <Polyline
              coordinates={route ? route.path : []}
              lineCap="round"
              lineJoin="round"
              strokeColor="rgba(70, 108, 255, 0.01)"
              strokeWidth={24}
              zIndex={14}
              tappable={Boolean(route)}
              onPress={
                route ? () => selectRouteOption(route, false) : undefined
              }
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
              tracksViewChanges={false}
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
        {shouldShowSearchResultMarkers &&
          !isRoutePreview &&
          !isNavigating &&
          displayedSearchResults
            .slice(0, MAX_VISIBLE_SEARCH_MARKERS)
            .map((item, markerIndex) => {
              // Hide marker if it's currently selected to avoid double overlapping icons
              const isSelected =
                selectedPoint &&
                (selectedPoint.id === item.id ||
                  selectedPoint.id === `google:${item.id}` ||
                  (selectedPoint.source === 'google' &&
                    item.kind === 'google' &&
                    selectedPoint.id.replace('google:', '') ===
                      item.prediction.placeId));

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
                  : isHealthPlace(
                      undefined,
                      title,
                      item.page.category,
                      item.page.location,
                    );

              if (item.kind === 'page' || isHealthSearchMarker) {
                return (
                  <AddressPlaceMapMarker
                    key={`search-address-marker:${item.id}`}
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

              const googleIconStyle =
                item.kind === 'google'
                  ? getPlaceIconAndColor(item.prediction.types, query)
                  : null;
              const MarkerIcon = googleIconStyle
                ? googleIconStyle.Icon
                : MapPin;
              const shouldUseGoogleIcon =
                item.kind === 'google' &&
                googleIconStyle?.Icon === DefaultPlaceDotIcon;

              return (
                <Marker
                  key={`search-marker:${item.id}`}
                  coordinate={coordinate}
                  title={title}
                  tracksViewChanges={false}
                  onPress={() => handleSelectSearchResult(item)}
                >
                  <View style={styles.googleMarkerPin}>
                    <View style={styles.googleMarkerPinHead}>
                      {shouldUseGoogleIcon && item.prediction.icon ? (
                        <Image
                          source={{ uri: item.prediction.icon }}
                          style={styles.googleMarkerPinIcon}
                          resizeMode="contain"
                        />
                      ) : (
                        <MarkerIcon size={15} color="#FFFFFF" />
                      )}
                    </View>
                    <View style={styles.googleMarkerPinTail} />
                  </View>
                </Marker>
              );
            })}
      </MapView>

      {!isNavigating &&
      !isRoutePreview &&
      !isFullScreen &&
      !(shouldShowSearchResultsSheet && searchResultsSheetSnap === 'expanded') ? (
        <View style={exploreTopControlsStyle}>
          <View style={styles.exploreSearchRow}>
            <Animated.View
              pointerEvents={isSearchChromeExpanded ? 'none' : 'auto'}
              style={[styles.searchBackSlot, searchBackAnimatedStyle]}
            >
              <TouchableOpacity
                activeOpacity={0.86}
                style={styles.backButton}
                onPress={handleBackPress}
              >
                <ArrowLeft size={22} color="#0F172A" />
              </TouchableOpacity>
            </Animated.View>

            <Animated.View
              style={[
                styles.searchBox,
                isSearchMode && styles.searchBoxSearchMode,
                searchBoxAnimatedStyle,
              ]}
            >
              {isSearchMode ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={styles.searchModeBackButton}
                  onPress={handleExitSearchMode}
                >
                  <ArrowLeft size={24} color="#334155" />
                </TouchableOpacity>
              ) : !isSearchResultsVisible ? (
                <Search size={19} color={BRAND} />
              ) : null}
              <TextInput
                style={styles.searchInput}
                placeholder="Tìm kiếm ở đây"
                placeholderTextColor="#64748B"
                value={query}
                onChangeText={text => {
                  committedSearchRequestIdRef.current += 1;
                  setIsCommittedSearchLoading(false);
                  setQuery(text);
                  setIsSearchFocused(true);
                  const trimmedLength = text.trim().length;
                  setIsSearchResultsVisible(
                    trimmedLength >= REMOTE_SEARCH_MIN_LENGTH,
                  );
                  if (trimmedLength === 0) {
                    setSearchResults([]);
                    clearSelectedPoint();
                  }
                }}
                onFocus={() => {
                  committedSearchRequestIdRef.current += 1;
                  setIsCommittedSearchLoading(false);
                  setIsSearchFocused(true);
                }}
                onSubmitEditing={() => handlePerformSearch(query)}
                returnKeyType="search"
              />
              {query.length > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    committedSearchRequestIdRef.current += 1;
                    setIsCommittedSearchLoading(false);
                    setQuery('');
                    setSearchMessage('');
                    setSearchResults([]);
                    committedSearchQueryRef.current = '';
                    setIsSearchResultsVisible(false);
                    clearPlacePredictions();
                    clearSelectedPoint();
                  }}
                >
                  <X size={22} color="#475569" />
                </TouchableOpacity>
              ) : isMapSearchLoading ? (
                <ActivityIndicator color={BRAND} />
              ) : (
                <Mic size={19} color="#0F172A" />
              )}
            </Animated.View>
          </View>

          {SHOW_APP_DISCOVERY_PLACES_ON_MAP ? (
            <Animated.View
              pointerEvents={isSearchChromeExpanded ? 'none' : 'auto'}
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
                        selectPage(place).catch(() => undefined);
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

          {!isSearchChromeExpanded && locationSource === 'profile' ? (
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
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={handleStartNavigation}
              >
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

      {isSearchMode && !isFullScreen ? (
        <View style={typeaheadOverlayStyle}>
          <View style={styles.typeaheadSummaryRow}>
            <View style={styles.typeaheadSummaryCopy}>
              <Text style={styles.typeaheadSummaryTitle} numberOfLines={1}>
                {query.trim().length === 0
                  ? 'Địa điểm gần bạn'
                  : query.trim().length < REMOTE_SEARCH_MIN_LENGTH
                  ? 'Gợi ý Page gần bạn'
                  : `Kết quả cho “${query.trim()}”`}
              </Text>
              <Text style={styles.typeaheadSummaryText}>
                {isSearchListLoading
                  ? activeSearchListResults.length > 0
                    ? `Đang cập nhật quanh bạn · hiển thị ${activeSearchListResults.length} kết quả gần nhất`
                    : 'Đang tìm Page VNSEEA và địa điểm quanh bạn...'
                  : activeSearchListResults.length > 0
                  ? `${activeSearchListResults.length} kết quả, ưu tiên theo độ phù hợp và khoảng cách`
                  : query.trim().length < REMOTE_SEARCH_MIN_LENGTH
                  ? 'Nhập thêm để tìm Page VNSEEA và mọi địa điểm, gần hoặc xa'
                  : 'Chưa có kết quả phù hợp với từ khóa này'}
              </Text>
            </View>
          </View>

          <ScrollView
            style={styles.typeaheadList}
            contentContainerStyle={styles.typeaheadListContent}
            keyboardShouldPersistTaps="always"
            showsVerticalScrollIndicator
          >
            {isSearchListLoading ? (
              <TypeaheadSearchSkeleton
                compact={activeSearchListResults.length > 0}
              />
            ) : null}

            {activeSearchListResults.map(item => (
              <SearchSuggestionRow
                key={`typeahead:${item.kind}:${item.id}`}
                item={item}
                query={query}
                vnseeaLogoUrl={visibleVnseeaLogoUrl}
                onVnseeaLogoError={notifyVnseeaLogoError}
                onPress={() => handleSelectSearchResult(item)}
              />
            ))}

            {!isSearchListLoading && activeSearchListResults.length === 0 ? (
              <View style={styles.typeaheadEmptyState}>
                <MapPin size={30} color="#94A3B8" />
                <Text style={styles.typeaheadEmptyTitle}>
                  {query.trim().length < REMOTE_SEARCH_MIN_LENGTH
                    ? 'Chưa có Page gần vị trí này'
                    : 'Không tìm thấy địa điểm'}
                </Text>
                <Text style={styles.typeaheadEmptyText}>
                  {searchMessage ||
                    'Hãy thử tên ngắn hơn hoặc một loại dịch vụ khác.'}
                </Text>
              </View>
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
      {shouldShowSelectedPlaceMapControls &&
      (!shouldShowSearchResultsSheet || isFullScreen) ? (
        <TouchableOpacity
          activeOpacity={0.86}
          style={[
            styles.mapFloatingBtn,
            styles.fullScreenButton,
            selectedPoint && !isSheetCollapsed && !isFullScreen
              ? selectedPlaceMapControlStyles.fullScreen
              : null,
          ]}
          onPress={() => setIsFullScreen(prev => !prev)}
        >
          {isFullScreen ? (
            <Minimize2 size={21} color={BRAND} />
          ) : (
            <Maximize2 size={21} color={BRAND} />
          )}
        </TouchableOpacity>
      ) : null}

      {/* Nút Phóng to */}
      {shouldShowSelectedPlaceMapControls && !shouldShowSearchResultsSheet ? (
        <TouchableOpacity
          activeOpacity={0.86}
          style={[
            styles.mapFloatingBtn,
            styles.zoomInButton,
            selectedPoint && !isSheetCollapsed && !isFullScreen
              ? selectedPlaceMapControlStyles.zoomIn
              : null,
          ]}
          onPress={handleZoomIn}
        >
          <Plus size={21} color={BRAND} />
        </TouchableOpacity>
      ) : null}

      {/* Nút Thu nhỏ */}
      {shouldShowSelectedPlaceMapControls && !shouldShowSearchResultsSheet ? (
        <TouchableOpacity
          activeOpacity={0.86}
          style={[
            styles.mapFloatingBtn,
            styles.zoomOutButton,
            selectedPoint && !isSheetCollapsed && !isFullScreen
              ? selectedPlaceMapControlStyles.zoomOut
              : null,
          ]}
          onPress={handleZoomOut}
        >
          <Minus size={21} color={BRAND} />
        </TouchableOpacity>
      ) : null}

      {/* Nút La bàn */}
      {shouldShowSelectedPlaceMapControls && !shouldShowSearchResultsSheet ? (
        <TouchableOpacity
          activeOpacity={0.86}
          style={[
            styles.compassButton,
            selectedPoint && !isSheetCollapsed && !isFullScreen
              ? selectedPlaceMapControlStyles.compass
              : null,
          ]}
          onPress={resetMapHeading}
        >
          <Compass size={21} color={BRAND} />
        </TouchableOpacity>
      ) : null}

      {/* Nút Vị trí của tôi */}
      {shouldShowSelectedPlaceMapControls &&
      !(
        shouldShowSearchResultsSheet &&
        !isFullScreen &&
        searchResultsSheetSnap === 'expanded'
      ) ? (
        <TouchableOpacity
          activeOpacity={0.86}
          style={[
            styles.locateButton,
            shouldShowSearchResultsSheet && !isFullScreen
              ? locateButtonWithSearchStyle
              : selectedPoint && !isSheetCollapsed && !isFullScreen
              ? locateButtonWithPlaceDetailStyle
              : null,
          ]}
          onPress={centerOnUser}
        >
          <LocateFixed size={21} color={BRAND} />
        </TouchableOpacity>
      ) : null}

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
                        ? `${selectedMapShareLocation.latitude.toFixed(
                            6,
                          )}, ${selectedMapShareLocation.longitude.toFixed(6)}`
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
                  {isPostingMapShare
                    ? 'Đang đăng bài...'
                    : 'Đăng thành bài viết'}
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
                <Text style={styles.mapShareLoadingText}>
                  Đang tải cuộc trò chuyện...
                </Text>
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
              <Text style={styles.mapShareOutsideText}>
                Chia sẻ ngoài ứng dụng
              </Text>
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

      {selectedPoint &&
      !isSheetCollapsed &&
      !isRoutePreview &&
      !isNavigating &&
      !isFullScreen ? (
        <MapPlaceDetailSheet
          key={`place-detail-sheet:${selectedPoint.id}`}
          place={{
            id: selectedPoint.id,
            source: selectedPoint.source,
            title: selectedPoint.title,
            subtitle: selectedPoint.subtitle,
            address: selectedPoint.address || selectedPoint.subtitle,
            distanceText:
              selectedDistance !== undefined
                ? formatDistance(selectedDistance)
                : undefined,
            durationText:
              activeRouteDuration !== null && activeRouteDuration > 0
                ? formatDuration(activeRouteDuration)
                : undefined,
            rating: selectedPoint.rating,
            ratingsTotal: selectedPoint.ratingsTotal,
            openNow: selectedPoint.openNow,
            photoUrls: selectedPoint.photoUrls,
            reviews: selectedPoint.reviews,
            editorialSummary: selectedPoint.editorialSummary,
            phoneNumber: selectedPoint.phoneNumber,
            website: selectedPoint.website,
            weekdayText: selectedPoint.weekdayText,
            businessStatus: selectedPoint.businessStatus,
            priceLevel: selectedPoint.priceLevel,
            pageFollowersCount: selectedPoint.page?.followersCount,
            pageLikes: selectedPoint.page?.likes,
            pagePostCount: selectedPoint.page?.postCount,
            pageCategory: selectedPoint.page?.category,
            pageDescription: selectedPoint.page?.description,
            isOwnedPage: Boolean(
              selectedPoint.page?.ownerId &&
                currentViewerId &&
                String(selectedPoint.page.ownerId) === String(currentViewerId),
            ),
          }}
          isDirectionsLoading={isLoadingRoutes}
          directionsDisabled={selectedPoint.source === 'self'}
          onClose={clearSelectedPoint}
          onShare={handleShare}
          onDirections={handleGetDirections}
          onStart={handleStartNavigation}
          onOpenPage={
            selectedPoint.source === 'page' && selectedPoint.page
              ? handleOpenSelectedPage
              : undefined
          }
          suggestions={selectedPlaceSuggestions}
          onSuggestionPress={handleSelectPlaceDetailSuggestion}
          onSnapChange={setPlaceDetailSheetSnap}
        />
      ) : null}

      {selectedPoint &&
      !isSheetCollapsed &&
      !isRoutePreview &&
      !isNavigating &&
      !isFullScreen &&
      SHOW_LEGACY_SELECTED_PLACE_CARD ? (
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
              className="flex-1 items-center rounded-xl bg-brand-pressed px-2 py-3"
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
              className="flex-1 items-center rounded-xl border border-info-border bg-info-soft px-2 py-3"
              onPress={handleStartNavigation}
              disabled={selectedPoint.source === 'self' || isLoadingRoutes}
              style={
                selectedPoint.source === 'self' || isLoadingRoutes
                  ? { opacity: 0.45 }
                  : null
              }
            >
              <Text className="text-xs font-extrabold text-info">
                Bắt đầu
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Submitted searches return to the map with a three-level result sheet. */}
      {shouldShowSearchResultsSheet ? (
        <Reanimated.View
          style={[searchResultsPanelStyle, searchResultsPanelAnimatedStyle]}
        >
          <GestureDetector gesture={searchResultsSheetGestures.header}>
            <View collapsable={false}>
              <View style={styles.searchResultsHandle} />
              <View style={styles.searchResultsHeader}>
                <View style={styles.searchResultsHeaderCopy}>
                  <Text style={styles.searchResultsTitle} numberOfLines={1}>
                    {query.trim() || 'Kết quả tìm kiếm'}
                  </Text>
                  <Text style={styles.searchResultsCountText}>
                    {displayedSearchResults.length > 0
                      ? `${displayedSearchResults.length} địa điểm${
                          searchDistanceSummary
                            ? ` · ${searchDistanceSummary}`
                            : ''
                        }`
                      : isCommittedSearchLoading
                      ? 'Đang tìm Page VNSEEA và địa điểm Google...'
                      : 'Chưa có kết quả phù hợp'}
                  </Text>
                </View>
              </View>
            </View>
          </GestureDetector>

          <GestureDetector gesture={searchResultsSheetGestures.body}>
            <View style={styles.searchResultsBody} collapsable={false}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.searchResultFiltersContent}
                style={styles.searchResultFilters}
              >
                {(
                  [
                    ['relevance', 'Liên quan'],
                    ['distance', 'Gần nhất'],
                    ['pages', 'Page VNSEEA'],
                  ] as Array<[SearchResultSort, string]>
                ).map(([value, label]) => {
                  const isActive = searchResultSort === value;
                  return (
                    <TouchableOpacity
                      key={`search-result-sort:${value}`}
                      activeOpacity={0.84}
                      style={[
                        styles.searchResultFilterChip,
                        isActive && styles.searchResultFilterChipActive,
                      ]}
                      onPress={() => setSearchResultSort(value)}
                    >
                      {value === 'relevance' ? (
                        <ArrowUpDown
                          size={15}
                          color={isActive ? '#FFFFFF' : '#475569'}
                        />
                      ) : null}
                      <Text
                        style={[
                          styles.searchResultFilterText,
                          isActive && styles.searchResultFilterTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <FlatList
                ref={searchResultsScrollRef}
                style={styles.searchResultsList}
                contentContainerStyle={styles.searchResultsListContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled
                scrollEnabled={searchResultsSheetSnap === 'expanded'}
                alwaysBounceVertical={
                  Platform.OS === 'ios' &&
                  searchResultsSheetSnap === 'expanded'
                }
                scrollEventThrottle={16}
                data={displayedSearchResults}
                keyExtractor={item => `result-card:${item.id}`}
                initialNumToRender={2}
                maxToRenderPerBatch={3}
                updateCellsBatchingPeriod={48}
                windowSize={5}
                keyboardShouldPersistTaps="handled"
                onScroll={event => {
                  const nextOffset = event.nativeEvent.contentOffset.y;
                  searchResultsScrollOffsetRef.current = nextOffset;
                  const nextIsAtTop = nextOffset <= 0.5;
                  if (
                    nextIsAtTop !== isSearchResultsScrollAtTopRef.current
                  ) {
                    isSearchResultsScrollAtTopRef.current = nextIsAtTop;
                    setIsSearchResultsScrollAtTop(nextIsAtTop);
                  }
                  if (
                    Platform.OS === 'ios' &&
                    searchResultsSheetSnap === 'expanded' &&
                    nextOffset <= -SEARCH_RESULTS_IOS_PULL_TO_HALF_THRESHOLD
                  ) {
                    collapseExpandedSearchResultsFromListPull();
                  }
                }}
                ListHeaderComponent={
                  searchMessage && displayedSearchResults.length > 0 ? (
                    <View style={styles.searchResultsNotice}>
                      <MapPin size={18} color="#475569" />
                      <Text style={styles.searchResultsNoticeText}>
                        {searchMessage}
                      </Text>
                    </View>
                  ) : null
                }
                ListEmptyComponent={
                  <View style={styles.searchResultsLoadingState}>
                    {isCommittedSearchLoading ? (
                      <ActivityIndicator size="large" color={BRAND} />
                    ) : (
                      <MapPin size={30} color="#94A3B8" />
                    )}
                    <Text style={styles.searchResultsLoadingTitle}>
                      {isCommittedSearchLoading
                        ? 'Đang tìm địa điểm phù hợp'
                        : searchMessage
                        ? 'Chưa có kết quả để hiển thị'
                        : 'Không tìm thấy kết quả'}
                    </Text>
                    <Text style={styles.searchResultsLoadingText}>
                      {isCommittedSearchLoading
                        ? 'Kết quả Page và địa điểm sẽ xuất hiện ngay khi nguồn đầu tiên phản hồi.'
                        : searchMessage ||
                          'Hãy thử từ khóa ngắn hơn hoặc tăng phạm vi tìm kiếm.'}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isPinned =
                    item.kind === 'page' &&
                    (item.page.isPinned || item.page.mapPinApproved);

                  let coordinate: LatLng | null = null;
                  let title = '';
                  let subtitle = '';
                  let addressText = '';
                  let avatarUrl = '';
                  let types: string[] | undefined;
                  let rating: number | undefined;
                  let ratingsTotal: number | undefined;
                  let openNow: boolean | undefined;
                  let photoUrls: string[] = [];

                  if (item.kind === 'page') {
                    coordinate = item.page.coordinate || null;
                    title = item.page.name;
                    subtitle = item.page.username
                      ? `@${item.page.username}`
                      : item.page.location || 'Page';
                    addressText = item.page.location || '';
                    avatarUrl = item.page.avatarUrl || '';
                    photoUrls = [
                      item.page.coverUrl,
                      item.page.avatarUrl,
                    ].filter(Boolean) as string[];
                  } else {
                    const lat = item.prediction.lat;
                    const lng = item.prediction.lng;
                    if (lat !== undefined && lng !== undefined) {
                      coordinate = { latitude: lat, longitude: lng };
                    }
                    title = item.prediction.mainText;
                    subtitle =
                      item.prediction.secondaryText ||
                      item.prediction.description;
                    addressText =
                      item.prediction.secondaryText ||
                      item.prediction.description;
                    types = item.prediction.types;
                    rating = item.prediction.rating;
                    ratingsTotal = item.prediction.ratingsTotal;
                    openNow = item.prediction.openNow;
                    photoUrls = item.prediction.photoUrls ?? [];
                  }

                  const routePoint: SelectedPoint | null = coordinate
                    ? item.kind === 'page'
                      ? {
                          id: item.page.id,
                          source: 'page',
                          placeId: item.page.placeId,
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
                          rating: item.page.rating,
                          ratingsTotal: item.page.ratingsTotal,
                          openNow: item.page.openNow,
                          photoUrls: [
                            item.page.coverUrl,
                            item.page.avatarUrl,
                          ].filter(Boolean) as string[],
                        }
                      : {
                          id: item.prediction.placeId,
                          source: 'google',
                          placeId: item.prediction.placeId,
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
                          iconBackgroundColor:
                            item.prediction.iconBackgroundColor,
                          rating: item.prediction.rating,
                          ratingsTotal: item.prediction.ratingsTotal,
                          openNow: item.prediction.openNow,
                          photoUrls: item.prediction.photoUrls,
                        }
                    : null;
                  const distMeters =
                    coordinate && currentLocation
                      ? distanceMeters(currentLocation, coordinate)
                      : item.kind === 'page'
                      ? item.page.distanceMeters
                      : item.prediction.distanceMeters;
                  const resultProximity = distanceProximity(distMeters);
                  const googleIconStyle =
                    item.kind === 'google'
                      ? getPlaceIconAndColor(types, query)
                      : null;
                  const IconComponent = googleIconStyle
                    ? googleIconStyle.Icon
                    : null;
                  const shouldUseGoogleIcon =
                    item.kind === 'google' &&
                    googleIconStyle?.Icon === DefaultPlaceDotIcon;

                  const onDetailsOrShare = () => {
                    if (item.kind === 'page') {
                      if (routePoint) {
                        selectPoint(routePoint);
                      } else {
                        selectPage(item.page).catch(() => undefined);
                      }
                    } else {
                      const shareMsg = `${title}\nĐịa chỉ: ${addressText}\nTọa độ: ${
                        coordinate
                          ? `${coordinate.latitude},${coordinate.longitude}`
                          : ''
                      }`;
                      Share.share({ message: shareMsg }).catch(() => undefined);
                    }
                  };

                  const onGetDirections = () => {
                    if (routePoint) {
                      selectPoint(routePoint, true);
                      return;
                    }
                    if (item.kind === 'page') {
                      selectPage(item.page, { shouldRoute: true }).catch(
                        () => undefined,
                      );
                    }
                  };

                  const onStartNavigation = () => {
                    if (routePoint) {
                      selectPoint(routePoint);
                      loadRouteOptions(
                        routePoint.coordinate,
                        true,
                        routePoint.title,
                      ).catch(() => undefined);
                      return;
                    }
                    if (item.kind === 'page') {
                      selectPage(item.page)
                        .then(point => {
                          if (!point) return;
                          loadRouteOptions(
                            point.coordinate,
                            true,
                            point.title,
                          ).catch(() => undefined);
                        })
                        .catch(() => undefined);
                    }
                  };

                  return (
                    <View
                      style={[
                        styles.resultCard,
                        isPinned && styles.resultCardPinned,
                      ]}
                      onLayout={event => {
                        itemOffsets.current[item.id] =
                          event.nativeEvent.layout.y;
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
                                <IconComponent
                                  size={22}
                                  color={googleIconStyle?.color || '#1E70E6'}
                                />
                              ) : null}
                            </View>
                          )}

                          <View style={styles.resultCardTextBody}>
                            <View style={styles.resultCardTitleLine}>
                              <Text
                                style={styles.resultCardTitleText}
                                numberOfLines={1}
                              >
                                {title}
                              </Text>
                              {resolvingPageId === item.id ? (
                                <ActivityIndicator size="small" color={BRAND} />
                              ) : null}
                              {item.kind === 'page' ? (
                                <VnseeaPageBadge
                                  logoUrl={visibleVnseeaLogoUrl}
                                  onLogoError={notifyVnseeaLogoError}
                                />
                              ) : null}
                              {isPinned ? (
                                <View style={styles.pinnedBadge}>
                                  <Text style={styles.pinnedBadgeText}>
                                    Được ghim
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            <Text
                              style={styles.resultCardSubtitleText}
                              numberOfLines={1}
                            >
                              {subtitle}
                            </Text>
                            {item.kind === 'google' &&
                            (rating !== undefined || openNow !== undefined) ? (
                              <View style={styles.resultCardMetaLine}>
                                {rating !== undefined ? (
                                  <Text style={styles.resultCardRatingText}>
                                    {rating.toFixed(1)} ★
                                    {ratingsTotal !== undefined
                                      ? ` (${ratingsTotal})`
                                      : ''}
                                  </Text>
                                ) : null}
                                {openNow !== undefined ? (
                                  <Text
                                    style={[
                                      styles.resultCardOpenText,
                                      !openNow && styles.resultCardClosedText,
                                    ]}
                                  >
                                    {openNow ? 'Đang mở cửa' : 'Đang đóng cửa'}
                                  </Text>
                                ) : null}
                              </View>
                            ) : null}
                          </View>
                        </View>

                        <View style={styles.resultCardBadgeRow}>
                          {distMeters !== undefined ? (
                            <View
                              style={[
                                styles.resultCardDistanceBadge,
                                resultProximity?.tone === 'near'
                                  ? styles.resultCardDistanceBadgeNear
                                  : resultProximity?.tone === 'far'
                                  ? styles.resultCardDistanceBadgeFar
                                  : styles.resultCardDistanceBadgeLocal,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.resultCardDistanceText,
                                  resultProximity?.tone === 'near'
                                    ? styles.resultCardDistanceTextNear
                                    : resultProximity?.tone === 'far'
                                    ? styles.resultCardDistanceTextFar
                                    : styles.resultCardDistanceTextLocal,
                                ]}
                              >
                                {resultProximity?.label || 'Khoảng cách'} ·{' '}
                                {formatDistance(distMeters)}
                              </Text>
                            </View>
                          ) : null}
                          <View style={styles.resultCardCoordinateBadge}>
                            <MapPin size={13} color="#64748B" />
                            <Text
                              style={styles.resultCardCoordinateText}
                              numberOfLines={1}
                            >
                              {subtitle}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={styles.resultCardAddressText}
                          numberOfLines={2}
                        >
                          {addressText}
                        </Text>

                        {item.kind === 'google' ? (
                          <SearchResultPhotoStrip
                            itemId={item.id}
                            photoUrls={photoUrls}
                          />
                        ) : null}
                      </TouchableOpacity>

                      <View style={styles.resultCardButtonsRow}>
                        <TouchableOpacity
                          activeOpacity={0.86}
                          style={[
                            styles.resultCardBtn,
                            styles.resultCardBtnOutline,
                          ]}
                          onPress={onDetailsOrShare}
                        >
                          <Text style={styles.resultCardBtnOutlineText}>
                            {item.kind === 'google' ? 'Chia sẻ' : 'Chi tiết'}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.86}
                          style={[
                            styles.resultCardBtn,
                            styles.resultCardBtnSolid,
                          ]}
                          onPress={onGetDirections}
                          disabled={!coordinate && item.kind !== 'page'}
                        >
                          <Text style={styles.resultCardBtnSolidText}>
                            Đường đi
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          activeOpacity={0.86}
                          style={[
                            styles.resultCardBtn,
                            styles.resultCardBtnSecondary,
                          ]}
                          onPress={onStartNavigation}
                          disabled={!coordinate && item.kind !== 'page'}
                        >
                          <Text style={styles.resultCardBtnSecondaryText}>
                            Bắt đầu
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            </View>
          </GestureDetector>
        </Reanimated.View>
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
                    <Users size={18} color={APP_BRAND_COLOR} />
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
                    <ActivityIndicator size="small" color={APP_BRAND_COLOR} />
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
                        ? APP_BRAND_COLOR
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
                      color={canFollowPageDetail ? APP_BRAND_COLOR : '#FFFFFF'}
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
                      <UserPlus size={17} color={APP_BRAND_COLOR} />
                    ) : (
                      <MessageCircle size={17} color={APP_BRAND_COLOR} />
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
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 16,
    zIndex: 31,
    overflow: 'hidden',
  },
  searchResultsHandle: {
    alignSelf: 'center',
    width: 42,
    height: 5,
    marginTop: 10,
    borderRadius: 999,
    backgroundColor: '#CBD5E1',
  },
  searchResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 10,
  },
  searchResultsHeaderCopy: {
    flex: 1,
    marginRight: 12,
  },
  searchResultsTitle: {
    color: '#0F172A',
    fontSize: 23,
    fontWeight: '900',
  },
  searchResultsCountText: {
    marginTop: 2,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700',
  },
  searchResultsBody: {
    flex: 1,
  },
  searchResultFilters: {
    flexGrow: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  searchResultFiltersContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  searchResultFilterChip: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
  },
  searchResultFilterChipActive: {
    borderColor: BRAND,
    backgroundColor: BRAND,
  },
  searchResultFilterText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '800',
  },
  searchResultFilterTextActive: {
    color: '#FFFFFF',
  },
  searchResultsList: {
    flex: 1,
  },
  searchResultsListContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  searchResultsNotice: {
    minHeight: 48,
    marginBottom: 8,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchResultsNoticeText: {
    flex: 1,
    marginLeft: 9,
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
  },
  searchResultsLoadingState: {
    minHeight: 190,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  searchResultsLoadingTitle: {
    marginTop: 12,
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  searchResultsLoadingText: {
    marginTop: 6,
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
  },
  resultCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
  },
  resultCardPinned: {
    backgroundColor: '#EFF6FF',
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
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  resultCardSubtitleText: {
    marginTop: 3,
    color: '#64748B',
    fontSize: 12,
  },
  resultCardMetaLine: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resultCardRatingText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '800',
  },
  resultCardOpenText: {
    color: '#15803D',
    fontSize: 12,
    fontWeight: '800',
  },
  resultCardClosedText: {
    color: '#DC2626',
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
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  resultCardDistanceBadgeNear: {
    backgroundColor: '#DCFCE7',
  },
  resultCardDistanceBadgeLocal: {
    backgroundColor: '#EEF2FF',
  },
  resultCardDistanceBadgeFar: {
    backgroundColor: '#FFF7ED',
  },
  resultCardDistanceText: {
    fontSize: 11,
    fontWeight: '800',
  },
  resultCardDistanceTextNear: {
    color: '#15803D',
  },
  resultCardDistanceTextLocal: {
    color: BRAND,
  },
  resultCardDistanceTextFar: {
    color: '#C2410C',
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
  resultPhotoList: {
    marginTop: 12,
    gap: 8,
  },
  resultPhoto: {
    width: 148,
    height: 104,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
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
  pageResultBadge: {
    marginRight: 6,
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  pageResultBadgeText: {
    color: '#1D4ED8',
    fontSize: 9,
    fontWeight: '900',
  },
  pageSuggestionBadge: {
    marginLeft: 8,
    borderRadius: 999,
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pageSuggestionBadgeText: {
    color: '#1D4ED8',
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
    fontSize: 17,
    fontWeight: '700',
  },
  searchBoxSearchMode: {
    backgroundColor: '#F1F3F4',
    shadowOpacity: 0,
    elevation: 0,
  },
  searchModeBackButton: {
    width: 32,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -4,
  },
  typeaheadOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 30,
    backgroundColor: '#FFFFFF',
  },
  typeaheadSummaryRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F2',
    paddingHorizontal: 18,
  },
  typeaheadSummaryCopy: {
    flex: 1,
    minWidth: 0,
    marginRight: 12,
  },
  typeaheadSummaryTitle: {
    color: '#1F2937',
    fontSize: 17,
    fontWeight: '800',
  },
  typeaheadSummaryText: {
    marginTop: 3,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  typeaheadSkeletonGroup: {
    backgroundColor: '#FFFFFF',
  },
  typeaheadSkeletonRow: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  typeaheadSkeletonLeading: {
    width: 62,
    alignItems: 'center',
  },
  typeaheadSkeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
  },
  typeaheadSkeletonDistance: {
    width: 38,
    height: 8,
    marginTop: 6,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  typeaheadSkeletonCopy: {
    flex: 1,
    marginLeft: 12,
    marginRight: 42,
  },
  typeaheadSkeletonLine: {
    borderRadius: 7,
    backgroundColor: '#E5E7EB',
  },
  typeaheadSkeletonTitle: {
    width: '82%',
    height: 17,
  },
  typeaheadSkeletonTitleShort: {
    width: '64%',
  },
  typeaheadSkeletonAddress: {
    width: '92%',
    height: 13,
    marginTop: 10,
    backgroundColor: '#EEF0F3',
  },
  typeaheadSkeletonAddressShort: {
    width: '72%',
  },
  typeaheadList: {
    flex: 1,
  },
  typeaheadListContent: {
    paddingBottom: 18,
  },
  typeaheadResultRow: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  typeaheadResultLeading: {
    width: 62,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  typeaheadResultIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeaheadResultDistance: {
    marginTop: 3,
    color: '#6B7280',
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  typeaheadResultCopy: {
    flex: 1,
    minWidth: 0,
    marginLeft: 12,
    marginRight: 10,
  },
  typeaheadResultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  typeaheadResultTitle: {
    flexShrink: 1,
    color: '#374151',
    fontSize: 17,
    fontWeight: '800',
  },
  vnseeaPageBadge: {
    width: 48,
    height: 17,
    marginLeft: 7,
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: APP_BRAND_COLOR,
  },
  vnseeaPageBadgeLogo: {
    width: 40,
    height: 12,
  },
  vnseeaPageBadgeText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.3,
  },
  typeaheadResultAddress: {
    marginTop: 4,
    color: '#6B7280',
    fontSize: 14,
    lineHeight: 19,
  },
  typeaheadEmptyState: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  typeaheadEmptyTitle: {
    marginTop: 12,
    color: '#374151',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  typeaheadEmptyText: {
    marginTop: 6,
    color: '#6B7280',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
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
    backgroundColor: APP_BRAND_COLOR,
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
    color: APP_BRAND_COLOR,
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
    backgroundColor: '#EF4444',
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
    backgroundColor: '#EF4444',
    transform: [{ rotate: '45deg' }],
    marginTop: -4,
    borderBottomRightRadius: 2,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  googleMarkerPinIcon: {
    width: 15,
    height: 15,
    tintColor: '#FFFFFF',
  },
});
