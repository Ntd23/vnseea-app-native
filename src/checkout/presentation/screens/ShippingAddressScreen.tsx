// Description: Dedicated shipping address screen for marketplace checkout.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  MapPin,
  Phone,
  Plus,
  User,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { DeliveryAddress } from '../../domain/types/checkout.types';
import { useCheckoutViewModel } from '../../application/view-models/useCheckoutViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import AddressAutocomplete from '../../../shared-kernel/presentation/components/AddressAutocomplete';

type ShippingAddressNav = NativeStackNavigationProp<RootStackParamList>;
type ShippingAddressRoute = RouteProp<RootStackParamList, typeof ROUTES.SHIPPING_ADDRESS>;

function Field({
  label,
  value,
  placeholder,
  required,
  keyboardType,
  multiline = false,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  required?: boolean;
  keyboardType?: 'default' | 'phone-pad';
  multiline?: boolean;
  onChangeText: (value: string) => void;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-bold text-slate-700">
        {label} {required ? <Text className="text-red-500">*</Text> : null}
      </Text>
      <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4">
        <TextInput
          className={`text-base font-semibold text-slate-900 ${
            multiline ? 'min-h-24 py-3' : 'min-h-[48px]'
          }`}
          style={multiline ? { textAlignVertical: 'top' } : undefined}
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          onChangeText={onChangeText}
        />
      </View>
    </View>
  );
}

function SavedAddressCard({
  address,
  selected,
  onPress,
}: {
  address: DeliveryAddress;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      className={`mb-3 rounded-3xl border bg-white p-4 shadow-sm ${
        selected ? 'border-brand' : 'border-slate-100'
      }`}
    >
      <View className="flex-row items-start">
        <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-subtle">
          <MapPin size={20} color={APP_BRAND_COLOR} />
        </View>
        <View className="ml-3 flex-1">
          <View className="flex-row items-center">
            <Text className="flex-1 text-base font-extrabold text-slate-950">
              {address.name}
            </Text>
            {selected ? (
              <View className="h-7 w-7 items-center justify-center rounded-full bg-brand">
                <Check size={16} color="#FFFFFF" strokeWidth={3} />
              </View>
            ) : null}
          </View>
          <View className="mt-2 flex-row items-center">
            <Phone size={14} color="#64748B" />
            <Text className="ml-2 text-sm font-semibold text-slate-600">
              {address.phone}
            </Text>
          </View>
          <Text className="mt-2 text-sm font-medium leading-5 text-slate-500">
            {[address.address, address.city, address.country].filter(Boolean).join(', ')}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function ShippingAddressScreen() {
  const navigation = useNavigation<ShippingAddressNav>();
  const route = useRoute<ShippingAddressRoute>();
  const selectedProductIds = route.params?.selectedProductIds;
  const selectedAddressId = route.params?.selectedAddressId;
  const vm = useCheckoutViewModel({
    selectedProductIds,
    selectedAddressId,
    initialStep: 'confirm',
  });

  const goToCheckout = useCallback(
    (addressId?: string) => {
      navigation.navigate(ROUTES.CHECKOUT, {
        selectedProductIds,
        selectedAddressId: addressId || vm.selectedAddressId || undefined,
      });
    },
    [navigation, selectedProductIds, vm.selectedAddressId],
  );

  const handleUseAddress = useCallback(
    (address: DeliveryAddress) => {
      vm.selectAddress(address);
      goToCheckout(address.id);
    },
    [goToCheckout, vm],
  );

  const handleSaveAddress = useCallback(async () => {
    const saved = await vm.saveAddress();
    if (saved) {
      goToCheckout();
    }
  }, [goToCheckout, vm]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />
      <FeedHeader />
      <View className="flex-row items-center border-b border-slate-200 bg-white px-4 py-3">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={23} color="#1E293B" />
        </TouchableOpacity>
        <View className="ml-2 flex-1">
          <Text className="text-2xl font-extrabold text-slate-950">
            Thông tin giao hàng
          </Text>
          <Text className="mt-0.5 text-sm font-semibold text-slate-500">
            Chọn hoặc thêm địa chỉ nhận hàng
          </Text>
        </View>
      </View>

      {vm.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={APP_BRAND_COLOR} />
          <Text className="mt-3 text-sm font-semibold text-slate-500">
            Đang tải địa chỉ...
          </Text>
        </View>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {vm.addresses.length > 0 ? (
              <View className="mb-5">
                <Text className="mb-3 text-lg font-extrabold text-slate-950">
                  Địa chỉ đã lưu
                </Text>
                {vm.addresses.map(address => (
                  <SavedAddressCard
                    key={address.id}
                    address={address}
                    selected={vm.selectedAddressId === address.id}
                    onPress={() => handleUseAddress(address)}
                  />
                ))}
              </View>
            ) : null}

            <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <View className="mb-4 flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-subtle">
                    <Plus size={20} color={APP_BRAND_COLOR} />
                  </View>
                  <Text className="ml-3 text-lg font-extrabold text-slate-950">
                    Thêm địa chỉ mới
                  </Text>
                </View>
                {vm.addresses.length > 0 ? (
                  <TouchableOpacity activeOpacity={0.8} onPress={vm.createNewAddress}>
                    <Text className="text-sm font-extrabold text-brand">Nhập mới</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              <Field
                label="Họ và tên"
                required
                value={vm.addressForm.name}
                placeholder="Nhập họ và tên"
                onChangeText={value => vm.updateAddressField('name', value)}
              />
              <Field
                label="Số điện thoại"
                required
                value={vm.addressForm.phone}
                placeholder="Nhập số điện thoại"
                keyboardType="phone-pad"
                onChangeText={value => vm.updateAddressField('phone', value)}
              />
              <View className="mb-4">
                <Text className="mb-2 text-sm font-bold text-slate-700">
                  Địa chỉ <Text className="text-red-500">*</Text>
                </Text>
                <AddressAutocomplete
                  value={vm.addressForm.address}
                  placeholder="Tìm số nhà, tên đường, phường/xã..."
                  onChangeText={value =>
                    vm.updateAddressField('address', value)
                  }
                  onSelectPlace={place => {
                    vm.updateAddressField('address', place.description);
                    if (place.city || place.district) {
                      vm.updateAddressField(
                        'city',
                        place.city || place.district || '',
                      );
                    }
                    if (place.country) {
                      vm.updateAddressField('country', place.country);
                    }
                  }}
                />
              </View>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Field
                    label="Quốc gia"
                    required
                    value={vm.addressForm.country}
                    placeholder="Nhập quốc gia"
                    onChangeText={value => vm.updateAddressField('country', value)}
                  />
                </View>
                <View className="flex-1">
                  <Field
                    label="Thành phố"
                    required
                    value={vm.addressForm.city}
                    placeholder="Nhập thành phố"
                    onChangeText={value => vm.updateAddressField('city', value)}
                  />
                </View>
              </View>

              {vm.addressError ? (
                <Text className="mb-3 text-sm font-semibold text-red-500">
                  {vm.addressError}
                </Text>
              ) : null}

              <TouchableOpacity
                className={`min-h-[50px] flex-row items-center justify-center rounded-full bg-brand px-5 ${
                  vm.isSavingAddress ? 'opacity-70' : ''
                }`}
                activeOpacity={0.9}
                disabled={vm.isSavingAddress}
                onPress={handleSaveAddress}
              >
                {vm.isSavingAddress ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <User size={18} color="#FFFFFF" />
                    <Text className="ml-2 text-base font-extrabold text-white">
                      Lưu và tiếp tục
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

export default ShippingAddressScreen;
