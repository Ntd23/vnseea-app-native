// Description: Shopee-style page location picker with Google search and a fixed center pin.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { PROVIDER_GOOGLE, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  LocateFixed,
  MapPin,
  Search,
  X,
} from 'lucide-react-native';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { apiRoutes } from '../../../shared-kernel/application/constants/route-registry';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { getCurrentDeviceLocation } from '../../../shared-kernel/application/utils/currentLocation';

export type PageLocationCoordinate = {
  latitude: number;
  longitude: number;
};

export type PageLocationSelection = {
  address: string;
  placeId?: string;
  lat: number;
  lng: number;
};

type PageLocationPickerModalProps = {
  visible: boolean;
  initialAddress?: string;
  initialPlaceId?: string;
  initialCoordinate?: PageLocationCoordinate;
  onClose: () => void;
  onConfirm: (selection: PageLocationSelection) => void;
};

type PlacePrediction = {
  place_id?: string;
  description?: string;
  main_text?: string;
  secondary_text?: string;
  lat?: number | string | null;
  lng?: number | string | null;
};

type PlaceDetailsResponse = {
  api_status?: number | string;
  place?: {
    place_id?: string;
    name?: string;
    address?: string;
    lat?: number | string | null;
    lng?: number | string | null;
  };
};

type ReverseGeocodeResponse = PlaceDetailsResponse;

const DEFAULT_COORDINATE: PageLocationCoordinate = {
  latitude: 16.047079,
  longitude: 108.20623,
};
const DEFAULT_DELTAS = {
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};
const SEARCH_DEBOUNCE_MS = 320;
const REVERSE_GEOCODE_DEBOUNCE_MS = 620;

const COPY = {
  vi: {
    title: 'Chọn vị trí trang',
    searchPlaceholder: 'Tìm địa chỉ, tên đường, tòa nhà...',
    useCurrent: 'Vị trí của tôi',
    confirm: 'Xác nhận vị trí này',
    resolving: 'Đang xác định địa chỉ...',
    dragHint: 'Kéo bản đồ để ghim vào đúng vị trí',
    empty: 'Không tìm thấy địa chỉ phù hợp.',
    searchError: 'Không tải được gợi ý địa chỉ.',
    reverseError: 'Chưa xác định được địa chỉ tại ghim này. Hãy kéo nhẹ đến vị trí gần hơn.',
    locationError: 'Không lấy được vị trí hiện tại. Bạn vẫn có thể tự kéo bản đồ.',
    addressError: 'Hãy chọn hoặc kéo đến một địa chỉ hợp lệ trước khi xác nhận.',
  },
  en: {
    title: 'Choose page location',
    searchPlaceholder: 'Search address, street, building...',
    useCurrent: 'My location',
    confirm: 'Confirm this location',
    resolving: 'Resolving address...',
    dragHint: 'Drag the map to place the pin exactly',
    empty: 'No matching address found.',
    searchError: 'Unable to load address suggestions.',
    reverseError: 'Could not resolve this pin to an address. Move it slightly and try again.',
    locationError: 'Unable to get your location. You can still move the map manually.',
    addressError: 'Choose or move to a valid address before confirming.',
  },
} as const;

