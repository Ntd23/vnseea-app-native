// Description: Shows backend-backed nearby people discovery with name and distance filters.
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  LayoutAnimation,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type LatLng,
  type UserLocationChangeEvent,
} from 'react-native-maps';
import Config from 'react-native-config';
import {
  ArrowLeft,
  BriefcaseBusiness,
  FileText,
  Filter,
  MapPin,
  RefreshCw,
  Search,
  Store,
  Users,
  UserRoundSearch,
  Verified,
  X,
} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ROUTES} from '../../../navigation/constants/routes';
import type {RootStackParamList} from '../../../navigation/types';
import type {
  NearbyPlace,
  NearbyPlaceKind,
  UserProfile,
} from '../../domain/types/user.types';
import {useUserViewModel} from '../../application/view-models/useUserViewModel';

type NearbyNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#1D4ED8';
const DISTANCE_OPTIONS = [5, 10, 25, 50];
const FILTER_OPTIONS = [
  {id: 'all', label: 'Tất cả'},
  {id: 'user', label: 'Người dùng'},
  {id: 'page', label: 'Trang'},
  {id: 'shop', label: 'Cửa hàng'},
  {id: 'business', label: 'Doanh nghiệp'},
] as const;
const DEFAULT_REGION = {
  latitude: 16.047079,
  longitude: 108.20623,
  latitudeDelta: 5,
  longitudeDelta: 5,
};
const FALLBACK_AVATAR =
  'https://cdn-icons-png.flaticon.com/512/847/847969.png';

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

  return {latitude, longitude};
}

