// Description: Provides a reusable modal address search input through the backend map discovery bridge.
import { APP_BRAND_COLOR, APP_COLORS } from '../theme/appColors';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MapPin, X, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { apiRoutes } from '../../application/constants/route-registry';
import { createAsyncResourceCache } from '../../application/utils/asyncResourceCache';
import { filterAddressPredictions } from '../../application/utils/addressPredictionRelevance';
import { parseMapCoordinate } from '../../application/utils/mapCoordinate';
import { apiBridge } from '../../infrastructure/api/apiBridge';
import { useAppLanguage } from '../../application/hooks/useAppLanguage';

interface PlacePrediction {
  place_id?: string;
  placeId?: string;
  description: string;
  main_text?: string;
  mainText?: string;
  secondary_text?: string;
  secondaryText?: string;
  lat?: number | string | null;
  lng?: number | string | null;
}

type PlaceDetailsResponse = {
  api_status: number | string;
  place?: {
    place_id?: string;
    name?: string;
    address?: string;
    lat?: number | string | null;
    lng?: number | string | null;
  };
};

type PlaceAutocompleteResponse = {
  api_status: number | string;
  predictions?: PlacePrediction[];
};

const addressPredictionCache = createAsyncResourceCache<PlacePrediction[]>({
  ttlMs: 2 * 60 * 1000,
  maxEntries: 80,
});
const addressDetailsCache = createAsyncResourceCache<PlaceDetailsResponse>({
  ttlMs: 10 * 60 * 1000,
  maxEntries: 160,
});
const MIN_AUTOCOMPLETE_CHARS = 2;

function addressPredictionCacheKey(
  language: string,
  query: string,
  preferAddressSearch: boolean,
) {
  return `${language}:${preferAddressSearch ? 'address' : 'place'}:${query.trim().toLocaleLowerCase(language).replace(/\s+/g, ' ')}`;
}

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectPlace: (place: {
    description: string;
    placeId: string;
    mainText: string;
    secondaryText: string;
    lat?: number;
    lng?: number;
  }) => void;
  placeholder?: string;
  debounceMs?: number;
  customInputContainerStyle?: any;
  customIconWrapperStyle?: any;
  customInputStyle?: any;
  customIcon?: React.ReactNode;
  /** Prefer exact street/address matches over nearby category results. */
  preferAddressSearch?: boolean;
}

const AUTOCOMPLETE_COPY = {
  vi: {
    title: 'Tìm địa điểm',
    placeholder: 'Nhập địa điểm cần tìm...',
    minChars: 'Nhập ít nhất 2 ký tự để tìm địa điểm.',
    empty: 'Không có gợi ý địa chỉ phù hợp.',
    error: 'Không tải được gợi ý địa chỉ.',
  },
  en: {
    title: 'Search Location',
    placeholder: 'Enter location to search...',
    minChars: 'Enter at least 2 characters to search.',
    empty: 'No matching address suggestions.',
    error: 'Failed to load address suggestions.',
  },
};

