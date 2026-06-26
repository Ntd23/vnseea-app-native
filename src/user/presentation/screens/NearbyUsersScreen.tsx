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
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
  Compass,
  LocateFixed,
  MapPin,
  Search,
  X,
} from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { useUserViewModel } from '../../application/view-models/useUserViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import type {
  MapPlacePrediction,
  NearbyPlace,
} from '../../domain/types/user.types';

type NearbyNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000FF';
const ACCENT = '#EF4444';
const FALLBACK_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';
const NAVIGATION_CAMERA_PITCH = 60;
const NAVIGATION_CAMERA_ZOOM = 19.25;
const ROUTE_CONNECTOR_MIN_METERS = 5;
const ROUTE_LOOKAHEAD_MIN_METERS = 14;
const ROUTE_LOOKAHEAD_MAX_METERS = 58;
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
  coordinate: LatLng;
  distanceMeters?: number;
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
    error,
    getPlaceDetails,
    getRoute,
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
  const lastRoutedOriginRef = useRef<LatLng | null>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [locationAllowed, setLocationAllowed] = useState(Platform.OS === 'ios');
  const [currentLocation, setCurrentLocation] = useState<LatLng | null>(null);
  const [currentHeading, setCurrentHeading] = useState(0);
  const [query, setQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<SelectedPoint | null>(
    null,
  );
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

  const selectedDistance = useMemo(() => {
    if (!selectedPoint) return undefined;
    if (currentLocation) {
      return distanceMeters(currentLocation, selectedPoint.coordinate);
    }
    return selectedPoint.distanceMeters;
  }, [currentLocation, selectedPoint]);
  const currentUserMarkerHeading =
    activeRoute.length > 1 && routeHeading !== null
      ? routeHeading
      : currentHeading;

  const centerOnUser = useCallback(() => {
    const location = currentLocationRef.current;
    if (!location) return;

    mapRef.current?.animateToRegion(
      {
        ...location,
        latitudeDelta: 0.009,
        longitudeDelta: 0.009,
      },
      450,
    );
  }, []);

  const resetMapHeading = useCallback(() => {
    mapRef.current?.animateCamera(
      {
        heading: 0,
        pitch: activeRoute.length > 1 ? NAVIGATION_CAMERA_PITCH : 0,
      },
      { duration: 320 },
    );
  }, [activeRoute.length]);

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

  const refreshRoute = useCallback(
    async (destination: LatLng) => {
      const origin = currentLocationRef.current;
      if (!origin) return;

      try {
        const route = await getRoute({
          originLat: origin.latitude,
          originLng: origin.longitude,
          destinationLat: destination.latitude,
          destinationLng: destination.longitude,
          mode: 'walking',
        });
        const routePath = normalizeRoutePath(route.path, origin, destination);
        const navigationPath = buildNavigationPath(origin, routePath);
        const routeConnector =
          navigationPath.length > routePath.length
            ? [navigationPath[0], navigationPath[1]]
            : [];

        setActiveRoute(routePath);
        setActiveRouteConnector(routeConnector);
        setActiveDestination(destination);
        setActiveRouteDuration(route.durationSeconds);
        lastRoutedOriginRef.current = origin;

        if (navigationPath.length > 1) {
          const distance = routeDistance(navigationPath);
          const routeBearing = initialRouteHeading(
            navigationPath,
            origin,
            destination,
          );
          const cameraCenter =
            pointAlongRoute(
              navigationPath,
              Math.min(
                ROUTE_LOOKAHEAD_MAX_METERS,
                Math.max(ROUTE_LOOKAHEAD_MIN_METERS, distance * 0.22),
              ),
            ) || origin;
          const navigationCamera = {
            center: cameraCenter,
            heading: routeBearing,
            pitch: NAVIGATION_CAMERA_PITCH,
            zoom: NAVIGATION_CAMERA_ZOOM,
          };

          setRouteHeading(routeBearing);
          mapRef.current?.animateCamera(
            navigationCamera,
            { duration: 650 },
          );
          setTimeout(() => {
            mapRef.current?.animateCamera(navigationCamera, { duration: 220 });
          }, 700);
        } else {
          setActiveRouteConnector([]);
          setRouteHeading(null);
        }
      } catch {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${destination.latitude},${destination.longitude}`;
        Linking.openURL(url).catch(() => undefined);
      }
    },
    [getRoute],
  );

  const selectPoint = useCallback(
    (point: SelectedPoint, shouldRoute = true) => {
      Keyboard.dismiss();
      setIsSearchFocused(false);
      setSelectedPoint(point);
      setIsSheetCollapsed(false);
      setActiveRouteDuration(null);

      mapRef.current?.animateToRegion(
        {
          ...point.coordinate,
          latitudeDelta: 0.007,
          longitudeDelta: 0.007,
        },
        450,
      );

      if (shouldRoute && point.source !== 'self') {
        refreshRoute(point.coordinate).catch(() => undefined);
      }
    },
    [refreshRoute],
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
      currentLocationRef.current = location;
      setCurrentLocation(location);
      if (Number.isFinite(Number(coordinate.heading))) {
        setCurrentHeading(Number(coordinate.heading));
      }

      if (!hasCenteredOnUser) {
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

      if (!hasLoadedNearbyPages) {
        hasLoadedNearbyPagesRef.current = true;
        setHasLoadedNearbyPages(true);
        loadPagesAroundUser(location).catch(() => undefined);
      }

      if (!activeDestination) return;
      const lastOrigin = lastRoutedOriginRef.current;
      if (!lastOrigin || distanceMeters(lastOrigin, location) > 30) {
        refreshRoute(activeDestination).catch(() => undefined);
      }
    },
    [
      activeDestination,
      hasCenteredOnUser,
      hasLoadedNearbyPages,
      loadPagesAroundUser,
      refreshRoute,
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

  const handleGetDirections = useCallback(() => {
    if (!selectedPoint) return;
    const dest = selectedPoint.coordinate;

    const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${dest.latitude},${dest.longitude}&travelmode=walking`;
    const appleMapsUrl = `http://maps.apple.com/?daddr=${dest.latitude},${dest.longitude}&dirflg=w`;

    const openMap = (url: string) => {
      Linking.openURL(url).catch(() => {
        Alert.alert('Lỗi', 'Không thể mở ứng dụng bản đồ.');
      });
    };

    if (Platform.OS === 'ios') {
      Alert.alert(
        'Chọn bản đồ',
        'Bạn muốn bắt đầu chỉ đường bằng ứng dụng nào?',
        [
          {
            text: 'Google Maps',
            onPress: () => openMap(googleMapsUrl),
          },
          {
            text: 'Apple Maps',
            onPress: () => openMap(appleMapsUrl),
          },
          {
            text: 'Xem lộ trình trong app',
            onPress: () => refreshRoute(dest).catch(() => undefined),
          },
          {
            text: 'Huỷ',
            style: 'cancel',
          },
        ],
        { cancelable: true },
      );
    } else {
      Alert.alert(
        'Bắt đầu điều hướng',
        'Mở Google Maps để bắt đầu chỉ đường và điều hướng?',
        [
          {
            text: 'Mở Google Maps',
            onPress: () => openMap(googleMapsUrl),
          },
          {
            text: 'Xem lộ trình trong app',
            onPress: () => refreshRoute(dest).catch(() => undefined),
          },
          {
            text: 'Huỷ',
            style: 'cancel',
          },
        ],
        { cancelable: true },
      );
    }
  }, [selectedPoint, refreshRoute]);

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

    loadCurrentUser()
      .then(user => {
        if (cancelled || currentLocationRef.current) return;
        const storedLocation = parseGeoInfo(user?.geoInfo);
        if (!storedLocation) return;

        currentLocationRef.current = storedLocation;
        setCurrentLocation(storedLocation);
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
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [loadCurrentUser, loadPagesAroundUser]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={DEFAULT_REGION}
        googleMapId={hasGoogleMapId ? googleMapId : undefined}
        loadingEnabled
        mapType="standard"
        pitchEnabled
        rotateEnabled
        showsBuildings={false}
        showsCompass
        showsIndoorLevelPicker={false}
        showsIndoors={false}
        showsMyLocationButton={false}
        showsUserLocation={locationAllowed && !currentLocation}
        toolbarEnabled={false}
        userInterfaceStyle="light"
        onPoiClick={handlePoiPress}
        onUserLocationChange={handleUserLocationChange}
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

        {currentLocation ? (
          <Marker
            anchor={{ x: 0.5, y: 0.5 }}
            coordinate={currentLocation}
            flat
            rotation={currentUserMarkerHeading}
            zIndex={20}
            onPress={selectCurrentUser}
          >
            <View style={styles.currentUserMarker}>
              <View style={styles.currentUserPuck}>
                <View style={styles.currentUserArrow}>
                  <View style={styles.currentUserArrowTail} />
                  <View style={styles.currentUserArrowHead} />
                </View>
              </View>
            </View>
          </Marker>
        ) : null}

        {pageMarkers.map(({ place, coordinate }) => {
          if (
            selectedPoint?.source === 'page' &&
            selectedPoint.id === place.id
          ) {
            return null;
          }

          const showNameBadge = true;

          return (
            <Marker
              key={`${place.id}:badge`}
              anchor={showNameBadge ? { x: 0.13, y: 1 } : { x: 0.5, y: 1 }}
              coordinate={coordinate}
              onPress={() => selectPage(place)}
              tracksViewChanges={showNameBadge}
              zIndex={showNameBadge ? 12 : 4}
            >
              <View
                style={[
                  styles.pageMarker,
                  showNameBadge && styles.pageMarkerWithBadge,
                ]}
              >
                <View style={styles.pagePinWrapper}>
                  <View style={styles.pagePinTail} />
                  <View style={styles.pagePinHead}>
                    <View style={styles.pagePinCore} />
                  </View>
                </View>
                {showNameBadge ? (
                  <View style={styles.pageNameBadge}>
                    <Text style={styles.pageNameBadgeText} numberOfLines={1}>
                      {place.name}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Marker>
          );
        })}

        {selectedPoint ? (
          <Marker
            key={`selected:${selectedPoint.id}:${selectedPoint.title}`}
            anchor={
              selectedPoint.showNameBadge ? { x: 0.13, y: 1 } : { x: 0.5, y: 1 }
            }
            coordinate={selectedPoint.coordinate}
            onPress={() => {
              setIsSheetCollapsed(false);
              if (selectedPoint.source !== 'self') {
                refreshRoute(selectedPoint.coordinate).catch(() => undefined);
              }
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

        {activeRoute.length > 1 ? (
          <>
            {activeRouteConnector.length > 1 ? (
              <>
                <Polyline
                  coordinates={activeRouteConnector}
                  lineCap="round"
                  lineDashPattern={[2, 8]}
                  strokeColor="rgba(255, 255, 255, 0.95)"
                  strokeWidth={8}
                  zIndex={15}
                />
                <Polyline
                  coordinates={activeRouteConnector}
                  lineCap="round"
                  lineDashPattern={[2, 8]}
                  strokeColor="#6B7280"
                  strokeWidth={4}
                  zIndex={16}
                />
              </>
            ) : null}
            <Polyline
              coordinates={activeRoute}
              lineCap="round"
              lineJoin="round"
              strokeColor="rgba(255, 255, 255, 0.92)"
              strokeWidth={9}
              zIndex={16}
            />
            <Polyline
              coordinates={activeRoute}
              lineCap="round"
              lineJoin="round"
              strokeColor="#1A73E8"
              strokeWidth={6}
              zIndex={17}
            />
          </>
        ) : null}
      </MapView>

      <View style={styles.topControls}>
        <TouchableOpacity
          activeOpacity={0.86}
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <Search size={18} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm quanh đây..."
            placeholderTextColor="#94A3B8"
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
          ) : null}
        </View>
      </View>

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

      {selectedPoint && !isSheetCollapsed ? (
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
                  {formatDuration(activeRouteDuration)} đi bộ
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

          <View className="mt-4 flex-row gap-2">
            <TouchableOpacity
              activeOpacity={0.86}
              className="flex-1 items-center rounded-xl border border-slate-200 bg-white px-2 py-3"
              onPress={centerOnUser}
            >
              <Text className="text-xs font-extrabold text-slate-900">
                Vị trí của tôi
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              className="flex-1 items-center rounded-xl bg-blue-700 px-2 py-3"
              onPress={handleGetDirections}
              disabled={selectedPoint.source === 'self'}
              style={selectedPoint.source === 'self' ? { opacity: 0.45 } : null}
            >
              <Text className="text-xs font-extrabold text-white">
                Chỉ đường
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              className="flex-1 items-center rounded-xl border border-slate-200 bg-white px-2 py-3"
              onPress={handleShare}
            >
              <Text className="text-xs font-extrabold text-slate-900">
                Chia sẻ
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
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
    bottom: 94,
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
    width: 44,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pageMarkerWithBadge: {
    width: 190,
  },
  pageNameBadge: {
    maxWidth: 132,
    marginLeft: 4,
    marginBottom: 16,
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
  searchBox: {
    marginLeft: 10,
    minHeight: 42,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    elevation: 5,
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
  suggestionPanel: {
    position: 'absolute',
    top: Platform.OS === 'android' ? 96 : 72,
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
});
