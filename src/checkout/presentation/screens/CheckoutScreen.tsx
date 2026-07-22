// Description: Creates a marketplace purchase request for selected cart items.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type KeyboardEvent,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  MapPin,
  Package,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  Truck,
  User,
  X,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type {
  CheckoutCurrencyTotal,
  CheckoutItem,
  DeliveryAddress,
} from '../../domain/types/checkout.types';
import { useCheckoutViewModel } from '../../application/view-models/useCheckoutViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import { AddressAutocomplete } from '../../../shared-kernel/presentation/components/AddressAutocomplete';
import { formatCurrency } from '../../../shared-kernel/application/utils/formatCurrency';

type CheckoutNav = NativeStackNavigationProp<RootStackParamList>;
type CheckoutRoute = RouteProp<RootStackParamList, typeof ROUTES.CHECKOUT>;
type CheckoutViewModel = ReturnType<typeof useCheckoutViewModel>;
type SelectedPlace = Parameters<
  React.ComponentProps<typeof AddressAutocomplete>['onSelectPlace']
>[0];

function formatMoney(total: CheckoutCurrencyTotal) {
  return formatCurrency(
    total.amount,
    total.currencyCode,
    total.currencySymbol,
  );
}

const ADDRESS_INPUT_STYLE = {
  height: 50,
  lineHeight: 22,
  paddingVertical: 0,
  textAlignVertical: 'center' as const,
};

function useCheckoutKeyboardInset(visible: boolean) {
  const sheetContentRef = useRef<View>(null);
  const keyboardTopRef = useRef<number | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  const refreshKeyboardInset = useCallback(() => {
    const keyboardTop = keyboardTopRef.current;
    if (keyboardTop === null) {
      setKeyboardInset(0);
      return;
    }

    requestAnimationFrame(() => {
      sheetContentRef.current?.measureInWindow((_x, y, _width, height) => {
        setKeyboardInset(Math.max(0, y + height - keyboardTop));
      });
    });
  }, []);

  useEffect(() => {
    if (!visible) {
      keyboardTopRef.current = null;
      setKeyboardInset(0);
      return;
    }

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillChangeFrame' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const handleKeyboardFrame = (event: KeyboardEvent) => {
      Keyboard.scheduleLayoutAnimation(event);
      keyboardTopRef.current = event.endCoordinates.screenY;
      refreshKeyboardInset();
    };
    const handleKeyboardHide = (event: KeyboardEvent) => {
      Keyboard.scheduleLayoutAnimation(event);
      keyboardTopRef.current = null;
      setKeyboardInset(0);
    };
    const showSubscription = Keyboard.addListener(showEvent, handleKeyboardFrame);
    const hideSubscription = Keyboard.addListener(hideEvent, handleKeyboardHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [refreshKeyboardInset, visible]);

  return { keyboardInset, refreshKeyboardInset, sheetContentRef };
}

function CurrencyTotals({
  totals,
  textClassName,
}: {
  totals: CheckoutCurrencyTotal[];
  textClassName: string;
}) {
  return (
    <View className="min-w-0 flex-1 items-end pl-3">
      {totals.map(total => (
        <Text
          key={total.currencyCode}
          className={textClassName}
          numberOfLines={1}
        >
          {formatMoney(total)}
        </Text>
      ))}
    </View>
  );
}

function inferAddress(place: SelectedPlace) {
  const address = place.description || [place.mainText, place.secondaryText]
    .filter(Boolean)
    .join(', ');
  const parts = address
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
  return {
    address,
    city: parts.length >= 2 ? parts[parts.length - 2] : '',
    country: parts.length ? parts[parts.length - 1] : '',
  };
}

function OrderLine({ item }: { item: CheckoutItem }) {
  return (
    <View className="flex-row py-3">
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          className="h-16 w-16 rounded-2xl bg-slate-100"
          resizeMode="cover"
        />
      ) : (
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <Package size={24} color="#94A3B8" />
        </View>
      )}
      <View className="ml-3 flex-1">
        <Text className="text-base font-extrabold text-slate-950" numberOfLines={2}>
          {item.name}
        </Text>
        <Text className="mt-1 text-sm font-semibold text-slate-500">
          Số lượng: {item.quantity}
        </Text>
      </View>
      <Text
        className="ml-3 max-w-[38%] text-right text-sm font-extrabold text-slate-900"
        numberOfLines={2}
      >
        {formatCurrency(item.total, item.currencyCode, item.currencySymbol)}
      </Text>
    </View>
  );
}

