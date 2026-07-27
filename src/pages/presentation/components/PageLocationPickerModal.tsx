// Description: Shopee-style page location picker with Google search and a fixed center pin.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
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
import { getCurrentDeviceLocation } from '../../../shared-kernel/application/utils/currentLocation';
import { parseMapCoordinate } from '../../../shared-kernel/application/utils/mapCoordinate';
import type {
  AddressSuggestion,
  NearbyAddressSuggestion,
} from '../../../shared-kernel/domain/types/addressSearch.types';
import {
  createAddressSearchRepository,
  createAddressSessionToken,
  resolveAddressLocationBias,
} from '../../../shared-kernel/infrastructure/address/ApiAddressSearchRepository';

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

const DEFAULT_COORDINATE: PageLocationCoordinate = {
  latitude: 16.047079,
  longitude: 108.20623,
};
const DEFAULT_DELTAS = {
  latitudeDelta: 0.025,
  longitudeDelta: 0.025,
};
const SELECTED_PLACE_DELTAS = {
  latitudeDelta: 0.0008,
  longitudeDelta: 0.0008,
};
const MIN_SEARCH_CHARS = 2;
const SEARCH_DEBOUNCE_MS = 320;
const REVERSE_GEOCODE_DEBOUNCE_MS = 620;
const addressSearchRepository = createAddressSearchRepository();

const COPY = {
  vi: {
    title: 'Chọn vị trí trang',
    searchPlaceholder: 'Tìm địa chỉ, tên đường, tòa nhà...',
    useCurrent: 'Vị trí của tôi',
    confirm: 'Xác nhận vị trí này',
    resolving: 'Đang tìm vị trí gần ghim...',
    dragHint: 'Kéo bản đồ để ghim vào đúng vị trí',
    enteredAddress: 'Địa chỉ đã nhập',
    nearbyLocation: 'Vị trí gần ghim',
    nearbySuggestions: 'Gợi ý vị trí gần đó',
    distanceFromPin: 'Cách ghim',
    pinCoordinates: 'Tọa độ ghim chính xác',
    coordinateOnly: 'Đã lấy tọa độ ghim; chưa tìm được tên vị trí gần đó.',
    empty: 'Không tìm thấy địa chỉ phù hợp.',
    searchError: 'Không tải được gợi ý địa chỉ.',
    googleAttribution: 'Google Maps',
    locationError: 'Không lấy được vị trí hiện tại. Bạn vẫn có thể tự kéo bản đồ.',
    addressError: 'Hãy nhập địa chỉ và chọn tọa độ ghim trước khi xác nhận.',
  },
  en: {
    title: 'Choose page location',
    searchPlaceholder: 'Search address, street, building...',
    useCurrent: 'My location',
    confirm: 'Confirm this location',
    resolving: 'Finding a nearby location...',
    dragHint: 'Drag the map to place the pin exactly',
    enteredAddress: 'Entered address',
    nearbyLocation: 'Near the pin',
    nearbySuggestions: 'Nearby place suggestions',
    distanceFromPin: 'From pin',
    pinCoordinates: 'Exact pin coordinates',
    coordinateOnly: 'The pin coordinates are ready; no nearby location name was found.',
    empty: 'No matching address found.',
    searchError: 'Unable to load address suggestions.',
    googleAttribution: 'Google Maps',
    locationError: 'Unable to get your location. You can still move the map manually.',
    addressError: 'Enter an address and choose pin coordinates before confirming.',
  },
} as const;

function isValidCoordinate(latitude: number, longitude: number) {
  return parseMapCoordinate(latitude, longitude) !== null;
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
  return parseMapCoordinate(latitude, longitude);
}

function mapPrediction(record: AddressSuggestion, index: number) {
  const description = String(record.description || '').trim();
  if (!description) return null;
  return {
    id: String(record.placeId || `${description}-${index}`),
    placeId: String(record.placeId || ''),
    description,
    mainText: String(record.mainText || description),
    secondaryText: String(record.secondaryText || ''),
    coordinate: toCoordinate(record.latitude, record.longitude),
  };
}

type MappedPrediction = NonNullable<ReturnType<typeof mapPrediction>>;

function nearbySuggestionAddress(suggestion: NearbyAddressSuggestion) {
  const prefix = `${suggestion.name}, `;
  return suggestion.formattedAddress.startsWith(prefix)
    ? suggestion.formattedAddress.slice(prefix.length)
    : suggestion.formattedAddress;
}

