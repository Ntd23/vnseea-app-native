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
  Image,
  Keyboard,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  Share,
  StatusBar,
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
  ExternalLink,
  LocateFixed,
  MapPin,
  Search,
  X,
} from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { useUserViewModel } from '../../application/view-models/useUserViewModel';
import type {
  MapPlacePrediction,
  NearbyPlace,
} from '../../domain/types/user.types';

type NearbyNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000FF';
const ACCENT = '#EF4444';
const FALLBACK_AVATAR = 'https://cdn-icons-png.flaticon.com/512/847/847969.png';
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

function formatCoordinate(coordinate: LatLng) {
  return `${coordinate.latitude.toFixed(14)},${coordinate.longitude.toFixed(
    14,
  )}`;
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
      <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
        <MapPin size={18} color={isGoogle ? '#64748B' : ACCENT} />
      </View>
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
  const [activeRoute, setActiveRoute] = useState<LatLng[]>([]);
  const [hasCenteredOnUser, setHasCenteredOnUser] = useState(false);
  const [hasLoadedNearbyPages, setHasLoadedNearbyPages] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');

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
        });
        setActiveRoute(route.path);
        setActiveDestination(destination);
        lastRoutedOriginRef.current = origin;

        if (route.path.length > 1) {
          mapRef.current?.fitToCoordinates(route.path, {
            animated: true,
            edgePadding: { top: 120, right: 60, bottom: 270, left: 60 },
          });
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
    setActiveDestination(null);
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
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={DEFAULT_REGION}
        loadingEnabled
        showsCompass
        showsMyLocationButton={false}
        showsUserLocation={locationAllowed && !currentLocation}
        toolbarEnabled={false}
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
            zIndex={20}
            onPress={selectCurrentUser}
          >
            <View
              style={[
                styles.currentUserMarker,
                { transform: [{ rotate: `${currentHeading}deg` }] },
              ]}
            >
              <View style={styles.currentUserArrow}>
                <View style={styles.currentUserArrowInner} />
              </View>
            </View>
          </Marker>
        ) : null}

        {pageMarkers.map(({ place, coordinate }) => (
          <Marker
            key={place.id}
            coordinate={coordinate}
            onPress={() => selectPage(place)}
          >
            <View style={styles.marker}>
              <Image
                source={{ uri: place.avatarUrl || FALLBACK_AVATAR }}
                style={styles.markerImage}
              />
            </View>
          </Marker>
        ))}

        {selectedPoint ? (
          <Marker
            coordinate={selectedPoint.coordinate}
            onPress={() => {
              setIsSheetCollapsed(false);
              if (selectedPoint.source !== 'self') {
                refreshRoute(selectedPoint.coordinate).catch(() => undefined);
              }
            }}
          >
            <View
              style={[
                styles.selectedMarker,
                selectedPoint.source === 'google' && styles.googleMarker,
              ]}
            >
              <MapPin size={22} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </Marker>
        ) : null}

        {activeRoute.length > 1 ? (
          <Polyline
            coordinates={activeRoute}
            strokeColor={BRAND}
            strokeWidth={5}
          />
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
            placeholder="Tìm Page hoặc địa chỉ Google..."
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

      {!locationAllowed ? (
        <View style={styles.permissionNotice}>
          <MapPin size={16} color="#D97706" />
          <Text className="ml-2 flex-1 text-xs font-semibold text-amber-700">
            Bật quyền vị trí để zoom quanh bạn trong phạm vi 1km và cập nhật chỉ
            đường.
          </Text>
        </View>
      ) : null}

      {selectedPoint && isSheetCollapsed ? (
        <TouchableOpacity
          activeOpacity={0.88}
          style={styles.sheetPeek}
          onPress={() => setIsSheetCollapsed(false)}
        >
          <MapPin size={17} color={BRAND} />
          <Text style={styles.sheetPeekText} numberOfLines={1}>
            {selectedPoint.title}
          </Text>
          <Text style={styles.sheetPeekAction}>Mở</Text>
        </TouchableOpacity>
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
              onPress={() => refreshRoute(selectedPoint.coordinate)}
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

          {selectedPoint.url ? (
            <TouchableOpacity
              activeOpacity={0.86}
              className="mt-3 flex-row items-center justify-center rounded-xl border border-slate-200 px-4 py-3"
              onPress={() =>
                Linking.openURL(selectedPoint.url || '').catch(() => undefined)
              }
            >
              <ExternalLink size={17} color={BRAND} />
              <Text className="ml-2 text-sm font-bold text-blue-700">
                Xem chi tiết
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 5,
  },
  currentUserMarker: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
  },
  currentUserArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 22,
    borderRightWidth: 22,
    borderBottomWidth: 54,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#FFFFFF',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 8,
  },
  currentUserArrowInner: {
    position: 'absolute',
    left: -16,
    top: 8,
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderBottomWidth: 40,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: BRAND,
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
    backgroundColor: '#22C55E',
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
  marker: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    elevation: 4,
  },
  markerImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    elevation: 5,
  },
  searchInput: {
    marginLeft: 10,
    minHeight: 46,
    flex: 1,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '700',
  },
  selectedMarker: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ACCENT,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    elevation: 6,
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
  sheetPeek: {
    position: 'absolute',
    right: 14,
    bottom: 18,
    left: 14,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    elevation: 8,
  },
  sheetPeekAction: {
    color: BRAND,
    fontSize: 13,
    fontWeight: '800',
  },
  sheetPeekText: {
    marginLeft: 8,
    flex: 1,
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '800',
  },
  suggestionPanel: {
    position: 'absolute',
    top: 72,
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
    top: 12,
    right: 14,
    left: 14,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
});