function AddressField({
  label,
  value,
  placeholder,
  keyboardType,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad';
  onChangeText: (value: string) => void;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-sm font-bold text-slate-700">
        {label} <Text className="text-red-500">*</Text>
      </Text>
      <View className="rounded-2xl border border-slate-200 bg-slate-50 px-4">
        <TextInput
          className="text-base font-semibold text-slate-900"
          style={ADDRESS_INPUT_STYLE}
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          keyboardType={keyboardType}
          onChangeText={onChangeText}
        />
      </View>
    </View>
  );
}

function AddressOption({
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
      className={`mb-3 rounded-2xl border p-4 ${
        selected ? 'border-[#0000ff] bg-blue-50' : 'border-slate-200 bg-white'
      }`}
      activeOpacity={0.85}
      onPress={onPress}
    >
      <View className="flex-row items-start">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-white">
          <MapPin size={19} color="#0000FF" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-base font-extrabold text-slate-950">
            {address.name}
          </Text>
          <Text className="mt-1 text-sm font-semibold text-slate-600">
            {address.phone}
          </Text>
          <Text className="mt-1 text-sm leading-5 text-slate-500">
            {[address.address, address.city, address.country]
              .filter(Boolean)
              .join(', ')}
          </Text>
        </View>
        <View
          className={`h-6 w-6 items-center justify-center rounded-full border ${
            selected ? 'border-[#0000ff] bg-[#0000ff]' : 'border-slate-300'
          }`}
        >
          {selected ? <Check size={14} color="#FFFFFF" strokeWidth={3} /> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function CheckoutAddressSheet({
  visible,
  vm,
  onClose,
}: {
  visible: boolean;
  vm: CheckoutViewModel;
  onClose: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const { keyboardInset, refreshKeyboardInset, sheetContentRef } =
    useCheckoutKeyboardInset(visible);

  useEffect(() => {
    if (!visible) return;
    setShowForm(vm.addresses.length === 0);
  }, [visible, vm.addresses.length]);

  const startNewAddress = useCallback(() => {
    vm.createNewAddress();
    setShowForm(true);
  }, [vm]);

  const selectAddress = useCallback(
    (address: DeliveryAddress) => {
      vm.selectAddress(address);
      onClose();
    },
    [onClose, vm],
  );

  const selectPlace = useCallback(
    (place: SelectedPlace) => {
      const nextAddress = inferAddress(place);
      vm.updateAddressField('address', nextAddress.address);
      vm.updateAddressField('zip', '10000');
      if (nextAddress.city) vm.updateAddressField('city', nextAddress.city);
      if (nextAddress.country) {
        vm.updateAddressField('country', nextAddress.country);
      }
    },
    [vm],
  );

  const saveAddress = useCallback(async () => {
    const saved = await vm.saveAddress();
    if (saved) onClose();
  }, [onClose, vm]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <SafeAreaView
          className="rounded-t-3xl bg-white"
          style={{ height: '88%' }}
          edges={['bottom']}
        >
          <View
            ref={sheetContentRef}
            className="flex-1"
            style={{ paddingBottom: keyboardInset }}
            onLayout={refreshKeyboardInset}
          >
            <View className="flex-row items-center border-b border-slate-100 px-4 py-3">
              <View className="h-10 w-10" />
              <View className="flex-1 items-center">
                <Text className="text-lg font-extrabold text-slate-950">
                  Địa chỉ nhận hàng
                </Text>
                <Text className="mt-0.5 text-xs font-semibold text-slate-500">
                  Chọn địa chỉ đã lưu hoặc nhập địa chỉ mới
                </Text>
              </View>
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Đóng"
              >
                <X size={20} color="#334155" />
              </TouchableOpacity>
            </View>
            <ScrollView
              className="flex-1"
              contentContainerStyle={{
                padding: 16,
                paddingBottom: 28,
                flexGrow: 1,
              }}
              keyboardDismissMode={
                Platform.OS === 'ios' ? 'interactive' : 'on-drag'
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {!showForm && vm.addresses.length > 0 ? (
                <>
                  {vm.addresses.map(address => (
                    <AddressOption
                      key={address.id}
                      address={address}
                      selected={vm.selectedAddressId === address.id}
                      onPress={() => selectAddress(address)}
                    />
                  ))}
                  <TouchableOpacity
                    className="mt-1 min-h-[48px] flex-row items-center justify-center rounded-full border border-blue-200 bg-blue-50"
                    activeOpacity={0.85}
                    onPress={startNewAddress}
                  >
                    <Plus size={18} color="#0000FF" />
                    <Text className="ml-2 text-base font-extrabold text-[#0000ff]">
                      Thêm địa chỉ mới
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View>
                  {vm.addresses.length > 0 ? (
                    <TouchableOpacity
                      className="mb-4 self-start"
                      onPress={() => setShowForm(false)}
                    >
                      <Text className="text-sm font-extrabold text-[#0000ff]">
                        Chọn địa chỉ đã lưu
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  <AddressField
                    label="Họ và tên"
                    value={vm.addressForm.name}
                    placeholder="Nhập họ và tên"
                    onChangeText={value => vm.updateAddressField('name', value)}
                  />
                  <AddressField
                    label="Số điện thoại"
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
                      placeholder="Nhập địa chỉ để tìm kiếm..."
                      onChangeText={value =>
                        vm.updateAddressField('address', value)
                      }
                      onSelectPlace={selectPlace}
                    />
                  </View>
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <AddressField
                        label="Quốc gia"
                        value={vm.addressForm.country}
                        placeholder="Quốc gia"
                        onChangeText={value =>
                          vm.updateAddressField('country', value)
                        }
                      />
                    </View>
                    <View className="flex-1">
                      <AddressField
                        label="Thành phố"
                        value={vm.addressForm.city}
                        placeholder="Thành phố"
                        onChangeText={value =>
                          vm.updateAddressField('city', value)
                        }
                      />
                    </View>
                  </View>
                  {vm.addressError ? (
                    <Text className="mb-3 text-sm font-semibold text-red-500">
                      {vm.addressError}
                    </Text>
                  ) : null}
                </View>
              )}
            </ScrollView>
            {showForm ? (
              <View className="border-t border-slate-100 bg-white px-4 pb-3 pt-3">
                <TouchableOpacity
                  className={`min-h-[50px] flex-row items-center justify-center rounded-full bg-[#0000ff] ${
                    vm.isSavingAddress ? 'opacity-70' : ''
                  }`}
                  activeOpacity={0.9}
                  disabled={vm.isSavingAddress}
                  onPress={saveAddress}
                >
                  {vm.isSavingAddress ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <User size={18} color="#FFFFFF" />
                      <Text className="ml-2 text-base font-extrabold text-white">
                        Lưu địa chỉ
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function ConfirmPurchaseModal({
  visible,
  itemCount,
  currencyTotals,
  isPaying,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  itemCount: number;
  currencyTotals: CheckoutCurrencyTotal[];
  isPaying: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/35 px-5">
        <View className="w-full rounded-3xl bg-white px-5 py-6 shadow-lg">
          <View className="mx-auto h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <ShieldCheck size={30} color="#0000FF" />
          </View>
          <Text className="mt-5 text-center text-xl font-extrabold text-slate-950">
            Xác nhận gửi yêu cầu mua
          </Text>
          <Text className="mt-3 text-center text-sm font-medium leading-6 text-slate-500">
            Người bán sẽ nhận đầy đủ sản phẩm và địa chỉ giao hàng qua đơn hàng
            cùng tin nhắn. Hai bên tự thỏa thuận phương thức thanh toán.
          </Text>
          <View className="mt-6 rounded-2xl bg-slate-50 px-4 py-4">
            <View className="flex-row justify-between py-2">
              <Text className="text-sm font-semibold text-slate-500">Sản phẩm</Text>
              <Text className="text-sm font-extrabold text-slate-900">{itemCount}</Text>
            </View>
            <View className="mt-2 flex-row items-start justify-between border-t border-slate-100 pt-4">
              <Text className="text-base font-extrabold text-slate-950">
                Tổng giá trị
              </Text>
              <CurrencyTotals
                totals={currencyTotals}
                textClassName="text-base font-extrabold text-[#0000ff]"
              />
            </View>
          </View>
          <View className="mt-6 flex-row gap-3">
            <TouchableOpacity
              className="h-12 flex-1 items-center justify-center rounded-2xl bg-slate-100"
              activeOpacity={0.85}
              disabled={isPaying}
              onPress={onCancel}
            >
              <Text className="text-base font-extrabold text-slate-600">Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`h-12 flex-1 items-center justify-center rounded-2xl bg-[#0000ff] ${
                isPaying ? 'opacity-70' : ''
              }`}
              activeOpacity={0.9}
              disabled={isPaying}
              onPress={onConfirm}
            >
              {isPaying ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-base font-extrabold text-white">
                  Gửi yêu cầu mua
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function RequestSuccessModal({
  visible,
  message,
  onTrackOrder,
}: {
  visible: boolean;
  message?: string | null;
  onTrackOrder: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/35 px-5">
        <View className="w-full rounded-3xl bg-white px-5 py-6 shadow-lg">
          <View className="mx-auto h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 size={32} color="#16A34A" />
          </View>
          <Text className="mt-5 text-center text-xl font-extrabold text-slate-950">
            Đã gửi yêu cầu mua
          </Text>
          <Text className="mt-3 text-center text-sm font-medium leading-6 text-slate-500">
            {message ||
              'Yêu cầu đã được lưu trong Đã đặt và gửi đầy đủ tới người bán.'}
          </Text>
          <TouchableOpacity
            className="mt-6 min-h-[48px] items-center justify-center rounded-full bg-[#0000ff]"
            activeOpacity={0.9}
            onPress={onTrackOrder}
          >
            <Text className="text-base font-extrabold text-white">
              Xem đơn đã đặt
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function CheckoutScreen() {
  const navigation = useNavigation<CheckoutNav>();
  const route = useRoute<CheckoutRoute>();
  const selectedProductIds = route.params?.selectedProductIds;
  const selectedAddressId = route.params?.selectedAddressId;
  const vm = useCheckoutViewModel({
    selectedProductIds,
    selectedAddressId,
    initialStep: 'payment',
  });
  const [addressSheetVisible, setAddressSheetVisible] = useState(false);
  const didAutoOpenAddressRef = useRef(false);
  const { createNewAddress } = vm;

  useEffect(() => {
    if (
      vm.isLoading ||
      vm.error ||
      vm.addresses.length > 0 ||
      didAutoOpenAddressRef.current
    ) {
      return;
    }
    didAutoOpenAddressRef.current = true;
    createNewAddress();
    setAddressSheetVisible(true);
  }, [createNewAddress, vm.addresses.length, vm.error, vm.isLoading]);

  const summary = vm.selectedSummary;

  const handleTrackOrder = useCallback(() => {
    vm.closeSuccess();
    navigation.navigate(ROUTES.MY_PRODUCTS, { initialTab: 'purchased' });
  }, [navigation, vm]);

  const handleBackToCart = useCallback(() => {
    navigation.navigate(ROUTES.CART);
  }, [navigation]);

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
          <Text className="text-2xl font-extrabold text-slate-950">Đặt hàng</Text>
          <Text className="mt-0.5 text-sm font-semibold text-slate-500">
            Kiểm tra thông tin trước khi gửi yêu cầu mua
          </Text>
        </View>
      </View>

      {vm.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0000FF" />
          <Text className="mt-3 text-sm font-semibold text-slate-500">
            Đang tải thông tin đặt hàng...
          </Text>
        </View>
      ) : !summary || summary.items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Package size={44} color="#94A3B8" />
          <Text className="mt-4 text-center text-xl font-extrabold text-slate-950">
            Chưa chọn sản phẩm
          </Text>
          <Text className="mt-2 text-center text-sm font-medium leading-6 text-slate-500">
            Quay lại giỏ hàng và chọn ít nhất một sản phẩm để tiếp tục.
          </Text>
          <TouchableOpacity
            className="mt-6 min-h-[46px] items-center justify-center rounded-full bg-[#0000ff] px-6"
            activeOpacity={0.9}
            onPress={handleBackToCart}
          >
            <Text className="text-base font-extrabold text-white">Về giỏ hàng</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 16, paddingBottom: 132 }}
            showsVerticalScrollIndicator={false}
          >
            <View className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-extrabold text-slate-950">
                  Thông tin giao hàng
                </Text>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setAddressSheetVisible(true)}
                >
                  <Text className="text-sm font-extrabold text-[#0000ff]">
                    {vm.selectedAddress ? 'Thay đổi' : 'Thêm địa chỉ'}
                  </Text>
                </TouchableOpacity>
              </View>
              {vm.selectedAddress ? (
                <TouchableOpacity
                  className="mt-4 rounded-2xl bg-slate-50 p-4"
                  activeOpacity={0.85}
                  onPress={() => setAddressSheetVisible(true)}
                >
                  <Text className="text-base font-extrabold text-slate-950">
                    {vm.selectedAddress.name}
                  </Text>
                  <View className="mt-3 flex-row items-center">
                    <Phone size={15} color="#64748B" />
                    <Text className="ml-2 text-sm font-semibold text-slate-600">
                      {vm.selectedAddress.phone}
                    </Text>
                  </View>
                  <View className="mt-2 flex-row items-start">
                    <MapPin size={15} color="#64748B" />
                    <Text className="ml-2 flex-1 text-sm font-medium leading-5 text-slate-500">
                      {[
                        vm.selectedAddress.address,
                        vm.selectedAddress.city,
                        vm.selectedAddress.country,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setAddressSheetVisible(true)}
                  className="mt-4 flex-row items-center rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-4"
                >
                  <Truck size={22} color="#0000FF" />
                  <Text className="ml-3 flex-1 text-base font-extrabold text-[#0000ff]">
                    Thêm địa chỉ giao hàng
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="mt-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <Text className="text-lg font-extrabold text-slate-950">
                Sản phẩm đặt mua
              </Text>
              <View className="mt-3">
                {summary.items.map(item => (
                  <OrderLine key={item.id} item={item} />
                ))}
              </View>
            </View>

            <View className="mt-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <Text className="text-lg font-extrabold text-slate-950">
                Tóm tắt yêu cầu
              </Text>
              <View className="mt-4 gap-3">
                <View className="flex-row items-start justify-between">
                  <Text className="text-sm font-semibold text-slate-500">Tạm tính</Text>
                  <CurrencyTotals
                    totals={summary.currencyTotals}
                    textClassName="text-sm font-extrabold text-slate-900"
                  />
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm font-semibold text-slate-500">
                    Phí giao hàng
                  </Text>
                  <Text className="text-sm font-extrabold text-slate-900">
                    Thỏa thuận với người bán
                  </Text>
                </View>
                <View className="mt-1 flex-row items-start justify-between border-t border-slate-100 pt-4">
                  <Text className="text-base font-extrabold text-slate-950">
                    Tổng giá trị
                  </Text>
                  <CurrencyTotals
                    totals={summary.currencyTotals}
                    textClassName="text-lg font-extrabold text-[#0000ff]"
                  />
                </View>
              </View>
              <Text className="mt-4 text-xs font-medium leading-5 text-slate-500">
                App không tự thực hiện thanh toán hoặc trừ số dư. Người mua và
                người bán tự thống nhất phương thức thanh toán.
              </Text>
            </View>

            {vm.paymentError ? (
              <Text className="mt-4 text-sm font-semibold text-red-500">
                {vm.paymentError}
              </Text>
            ) : null}
            {vm.error ? (
              <Text className="mt-4 text-sm font-semibold text-red-500">
                {vm.error}
              </Text>
            ) : null}
          </ScrollView>
          <View className="absolute bottom-0 left-0 right-0 border-t border-slate-200 bg-white px-4 pb-4 pt-3 shadow-lg">
            {!vm.selectedAddress ? (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setAddressSheetVisible(true)}
                className="min-h-[50px] flex-row items-center justify-center rounded-full bg-[#0000ff] px-5"
              >
                <Truck size={19} color="#FFFFFF" />
                <Text className="ml-2 text-base font-extrabold text-white">
                  Thêm địa chỉ giao hàng
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.9}
                disabled={vm.isPaying}
                onPress={vm.openConfirm}
                className={`min-h-[50px] flex-row items-center justify-center rounded-full bg-[#0000ff] px-5 ${
                  vm.isPaying ? 'opacity-70' : ''
                }`}
              >
                {vm.isPaying ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Send size={19} color="#FFFFFF" />
                    <Text className="ml-2 text-base font-extrabold text-white">
                      Gửi yêu cầu mua
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
          <ConfirmPurchaseModal
            visible={vm.confirmVisible}
            itemCount={vm.itemCount}
            currencyTotals={summary.currencyTotals}
            isPaying={vm.isPaying}
            onCancel={vm.closeConfirm}
            onConfirm={vm.pay}
          />
        </>
      )}

      <CheckoutAddressSheet
        visible={addressSheetVisible}
        vm={vm}
        onClose={() => setAddressSheetVisible(false)}
      />
      <RequestSuccessModal
        visible={vm.successVisible}
        message={vm.successMessage}
        onTrackOrder={handleTrackOrder}
      />
    </SafeAreaView>
  );
}

export default CheckoutScreen;