function formatNearbyDistance(distanceMeters?: number) {
  const numericDistance = Number(distanceMeters);
  if (!Number.isFinite(numericDistance)) return '';
  const distance = Math.max(0, numericDistance);
  if (distance < 1000) return `${Math.round(distance)} m`;
  return `${(distance / 1000).toFixed(distance < 10000 ? 1 : 0)} km`;
}

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
  const mapReadyRef = useRef(false);
  const mapGestureRef = useRef(false);
  const regionRef = useRef<Region>(
    toRegion(
      initialCoordinate &&
        isValidCoordinate(initialCoordinate.latitude, initialCoordinate.longitude)
        ? initialCoordinate
        : DEFAULT_COORDINATE,
      initialCoordinate &&
        isValidCoordinate(initialCoordinate.latitude, initialCoordinate.longitude)
        ? SELECTED_PLACE_DELTAS
        : DEFAULT_DELTAS,
    ),
  );
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestIdRef = useRef(0);
  const reverseRequestIdRef = useRef(0);
  const sessionIdRef = useRef(0);
  const addressSessionTokenRef = useRef(createAddressSessionToken());
  const addressLocationBiasRef = useRef<PageLocationCoordinate | undefined>(
    resolveAddressLocationBias(initialCoordinate),
  );
  const latestQueryRef = useRef(initialAddress);
  const primaryAddressRef = useRef(initialAddress.trim());
  const suppressedSearchQueryRef = useRef<string | null>(null);
  const initialPlaceRequestIdRef = useRef(0);
  const [region, setRegion] = useState<Region>(regionRef.current);
  const [query, setQuery] = useState(initialAddress);
  const [predictions, setPredictions] = useState<MappedPrediction[]>([]);
  const [selectedAddress, setSelectedAddress] = useState(initialAddress);
  const [selectedPlaceId, setSelectedPlaceId] = useState(initialPlaceId);
  const [nearbyAddress, setNearbyAddress] = useState('');
  const [nearbySuggestions, setNearbySuggestions] = useState<
    NearbyAddressSuggestion[]
  >([]);
  const [hasPinnedCoordinate, setHasPinnedCoordinate] = useState(
    Boolean(
      initialCoordinate &&
        isValidCoordinate(initialCoordinate.latitude, initialCoordinate.longitude),
    ),
  );
  const [reverseLookupFailed, setReverseLookupFailed] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const cancelPendingReverseGeocode = useCallback(() => {
    reverseRequestIdRef.current += 1;
    if (reverseTimerRef.current) {
      clearTimeout(reverseTimerRef.current);
      reverseTimerRef.current = null;
    }
    setIsResolving(false);
  }, []);

  const prepareManualPinMove = useCallback(() => {
    setSelectedPlaceId(undefined);
    setNearbyAddress('');
    setNearbySuggestions([]);
    setReverseLookupFailed(false);
    searchRequestIdRef.current += 1;
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }
    setPredictions([]);
    setIsSearching(false);
  }, []);

  const applyPrimaryAddress = useCallback(
    (address: string, placeId?: string) => {
      primaryAddressRef.current = address;
      suppressedSearchQueryRef.current = address;
      latestQueryRef.current = address;
      setQuery(address);
      setSelectedAddress(address);
      setSelectedPlaceId(placeId);
      setNearbyAddress('');
      setReverseLookupFailed(false);
      setErrorMessage('');
    },
    [],
  );

  const animateToCoordinate = useCallback(
    (coordinate: PageLocationCoordinate, deltas = DEFAULT_DELTAS) => {
      cancelPendingReverseGeocode();
      mapGestureRef.current = false;
      const nextRegion = toRegion(coordinate, deltas);
      regionRef.current = nextRegion;
      addressLocationBiasRef.current = coordinate;
      setRegion(nextRegion);
      setHasPinnedCoordinate(true);
      if (mapReadyRef.current) {
        mapRef.current?.animateToRegion(nextRegion, 450);
      }
    },
    [cancelPendingReverseGeocode],
  );

  const handleMapReady = useCallback(() => {
    mapReadyRef.current = true;
    // Modal content and MapView can become ready on different frames. Reapply
    // the latest region here so the map never remains on the default city.
    mapRef.current?.animateToRegion(regionRef.current, 250);
  }, []);

  const reverseGeocode = useCallback(
    async (coordinate: PageLocationCoordinate, sessionId: number) => {
      const requestId = ++reverseRequestIdRef.current;
      setIsResolving(true);
      try {
        const resolved =
          await addressSearchRepository.reverseGeocodeCoordinate({
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            language: language === 'en' ? 'en' : 'vi',
            country: 'vn',
            sessionToken: addressSessionTokenRef.current,
          });
        if (
          sessionId !== sessionIdRef.current ||
          requestId !== reverseRequestIdRef.current
        ) {
          return;
        }
        const address = String(resolved.formattedAddress || '').trim();
        setNearbySuggestions(resolved.nearbySuggestions.slice(0, 5));
        if (!address) {
          setNearbyAddress('');
          setReverseLookupFailed(true);
          return;
        }
        const placeId = String(resolved.placeId || '') || undefined;
        const primaryAddress = primaryAddressRef.current.trim();
        if (!primaryAddress) {
          applyPrimaryAddress(address, placeId);
        } else {
          setNearbyAddress(address === primaryAddress ? '' : address);
          setReverseLookupFailed(false);
          setErrorMessage('');
        }
      } catch {
        if (
          sessionId === sessionIdRef.current &&
          requestId === reverseRequestIdRef.current
        ) {
          setNearbyAddress('');
          setNearbySuggestions([]);
          setReverseLookupFailed(true);
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
    [applyPrimaryAddress, language],
  );

  const scheduleReverseGeocode = useCallback(
    (nextRegion: Region, sessionId: number) => {
      // Invalidate an in-flight request immediately when the user moves the
      // map, so a slower response for the previous center cannot overwrite
      // the address currently under the pin.
      const scheduledRequestId = ++reverseRequestIdRef.current;
      if (reverseTimerRef.current) {
        clearTimeout(reverseTimerRef.current);
      }
      const coordinate = {
        latitude: nextRegion.latitude,
        longitude: nextRegion.longitude,
      };
      setErrorMessage('');
      setIsResolving(true);
      reverseTimerRef.current = setTimeout(() => {
        reverseTimerRef.current = null;
        if (
          sessionId !== sessionIdRef.current ||
          scheduledRequestId !== reverseRequestIdRef.current
        ) {
          return;
        }
        reverseGeocode(coordinate, sessionId);
      }, REVERSE_GEOCODE_DEBOUNCE_MS);
    },
    [reverseGeocode],
  );

  const fetchPredictions = useCallback(
    async (searchText: string, sessionId: number) => {
      const trimmed = searchText.trim();
      if (trimmed.length < MIN_SEARCH_CHARS) {
        setPredictions([]);
        setIsSearching(false);
        return;
      }

      const requestId = ++searchRequestIdRef.current;
      setIsSearching(true);
      setErrorMessage('');
      try {
        const input = {
          query: trimmed,
          language: language === 'en' ? 'en' as const : 'vi' as const,
          country: 'vn' as const,
          locationBias: addressLocationBiasRef.current,
          sessionToken: addressSessionTokenRef.current,
        };
        const suggestions =
          await addressSearchRepository.searchAddresses(input);
        if (
          sessionId !== sessionIdRef.current ||
          requestId !== searchRequestIdRef.current ||
          searchText !== latestQueryRef.current
        ) {
          return;
        }
        const nextPredictions = suggestions
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

  const resolveInitialPlace = useCallback(
    async (placeId: string, fallbackAddress: string, sessionId: number) => {
      const requestId = ++initialPlaceRequestIdRef.current;
      setIsResolving(true);
      try {
        const resolved = await addressSearchRepository.resolveAddressSuggestion(
          {
            placeId,
            description: fallbackAddress,
            mainText: fallbackAddress,
            secondaryText: '',
            source: 'autocomplete',
          },
          {
            language: language === 'en' ? 'en' : 'vi',
            country: 'vn',
            sessionToken: addressSessionTokenRef.current,
          },
        );
        if (
          sessionId !== sessionIdRef.current ||
          requestId !== initialPlaceRequestIdRef.current
        ) {
          return;
        }

        const coordinate = toCoordinate(resolved.latitude, resolved.longitude);
        if (!coordinate) {
          setSelectedPlaceId(undefined);
          setHasPinnedCoordinate(false);
          setErrorMessage(copy.searchError);
          return;
        }

        const address = String(
          resolved.formattedAddress || fallbackAddress,
        ).trim();
        if (!address) {
          setSelectedAddress('');
          setSelectedPlaceId(undefined);
          primaryAddressRef.current = '';
          setHasPinnedCoordinate(false);
          setErrorMessage(copy.searchError);
          return;
        }
        const resolvedPlaceId =
          String(resolved.placeId || placeId) || undefined;
        applyPrimaryAddress(address, resolvedPlaceId);
        animateToCoordinate(coordinate, {
          ...SELECTED_PLACE_DELTAS,
        });
      } catch {
        if (
          sessionId === sessionIdRef.current &&
          requestId === initialPlaceRequestIdRef.current
        ) {
          setSelectedPlaceId(undefined);
          setHasPinnedCoordinate(false);
          setErrorMessage(copy.searchError);
        }
      } finally {
        if (
          sessionId === sessionIdRef.current &&
          requestId === initialPlaceRequestIdRef.current
        ) {
          setIsResolving(false);
        }
      }
    },
    [animateToCoordinate, applyPrimaryAddress, copy.searchError, language],
  );

  useEffect(() => {
    if (!visible) return;
    const sessionId = ++sessionIdRef.current;
    addressSessionTokenRef.current = createAddressSessionToken();
    initialPlaceRequestIdRef.current += 1;
    cancelPendingReverseGeocode();
    mapGestureRef.current = false;
    const coordinate =
      initialCoordinate &&
      isValidCoordinate(initialCoordinate.latitude, initialCoordinate.longitude)
        ? initialCoordinate
        : null;
    const nextRegion = toRegion(
      coordinate || DEFAULT_COORDINATE,
      coordinate ? SELECTED_PLACE_DELTAS : DEFAULT_DELTAS,
    );
    regionRef.current = nextRegion;
    addressLocationBiasRef.current = resolveAddressLocationBias(
      coordinate || undefined,
    );
    setRegion(nextRegion);
    setQuery(initialAddress);
    primaryAddressRef.current = initialAddress.trim();
    latestQueryRef.current = initialAddress;
    suppressedSearchQueryRef.current =
      initialAddress.trim() && (coordinate || initialPlaceId)
        ? initialAddress
        : null;
    setSelectedAddress(initialAddress);
    setSelectedPlaceId(initialPlaceId);
    setNearbyAddress('');
    setNearbySuggestions([]);
    setReverseLookupFailed(false);
    setHasPinnedCoordinate(Boolean(coordinate));
    setPredictions([]);
    setErrorMessage('');
    setIsResolving(false);
    setIsLocating(false);
    if (coordinate) {
      if (mapReadyRef.current) {
        mapRef.current?.animateToRegion(nextRegion, 250);
      }
      // Keep the selected suggestion visible. Reverse geocoding is needed
      // after the user pans, but would unnecessarily replace this address
      // while the picker is opening.
      if (!initialAddress.trim()) {
        scheduleReverseGeocode(nextRegion, sessionId);
      }
    } else if (initialPlaceId) {
      resolveInitialPlace(initialPlaceId, initialAddress, sessionId);
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
    cancelPendingReverseGeocode,
    resolveInitialPlace,
    scheduleReverseGeocode,
    visible,
  ]);

  useEffect(() => {
    if (!visible) return;
    const sessionId = sessionIdRef.current;
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    latestQueryRef.current = query;
    searchRequestIdRef.current += 1;
    setPredictions([]);
    setErrorMessage('');
    if (suppressedSearchQueryRef.current === query) {
      suppressedSearchQueryRef.current = null;
      setIsSearching(false);
      return;
    }
    if (query.trim().length < MIN_SEARCH_CHARS) {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchTimerRef.current = setTimeout(() => {
      fetchPredictions(query, sessionId);
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [fetchPredictions, query, visible]);

  const handleRegionChangeStart = useCallback(
    (_nextRegion: Region, details?: { isGesture?: boolean }) => {
      if (details?.isGesture === true) {
        initialPlaceRequestIdRef.current += 1;
        cancelPendingReverseGeocode();
        prepareManualPinMove();
        mapGestureRef.current = true;
        setErrorMessage('');
      }
    },
    [cancelPendingReverseGeocode, prepareManualPinMove],
  );

  const handlePanDrag = useCallback(() => {
    if (!mapGestureRef.current) {
      initialPlaceRequestIdRef.current += 1;
      cancelPendingReverseGeocode();
      prepareManualPinMove();
    }
    mapGestureRef.current = true;
    setErrorMessage('');
    Keyboard.dismiss();
  }, [cancelPendingReverseGeocode, prepareManualPinMove]);

  const handleRegionChangeComplete = useCallback(
    (nextRegion: Region, details?: { isGesture?: boolean }) => {
      regionRef.current = nextRegion;
      setRegion(nextRegion);
      const movedByUser =
        mapGestureRef.current || details?.isGesture === true;
      mapGestureRef.current = false;
      if (!movedByUser) {
        return;
      }
      // The user-entered address and the exact pin are separate fields. Keep
      // the text, but detach the old Google place ID from the new coordinate.
      prepareManualPinMove();
      setHasPinnedCoordinate(true);
      addressLocationBiasRef.current = {
        latitude: nextRegion.latitude,
        longitude: nextRegion.longitude,
      };
      scheduleReverseGeocode(nextRegion, sessionIdRef.current);
    },
    [prepareManualPinMove, scheduleReverseGeocode],
  );

  const handleSelectPrediction = useCallback(
    async (prediction: MappedPrediction) => {
      Keyboard.dismiss();
      cancelPendingReverseGeocode();
      const detailsRequestId = ++initialPlaceRequestIdRef.current;
      searchRequestIdRef.current += 1;
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
      setPredictions([]);
      setNearbySuggestions([]);
      setErrorMessage('');
      suppressedSearchQueryRef.current = prediction.description;
      latestQueryRef.current = prediction.description;
      setQuery(prediction.description);
      const sessionId = sessionIdRef.current;
      let coordinate = prediction.coordinate;
      let address = prediction.description;
      let placeId = prediction.placeId || undefined;

      if (placeId) {
        try {
          const details =
            await addressSearchRepository.resolveAddressSuggestion(
              {
                placeId,
                description: prediction.description,
                mainText: prediction.mainText,
                secondaryText: prediction.secondaryText,
                source: 'autocomplete',
                latitude: prediction.coordinate?.latitude,
                longitude: prediction.coordinate?.longitude,
              },
              {
                language: language === 'en' ? 'en' : 'vi',
                country: 'vn',
                sessionToken: addressSessionTokenRef.current,
              },
            );
          coordinate = toCoordinate(details.latitude, details.longitude);
          address = details.formattedAddress || address;
          placeId = details.placeId || placeId;
        } catch {
          coordinate = null;
        }
      } else {
        coordinate = null;
      }

      if (
        sessionId !== sessionIdRef.current ||
        detailsRequestId !== initialPlaceRequestIdRef.current ||
        prediction.description !== latestQueryRef.current
      ) {
        return;
      }

      if (!coordinate || !address) {
        primaryAddressRef.current = address;
        setSelectedAddress(address);
        setSelectedPlaceId(undefined);
        setNearbyAddress('');
        setNearbySuggestions([]);
        setReverseLookupFailed(false);
        setHasPinnedCoordinate(false);
        setErrorMessage(copy.searchError);
        return;
      }

      applyPrimaryAddress(address, placeId);
      animateToCoordinate(coordinate, {
        ...SELECTED_PLACE_DELTAS,
      });
    },
    [
      animateToCoordinate,
      applyPrimaryAddress,
      cancelPendingReverseGeocode,
      copy.searchError,
      language,
    ],
  );

  const handleSelectNearbySuggestion = useCallback(
    (suggestion: NearbyAddressSuggestion) => {
      Keyboard.dismiss();
      cancelPendingReverseGeocode();
      initialPlaceRequestIdRef.current += 1;
      searchRequestIdRef.current += 1;
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
        searchTimerRef.current = null;
      }
      setPredictions([]);
      setNearbyAddress('');
      setReverseLookupFailed(false);
      applyPrimaryAddress(
        suggestion.formattedAddress,
        suggestion.placeId || undefined,
      );
      animateToCoordinate(
        {
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
        },
        SELECTED_PLACE_DELTAS,
      );
    },
    [
      animateToCoordinate,
      applyPrimaryAddress,
      cancelPendingReverseGeocode,
    ],
  );

  const handleUseCurrentLocation = useCallback(async () => {
    setErrorMessage('');
    setIsLocating(true);
    try {
      const current = await getCurrentDeviceLocation(6000);
      const coordinate = {
        latitude: current.latitude,
        longitude: current.longitude,
      };
      cancelPendingReverseGeocode();
      prepareManualPinMove();
      // Selecting the device location is an explicit replacement, unlike
      // manually nudging the pin. Clear any previously typed address so the
      // reverse-geocoded current address becomes the primary selection.
      primaryAddressRef.current = '';
      suppressedSearchQueryRef.current = null;
      latestQueryRef.current = '';
      setQuery('');
      setSelectedAddress('');
      setSelectedPlaceId(undefined);
      animateToCoordinate(coordinate, {
        latitudeDelta: 0.006,
        longitudeDelta: 0.006,
      });
      await reverseGeocode(coordinate, sessionIdRef.current);
    } catch {
      setErrorMessage(copy.locationError);
    } finally {
      setIsLocating(false);
    }
  }, [
    animateToCoordinate,
    cancelPendingReverseGeocode,
    copy.locationError,
    prepareManualPinMove,
    reverseGeocode,
  ]);

  const handleQueryChange = useCallback(
    (text: string) => {
      cancelPendingReverseGeocode();
      suppressedSearchQueryRef.current = null;
      initialPlaceRequestIdRef.current += 1;
      primaryAddressRef.current = text;
      latestQueryRef.current = text;
      setQuery(text);
      setSelectedAddress(text);
      setSelectedPlaceId(undefined);
      setNearbyAddress('');
      setNearbySuggestions([]);
      setReverseLookupFailed(false);
      setErrorMessage('');
    },
    [cancelPendingReverseGeocode],
  );

  const handleConfirm = useCallback(() => {
    const currentRegion = regionRef.current;
    const address = selectedAddress.trim();
    if (
      !hasPinnedCoordinate ||
      !isValidCoordinate(currentRegion.latitude, currentRegion.longitude) ||
      !address
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
  }, [
    copy.addressError,
    hasPinnedCoordinate,
    onConfirm,
    selectedAddress,
    selectedPlaceId,
  ]);

  const canConfirm =
    hasPinnedCoordinate &&
    isValidCoordinate(region.latitude, region.longitude) &&
    Boolean(selectedAddress.trim());

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent={Platform.OS === 'android'}
    >
      <View style={styles.root}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          provider={PROVIDER_GOOGLE}
          initialRegion={region}
          onMapReady={handleMapReady}
          onRegionChangeStart={handleRegionChangeStart}
          onRegionChangeComplete={handleRegionChangeComplete}
          onPanDrag={handlePanDrag}
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
            {isSearching ? <ActivityIndicator size="small" color={APP_BRAND_COLOR} /> : null}
          </View>

          {predictions.length > 0 ? (
            <View style={styles.predictionPanel}>
                  <FlatList
                    data={predictions}
                    keyExtractor={item => item.id}
                    keyboardShouldPersistTaps="handled"
                    ListFooterComponent={
                      <Text style={styles.googleAttribution}>
                        {copy.googleAttribution}
                      </Text>
                    }
                    renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.78}
                    style={styles.predictionRow}
                    onPress={() => handleSelectPrediction(item)}
                  >
                    <View style={styles.predictionIcon}>
                      <MapPin size={17} color={APP_BRAND_COLOR} />
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
              <MapPin size={19} color={APP_BRAND_COLOR} />
            </View>
            <View style={styles.addressCopy}>
              <Text style={styles.addressLabel}>{copy.enteredAddress}</Text>
              <Text style={styles.addressText} numberOfLines={3}>
                {selectedAddress || copy.dragHint}
              </Text>
              {isResolving ? (
                <View style={styles.resolvingRow}>
                  <ActivityIndicator size="small" color={APP_BRAND_COLOR} />
                  <Text style={styles.resolvingText}>{copy.resolving}</Text>
                </View>
              ) : nearbyAddress ? (
                <View style={styles.nearbyRow}>
                  <Text style={styles.nearbyLabel}>{copy.nearbyLocation}: </Text>
                  <Text style={styles.nearbyText} numberOfLines={2}>
                    {nearbyAddress}
                  </Text>
                </View>
              ) : reverseLookupFailed && hasPinnedCoordinate ? (
                <Text style={styles.coordinateStatusText}>
                  {copy.coordinateOnly}
                </Text>
              ) : null}
            </View>
          </View>
          {!isResolving && nearbySuggestions.length > 0 ? (
            <View style={styles.nearbySuggestionsSection}>
              <Text style={styles.nearbySuggestionsTitle}>
                {copy.nearbySuggestions}
              </Text>
              {nearbySuggestions.slice(0, 3).map((suggestion, index) => {
                const isSelected = Boolean(
                  (suggestion.placeId &&
                    suggestion.placeId === selectedPlaceId) ||
                    suggestion.formattedAddress === selectedAddress,
                );
                const secondaryAddress =
                  nearbySuggestionAddress(suggestion);
                const distance = formatNearbyDistance(
                  suggestion.distanceMeters,
                );
                return (
                  <TouchableOpacity
                    key={
                      suggestion.placeId ||
                      `${suggestion.latitude}:${suggestion.longitude}:${index}`
                    }
                    activeOpacity={0.8}
                    onPress={() =>
                      handleSelectNearbySuggestion(suggestion)
                    }
                    style={[
                      styles.nearbySuggestionRow,
                      isSelected
                        ? styles.nearbySuggestionRowSelected
                        : null,
                    ]}
                  >
                    <View style={styles.nearbySuggestionIcon}>
                      <MapPin
                        size={16}
                        color={
                          isSelected ? APP_BRAND_COLOR : '#64748b'
                        }
                      />
                    </View>
                    <View style={styles.nearbySuggestionCopy}>
                      <Text
                        style={styles.nearbySuggestionName}
                        numberOfLines={1}
                      >
                        {suggestion.name}
                      </Text>
                      <Text
                        style={styles.nearbySuggestionAddress}
                        numberOfLines={1}
                      >
                        {secondaryAddress}
                      </Text>
                    </View>
                    {distance ? (
                      <Text style={styles.nearbySuggestionDistance}>
                        {copy.distanceFromPin} {distance}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
          {hasPinnedCoordinate ? (
            <View style={styles.coordinateBox}>
              <Text style={styles.coordinateLabel}>{copy.pinCoordinates}</Text>
              <Text style={styles.coordinateValue}>
                {region.latitude.toFixed(6)}, {region.longitude.toFixed(6)}
              </Text>
            </View>
          ) : null}
          {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={handleUseCurrentLocation}
              disabled={isLocating}
              style={[
                styles.currentLocationButton,
                isLocating ? styles.currentLocationButtonDisabled : null,
              ]}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color={APP_BRAND_COLOR} />
              ) : (
                <LocateFixed size={18} color={APP_BRAND_COLOR} />
              )}
              <Text style={styles.currentLocationText}>{copy.useCurrent}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={handleConfirm}
              disabled={!canConfirm}
              style={[styles.confirmButton, !canConfirm ? styles.confirmButtonDisabled : null]}
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
  googleAttribution: {
    paddingVertical: 8,
    textAlign: 'center',
    color: '#5e5e5e',
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0,
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
  addressLabel: {
    marginBottom: 2,
    color: '#64748b',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
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
  nearbyRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  nearbyLabel: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  nearbyText: {
    flex: 1,
    color: '#475569',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  nearbySuggestionsSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  nearbySuggestionsTitle: {
    marginBottom: 5,
    color: '#334155',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  nearbySuggestionRow: {
    minHeight: 48,
    marginBottom: 5,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  nearbySuggestionRowSelected: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  nearbySuggestionIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  nearbySuggestionCopy: {
    flex: 1,
    minWidth: 0,
  },
  nearbySuggestionName: {
    color: '#0f172a',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
  },
  nearbySuggestionAddress: {
    marginTop: 1,
    color: '#64748b',
    fontSize: 10.5,
    lineHeight: 14,
    fontWeight: '600',
  },
  nearbySuggestionDistance: {
    maxWidth: 82,
    marginLeft: 8,
    color: '#64748b',
    fontSize: 9.5,
    lineHeight: 13,
    fontWeight: '700',
    textAlign: 'right',
  },
  coordinateStatusText: {
    marginTop: 6,
    color: '#475569',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  coordinateBox: {
    marginTop: 9,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#dbeafe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  coordinateLabel: {
    color: '#64748b',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
  coordinateValue: {
    marginTop: 2,
    color: '#1d4ed8',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
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
  currentLocationButtonDisabled: {
    opacity: 0.68,
  },
  confirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: APP_BRAND_COLOR,
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
