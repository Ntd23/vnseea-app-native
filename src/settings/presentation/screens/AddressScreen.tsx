// Description: View and edit the logged-in user's address information.
import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Check, Edit2, MapPin } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useUserViewModel } from '../../../user/application/view-models/useUserViewModel';

type AddressNav = NativeStackNavigationProp<RootStackParamList>;

interface AddressDisplayProps {
  address: string;
  city: string;
  country: string;
  onEdit: () => void;
}

function AddressDisplay({ address, city, country, onEdit }: AddressDisplayProps) {
  const hasAddress = address || city || country;

  if (!hasAddress) {
    return (
      <View className="mx-4 mt-6 items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8">
        <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-100">
          <MapPin size={32} color="#94A3B8" />
        </View>
        <Text className="mt-4 text-center text-base font-semibold text-slate-700">
          Bạn chưa cập nhật địa chỉ
        </Text>
        <Text className="mt-2 text-center text-sm text-slate-500">
          Thêm địa chỉ để người khác biết bạn ở đâu
        </Text>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={onEdit}
          className="mt-6 rounded-full bg-[#0000FF] px-6 py-3"
        >
          <Text className="font-semibold text-white">Thêm địa chỉ</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="mx-4 mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white p-5">
      <View className="flex-row items-center justify-between">
        <Text className="text-sm font-semibold uppercase text-slate-500">
          Địa chỉ hiện tại
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onEdit}
          className="flex-row items-center"
        >
          <Edit2 size={14} color="#0000FF" />
          <Text className="ml-1 text-sm font-medium text-[#0000FF]">Sửa</Text>
        </TouchableOpacity>
      </View>

      <View className="mt-4 flex-row items-start">
        <View className="mr-3 mt-1 h-8 w-8 items-center justify-center rounded-full bg-blue-50">
          <MapPin size={16} color="#0000FF" />
        </View>
        <View className="flex-1">
          {address && (
            <Text className="text-base text-slate-800">{address}</Text>
          )}
          {city && (
            <Text className="mt-1 text-sm text-slate-600">{city}</Text>
          )}
          {country && (
            <Text className="mt-1 text-sm text-slate-500">{country}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

interface AddressFormProps {
  initialAddress: string;
  initialCity: string;
  initialCountry: string;
  onSave: (data: { address: string; city: string; country: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function AddressForm({
  initialAddress,
  initialCity,
  initialCountry,
  onSave,
  onCancel,
  isLoading,
}: AddressFormProps) {
  const [address, setAddress] = useState(initialAddress);
  const [city, setCity] = useState(initialCity);
  const [country, setCountry] = useState(initialCountry || 'Vietnam');
  const [errors, setErrors] = useState<{ address?: string; city?: string }>({});

  const validate = useCallback(() => {
    const newErrors: { address?: string; city?: string } = {};

    if (!address.trim()) {
      newErrors.address = 'Vui lòng nhập địa chỉ';
    }

    if (!city.trim()) {
      newErrors.city = 'Vui lòng nhập tỉnh/thành phố';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [address, city]);

  const handleSave = useCallback(() => {
    if (validate()) {
      onSave({ address: address.trim(), city: city.trim(), country: country.trim() });
    }
  }, [validate, onSave, address, city, country]);

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4"
        keyboardShouldPersistTaps="handled"
      >
        <View className="overflow-hidden rounded-2xl border border-slate-100 bg-white p-5">
          <Text className="mb-4 text-base font-semibold text-slate-900">
            Cập nhật địa chỉ
          </Text>

          {/* Address Input */}
          <View className="mb-4">
            <Text className="mb-1.5 text-sm font-medium text-slate-700">
              Địa chỉ *
            </Text>
            <TextInput
              value={address}
              onChangeText={text => {
                setAddress(text);
                if (errors.address) setErrors(e => ({ ...e, address: undefined }));
              }}
              placeholder="Ví dụ: 123 Đường Nguyễn Huệ, Quận 1"
              placeholderTextColor="#94A3B8"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            />
            {errors.address && (
              <Text className="mt-1 text-xs text-red-500">{errors.address}</Text>
            )}
          </View>

          {/* City Input */}
          <View className="mb-4">
            <Text className="mb-1.5 text-sm font-medium text-slate-700">
              Tỉnh/Thành phố *
            </Text>
            <TextInput
              value={city}
              onChangeText={text => {
                setCity(text);
                if (errors.city) setErrors(e => ({ ...e, city: undefined }));
              }}
              placeholder="Ví dụ: TP. Hồ Chí Minh, Hà Nội"
              placeholderTextColor="#94A3B8"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            />
            {errors.city && (
              <Text className="mt-1 text-xs text-red-500">{errors.city}</Text>
            )}
          </View>

          {/* Country Input */}
          <View className="mb-4">
            <Text className="mb-1.5 text-sm font-medium text-slate-700">
              Quốc gia
            </Text>
            <TextInput
              value={country}
              onChangeText={setCountry}
              placeholder="Ví dụ: Vietnam"
              placeholderTextColor="#94A3B8"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View className="mt-4 flex-row gap-3">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={onCancel}
            disabled={isLoading}
            className="flex-1 rounded-full border border-slate-300 py-4"
          >
            <Text className="text-center text-base font-medium text-slate-600">
              Hủy
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleSave}
            disabled={isLoading}
            className="flex-1 items-center justify-center rounded-full bg-[#0000FF] py-4"
          >
            {isLoading ? (
              <View className="h-5 w-5 rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Text className="text-center text-base font-semibold text-white">
                Lưu
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function AddressScreen() {
  const navigation = useNavigation<AddressNav>();
  const { currentUser, loadCurrentUser, updateCurrentUser, isLoading } = useUserViewModel();

  const [isEditing, setIsEditing] = useState(false);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSave = useCallback(
    async (data: { address: string; city: string; country: string }) => {
      try {
        await updateCurrentUser({
          address: data.address,
        });
        await loadCurrentUser();
        setIsEditing(false);
        Alert.alert('Thành công', 'Địa chỉ đã được cập nhật');
      } catch (error) {
        Alert.alert(
          'Lỗi',
          error instanceof Error ? error.message : 'Không thể cập nhật địa chỉ',
        );
      }
    },
    [updateCurrentUser, loadCurrentUser],
  );

  React.useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      {/* Header */}
      <View className="h-14 flex-row items-center justify-between border-b border-slate-100 bg-white px-3">
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <ArrowLeft size={23} color="#0F172A" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-900">Địa chỉ</Text>
        <View className="h-10 w-10" />
      </View>

      {/* Content */}
      {isEditing ? (
        <AddressForm
          initialAddress={currentUser?.address || ''}
          initialCity={currentUser?.address || ''} // Backend uses single address field
          initialCountry={currentUser?.countryId || 'Vietnam'}
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      ) : (
        <ScrollView className="flex-1">
          <AddressDisplay
            address={currentUser?.address || ''}
            city={currentUser?.address || ''} // Backend uses single address field
            country={currentUser?.countryId || ''}
            onEdit={handleEdit}
          />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default AddressScreen;
