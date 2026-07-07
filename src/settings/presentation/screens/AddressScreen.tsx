// Description: View, add, edit, and delete user shipping addresses with Google Maps autocomplete.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Pencil, Plus, Trash2, X } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { apiBridge } from '../../../shared-kernel/infrastructure/api/apiBridge';
import { AddressAutocomplete } from '../../../shared-kernel/presentation/components/AddressAutocomplete';

type AddressNav = NativeStackNavigationProp<RootStackParamList>;

interface DeliveryAddress {
  id: string;
  name: string;
  phone: string;
  country: string;
  city: string;
  zip: string;
  address: string;
}

type SelectedPlace = Parameters<
  React.ComponentProps<typeof AddressAutocomplete>['onSelectPlace']
>[0];

const ADDRESS_COPY = {
  vi: {
    header: 'Địa chỉ của tôi',
    addNew: 'Thêm mới',
    name: 'Tên',
    namePlaceholder: 'Nhập họ tên',
    phone: 'Điện thoại',
    phonePlaceholder: 'Nhập số điện thoại',
    country: 'Quốc gia',
    countryPlaceholder: 'Nhập quốc gia',
    city: 'Thành phố',
    cityPlaceholder: 'Nhập thành phố',
    zip: 'Mã Bưu Chính',
    zipPlaceholder: 'Nhập mã bưu chính',
    streetAddress: 'Địa chỉ nhà',
    streetPlaceholder: 'Nhập địa chỉ nhà hoặc tìm kiếm...',
    addBtn: 'Thêm',
    saveBtn: 'Lưu',
    cancelBtn: 'Hủy',
    addTitle: 'Thêm địa chỉ mới',
    editTitle: 'Sửa địa chỉ',
    confirmDeleteTitle: 'Xóa địa chỉ',
    confirmDeleteMsg: 'Bạn có chắc chắn muốn xóa địa chỉ này?',
    deleteSuccess: 'Xóa địa chỉ thành công',
    addSuccess: 'Thêm địa chỉ thành công',
    editSuccess: 'Cập nhật địa chỉ thành công',
    errorTitle: 'Lỗi',
    validationError: 'Vui lòng nhập đầy đủ các trường thông tin bắt buộc.',
  },
  en: {
    header: 'My Addresses',
    addNew: 'Add New',
    name: 'Name',
    namePlaceholder: 'Enter name',
    phone: 'Phone',
    phonePlaceholder: 'Enter phone number',
    country: 'Country',
    countryPlaceholder: 'Enter country',
    city: 'City',
    cityPlaceholder: 'Enter city',
    zip: 'Zip Code',
    zipPlaceholder: 'Enter zip code',
    streetAddress: 'Address',
    streetPlaceholder: 'Enter street address or search...',
    addBtn: 'Add',
    saveBtn: 'Save',
    cancelBtn: 'Cancel',
    addTitle: 'Add new address',
    editTitle: 'Edit address',
    confirmDeleteTitle: 'Delete address',
    confirmDeleteMsg: 'Are you sure you want to delete this address?',
    deleteSuccess: 'Address deleted successfully',
    addSuccess: 'Address added successfully',
    editSuccess: 'Address updated successfully',
    errorTitle: 'Error',
    validationError: 'Please fill in all required fields.',
  },
};

