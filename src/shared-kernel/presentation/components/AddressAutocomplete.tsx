// Description: Provides a reusable modal trigger for the dedicated address-only search pipeline.
import React, { useCallback, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MapPin, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type {
  AddressLocationBias,
  ResolvedAddress,
} from '../../domain/types/addressSearch.types';
import AddressSearchContent from './AddressSearchContent';
import { APP_BRAND_COLOR, APP_COLORS } from '../theme/appColors';

export interface AddressAutocompleteSelection {
  description: string;
  placeId: string;
  mainText: string;
  secondaryText: string;
  lat?: number;
  lng?: number;
  city?: string;
  district?: string;
  ward?: string;
  country?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectPlace: (place: AddressAutocompleteSelection) => void;
  placeholder?: string;
  debounceMs?: number;
  locationBias?: AddressLocationBias;
  customInputContainerStyle?: any;
  customIconWrapperStyle?: any;
  customInputStyle?: any;
  customIcon?: React.ReactNode;
}

export function AddressAutocomplete({
  value,
  onChangeText,
  onSelectPlace,
  placeholder,
  debounceMs = 300,
  locationBias,
  customInputContainerStyle,
  customIconWrapperStyle,
  customInputStyle,
  customIcon,
}: AddressAutocompleteProps) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchSessionKey, setSearchSessionKey] = useState(0);
  const isModalActiveRef = useRef(false);

  const openModal = useCallback(() => {
    isModalActiveRef.current = true;
    setSearchSessionKey(current => current + 1);
    setIsModalVisible(true);
  }, []);

  const closeModal = useCallback(() => {
    isModalActiveRef.current = false;
    setIsModalVisible(false);
    Keyboard.dismiss();
  }, []);

  const handleResolvedAddress = useCallback(
    (
      resolved: ResolvedAddress,
      suggestion: {
        mainText: string;
        secondaryText: string;
      },
    ) => {
      if (!isModalActiveRef.current) return;
      onSelectPlace({
        description: resolved.formattedAddress,
        placeId: resolved.placeId,
        mainText: suggestion.mainText || resolved.formattedAddress,
        secondaryText: suggestion.secondaryText,
        lat: resolved.latitude,
        lng: resolved.longitude,
        city: resolved.city,
        district: resolved.district,
        ward: resolved.ward,
        country: resolved.country,
      });
      closeModal();
    },
    [closeModal, onSelectPlace],
  );

  const handleSearchQueryChange = useCallback(
    (text: string) => {
      if (!isModalActiveRef.current) return;
      onChangeText(text);
    },
    [onChangeText],
  );

  const handleClear = useCallback(() => {
    onChangeText('');
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
          style={[
            styles.input,
            !value ? styles.placeholderText : null,
            customInputStyle,
          ]}
          numberOfLines={1}
        >
          {value || placeholder}
        </Text>
        {value ? (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
            accessibilityRole="button"
            accessibilityLabel="Xóa địa chỉ"
          >
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
        <SafeAreaView style={styles.modalRoot} edges={['top', 'bottom']}>
          <AddressSearchContent
            key={searchSessionKey}
            initialQuery={value}
            placeholder={placeholder}
            debounceMs={debounceMs}
            locationBias={locationBias}
            onQueryChange={handleSearchQueryChange}
            onResolvedAddress={handleResolvedAddress}
            onClose={closeModal}
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
    minHeight: 54,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  iconWrapper: {
    width: 36,
    height: 36,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: APP_COLORS.brand.soft,
  },
  input: {
    flex: 1,
    padding: 0,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '600',
  },
  placeholderText: {
    color: '#94A3B8',
  },
  clearButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
});

export default AddressAutocomplete;
