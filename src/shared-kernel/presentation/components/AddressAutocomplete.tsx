// Description: Provides a reusable modal address search input through the backend map discovery bridge.
import React, { useCallback, useRef, useState } from 'react';
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
}

const AUTOCOMPLETE_COPY = {
  vi: {
    title: 'Tìm địa điểm',
    placeholder: 'Nhập địa điểm cần tìm...',
    minChars: 'Nhập ít nhất 3 ký tự để tìm địa điểm.',
    empty: 'Không có gợi ý địa chỉ phù hợp.',
    error: 'Không tải được gợi ý địa chỉ.',
  },
  en: {
    title: 'Search Location',
    placeholder: 'Enter location to search...',
    minChars: 'Enter at least 3 characters to search.',
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
}: AddressAutocompleteProps) {
  const language = useAppLanguage();
  const copy = AUTOCOMPLETE_COPY[language] || AUTOCOMPLETE_COPY.vi;
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalQuery, setModalQuery] = useState(value);
  const [errorMessage, setErrorMessage] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const modalInputRef = useRef<TextInput>(null);

  const handleModalShow = useCallback(() => {
    // Small delay lets the modal animation finish so keyboard opens instantly
    const timer = setTimeout(() => {
      modalInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const getErrorMessage = useCallback((error: unknown) => {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return copy.error;
  }, [copy.error]);

  const fetchPredictions = useCallback(
    async (input: string) => {
      if (!input.trim() || input.trim().length < 3) {
        setPredictions([]);
        setErrorMessage('');
        return;
      }

      setIsLoading(true);
      setErrorMessage('');
      try {
        const data = await apiBridge.post<PlaceAutocompleteResponse>(
          apiRoutes.user.mapDiscovery,
          {
            type: 'place_autocomplete',
            query: input.trim(),
          },
        );

        if (data.predictions && Array.isArray(data.predictions)) {
          setPredictions(data.predictions);
          setErrorMessage(
            data.predictions.length === 0
              ? copy.empty
              : '',
          );
        } else {
          setPredictions([]);
          setErrorMessage(copy.empty);
        }
      } catch (error) {
        setPredictions([]);
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [getErrorMessage, copy.empty],
  );

  const openModal = useCallback(() => {
    setModalQuery(value);
    setIsModalVisible(true);
    setErrorMessage('');
    if (value.trim().length >= 3) {
      fetchPredictions(value);
    }
  }, [fetchPredictions, value]);

  const closeModal = useCallback(() => {
    setIsModalVisible(false);
    Keyboard.dismiss();
  }, []);

  const handleModalTextChange = useCallback(
    (text: string) => {
      setModalQuery(text);
      onChangeText(text);

      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      const timer = setTimeout(() => {
        fetchPredictions(text);
      }, debounceMs);

      setDebounceTimer(timer);
    },
    [debounceMs, debounceTimer, fetchPredictions, onChangeText],
  );

  const handleSelectPrediction = useCallback(
    async (prediction: PlacePrediction) => {
      const placeId = prediction.place_id || prediction.placeId || '';
      const mainText =
        prediction.main_text || prediction.mainText || prediction.description;
      const secondaryText =
        prediction.secondary_text || prediction.secondaryText || '';
      let selected = {
        description: prediction.description,
        placeId,
        mainText,
        secondaryText,
        lat: undefined as number | undefined,
        lng: undefined as number | undefined,
      };

      if (placeId) {
        try {
          const details = await apiBridge.post<PlaceDetailsResponse>(
            apiRoutes.user.mapDiscovery,
            {
              type: 'place_details',
              place_id: placeId,
            },
          );
          const place = details.place;
          const lat = Number(place?.lat);
          const lng = Number(place?.lng);
          selected = {
            ...selected,
            description: place?.address || selected.description,
            mainText: place?.name || selected.mainText,
            lat: Number.isFinite(lat) ? lat : undefined,
            lng: Number.isFinite(lng) ? lng : undefined,
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
      setIsModalVisible(false);
      Keyboard.dismiss();
    },
    [onChangeText, onSelectPlace],
  );

  const handleClear = useCallback(() => {
    onChangeText('');
    setModalQuery('');
    setPredictions([]);
    setErrorMessage('');
    setIsModalVisible(false);
  }, [onChangeText]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.inputContainer}
        onPress={openModal}
        activeOpacity={0.85}
      >
        <View style={styles.iconWrapper}>
          <MapPin size={18} color="#002fff" />
        </View>
        <Text
          style={[styles.input, !value ? styles.placeholderText : null]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color="#002fff"
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
                <MapPin size={18} color="#002fff" />
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
                <ActivityIndicator size="small" color="#002fff" />
              ) : null}
            </View>
          </View>

          {modalQuery.trim().length > 0 && modalQuery.trim().length < 3 ? (
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
              <Animated.View entering={FadeInDown.delay(index * 60).springify().damping(18)}>
                <TouchableOpacity
                  style={styles.predictionItem}
                  onPress={() => handleSelectPrediction(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.predictionIconWrapper}>
                    <MapPin size={18} color="#002fff" />
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
    backgroundColor: '#f0f3ff',
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
    borderColor: '#e0e7ff',
    borderRadius: 20,
    paddingHorizontal: 10,
    minHeight: 54,
  },
  modalIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f3ff',
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
    backgroundColor: '#f0f3ff',
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