function AddressScreen() {
  const navigation = useNavigation<AddressNav>();
  const language = useAppLanguage();
  const copy = ADDRESS_COPY[language] || ADDRESS_COPY.vi;
  const isVi = language === 'vi';

  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAddress, setEditingAddress] = useState<DeliveryAddress | null>(null);

  // Form Field States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch saved addresses from server
  const loadAddresses = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiBridge.post<{ api_status: number; data?: any[] }>('address', {
        type: 'get',
        limit: 50,
      });

      if (response && Array.isArray(response.data)) {
        const mapped = response.data.map(item => ({
          id: String(item.id || ''),
          name: String(item.name || ''),
          phone: String(item.phone || ''),
          country: String(item.country || ''),
          city: String(item.city || ''),
          zip: String(item.zip || '') || '10000',
          address: String(item.address || ''),
        }));
        setAddresses(mapped);
      }
    } catch (error) {
      console.warn('[AddressScreen] Failed to load addresses', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Open modal to add new
  const handleAddNewPress = useCallback(() => {
    setEditingAddress(null);
    setName('');
    setPhone('');
    setCountry('');
    setCity('');
    setZip('');
    setAddress('');
    setIsModalVisible(true);
  }, []);

  // Open modal to edit existing
  const handleEditPress = useCallback((addr: DeliveryAddress) => {
    setEditingAddress(addr);
    setName(addr.name);
    setPhone(addr.phone);
    setCountry(addr.country);
    setCity(addr.city);
    setZip(addr.zip);
    setAddress(addr.address);
    setIsModalVisible(true);
  }, []);

  // Delete address
  const handleDeletePress = useCallback(
    (addr: DeliveryAddress) => {
      Alert.alert(copy.confirmDeleteTitle, copy.confirmDeleteMsg, [
        { text: copy.cancelBtn, style: 'cancel' },
        {
          text: isVi ? 'Xóa' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await apiBridge.post('address', {
                type: 'delete',
                id: addr.id,
              });
              Alert.alert(isVi ? 'Thành công' : 'Success', copy.deleteSuccess);
              loadAddresses();
            } catch (error) {
              Alert.alert(
                copy.errorTitle,
                error instanceof Error ? error.message : String(error),
              );
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]);
    },
    [copy, isVi, loadAddresses],
  );

  // Address Autocomplete selection handler
  const handleSelectAddressPlace = useCallback((place: SelectedPlace) => {
    const rawAddress = place.description || [place.mainText, place.secondaryText]
      .filter(Boolean)
      .join(', ');
    const parts = rawAddress
      .split(',')
      .map(part => part.trim())
      .filter(Boolean);

    setAddress(rawAddress);
    if (parts.length >= 2) {
      setCity(parts[parts.length - 2]);
    }
    if (parts.length >= 1) {
      setCountry(parts[parts.length - 1]);
    }
  }, []);

  // Save/Create address handler
  const handleSaveAddress = useCallback(async () => {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      Alert.alert(copy.errorTitle, copy.validationError);
      return;
    }

    setIsSaving(true);
    try {
      await apiBridge.post('address', {
        type: editingAddress ? 'edit' : 'add',
        id: editingAddress?.id,
        name: name.trim(),
        phone: phone.trim(),
        country: country.trim() || 'Việt Nam',
        city: city.trim() || 'Hà Nội',
        zip: zip.trim() || '10000',
        address: address.trim(),
      });

      Alert.alert(
        isVi ? 'Thành công' : 'Success',
        editingAddress ? copy.editSuccess : copy.addSuccess,
      );
      setIsModalVisible(false);
      loadAddresses();
    } catch (error) {
      Alert.alert(
        copy.errorTitle,
        error instanceof Error ? error.message : String(error),
      );
    } finally {
      setIsSaving(false);
    }
  }, [name, phone, address, country, city, zip, editingAddress, copy, isVi, loadAddresses]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="h-16 flex-row items-center justify-between border-b border-slate-100 bg-white px-4">
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => navigation.goBack()}
          className="h-11 w-11 items-center justify-center rounded-full bg-slate-50"
        >
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-xl font-extrabold text-slate-950">{copy.header}</Text>
        <View className="h-11 w-11" />
      </View>

      {/* Main List */}
      {isLoading && addresses.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563eb" />
        </View>
      ) : (
        <FlatList
          data={addresses}
          keyExtractor={item => item.id}
          ListHeaderComponent={
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleAddNewPress}
              className="mx-4 mt-5 items-center justify-center rounded-2xl bg-slate-100 py-7 border border-dashed border-slate-300"
            >
              <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-800 mb-2">
                <Plus size={20} color="#ffffff" />
              </View>
              <Text className="text-base font-bold text-slate-800">{copy.addNew}</Text>
            </TouchableOpacity>
          }
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View
              className="mx-4 mt-4 flex-row items-center justify-between rounded-2xl border border-slate-100 bg-white p-5"
              style={{
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.03,
                shadowRadius: 4,
                elevation: 1,
              }}
            >
              <View className="flex-1 pr-4">
                <Text className="text-[17px] font-bold text-slate-900 mb-1">{item.name}</Text>
                <Text className="text-sm font-semibold text-slate-600 mb-1">{item.phone}</Text>
                <Text className="text-sm font-medium text-slate-500 mb-0.5">{item.address}</Text>
                <Text className="text-sm font-medium text-slate-500">{item.city}, {item.country}</Text>
              </View>

              {/* Action Buttons */}
              <View className="flex-col justify-center gap-3">
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleEditPress(item)}
                  className="h-10 w-10 items-center justify-center rounded-full bg-sky-100"
                >
                  <Pencil size={18} color="#0284c7" />
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => handleDeletePress(item)}
                  className="h-10 w-10 items-center justify-center rounded-full bg-red-100"
                >
                  <Trash2 size={18} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <SafeAreaView className="flex-1 bg-white">
          {/* Top Drag Handle for Modal presentation */}
          <View className="h-1.5 w-12 rounded-full bg-slate-200 self-center mt-2.5 mb-1.5" />

          {/* Modal Header */}
          <View className="flex-row items-center justify-between px-5 py-3 border-b border-slate-100">
            <Text className="text-xl font-bold text-slate-900">
              {editingAddress ? copy.editTitle : copy.addTitle}
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setIsModalVisible(false)}
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
            >
              <X size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1"
          >
            <ScrollView
              className="flex-1 px-5 pt-5"
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Receiver Name */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-bold text-slate-700">
                  {copy.name} <Text className="text-red-500">*</Text>
                </Text>
                <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4">
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder={copy.namePlaceholder}
                    placeholderTextColor="#94A3B8"
                    className="min-h-[48px] text-base font-semibold text-slate-900"
                  />
                </View>
              </View>

              {/* Phone Number */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-bold text-slate-700">
                  {copy.phone} <Text className="text-red-500">*</Text>
                </Text>
                <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4">
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder={copy.phonePlaceholder}
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    className="min-h-[48px] text-base font-semibold text-slate-900"
                  />
                </View>
              </View>

              {/* Country & City Row */}
              <View className="flex-row gap-3 mb-4">
                <View className="flex-1">
                  <Text className="mb-2 text-sm font-bold text-slate-700">
                    {copy.country}
                  </Text>
                  <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4">
                    <TextInput
                      value={country}
                      onChangeText={setCountry}
                      placeholder={copy.countryPlaceholder}
                      placeholderTextColor="#94A3B8"
                      className="min-h-[48px] text-base font-semibold text-slate-900"
                    />
                  </View>
                </View>
                <View className="flex-1">
                  <Text className="mb-2 text-sm font-bold text-slate-700">
                    {copy.city}
                  </Text>
                  <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4">
                    <TextInput
                      value={city}
                      onChangeText={setCity}
                      placeholder={copy.cityPlaceholder}
                      placeholderTextColor="#94A3B8"
                      className="min-h-[48px] text-base font-semibold text-slate-900"
                    />
                  </View>
                </View>
              </View>

              {/* Zip Code */}
              <View className="mb-4">
                <Text className="mb-2 text-sm font-bold text-slate-700">
                  {copy.zip}
                </Text>
                <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4">
                  <TextInput
                    value={zip}
                    onChangeText={setZip}
                    placeholder={copy.zipPlaceholder}
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                    className="min-h-[48px] text-base font-semibold text-slate-900"
                  />
                </View>
              </View>

              {/* Autocomplete Street Address */}
              <View className="mb-6">
                <Text className="mb-2 text-sm font-bold text-slate-700">
                  {copy.streetAddress} <Text className="text-red-500">*</Text>
                </Text>
                <AddressAutocomplete
                  value={address}
                  placeholder={copy.streetPlaceholder}
                  onChangeText={setAddress}
                  onSelectPlace={handleSelectAddressPlace}
                />
                {(!city && !country) ? (
                  <Text className="mt-2 text-xs font-semibold text-slate-400">
                    {isVi
                      ? 'Chọn gợi ý để tự động điền quốc gia và thành phố'
                      : 'Select a suggestion to automatically populate country and city'}
                  </Text>
                ) : null}
              </View>

              {/* Submit Button */}
              <View className="flex-row justify-end mb-10">
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isSaving}
                  onPress={handleSaveAddress}
                  className="min-h-[48px] px-8 bg-blue-600 rounded-2xl items-center justify-center flex-row"
                  style={{
                    shadowColor: '#2563eb',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 6,
                    elevation: 2,
                  }}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#ffffff" className="mr-2" />
                  ) : null}
                  <Text className="text-base font-extrabold text-white">
                    {editingAddress ? copy.saveBtn : copy.addBtn}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

export default AddressScreen;
