// Description: Provides a reusable modal address search input through the backend map discovery bridge.
import React, { useCallback, useState } from 'react';
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
import { MapPin, X } from 'lucide-react-native';
import { apiRoutes } from '../../application/constants/route-registry';
import { apiBridge } from '../../infrastructure/api/apiBridge';

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

export function AddressAutocomplete({
  value,
  onChangeText,
  onSelectPlace,
  placeholder = 'Nhập địa chỉ...',
  debounceMs = 300,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalQuery, setModalQuery] = useState(value);
  const [errorMessage, setErrorMessage] = useState('');
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const getErrorMessage = useCallback((error: unknown) => {
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return 'Không tải được gợi ý địa chỉ.';
  }, []);

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
              ? 'Không có gợi ý địa chỉ phù hợp.'
              : '',
          );
        } else {
          setPredictions([]);
          setErrorMessage('Không có gợi ý địa chỉ phù hợp.');
        }
      } catch (error) {
        setPredictions([]);
        setErrorMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [getErrorMessage],
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
        <MapPin size={20} color="#94A3B8" style={styles.inputIcon} />
        <Text
          style={[styles.input, !value ? styles.placeholderText : null]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        {isLoading ? (
          <ActivityIndicator
            size="small"
            color="#0000FF"
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
      >
        <SafeAreaView style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Tìm địa điểm</Text>
            <TouchableOpacity onPress={closeModal} style={styles.modalClose}>
              <X size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearchContainer}>
            <MapPin size={20} color="#64748B" style={styles.inputIcon} />
            <TextInput
              style={styles.modalInput}
              value={modalQuery}
              onChangeText={handleModalTextChange}
              placeholder={placeholder}
              placeholderTextColor="#94A3B8"
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {isLoading ? (
              <ActivityIndicator size="small" color="#0000FF" />
            ) : null}
          </View>

          {modalQuery.trim().length > 0 && modalQuery.trim().length < 3 ? (
            <Text style={styles.helperText}>
              Nhập ít nhất 3 ký tự để tìm địa điểm.
            </Text>
          ) : null}

          <FlatList
            data={predictions}
            keyExtractor={(item, index) =>
              item.place_id || item.placeId || `${item.description}-${index}`
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.predictionItem}
                onPress={() => handleSelectPrediction(item)}
                activeOpacity={0.7}
              >
                <MapPin size={18} color="#64748B" />
                <View style={styles.predictionTextContainer}>
                  <Text style={styles.mainText} numberOfLines={2}>
                    {item.main_text || item.mainText || item.description}
                  </Text>
                  <Text style={styles.secondaryText} numberOfLines={2}>
                    {item.secondary_text ||
                      item.secondaryText ||
                      item.description}
                  </Text>
                </View>
              </TouchableOpacity>
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
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
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
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalClose: {
    padding: 8,
    marginRight: -8,
  },
  modalSearchContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    padding: 0,
  },
  helperText: {
    paddingHorizontal: 20,
    paddingTop: 12,
    fontSize: 13,
    color: '#64748B',
  },
  modalListContent: {
    paddingTop: 8,
    paddingBottom: 28,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  predictionTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  mainText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
  },
  secondaryText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  errorText: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: '600',
    color: '#B91C1C',
  },
});

export default AddressAutocomplete;
