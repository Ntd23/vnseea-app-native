// Description: Google Places Autocomplete component for address search.
// English description: A reusable address autocomplete input using Google Places API.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MapPin, X } from 'lucide-react-native';
import { apiConfig } from '../../infrastructure/config/env';

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectPlace: (place: {
    description: string;
    placeId: string;
    mainText: string;
    secondaryText: string;
  }) => void;
  placeholder?: string;
  debounceMs?: number;
}

const GOOGLE_PLACES_API_KEY = apiConfig.googleMapsApiKey || '';

export function AddressAutocomplete({
  value,
  onChangeText,
  onSelectPlace,
  placeholder = 'Nhập địa chỉ...',
  debounceMs = 300,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const fetchPredictions = useCallback(async (input: string) => {
    if (!input.trim() || input.length < 3) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    if (!GOOGLE_PLACES_API_KEY) {
      console.warn('[AddressAutocomplete] Google Maps API key not found');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input
      )}&key=${GOOGLE_PLACES_API_KEY}&language=vi&components=country:vn`;

      console.log('[AddressAutocomplete] Fetching:', url.substring(0, 100) + '...');

      const response = await fetch(url);
      const data = await response.json();

      console.log('[AddressAutocomplete] Response status:', response.status);
      console.log('[AddressAutocomplete] Response data:', JSON.stringify(data).substring(0, 200));

      if (data.predictions && Array.isArray(data.predictions)) {
        setPredictions(data.predictions);
        setShowDropdown(data.predictions.length > 0);
        console.log('[AddressAutocomplete] Found', data.predictions.length, 'predictions');
      } else if (data.error_message) {
        console.error('[AddressAutocomplete] API Error:', data.error_message);
        setPredictions([]);
        setShowDropdown(false);
      } else {
        console.log('[AddressAutocomplete] No predictions found');
        setPredictions([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('[AddressAutocomplete] fetch error:', error);
      setPredictions([]);
      setShowDropdown(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTextChange = useCallback(
    (text: string) => {
      onChangeText(text);

      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Set new debounce timer
      const timer = setTimeout(() => {
        fetchPredictions(text);
      }, debounceMs);

      setDebounceTimer(timer);
    },
    [onChangeText, fetchPredictions, debounceMs, debounceTimer]
  );

  const handleSelectPrediction = useCallback(
    (prediction: PlacePrediction) => {
      const { place_id, description, structured_formatting } = prediction;

      onSelectPlace({
        description,
        placeId: place_id,
        mainText: structured_formatting.main_text,
        secondaryText: structured_formatting.secondary_text,
      });

      // Update input with the selected address
      onChangeText(structured_formatting.main_text);

      // Clear predictions and hide dropdown
      setPredictions([]);
      setShowDropdown(false);
      Keyboard.dismiss();
    },
    [onSelectPlace, onChangeText]
  );

  const handleClear = useCallback(() => {
    onChangeText('');
    setPredictions([]);
    setShowDropdown(false);
  }, [onChangeText]);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <MapPin size={20} color="#94A3B8" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          autoCapitalize="none"
          autoCorrect={false}
          onFocus={() => {
            if (predictions.length > 0) {
              setShowDropdown(true);
            }
          }}
          onBlur={() => {
            // Delay hiding dropdown to allow tap on prediction
            setTimeout(() => setShowDropdown(false), 200);
          }}
        />
        {isLoading ? (
          <ActivityIndicator size="small" color="#0000FF" style={styles.clearIcon} />
        ) : value ? (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <X size={18} color="#94A3B8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {showDropdown && predictions.length > 0 && (
        <View style={styles.dropdown}>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.predictionItem}
                onPress={() => handleSelectPrediction(item)}
                activeOpacity={0.7}
              >
                <MapPin size={18} color="#94A3B8" />
                <View style={styles.predictionTextContainer}>
                  <Text style={styles.mainText} numberOfLines={1}>
                    {item.structured_formatting.main_text}
                  </Text>
                  <Text style={styles.secondaryText} numberOfLines={1}>
                    {item.structured_formatting.secondary_text}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          />
        </View>
      )}
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
  clearButton: {
    padding: 4,
  },
  clearIcon: {
    padding: 4,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
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
});

export default AddressAutocomplete;