function isValidCoordinate(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function toRegion(coordinate: PageLocationCoordinate, deltas = DEFAULT_DELTAS): Region {
  return {
    latitude: coordinate.latitude,
    longitude: coordinate.longitude,
    latitudeDelta: deltas.latitudeDelta,
    longitudeDelta: deltas.longitudeDelta,
  };
}

function toCoordinate(latitude: unknown, longitude: unknown): PageLocationCoordinate | null {
  const nextLatitude = Number(latitude);
  const nextLongitude = Number(longitude);
  return isValidCoordinate(nextLatitude, nextLongitude)
    ? { latitude: nextLatitude, longitude: nextLongitude }
    : null;
}

function mapPrediction(record: PlacePrediction, index: number) {
  const description = String(record.description || '').trim();
  if (!description) return null;
  return {
    id: String(record.place_id || `${description}-${index}`),
    placeId: String(record.place_id || ''),
    description,
    mainText: String(record.main_text || description),
    secondaryText: String(record.secondary_text || ''),
    coordinate: toCoordinate(record.lat, record.lng),
  };
}

type MappedPrediction = NonNullable<ReturnType<typeof mapPrediction>>;

export default function PageLocationPickerModal({
  visible,
  initialAddress = '',
  initialPlaceId,
  initialCoordinate,
  onClose,
  onConfirm,
}: PageLocationPickerModalProps) {
  const language = useAppLanguage();
  const copy = COPY[language] || COPY.vi;
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const regionRef = useRef<Region>(
    toRegion(
      initialCoordinate &&
        isValidCoordinate(initialCoordinate.latitude, initialCoordinate.longitude)
        ? initialCoordinate
        : DEFAULT_COORDINATE,
    ),
  );
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestIdRef = useRef(0);
  const reverseRequestIdRef = useRef(0);
  const sessionIdRef = useRef(0);
  const latestQueryRef = useRef(initialAddress);
  const skipNextSearchRef = useRef(false);
  const hasResolvedAddressRef = useRef(
    Boolean(initialAddress.trim() && initialCoordinate),
  );
  const [region, setRegion] = useState<Region>(regionRef.current);
  const [query, setQuery] = useState(initialAddress);
  const [predictions, setPredictions] = useState<MappedPrediction[]>([]);
  const [selectedAddress, setSelectedAddress] = useState(initialAddress);
  const [selectedPlaceId, setSelectedPlaceId] = useState(initialPlaceId);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const animateToCoordinate = useCallback(
    (coordinate: PageLocationCoordinate, deltas = DEFAULT_DELTAS) => {
      const nextRegion = toRegion(coordinate, deltas);
      regionRef.current = nextRegion;
      setRegion(nextRegion);
      mapRef.current?.animateToRegion(nextRegion, 450);
    },
    [],
  );

  const reverseGeocode = useCallback(
    async (coordinate: PageLocationCoordinate, sessionId: number) => {
      const requestId = ++reverseRequestIdRef.current;
      setIsResolving(true);
      try {
        const response = await apiBridge.post<ReverseGeocodeResponse>(
          apiRoutes.user.mapDiscovery,
          {
            type: 'reverse_geocode',
            lat: coordinate.latitude,
            lng: coordinate.longitude,
            language,
            country: language === 'vi' ? 'vn' : undefined,
          },
        );
        if (
          sessionId !== sessionIdRef.current ||
          requestId !== reverseRequestIdRef.current
        ) {
          return;
        }
        const place = response.place;
        const resolvedCoordinate = toCoordinate(place?.lat, place?.lng);
        const address = String(place?.address || place?.name || '').trim();
        if (resolvedCoordinate) {
          regionRef.current = {
            ...regionRef.current,
            ...resolvedCoordinate,
          };
          setRegion(current => ({ ...current, ...resolvedCoordinate }));
        }
        setSelectedAddress(address);
        setSelectedPlaceId(String(place?.place_id || '') || undefined);
        hasResolvedAddressRef.current = Boolean(address);
        setErrorMessage('');
      } catch {
        if (
          sessionId === sessionIdRef.current &&
          requestId === reverseRequestIdRef.current
        ) {
          setErrorMessage(copy.reverseError);
          hasResolvedAddressRef.current = false;
        }
      } finally {
        if (
          sessionId === sessionIdRef.current &&
          requestId === reverseRequestIdRef.current
        ) {
          setIsResolving(false);
        }
      }
    },
    [copy.reverseError, language],
  );

  const scheduleReverseGeocode = useCallback(
    (nextRegion: Region, sessionId: number) => {
      // Invalidate an in-flight request immediately when the user moves the
      // map, so a slower response for the previous center cannot overwrite
      // the address currently under the pin.
      reverseRequestIdRef.current += 1;
      if (reverseTimerRef.current) {
        clearTimeout(reverseTimerRef.current);
      }
      const coordinate = {
        latitude: nextRegion.latitude,
        longitude: nextRegion.longitude,
      };
      setIsResolving(true);
      reverseTimerRef.current = setTimeout(() => {
        reverseGeocode(coordinate, sessionId);
      }, REVERSE_GEOCODE_DEBOUNCE_MS);
    },
    [reverseGeocode],
  );

  const fetchPredictions = useCallback(
    async (searchText: string, sessionId: number) => {
      const trimmed = searchText.trim();
      if (trimmed.length < 3) {
        setPredictions([]);
        setIsSearching(false);
        return;
      }

      const requestId = ++searchRequestIdRef.current;
      setIsSearching(true);
      setErrorMessage('');
      try {
        const response = await apiBridge.post<{
          api_status?: number | string;
          predictions?: PlacePrediction[];
        }>(apiRoutes.user.mapDiscovery, {
          type: 'place_autocomplete',
          query: trimmed,
          language,
          country: language === 'vi' ? 'vn' : undefined,
          prefer_address: 1,
        });
        if (
          sessionId !== sessionIdRef.current ||
          requestId !== searchRequestIdRef.current ||
          searchText !== latestQueryRef.current
        ) {
          return;
        }
        const nextPredictions = (response.predictions || [])
          .map(mapPrediction)
          .filter(Boolean) as MappedPrediction[];
        setPredictions(nextPredictions);
        if (nextPredictions.length === 0) {
          setErrorMessage(copy.empty);
        }
      } catch {
        if (
          sessionId === sessionIdRef.current &&
          requestId === searchRequestIdRef.current &&
          searchText === latestQueryRef.current
        ) {
          setPredictions([]);
          setErrorMessage(copy.searchError);
        }
      } finally {
        if (
          sessionId === sessionIdRef.current &&
          requestId === searchRequestIdRef.current &&
          searchText === latestQueryRef.current
        ) {
          setIsSearching(false);
        }
      }
    },
    [copy.empty, copy.searchError, language],
  );

  useEffect(() => {
    if (!visible) return;
    const sessionId = ++sessionIdRef.current;
    const coordinate =
      initialCoordinate &&
      isValidCoordinate(initialCoordinate.latitude, initialCoordinate.longitude)
        ? initialCoordinate
        : null;
    const nextRegion = toRegion(coordinate || DEFAULT_COORDINATE);
    regionRef.current = nextRegion;
    setRegion(nextRegion);
    setQuery(initialAddress);
    latestQueryRef.current = initialAddress;
    skipNextSearchRef.current = false;
    setSelectedAddress(initialAddress);
    setSelectedPlaceId(initialPlaceId);
    hasResolvedAddressRef.current = Boolean(initialAddress.trim() && coordinate);
    setPredictions([]);
    setErrorMessage('');
    setIsResolving(false);
    if (coordinate) {
      mapRef.current?.animateToRegion(nextRegion, 250);
      scheduleReverseGeocode(nextRegion, sessionId);
    }

    return () => {
      sessionIdRef.current += 1;
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      if (reverseTimerRef.current) clearTimeout(reverseTimerRef.current);
    };
  }, [
    initialAddress,
    initialCoordinate,
    initialPlaceId,
    scheduleReverseGeocode,
    visible,
  ]);

  useEffect(() => {
    if (!visible) return;
    const sessionId = sessionIdRef.current;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    latestQueryRef.current = query;
    searchRequestIdRef.current += 1;
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      setPredictions([]);
      setIsSearching(false);
      return;
    }
    if (query.trim().length < 3) {
      setPredictions([]);
      setIsSearching(false);
      return;
    }
    searchTimerRef.current = setTimeout(() => {
      fetchPredictions(query, sessionId);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [fetchPredictions, query, visible]);

  const handleRegionChangeComplete = useCallback(
    (nextRegion: Region) => {
      regionRef.current = nextRegion;
      setRegion(nextRegion);
      hasResolvedAddressRef.current = false;
      setSelectedAddress('');
      setSelectedPlaceId(undefined);
      scheduleReverseGeocode(nextRegion, sessionIdRef.current);
    },
    [scheduleReverseGeocode],
  );

  const handleSelectPrediction = useCallback(
    async (prediction: MappedPrediction) => {
      Keyboard.dismiss();
      setPredictions([]);
      setErrorMessage('');
      skipNextSearchRef.current = true;
      setQuery(prediction.description);
      const sessionId = sessionIdRef.current;
      let coordinate = prediction.coordinate;
      let address = prediction.description;
      let placeId = prediction.placeId || undefined;

      if (!coordinate && placeId) {
        try {
          const details = await apiBridge.post<PlaceDetailsResponse>(
            apiRoutes.user.mapDiscovery,
            {
              type: 'place_details',
              place_id: placeId,
              language,
            },
          );
          coordinate = toCoordinate(details.place?.lat, details.place?.lng);
          address = String(details.place?.address || details.place?.name || address).trim();
          placeId = String(details.place?.place_id || placeId) || undefined;
        } catch {
          // Keep the visible suggestion; the user can still refine it by panning.
        }
      }

      if (
        !coordinate ||
        sessionId !== sessionIdRef.current ||
        prediction.description !== latestQueryRef.current
      ) {
        setSelectedAddress(address);
        setSelectedPlaceId(placeId);
        hasResolvedAddressRef.current = false;
        return;
      }

      setSelectedAddress(address);
      setSelectedPlaceId(placeId);
      hasResolvedAddressRef.current = Boolean(address);
      animateToCoordinate(coordinate, {
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      });
    },
    [animateToCoordinate, language],
  );

  const handleUseCurrentLocation = useCallback(async () => {
    setErrorMessage('');
    try {
      const current = await getCurrentDeviceLocation(6000);
      const coordinate = {
        latitude: current.latitude,
        longitude: current.longitude,
      };
      hasResolvedAddressRef.current = false;
      setSelectedAddress('');
      animateToCoordinate(coordinate, {
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      });
      scheduleReverseGeocode(regionRef.current, sessionIdRef.current);
    } catch {
      setErrorMessage(copy.locationError);
    }
  }, [animateToCoordinate, copy.locationError, scheduleReverseGeocode]);

  const handleQueryChange = useCallback((text: string) => {
    skipNextSearchRef.current = false;
    latestQueryRef.current = text;
    setQuery(text);
  }, []);

  const handleConfirm = useCallback(() => {
    const currentRegion = regionRef.current;
    const address = selectedAddress.trim();
    if (
      !isValidCoordinate(currentRegion.latitude, currentRegion.longitude) ||
      !address ||
      !hasResolvedAddressRef.current
    ) {
      setErrorMessage(copy.addressError);
      return;
    }
    onConfirm({
      address,
      placeId: selectedPlaceId,
      lat: currentRegion.latitude,
      lng: currentRegion.longitude,
    });
    Keyboard.dismiss();
  }, [copy.addressError, onConfirm, selectedAddress, selectedPlaceId]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          onPanDrag={Keyboard.dismiss}
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          moveOnMarkerPress={false}
        />

        <View
          pointerEvents="box-none"
          style={[styles.topOverlay, { paddingTop: Math.max(insets.top, 10) + 8 }]}
        >
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={onClose} style={styles.iconButton} activeOpacity={0.82}>
              <ArrowLeft size={21} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.title}>{copy.title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.iconButton} activeOpacity={0.82}>
              <X size={20} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBox}>
            <Search size={19} color="#64748b" />
            <TextInput
              value={query}
              onChangeText={handleQueryChange}
              placeholder={copy.searchPlaceholder}
              placeholderTextColor="#94a3b8"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {isSearching ? <ActivityIndicator size="small" color="#002fff" /> : null}
          </View>

          {predictions.length > 0 ? (
            <View style={styles.predictionPanel}>
              <FlatList
                data={predictions}
                keyExtractor={item => item.id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.78}
                    style={styles.predictionRow}
                    onPress={() => handleSelectPrediction(item)}
                  >
                    <View style={styles.predictionIcon}>
                      <MapPin size={17} color="#002fff" />
                    </View>
                    <View style={styles.predictionCopy}>
                      <Text style={styles.predictionMain} numberOfLines={1}>
                        {item.mainText}
                      </Text>
                      <Text style={styles.predictionSecondary} numberOfLines={2}>
                        {item.secondaryText || item.description}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </View>
          ) : null}
        </View>

        <View pointerEvents="none" style={styles.centerPin}>
          <MapPin size={48} color="#ef4444" fill="#ef4444" strokeWidth={1.8} />
          <View style={styles.pinShadow} />
        </View>

        <View style={[styles.bottomCard, { paddingBottom: Math.max(insets.bottom, 14) + 6 }]}>
          <View style={styles.dragHandle} />
          <Text style={styles.dragHint}>{copy.dragHint}</Text>
          <View style={styles.addressRow}>
            <View style={styles.addressIcon}>
              <MapPin size={19} color="#002fff" />
            </View>
            <View style={styles.addressCopy}>
              {isResolving ? (
                <View style={styles.resolvingRow}>
                  <ActivityIndicator size="small" color="#002fff" />
                  <Text style={styles.resolvingText}>{copy.resolving}</Text>
                </View>
              ) : (
                <Text style={styles.addressText} numberOfLines={3}>
                  {selectedAddress || query || copy.dragHint}
                </Text>
              )}
            </View>
          </View>
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={handleUseCurrentLocation}
              style={styles.currentLocationButton}
            >
              <LocateFixed size={18} color="#002fff" />
              <Text style={styles.currentLocationText}>{copy.useCurrent}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={handleConfirm}
              disabled={isResolving}
              style={[styles.confirmButton, isResolving ? styles.confirmButtonDisabled : null]}
            >
              <Check size={18} color="#ffffff" strokeWidth={2.8} />
              <Text style={styles.confirmText}>{copy.confirm}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#e2e8f0',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
  },
  headerRow: {
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  title: {
    flex: 1,
    color: '#0f172a',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    minHeight: 50,
    marginTop: 10,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.13,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    marginLeft: 10,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    color: '#0f172a',
    fontSize: 15,
  },
  predictionPanel: {
    maxHeight: 250,
    marginTop: 8,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    shadowColor: '#0f172a',
    shadowOpacity: 0.13,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  predictionRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  predictionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  predictionCopy: {
    flex: 1,
  },
  predictionMain: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '800',
  },
  predictionSecondary: {
    marginTop: 2,
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
  },
  centerPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    alignItems: 'center',
    transform: [{ translateX: -24 }, { translateY: -45 }],
  },
  pinShadow: {
    width: 12,
    height: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(15,23,42,0.25)',
    marginTop: -4,
  },
  bottomCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingTop: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#cbd5e1',
    marginBottom: 8,
  },
  dragHint: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 54,
  },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  addressCopy: {
    flex: 1,
    paddingTop: 2,
  },
  addressText: {
    color: '#0f172a',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  resolvingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
  },
  resolvingText: {
    marginLeft: 8,
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 6,
    color: '#dc2626',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 10,
  },
  currentLocationButton: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentLocationText: {
    marginLeft: 7,
    color: '#1d4ed8',
    fontSize: 13,
    fontWeight: '800',
  },
  confirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: '#002fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.62,
  },
  confirmText: {
    marginLeft: 7,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
});