function shouldSyncLocation(previous: LatLng | null, next: LatLng) {
  if (!previous) {
    return true;
  }

  return (
    Math.abs(previous.latitude - next.latitude) > 0.001 ||
    Math.abs(previous.longitude - next.longitude) > 0.001
  );
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

function fuzzyMatch(query: string, target: string): boolean {
  const q = normalizeString(query);
  const t = normalizeString(target);
  if (!q) {
    return true;
  }
  if (t.includes(q)) {
    return true;
  }

  let qIdx = 0;
  for (let tIdx = 0; tIdx < t.length; tIdx++) {
    if (t[tIdx] === q[qIdx]) {
      qIdx++;
      if (qIdx === q.length) {
        return true;
      }
    }
  }
  return false;
}

type NearbyFilter = (typeof FILTER_OPTIONS)[number]['id'];

type DiscoveryItem =
  | {id: string; kind: 'user'; user: UserProfile}
  | {id: string; kind: NearbyPlaceKind; place: NearbyPlace};

function formatDistance(distance: string | number | undefined) {
  const numericDistance = Number(distance);

  if (!Number.isFinite(numericDistance)) {
    return 'Ở gần bạn';
  }

  if (numericDistance < 1) {
    return `${Math.max(1, Math.round(numericDistance * 1000))} m`;
  }

  return `${numericDistance.toFixed(numericDistance < 10 ? 1 : 0)} km`;
}

function distanceValue(item: DiscoveryItem) {
  const distance =
    item.kind === 'user' ? item.user.distance : item.place.distance;
  const numericDistance = Number(distance);
  return Number.isFinite(numericDistance) ? numericDistance : Infinity;
}

function NearbyUserRow({
  onPress,
  user,
}: {
  onPress: () => void;
  user: UserProfile;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={{
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
      className="mb-3 flex-row items-center rounded-2xl border border-slate-100 bg-white p-4"
      onPress={onPress}>
      <Image
        source={{uri: user.avatarUrl || FALLBACK_AVATAR}}
        className="h-14 w-14 rounded-full bg-slate-100 border border-slate-100"
        resizeMode="cover"
      />

      <View className="ml-3.5 flex-1">
        <View className="flex-row items-center">
          <Text className="flex-shrink text-base font-bold text-slate-800" numberOfLines={1}>
            {user.name || user.username || 'Người dùng'}
          </Text>
          {user.verified && <Verified size={15} color="#1D4ED8" fill="#1D4ED8" className="ml-1" />}
        </View>

        {user.username && (
          <Text className="text-xs text-slate-400 mt-0.5" numberOfLines={1}>
            @{user.username}
          </Text>
        )}

        <View className="mt-2 flex-row items-center bg-blue-50/70 self-start px-2 py-0.5 rounded-full">
          <MapPin size={11} color="#1D4ED8" />
          <Text className="ml-1 text-[11px] font-bold text-blue-700">
            {formatDistance(user.distance)}
          </Text>
        </View>
      </View>

      <View className="rounded-full bg-blue-50 px-3.5 py-1.5 border border-blue-100/50">
        <Text className="text-xs font-bold text-blue-700">Chi tiết</Text>
      </View>
    </TouchableOpacity>
  );
}

function NearbyPlaceRow({
  onPress,
  place,
}: {
  onPress: () => void;
  place: NearbyPlace;
}) {
  const isPage = place.kind === 'page';
  const isShop = place.kind === 'shop';
  const accentColor = isPage ? '#7C3AED' : isShop ? '#16A34A' : '#EA580C';
  const kindLabel = isPage ? 'Trang' : isShop ? 'Cửa hàng' : 'Doanh nghiệp';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={{
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
      }}
      className="mb-3 flex-row items-center rounded-2xl border border-slate-100 bg-white p-4"
      onPress={onPress}>
      <Image
        source={{uri: place.avatarUrl || FALLBACK_AVATAR}}
        className="h-14 w-14 rounded-2xl bg-slate-100 border border-slate-100"
        resizeMode="cover"
      />

      <View className="ml-3.5 flex-1">
        <Text className="text-base font-bold text-slate-800" numberOfLines={1}>
          {place.name}
        </Text>

        <View className="mt-1 flex-row items-center">
          {isPage ? (
            <FileText size={12} color={accentColor} />
          ) : isShop ? (
            <Store size={12} color="#16A34A" />
          ) : (
            <BriefcaseBusiness size={12} color="#EA580C" />
          )}
          <Text
            className="ml-1 text-xs font-bold"
            style={{color: accentColor}}>
            {kindLabel}
          </Text>
          {place.category && (
            <Text className="ml-1 flex-1 text-xs text-slate-400" numberOfLines={1}>
              · {place.category}
            </Text>
          )}
        </View>

        <View className="mt-2 flex-row items-center bg-slate-50 self-start px-2 py-0.5 rounded-full border border-slate-100">
          <MapPin size={11} color="#64748B" />
          <Text className="ml-1 text-[11px] font-bold text-slate-500" numberOfLines={1}>
            {place.location || formatDistance(place.distance)}
          </Text>
        </View>
      </View>

      <View className="rounded-full bg-slate-50 px-3.5 py-1.5 border border-slate-100">
        <Text className="text-xs font-bold text-slate-600">Xem trang</Text>
      </View>
    </TouchableOpacity>
  );
}

function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push({
      latitude: lat / 1E5,
      longitude: lng / 1E5,
    });
  }

  return points;
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function NearbyUsersScreen() {
  const navigation = useNavigation<NearbyNav>();
  const {
    error,
    isLoading,
    loadNearbyDiscovery,
    nearbyPlaces,
    nearbyUsers,
  } = useUserViewModel();
  const mapRef = useRef<MapView>(null);
  const currentLocationRef = useRef<LatLng | null>(null);
  const lastSyncedLocationRef = useRef<LatLng | null>(null);
  const [distance, setDistance] = useState(25);
  const [keyword, setKeyword] = useState('');
  const [submittedKeyword, setSubmittedKeyword] = useState('');
  const [filter, setFilter] = useState<NearbyFilter>('all');
  const [locationAllowed, setLocationAllowed] = useState(Platform.OS === 'ios');
  const [showFilters, setShowFilters] = useState(false);
  const [showList, setShowList] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  const handleToggleFilters = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowFilters(prev => !prev);
  }, []);

  const handleToggleList = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowList(prev => !prev);
  }, []);

  const handleFocusSearch = useCallback(() => {
    if (!showFilters) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setShowFilters(true);
    }
  }, [showFilters]);

  const [selectedPoint, setSelectedPoint] = useState<any | null>(null);
  const [activeRoute, setActiveRoute] = useState<LatLng[] | null>(null);

  const handleGetDirections = useCallback((destLat: number, destLng: number) => {
    const origin = currentLocationRef.current;
    if (!origin) {
      Alert.alert(
        'Không tìm thấy vị trí',
        'Chưa xác định được vị trí hiện tại của bạn. Ứng dụng sẽ chuyển sang Google Maps ngoài để chỉ đường.',
        [
          {
            text: 'Mở Google Maps',
            onPress: () => {
              const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
              Linking.openURL(url).catch(() => undefined);
            },
          },
          { text: 'Hủy', style: 'cancel' },
        ]
      );
      return;
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destLat},${destLng}&key=${Config.GOOGLE_MAPS_API_KEY}`;
    
    console.log('[Directions] Requesting route:', url);

    fetch(url)
      .then(res => res.json())
      .then(data => {
        console.log('[Directions] Response:', data);
        if (data.status === 'OK' && data.routes && data.routes.length > 0) {
          const points = decodePolyline(data.routes[0].overview_polyline.points);
          setActiveRoute(points);
          
          mapRef.current?.fitToCoordinates([origin, { latitude: destLat, longitude: destLng }], {
            animated: true,
            edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
          });
        } else {
          console.warn('[Directions] API returned non-OK status:', data.status, data.error_message);
          
          let alertMsg = `Không thể vẽ đường đi trong ứng dụng (Status: ${data.status}).`;
          if (data.status === 'REQUEST_DENIED') {
            alertMsg += '\n\nNguyên nhân: Khóa Google Maps API của bạn đang bị giới hạn ứng dụng (Application Restrictions) trên Google Cloud Console, chặn cuộc gọi Web Service trực tiếp từ thiết bị.\n\nHướng dẫn sửa:\n1. Vào Google Cloud Console.\n2. Cập nhật khóa API này (hoặc tạo khóa mới) và chọn "Application restrictions" là "None" (Không có).\n3. Trong mục "API restrictions", chọn "Restrict key" và tích chọn "Directions API".\n4. Cập nhật khóa mới vào tệp .env.';
          } else if (data.error_message) {
            alertMsg += `\n\nChi tiết lỗi: ${data.error_message}`;
          }

          Alert.alert(
            'Lỗi chỉ đường Google API',
            alertMsg,
            [
              {
                text: 'Mở bản đồ ngoài',
                onPress: () => {
                  const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destLat},${destLng}`;
                  Linking.openURL(mapUrl).catch(() => undefined);
                },
              },
              { text: 'Đóng', style: 'cancel' },
            ]
          );
        }
      })
      .catch(err => {
        console.error('[Directions] Fetch error:', err);
        Alert.alert(
          'Lỗi kết nối',
          'Không thể kết nối tới Google Directions API. Hệ thống sẽ mở bản đồ ngoài.',
          [
            {
              text: 'Mở bản đồ ngoài',
              onPress: () => {
                const mapUrl = `https://www.google.com/maps/dir/?api=1&origin=${origin.latitude},${origin.longitude}&destination=${destLat},${destLng}`;
                Linking.openURL(mapUrl).catch(() => undefined);
              },
            },
            { text: 'Đóng', style: 'cancel' },
          ]
        );
      });
  }, []);

  const loadDiscovery = useCallback(async (location = currentLocationRef.current) => {
    try {
      await loadNearbyDiscovery({
        distance,
        keyword: submittedKeyword || undefined,
        limit: 35,
        lat: location?.latitude,
        lng: location?.longitude,
      });
    } catch {
      // The view-model exposes the backend message through `error`.
    }
  }, [distance, loadNearbyDiscovery, submittedKeyword]);

  useEffect(() => {
    loadDiscovery();
  }, [loadDiscovery]);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Cho phép truy cập vị trí',
        message: 'VNSEEA cần vị trí của bạn để hiển thị người dùng ở gần.',
        buttonPositive: 'Cho phép',
        buttonNegative: 'Để sau',
      },
    )
      .then(result => {
        setLocationAllowed(result === PermissionsAndroid.RESULTS.GRANTED);
      })
      .catch(() => setLocationAllowed(false));
  }, []);

  const discoveryItems = useMemo<DiscoveryItem[]>(
    () =>
      [
        ...nearbyUsers.map(user => ({
          id: `user:${String(user.id)}`,
          kind: 'user' as const,
          user,
        })),
        ...nearbyPlaces.map(place => ({
          id: place.id,
          kind: place.kind,
          place,
        })),
      ].sort((left, right) => distanceValue(left) - distanceValue(right)),
    [nearbyPlaces, nearbyUsers],
  );

  const visibleItems = useMemo(
    () =>
      filter === 'all'
        ? discoveryItems
        : discoveryItems.filter(item => item.kind === filter),
    [discoveryItems, filter],
  );

  const filteredSuggestions = useMemo(() => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      return [];
    }

    return discoveryItems
      .filter(item => {
        const title =
          item.kind === 'user'
            ? item.user.name || item.user.username || ''
            : item.place.name || '';
        const username = item.kind === 'user' ? item.user.username || '' : '';
        return fuzzyMatch(trimmed, title) || fuzzyMatch(trimmed, username);
      })
      .slice(0, 6);
  }, [discoveryItems, keyword]);

  const handleSelectSuggestion = useCallback((item: DiscoveryItem) => {
    Keyboard.dismiss();
    setSearchFocused(false);

    const title =
      item.kind === 'user'
        ? item.user.name || item.user.username || 'Người dùng'
        : item.place.name;
    setKeyword(title);

    const coordinate =
      item.kind === 'user'
        ? parseGeoInfo(item.user.geoInfo)
        : item.place.coordinate;

    if (coordinate) {
      const point = {
        coordinate,
        description:
          item.kind === 'user'
            ? formatDistance(item.user.distance)
            : item.place.location || formatDistance(item.place.distance),
        id: item.id,
        title,
        avatarUrl:
          item.kind === 'user' ? item.user.avatarUrl : item.place.avatarUrl,
        kind: item.kind,
        onPress: () => {
          if (item.kind === 'user') {
            navigation.navigate(ROUTES.PROFILE, {
              userId: String(item.user.id),
            });
          } else {
            if (item.place.url) {
              Linking.openURL(item.place.url).catch(() => undefined);
            }
          }
        },
      };

      setSelectedPoint(point);

      mapRef.current?.animateToRegion(
        {
          ...coordinate,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        },
        600
      );
    }
  }, [navigation]);

  const mapPoints = useMemo(
    () =>
      visibleItems.flatMap(item => {
        if (item.kind === 'user') {
          const coordinate = parseGeoInfo(item.user.geoInfo);

          return coordinate
            ? [{
                coordinate,
                description: formatDistance(item.user.distance),
                id: item.id,
                title: item.user.name || item.user.username || 'Người dùng',
                avatarUrl: item.user.avatarUrl,
                kind: 'user' as any,
                onPress: () =>
                  navigation.navigate(ROUTES.PROFILE, {
                    userId: String(item.user.id),
                  }),
              }]
            : [];
        }

        return item.place.coordinate
          ? [{
              coordinate: item.place.coordinate,
              description:
                item.place.location || formatDistance(item.place.distance),
              id: item.id,
              title: item.place.name,
              avatarUrl: item.place.avatarUrl,
              kind: 'place' as any,
              onPress: () => {
                if (item.place.url) {
                  Linking.openURL(item.place.url).catch(() => undefined);
                }
              },
            }]
          : [];
      }),
    [navigation, visibleItems],
  );

  useEffect(() => {
    if (mapPoints.length === 0) {
      return;
    }

    mapRef.current?.fitToCoordinates(
      mapPoints.map(item => item.coordinate),
      {
        animated: true,
        edgePadding: {top: 48, right: 48, bottom: 48, left: 48},
      },
    );
  }, [mapPoints]);

  const handleUserLocationChange = useCallback(
    (event: UserLocationChangeEvent) => {
      const coordinate = event.nativeEvent.coordinate;

      if (
        !coordinate ||
        !Number.isFinite(coordinate.latitude) ||
        !Number.isFinite(coordinate.longitude)
      ) {
        return;
      }

      const location = {
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      };
      currentLocationRef.current = location;

      if (!shouldSyncLocation(lastSyncedLocationRef.current, location)) {
        return;
      }

      lastSyncedLocationRef.current = location;
      loadDiscovery(location);
    },
    [loadDiscovery],
  );

  const submitSearch = useCallback(() => {
    Keyboard.dismiss();
    setSearchFocused(false);
    const normalizedKeyword = keyword.trim();

    if (normalizedKeyword === submittedKeyword) {
      loadDiscovery();
      return;
    }

    setSubmittedKeyword(normalizedKeyword);
  }, [keyword, loadDiscovery, submittedKeyword]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#1D4ED8" />

      {/* Header */}
      <View className="h-14 flex-row items-center bg-blue-700 px-4">
        <TouchableOpacity
          activeOpacity={0.8}
          className="h-10 w-10 items-center justify-center rounded-full"
          onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-[17px] font-bold text-white">Khám phá gần đây</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          className="h-10 w-10 items-center justify-center rounded-full"
          onPress={() => loadDiscovery()}>
          <RefreshCw size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Filters & Settings Panel */}
      <View style={{ zIndex: 50 }} className="border-b border-slate-200/60 bg-white px-4 pb-4 pt-4 shadow-sm">
        {/* Search Row */}
        <View className="flex-row items-center gap-2">
          <View className="flex-1 flex-row items-center rounded-xl bg-slate-100 px-3">
            <Search size={18} color="#64748B" />
            <TextInput
              value={keyword}
              onChangeText={setKeyword}
              onFocus={() => {
                handleFocusSearch();
                setSearchFocused(true);
              }}
              onBlur={() => {
                setTimeout(() => setSearchFocused(false), 200);
              }}
              onSubmitEditing={submitSearch}
              placeholder="Tìm theo tên hoặc username..."
              placeholderTextColor="#94A3B8"
              returnKeyType="search"
              className="ml-2 flex-1 py-3 text-sm text-slate-800"
            />
            {keyword.length > 0 && (
              <TouchableOpacity
                activeOpacity={0.8}
                className="h-7 w-7 items-center justify-center rounded-full bg-slate-200/50 mr-1"
                onPress={() => {
                  setKeyword('');
                  setSubmittedKeyword('');
                  setSearchFocused(false);
                }}
              >
                <X size={14} color="#64748B" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            className={`h-12 w-12 items-center justify-center rounded-xl border ${
              showFilters ? 'bg-blue-50 border-blue-200' : 'bg-slate-100 border-slate-100'
            }`}
            onPress={handleToggleFilters}>
            <Filter size={20} color={showFilters ? '#1D4ED8' : '#64748B'} />
          </TouchableOpacity>
        </View>

        {/* Autocomplete Suggestions Dropdown */}
        {searchFocused && filteredSuggestions.length > 0 && (
          <View
            style={{
              position: 'absolute',
              top: 68,
              left: 16,
              right: 16,
              backgroundColor: '#FFFFFF',
              borderRadius: 12,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              maxHeight: 280,
              shadowColor: '#0F172A',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
              elevation: 5,
              zIndex: 9999,
            }}
          >
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 4 }}
            >
              {filteredSuggestions.map(item => {
                const title =
                  item.kind === 'user'
                    ? item.user.name || item.user.username || 'Người dùng'
                    : item.place.name;
                const desc =
                  item.kind === 'user'
                    ? `@${item.user.username || ''} · ${formatDistance(item.user.distance)}`
                    : item.place.location || formatDistance(item.place.distance);
                const avatar =
                  item.kind === 'user' ? item.user.avatarUrl : item.place.avatarUrl;
                const isPage = item.kind === 'page';
                const isShop = item.kind === 'shop';
                const isUser = item.kind === 'user';
                const isBusiness = item.kind === 'business';

                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.7}
                    onPress={() => handleSelectSuggestion(item)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      borderBottomWidth: 1,
                      borderBottomColor: '#F1F5F9',
                    }}
                  >
                    <Image
                      source={{ uri: avatar || FALLBACK_AVATAR }}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: isUser ? 18 : 8,
                        backgroundColor: '#F1F5F9',
                      }}
                      resizeMode="cover"
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 14,
                          fontWeight: 'bold',
                          color: '#0F172A',
                        }}
                      >
                        {title}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={{
                          fontSize: 11,
                          color: '#64748B',
                          marginTop: 2,
                        }}
                      >
                        {desc}
                      </Text>
                    </View>
                    <View style={{ marginLeft: 8 }}>
                      {isUser && <Users size={14} color="#1D4ED8" />}
                      {isPage && <FileText size={14} color="#7C3AED" />}
                      {isShop && <Store size={14} color="#16A34A" />}
                      {isBusiness && <BriefcaseBusiness size={14} color="#EA580C" />}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Dynamic Filters Panel */}
        {showFilters && (
          <View className="mt-4 border-t border-slate-100 pt-4">
            {/* Distance Selector */}
            <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Bán kính tìm kiếm
            </Text>
            <View className="flex-row gap-2">
              {DISTANCE_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option}
                  activeOpacity={0.8}
                  className={`rounded-full px-4 py-2 border ${
                    distance === option ? 'bg-blue-700 border-blue-700' : 'bg-slate-100 border-slate-100'
                  }`}
                  onPress={() => setDistance(option)}>
                  <Text
                    className={`text-xs font-bold ${
                      distance === option ? 'text-white' : 'text-slate-600'
                    }`}>
                    {option} km
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Category Filters */}
            <ScrollView
              horizontal
              className="mt-4"
              contentContainerStyle={{ gap: 8 }}
              showsHorizontalScrollIndicator={false}>
              {FILTER_OPTIONS.map(option => {
                const active = filter === option.id;
                return (
                  <TouchableOpacity
                    key={option.id}
                    activeOpacity={0.8}
                    className={`flex-row items-center rounded-full px-4 py-2 border ${
                      active ? 'bg-slate-900 border-slate-900' : 'bg-slate-100 border-slate-100'
                    }`}
                    onPress={() => setFilter(option.id)}>
                    {option.id === 'user' && (
                      <Users size={13} color={active ? '#FFFFFF' : '#64748B'} />
                    )}
                    {option.id === 'page' && (
                      <FileText size={13} color={active ? '#FFFFFF' : '#7C3AED'} />
                    )}
                    {option.id === 'shop' && (
                      <Store size={13} color={active ? '#FFFFFF' : '#16A34A'} />
                    )}
                    {option.id === 'business' && (
                      <BriefcaseBusiness
                        size={13}
                        color={active ? '#FFFFFF' : '#EA580C'}
                      />
                    )}
                    <Text
                      className={`text-xs font-bold ${
                        option.id === 'all' ? '' : 'ml-1.5'
                      } ${active ? 'text-white' : 'text-slate-600'}`}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Map View */}
      {showList ? (
        <View style={styles.mapContainerHalf}>
          <MapView
            ref={mapRef}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={DEFAULT_REGION}
            loadingEnabled
            showsCompass
            showsMyLocationButton={locationAllowed}
            showsUserLocation={locationAllowed}
            toolbarEnabled={false}
            onUserLocationChange={handleUserLocationChange}
            style={styles.map}>
            {mapPoints.map(point => (
              <Marker
                key={point.id}
                coordinate={point.coordinate}
                onPress={() => setSelectedPoint(point)}>
                <View style={styles.customMarkerContainer}>
                  <View style={styles.markerBubble}>
                    <Text style={styles.markerTitle} numberOfLines={1}>
                      {point.title}
                    </Text>
                    <Text style={styles.markerDescription}>
                      {point.description}
                    </Text>
                  </View>
                  <View style={styles.markerArrow} />
                  <View style={styles.markerAvatarContainer}>
                    <Image
                      source={{uri: point.avatarUrl || FALLBACK_AVATAR}}
                      style={styles.markerAvatar}
                      resizeMode="cover"
                    />
                  </View>
                </View>
              </Marker>
            ))}
            {activeRoute && (
              <Polyline
                coordinates={activeRoute}
                strokeColor="#1D4ED8"
                strokeWidth={5}
              />
            )}
          </MapView>
          {activeRoute && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.clearRouteButton}
              onPress={() => {
                setActiveRoute(null);
                if (mapPoints.length > 0) {
                  mapRef.current?.fitToCoordinates(
                    mapPoints.map(item => item.coordinate),
                    {
                      animated: true,
                      edgePadding: {top: 48, right: 48, bottom: 48, left: 48},
                    },
                  );
                }
              }}
            >
              <X size={14} color="#FFFFFF" />
              <Text style={styles.clearRouteText}>Hủy chỉ đường</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <View style={styles.mapContainerFull}>
          <MapView
            ref={mapRef}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={DEFAULT_REGION}
            loadingEnabled
            showsCompass
            showsMyLocationButton={locationAllowed}
            showsUserLocation={locationAllowed}
            toolbarEnabled={false}
            onUserLocationChange={handleUserLocationChange}
            style={styles.map}>
            {mapPoints.map(point => (
              <Marker
                key={point.id}
                coordinate={point.coordinate}
                onPress={() => setSelectedPoint(point)}>
                <View style={styles.customMarkerContainer}>
                  <View style={styles.markerBubble}>
                    <Text style={styles.markerTitle} numberOfLines={1}>
                      {point.title}
                    </Text>
                    <Text style={styles.markerDescription}>
                      {point.description}
                    </Text>
                  </View>
                  <View style={styles.markerArrow} />
                  <View style={styles.markerAvatarContainer}>
                    <Image
                      source={{uri: point.avatarUrl || FALLBACK_AVATAR}}
                      style={styles.markerAvatar}
                      resizeMode="cover"
                    />
                  </View>
                </View>
              </Marker>
            ))}
            {activeRoute && (
              <Polyline
                coordinates={activeRoute}
                strokeColor="#1D4ED8"
                strokeWidth={5}
              />
            )}
          </MapView>
          {activeRoute && (
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.clearRouteButton}
              onPress={() => {
                setActiveRoute(null);
                if (mapPoints.length > 0) {
                  mapRef.current?.fitToCoordinates(
                    mapPoints.map(item => item.coordinate),
                    {
                      animated: true,
                      edgePadding: {top: 48, right: 48, bottom: 48, left: 48},
                    },
                  );
                }
              }}
            >
              <X size={14} color="#FFFFFF" />
              <Text style={styles.clearRouteText}>Hủy chỉ đường</Text>
            </TouchableOpacity>
          )}
          {!locationAllowed && (
            <View className="absolute bottom-24 left-4 right-4 flex-row items-center rounded-xl bg-amber-50 px-4 py-2.5 border border-amber-100 shadow-sm">
              <MapPin size={14} color="#D97706" />
              <Text className="ml-2 flex-1 text-xs font-medium leading-4 text-amber-700">
                Bật quyền vị trí để cập nhật kết quả chính xác quanh bạn.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Static location warning for list view */}
      {showList && !locationAllowed && (
        <View className="flex-row items-center bg-amber-50 px-4 py-2.5 border-b border-amber-100">
          <MapPin size={14} color="#D97706" />
          <Text className="ml-2 flex-1 text-xs font-medium leading-4 text-amber-700">
            Bật quyền vị trí để cập nhật kết quả chính xác quanh bạn.
          </Text>
        </View>
      )}

      {/* List results (only if showList is true) */}
      {showList && (
        isLoading && visibleItems.length === 0 ? (
          <View key="nearby-loading" className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#1D4ED8" />
            <Text className="mt-3 text-sm font-medium text-slate-500">Đang tải dữ liệu gần bạn...</Text>
          </View>
        ) : error && visibleItems.length === 0 ? (
          <View key="nearby-error" className="flex-1 items-center justify-center px-8">
            <UserRoundSearch size={56} color="#94A3B8" />
            <Text className="mt-4 text-center text-base font-bold text-slate-800">
              Không tải được dữ liệu gần bạn
            </Text>
            <Text className="mt-2 text-center text-sm text-slate-500">{error}</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              className="mt-5 rounded-full bg-blue-700 px-6 py-3"
              onPress={() => loadDiscovery()}>
              <Text className="font-bold text-white">Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : visibleItems.length === 0 ? (
          <View key="nearby-empty" className="flex-1 items-center justify-center px-8">
            <UserRoundSearch size={56} color="#94A3B8" />
            <Text className="mt-4 text-center text-base font-bold text-slate-800">
              Chưa tìm thấy kết quả gần bạn
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
              Thử tăng bán kính tìm kiếm hoặc chọn loại nội dung khác.
            </Text>
          </View>
        ) : (
          <FlatList
            key="nearby-list"
            data={visibleItems}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 80 }}
            refreshControl={
              <RefreshControl refreshing={isLoading} onRefresh={() => loadDiscovery()} tintColor="#1D4ED8" />
            }
            renderItem={({item}) => (
              item.kind === 'user' ? (
                <NearbyUserRow
                  user={item.user}
                  onPress={() => {
                    const coordinate = parseGeoInfo(item.user.geoInfo);
                    if (coordinate) {
                      setSelectedPoint({
                        coordinate,
                        description: formatDistance(item.user.distance),
                        id: item.id,
                        title: item.user.name || item.user.username || 'Người dùng',
                        avatarUrl: item.user.avatarUrl,
                        kind: 'user',
                        onPress: () =>
                          navigation.navigate(ROUTES.PROFILE, {
                            userId: String(item.user.id),
                          }),
                      });
                    } else {
                      navigation.navigate(ROUTES.PROFILE, {
                        userId: String(item.user.id),
                      });
                    }
                  }}
                />
              ) : (
                <NearbyPlaceRow
                  place={item.place}
                  onPress={() => {
                    if (item.place.coordinate) {
                      setSelectedPoint({
                        coordinate: item.place.coordinate,
                        description:
                          item.place.location || formatDistance(item.place.distance),
                        id: item.id,
                        title: item.place.name,
                        avatarUrl: item.place.avatarUrl,
                        kind: 'place',
                        onPress: () => {
                          if (item.place.url) {
                            Linking.openURL(item.place.url).catch(() => undefined);
                          }
                        },
                      });
                    } else {
                      if (item.place.url) {
                        Linking.openURL(item.place.url).catch(() => undefined);
                      }
                    }
                  }}
                />
              )
            )}
          />
        )
      )}

      {/* Floating Toggle Button */}
      <View
        pointerEvents="box-none"
        style={styles.floatingButtonContainer}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleToggleList}
          style={styles.floatingButton}
        >
          {showList ? (
            <MapPin size={16} color="#FFFFFF" />
          ) : (
            <Users size={16} color="#FFFFFF" />
          )}
          <Text style={styles.floatingButtonText}>
            {showList
              ? 'Xem bản đồ'
              : `Hiện danh sách (${visibleItems.length})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Custom Action Sheet Modal */}
      <Modal
        visible={selectedPoint !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPoint(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setSelectedPoint(null)}
        >
          <View style={styles.modalContent}>
            {/* Header / Target Profile Info */}
            {selectedPoint && (
              <View style={styles.modalProfileRow}>
                <Image
                  source={{ uri: selectedPoint.avatarUrl || FALLBACK_AVATAR }}
                  style={styles.modalAvatar}
                />
                <View style={styles.modalInfoCol}>
                  <Text style={styles.modalNameText} numberOfLines={1}>
                    {selectedPoint.title}
                  </Text>
                  <Text style={styles.modalDistanceText}>
                    {selectedPoint.description}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalSeparator} />

            {/* Action Buttons */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.modalPrimaryBtn}
              onPress={() => {
                if (selectedPoint) {
                  selectedPoint.onPress();
                  setSelectedPoint(null);
                }
              }}
            >
              <Users size={18} color="#FFFFFF" />
              <Text style={styles.modalPrimaryBtnText}>
                {selectedPoint?.kind === 'user' ? 'Xem trang cá nhân' : 'Xem chi tiết trang'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.modalSecondaryBtn}
              onPress={() => {
                if (selectedPoint) {
                  handleGetDirections(
                    selectedPoint.coordinate.latitude,
                    selectedPoint.coordinate.longitude
                  );
                  setSelectedPoint(null);
                }
              }}
            >
              <MapPin size={18} color="#1D4ED8" />
              <Text style={styles.modalSecondaryBtnText}>Chỉ đường đi</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.modalCancelBtn}
              onPress={() => setSelectedPoint(null)}
            >
              <Text style={styles.modalCancelBtnText}>Hủy bỏ</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: '100%',
  },
  mapContainerFull: {
    flex: 1,
    width: '100%',
  },
  mapContainerHalf: {
    height: 220,
    width: '100%',
  },
  customMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerBubble: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxWidth: 120,
  },
  markerTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  markerDescription: {
    fontSize: 9,
    fontWeight: '600',
    color: '#1D4ED8',
    marginTop: 1,
  },
  markerArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderLeftColor: 'transparent',
    borderRightWidth: 6,
    borderRightColor: 'transparent',
    borderTopWidth: 6,
    borderTopColor: '#FFFFFF',
    alignSelf: 'center',
    marginTop: -1,
  },
  markerAvatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#1D4ED8',
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  markerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  floatingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  floatingButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  modalProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  modalInfoCol: {
    marginLeft: 14,
    flex: 1,
  },
  modalNameText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0F172A',
  },
  modalDistanceText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
  },
  modalSeparator: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 20,
  },
  modalPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1D4ED8',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 12,
    gap: 8,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalSecondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 16,
    gap: 8,
  },
  modalSecondaryBtnText: {
    color: '#1D4ED8',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  clearRouteButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 5,
  },
  clearRouteText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});