export function AddressAutocomplete({
  value,
  onChangeText,
  onSelectPlace,
  placeholder,
  debounceMs = 300,
  customInputContainerStyle,
  customIconWrapperStyle,
  customInputStyle,
  customIcon,
  preferAddressSearch = false,
}: AddressAutocompleteProps) {
  const language = useAppLanguage();
  const copy = AUTOCOMPLETE_COPY[language] || AUTOCOMPLETE_COPY.vi;
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalQuery, setModalQuery] = useState(value);
  const [errorMessage, setErrorMessage] = useState('');
  
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef(value);
  const searchRequestIdRef = useRef(0);
  const isModalOpenRef = useRef(false);
  const modalInputRef = useRef<TextInput>(null);

  const handleModalShow = useCallback(() => {
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }
    // Small delay lets the modal animation finish so keyboard opens instantly.
    focusTimerRef.current = setTimeout(() => {
      modalInputRef.current?.focus();
    }, 100);
  }, []);

  useEffect(
    () => () => {
      isModalOpenRef.current = false;
      searchRequestIdRef.current += 1;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (focusTimerRef.current) {
        clearTimeout(focusTimerRef.current);
      }
    },
    [],
  );

  const getErrorMessage = useCallback((error: unknown) => {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return copy.error;
  }, [copy.error]);

  const fetchPredictions = useCallback(
    async (input: string) => {
      const trimmedInput = input.trim();
      const requestId = ++searchRequestIdRef.current;
      if (!trimmedInput || trimmedInput.length < MIN_AUTOCOMPLETE_CHARS) {
        if (
          requestId === searchRequestIdRef.current &&
          latestQueryRef.current.trim().length < MIN_AUTOCOMPLETE_CHARS
        ) {
          setPredictions([]);
          setErrorMessage('');
          setIsLoading(false);
        }
        return;
      }

      const cacheKey = addressPredictionCacheKey(
        language,
        trimmedInput,
        preferAddressSearch,
      );
      const cachedPredictions = addressPredictionCache.get(cacheKey);
      if (cachedPredictions !== undefined) {
        const visibleCachedPredictions = preferAddressSearch
          ? filterAddressPredictions(trimmedInput, cachedPredictions)
          : cachedPredictions;
        if (
          requestId === searchRequestIdRef.current &&
          input === latestQueryRef.current &&
          isModalOpenRef.current
        ) {
          setPredictions(visibleCachedPredictions);
          setErrorMessage(
            visibleCachedPredictions.length === 0 ? copy.empty : '',
          );
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setErrorMessage('');
      try {
        const nextPredictions = await addressPredictionCache.getOrLoad(
          cacheKey,
          async () => {
            const data = await apiBridge.post<PlaceAutocompleteResponse>(
              apiRoutes.user.mapDiscovery,
              {
                type: 'place_autocomplete',
                query: trimmedInput,
                language,
                country: language === 'vi' ? 'vn' : undefined,
                prefer_address: preferAddressSearch ? 1 : undefined,
              },
            );
            const receivedPredictions = Array.isArray(data.predictions)
              ? data.predictions
              : [];
            return preferAddressSearch
              ? filterAddressPredictions(trimmedInput, receivedPredictions)
              : receivedPredictions;
          },
        );

        // Prevent race condition: only update state if this matches the latest typed input
        if (
          requestId !== searchRequestIdRef.current ||
          input !== latestQueryRef.current ||
          !isModalOpenRef.current
        ) {
          return;
        }

        setPredictions(nextPredictions);
        setErrorMessage(nextPredictions.length === 0 ? copy.empty : '');
      } catch (error) {
        if (
          requestId !== searchRequestIdRef.current ||
          input !== latestQueryRef.current ||
          !isModalOpenRef.current
        ) {
          return;
        }
        setPredictions([]);
        setErrorMessage(getErrorMessage(error));
      } finally {
        if (
          requestId === searchRequestIdRef.current &&
          input === latestQueryRef.current &&
          isModalOpenRef.current
        ) {
          setIsLoading(false);
        }
      }
    },
    [copy.empty, getErrorMessage, language, preferAddressSearch],
  );

  const openModal = useCallback(() => {
    isModalOpenRef.current = true;
    searchRequestIdRef.current += 1;
    latestQueryRef.current = value;
    setModalQuery(value);
    setPredictions([]);
    setIsModalVisible(true);
    setIsLoading(false);
    setErrorMessage('');
    if (value.trim().length >= MIN_AUTOCOMPLETE_CHARS) {
      fetchPredictions(value);
    }
  }, [fetchPredictions, value]);

  const closeModal = useCallback(() => {
    isModalOpenRef.current = false;
    searchRequestIdRef.current += 1;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (focusTimerRef.current) {
      clearTimeout(focusTimerRef.current);
    }
    setIsModalVisible(false);
    setIsLoading(false);
    setPredictions([]);
    Keyboard.dismiss();
  }, []);

  const handleModalTextChange = useCallback(
    (text: string) => {
      setModalQuery(text);
      onChangeText(text);
      latestQueryRef.current = text;
      searchRequestIdRef.current += 1;
      setPredictions([]);
      setErrorMessage('');

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (text.trim().length < MIN_AUTOCOMPLETE_CHARS) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      debounceTimerRef.current = setTimeout(() => {
        fetchPredictions(text);
      }, debounceMs);
    },
    [debounceMs, fetchPredictions, onChangeText],
  );

  const handleSelectPrediction = useCallback(
    async (prediction: PlacePrediction) => {
      searchRequestIdRef.current += 1;
      const placeId = prediction.place_id || prediction.placeId || '';
      const mainText =
        prediction.main_text || prediction.mainText || prediction.description;
      const secondaryText =
        prediction.secondary_text || prediction.secondaryText || '';
      const predictionCoordinate = parseMapCoordinate(
        prediction.lat,
        prediction.lng,
      );
      let selected = {
        description: prediction.description,
        placeId,
        mainText,
        secondaryText,
        lat: predictionCoordinate?.latitude,
        lng: predictionCoordinate?.longitude,
      };

      if (placeId && (selected.lat === undefined || selected.lng === undefined)) {
        try {
          const details = await addressDetailsCache.getOrLoad(
            placeId,
            () =>
              apiBridge.post<PlaceDetailsResponse>(
                apiRoutes.user.mapDiscovery,
                {
                  type: 'place_details',
                  place_id: placeId,
                  language,
                  country: language === 'vi' ? 'vn' : undefined,
                },
              ),
          );
          const place = details.place;
          const detailsCoordinate = parseMapCoordinate(place?.lat, place?.lng);
          selected = {
            ...selected,
            description: place?.address || selected.description,
            mainText: place?.name || selected.mainText,
            lat: detailsCoordinate?.latitude,
            lng: detailsCoordinate?.longitude,
          };
        } catch (error) {
          console.warn('[AddressAutocomplete] place details failed', error);
        }
      }

      const selectedText = selected.description || selected.mainText;
      onChangeText(selectedText);
      onSelectPlace(selected);
      setModalQuery(selectedText);
      setPredictions([]);
      setErrorMessage('');
      isModalOpenRef.current = false;
      setIsModalVisible(false);
      Keyboard.dismiss();
    },
    [language, onChangeText, onSelectPlace],
  );

  const handleClear = useCallback(() => {
    isModalOpenRef.current = false;
    searchRequestIdRef.current += 1;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onChangeText('');
    setModalQuery('');
    setPredictions([]);
    setErrorMessage('');
    setIsModalVisible(false);
  }, [onChangeText]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.inputContainer, customInputContainerStyle]}
        onPress={openModal}
        activeOpacity={0.85}
      >
        <View style={[styles.iconWrapper, customIconWrapperStyle]}>
          {customIcon || <MapPin size={18} color={APP_BRAND_COLOR} />}
        </View>
        <Text
          style={[styles.input, !value ? styles.placeholderText : null, customInputStyle]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color={APP_BRAND_COLOR}
            style={styles.clearIcon}
          />
        ) : value ? (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <X size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
        onShow={handleModalShow}
      >
        <SafeAreaView style={styles.modalRoot}>
          {/* Top Sheet Handle Indicator */}
          <View style={styles.modalHandle} />

          {/* White Header & Search Field wrapper */}
          <View style={{ backgroundColor: '#ffffff', paddingBottom: 16 }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{copy.title}</Text>
              <TouchableOpacity onPress={closeModal} style={styles.modalClose}>
                <X size={20} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearchContainer}>
              <View style={styles.modalIconWrapper}>
                <MapPin size={18} color={APP_BRAND_COLOR} />
              </View>
              <TextInput
                ref={modalInputRef}
                style={styles.modalInput}
                value={modalQuery}
                onChangeText={handleModalTextChange}
                placeholder={placeholder || copy.placeholder}
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {isLoading ? (
                <ActivityIndicator size="small" color={APP_BRAND_COLOR} />
              ) : null}
            </View>
          </View>

          {modalQuery.trim().length > 0 &&
          modalQuery.trim().length < MIN_AUTOCOMPLETE_CHARS ? (
            <Text style={styles.helperText}>
              {copy.minChars}
            </Text>
          ) : null}

          <FlatList
            data={predictions}
            keyExtractor={(item, index) =>
              item.place_id || item.placeId || `${item.description}-${index}`
            }
            renderItem={({ item, index }) => (
              <Animated.View
                entering={FadeInDown.delay(Math.min(index, 4) * 35)
                  .springify()
                  .damping(18)}
              >
                <TouchableOpacity
                  style={styles.predictionItem}
                  onPress={() => handleSelectPrediction(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.predictionIconWrapper}>
                    <MapPin size={18} color={APP_BRAND_COLOR} />
                  </View>
                  <View style={styles.predictionTextContainer}>
                    <Text style={styles.mainText} numberOfLines={1}>
                      {item.main_text || item.mainText || item.description}
                    </Text>
                    <Text style={styles.secondaryText} numberOfLines={1}>
                      {item.secondary_text ||
                        item.secondaryText ||
                        item.description}
                    </Text>
                  </View>
                  <ChevronRight size={18} color="#94a3b8" />
                </TouchableOpacity>
              </Animated.View>
            )}
            ListEmptyComponent={
              !isLoading && errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : null
            }
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.modalListContent}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 100,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingHorizontal: 10,
    minHeight: 54,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: APP_COLORS.brand.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '600',
    padding: 0,
  },
  placeholderText: {
    color: '#94A3B8',
  },
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    padding: 4,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#cbd5e1',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  modalHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSearchContainer: {
    marginHorizontal: 20,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: APP_COLORS.brand.border,
    borderRadius: 20,
    paddingHorizontal: 10,
    minHeight: 54,
  },
  modalIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: APP_COLORS.brand.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '600',
    padding: 0,
  },
  helperText: {
    paddingHorizontal: 24,
    paddingTop: 12,
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  modalListContent: {
    paddingTop: 12,
    paddingBottom: 28,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  predictionIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: APP_COLORS.brand.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  predictionTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  mainText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  secondaryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 4,
  },
  errorText: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#dc2626',
  },
});

export default AddressAutocomplete;
