// Description: Renders marketplace checkout with wallet validation and purchase confirmation.
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Edit3,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { CheckoutItem } from '../../domain/types/checkout.types';
import {
  useCheckoutViewModel,
  type CheckoutStep,
} from '../../application/view-models/useCheckoutViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type CheckoutNav = NativeStackNavigationProp<RootStackParamList>;

function formatMoney(value: number, symbol: string) {
  const roundedValue = Math.round(Number.isFinite(value) ? value : 0);
  return `${roundedValue.toLocaleString('vi-VN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })} ${symbol}`;
}

function Stepper({ step }: { step: CheckoutStep }) {
  const order: CheckoutStep[] = ['cart', 'confirm', 'payment'];
  const labels = {
    cart: 'Giỏ hàng',
    confirm: 'Xác nhận',
    payment: 'Thanh toán',
  };
  const currentIndex = order.indexOf(step);

  return (
    <View className="surface-topbar flex-row items-center justify-center gap-2 px-4 py-3">
      {order.map((item, index) => {
        const isDone = index < currentIndex;
        const isActive = index === currentIndex;
        return (
          <React.Fragment key={item}>
            <View className="flex-row items-center">
              <View
                className={`h-7 w-7 items-center justify-center rounded-full ${
                  isDone || isActive ? 'bg-blue-600' : 'bg-slate-100'
                }`}
              >
                {isDone ? (
                  <Check size={15} color="#FFFFFF" />
                ) : (
                  <Text
                    className={
                      isActive
                        ? 'text-caption-primary text-inverse'
                        : 'text-caption-primary text-slate-400'
                    }
                  >
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text
                className={`ml-2 text-caption-primary ${
                  isActive ? 'text-slate-950' : 'text-slate-500'
                }`}
              >
                {labels[item]}
              </Text>
            </View>
            {index < order.length - 1 ? (
              <View
                className={`h-0.5 w-8 ${
                  index < currentIndex ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </View>
  );
}

function Field({
  label,
  value,
  placeholder,
  required,
  keyboardType,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  required?: boolean;
  keyboardType?: 'default' | 'phone-pad';
  onChangeText: (value: string) => void;
}) {
  return (
    <View className="mb-4">
      <Text className="mb-2 text-caption-primary">
        {label} {required ? <Text className="text-red-500">*</Text> : null}
      </Text>
      <View className="input-shell px-4">
        <TextInput
          className="min-h-[46px] text-body-primary"
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

function AddressCard({
  name,
  phone,
  address,
  onEdit,
}: {
  name: string;
  phone: string;
  address: string;
  onEdit: () => void;
}) {
  return (
    <View className="surface-card px-4 py-4">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-3">
          <View className="flex-row items-center">
            <Text className="text-title-primary">{name}</Text>
            <View className="ml-2 rounded-md bg-blue-50 px-2 py-1">
              <Text className="text-caption-primary font-bold text-brand">
                ĐANG SỬ DỤNG
              </Text>
            </View>
          </View>
          <View className="mt-4 flex-row items-center">
            <Phone size={15} color="#64748B" />
            <Text className="ml-2 text-body-secondary">{phone}</Text>
          </View>
          <View className="mt-3 flex-row items-start">
            <MapPin size={15} color="#64748B" />
            <Text className="ml-2 flex-1 text-body-secondary">{address}</Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white"
            activeOpacity={0.8}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            onPress={onEdit}
          >
            <Edit3 size={16} color="#0000FF" />
          </TouchableOpacity>
          <View className="h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white opacity-50">
            <Trash2 size={16} color="#EF4444" />
          </View>
        </View>
      </View>
    </View>
  );
}

function OrderLine({
  item,
  disabled,
  onChangeQuantity,
}: {
  item: CheckoutItem;
  disabled: boolean;
  onChangeQuantity: (productId: number, quantity: number) => void;
}) {
  return (
    <View className="flex-row items-center py-3">
      {item.image ? (
        <Image
          source={{ uri: item.image }}
          className="h-16 w-16 rounded-xl bg-slate-100"
          resizeMode="cover"
        />
      ) : (
        <View className="h-16 w-16 items-center justify-center rounded-xl bg-slate-100">
          <Package size={24} color="#94A3B8" />
        </View>
      )}
      <View className="ml-3 flex-1">
        <Text className="text-title-secondary" numberOfLines={2}>
          {item.name}
        </Text>
        <View className="mt-2 flex-row items-center rounded-lg bg-slate-100 self-start">
          <TouchableOpacity
            className="h-8 w-9 items-center justify-center"
            activeOpacity={0.8}
            disabled={disabled}
            onPress={() => onChangeQuantity(item.productId, item.quantity - 1)}
          >
            <Text className="text-title-primary text-slate-500">-</Text>
          </TouchableOpacity>
          <Text className="min-w-6 text-center text-caption-primary">
            {item.quantity}
          </Text>
          <TouchableOpacity
            className="h-8 w-9 items-center justify-center"
            activeOpacity={0.8}
            disabled={disabled}
            onPress={() => onChangeQuantity(item.productId, item.quantity + 1)}
          >
            <Text className="text-title-primary text-slate-500">+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text className="ml-3 text-title-primary">
        {formatMoney(item.total, item.currencySymbol)}
      </Text>
    </View>
  );
}

function OrderSummary({
  items,
  subtotal,
  shipping,
  total,
  currencySymbol,
  wallet,
  canPay,
  addressReady,
  isSubmitting,
  isUpdatingQuantity,
  onChangeQuantity,
  onPay,
  onSaveAddress,
  onDeposit,
}: {
  items: CheckoutItem[];
  subtotal: number;
  shipping: number;
  total: number;
  currencySymbol: string;
  wallet: number;
  canPay: boolean;
  addressReady: boolean;
  isSubmitting: boolean;
  isUpdatingQuantity: boolean;
  onChangeQuantity: (productId: number, quantity: number) => void;
  onPay: () => void;
  onSaveAddress: () => void;
  onDeposit: () => void;
}) {
  const missingAmount = Math.max(0, total - wallet);

  return (
    <View className="surface-card mt-5 px-4 py-4">
      <Text className="text-heading">Xem lại đơn hàng</Text>
      <View className="mt-4">
        {items.map(item => (
          <OrderLine
            key={item.id}
            item={item}
            disabled={isUpdatingQuantity}
            onChangeQuantity={onChangeQuantity}
          />
        ))}
      </View>
      <View className="mt-4 border-t border-slate-100 pt-4">
        <View className="flex-row justify-between py-1.5">
          <Text className="text-body-secondary">Tạm tính</Text>
          <Text className="text-body-secondary">
            {formatMoney(subtotal, currencySymbol)}
          </Text>
        </View>
        <View className="flex-row justify-between py-1.5">
          <Text className="text-body-secondary">Phí giao hàng</Text>
          <Text className="text-body-secondary">
            {shipping > 0 ? formatMoney(shipping, currencySymbol) : 'Miễn phí'}
          </Text>
        </View>
        <View className="flex-row justify-between py-1.5">
          <Text className="text-body-secondary">Số dư ví hiện tại</Text>
          <Text className="text-body-secondary">
            {formatMoney(wallet, currencySymbol)}
          </Text>
        </View>
        <View className="mt-3 flex-row justify-between border-t border-slate-100 pt-4">
          <Text className="text-title-primary">Tổng thanh toán</Text>
          <Text className="text-title-primary">
            {formatMoney(total, currencySymbol)}
          </Text>
        </View>
      </View>

      {!addressReady ? (
        <View className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Text className="text-caption-primary text-amber-700">
            Hãy lưu địa chỉ giao hàng trước khi tiếp tục thanh toán.
          </Text>
        </View>
      ) : !canPay ? (
        <View className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Text className="text-caption-primary text-amber-700">
            Số dư ví chưa đủ. Bạn cần nạp thêm{' '}
            {formatMoney(missingAmount, currencySymbol)} để thanh toán đơn hàng.
          </Text>
        </View>
      ) : null}

      {!addressReady ? (
        <TouchableOpacity
          className={`btn-primary mt-4 min-h-[46px] ${
            isSubmitting ? 'opacity-70' : ''
          }`}
          activeOpacity={0.9}
          disabled={isSubmitting}
          onPress={onSaveAddress}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-title-primary text-inverse">
              Lưu địa chỉ trước
            </Text>
          )}
        </TouchableOpacity>
      ) : canPay ? (
        <TouchableOpacity
          className={`btn-primary mt-4 min-h-[46px] ${
            isSubmitting ? 'opacity-70' : ''
          }`}
          activeOpacity={0.9}
          disabled={isSubmitting}
          onPress={onPay}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-title-primary text-inverse">
              Thanh toán bằng ví
            </Text>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          className="btn-primary mt-4 min-h-[46px]"
          activeOpacity={0.9}
          onPress={onDeposit}
        >
          <Wallet size={18} color="#FFFFFF" />
          <Text className="text-title-primary text-inverse">
            Nạp thêm vào ví
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ConfirmPurchaseModal({
  visible,
  itemCount,
  wallet,
  total,
  currencySymbol,
  isPaying,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  itemCount: number;
  wallet: number;
  total: number;
  currencySymbol: string;
  isPaying: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View className="flex-1 items-center justify-center bg-black/35 px-5">
        <View className="w-full rounded-2xl bg-white px-5 py-6 shadow-lg">
          <View className="mx-auto h-16 w-16 items-center justify-center rounded-full bg-blue-50">
            <ShieldCheck size={28} color="#4F46E5" />
          </View>
          <Text className="mt-5 text-center text-heading">
            Xác nhận mua hàng
          </Text>
          <Text className="mt-3 text-center text-body-secondary">
            Vui lòng kiểm tra kỹ thông tin đơn hàng trước khi tiến hành thanh toán.
          </Text>
          <View className="mt-6 rounded-2xl bg-slate-50 px-4 py-4">
            <View className="flex-row justify-between py-2">
              <Text className="text-body-secondary">Số lượng mặt hàng</Text>
              <Text className="text-title-primary">{itemCount}</Text>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-body-secondary">Số dư ví hiện tại</Text>
              <Text className="text-title-primary text-brand">
                {formatMoney(wallet, currencySymbol)}
              </Text>
            </View>
            <View className="mt-2 flex-row justify-between border-t border-slate-100 pt-4">
              <Text className="text-title-primary">Tổng thanh toán</Text>
              <Text className="text-heading text-brand">
                {formatMoney(total, currencySymbol)}
              </Text>
            </View>
          </View>
          <View className="mt-6 flex-row gap-3">
            <TouchableOpacity
              className="h-12 flex-1 items-center justify-center rounded-xl bg-slate-100"
              activeOpacity={0.85}
              disabled={isPaying}
              onPress={onCancel}
            >
              <Text className="text-title-primary text-slate-600">Hủy bỏ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`btn-primary h-12 flex-1 ${isPaying ? 'opacity-70' : ''}`}
              activeOpacity={0.9}
              disabled={isPaying}
              onPress={onConfirm}
            >
              {isPaying ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text className="text-title-primary text-inverse">
                  Xác nhận mua
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PaymentSuccessModal({
  visible,
  onTrackOrder,
}: {
  visible: boolean;
  onTrackOrder: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View className="flex-1 items-center justify-center bg-black/35 px-5">
        <View className="w-full rounded-2xl bg-white px-5 py-6 shadow-lg">
          <View className="mx-auto h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 size={30} color="#16A34A" />
          </View>
          <Text className="mt-5 text-center text-heading">
            Thanh toán thành công
          </Text>
          <Text className="mt-3 text-center text-body-secondary">
            Đơn hàng của bạn đã được ghi nhận. Bạn có thể theo dõi trạng thái
            trong tab Đã mua.
          </Text>
          <TouchableOpacity
            className="btn-primary mt-6 min-h-[48px]"
            activeOpacity={0.9}
            onPress={onTrackOrder}
          >
            <Text className="text-title-primary text-inverse">
              Theo dõi đơn hàng
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function CheckoutScreen() {
  const navigation = useNavigation<CheckoutNav>();
  const vm = useCheckoutViewModel();

  const handleDeposit = useCallback(() => {
    navigation.navigate(ROUTES.DEPOSIT, { returnTo: ROUTES.CHECKOUT });
  }, [navigation]);

  const handleTrackOrder = useCallback(() => {
    vm.closeSuccess();
    navigation.navigate(ROUTES.MY_PRODUCTS, { initialTab: 'purchased' });
  }, [navigation, vm]);

  const summary = vm.summary;
  const wallet = vm.walletBalance?.wallet ?? 0;
  const currencySymbol =
    summary?.currencySymbol || vm.walletBalance?.currencySymbol || 'đ';

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />
      <View className="surface-topbar flex-row items-center px-4 py-3">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#1E293B" />
        </TouchableOpacity>
        <Text className="ml-2 flex-1 text-heading">Thanh toán</Text>
      </View>
      <Stepper step={vm.step} />

      {vm.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0000FF" />
          <Text className="mt-3 text-body-secondary">
            Đang tải thông tin thanh toán...
          </Text>
        </View>
      ) : !summary || summary.items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <Package size={42} color="#94A3B8" />
          <Text className="mt-4 text-center text-title-primary">
            Giỏ hàng đang trống
          </Text>
          <Text className="mt-2 text-center text-body-secondary">
            Hãy thêm sản phẩm vào giỏ trước khi thanh toán.
          </Text>
          <TouchableOpacity
            className="btn-primary mt-6 min-h-[44px] px-6"
            activeOpacity={0.9}
            onPress={() => navigation.navigate(ROUTES.MARKETPLACE)}
          >
            <Text className="text-title-primary text-inverse">
              Quay lại cửa hàng
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView
            className="flex-1"
            contentContainerClassName="px-4 pb-8 pt-5"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-display">Thanh toán</Text>
              {vm.addresses.length > 0 ? (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => vm.setStep('confirm')}
                >
                  <Text className="text-caption-primary text-brand">
                    Thay đổi địa chỉ
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            <View className="mt-8">
              <Text className="mb-4 text-heading">
                {vm.step === 'payment' && vm.selectedAddress
                  ? 'Địa chỉ giao hàng'
                  : 'Thông tin giao hàng'}
              </Text>

              {vm.step === 'payment' && vm.selectedAddress ? (
                <AddressCard
                  name={vm.selectedAddress.name}
                  phone={vm.selectedAddress.phone}
                  address={[
                    vm.selectedAddress.address,
                    vm.selectedAddress.city,
                    vm.selectedAddress.country,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                  onEdit={() => vm.setStep('confirm')}
                />
              ) : (
                <View className="surface-card px-4 py-4">
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
                  <Field
                    label="Quốc gia"
                    required
                    value={vm.addressForm.country}
                    placeholder="Quốc gia"
                    onChangeText={value =>
                      vm.updateAddressField('country', value)
                    }
                  />
                  <View className="flex-row gap-3">
                    <View className="flex-1">
                      <Field
                        label="Thành phố"
                        required
                        value={vm.addressForm.city}
                        placeholder="Thành phố"
                        onChangeText={value =>
                          vm.updateAddressField('city', value)
                        }
                      />
                    </View>
                    <View className="flex-1">
                      <Field
                        label="Mã Bưu Chính"
                        required
                        value={vm.addressForm.zip}
                        placeholder="Mã Bưu Chính"
                        onChangeText={value =>
                          vm.updateAddressField('zip', value)
                        }
                      />
                    </View>
                  </View>
                  <Field
                    label="Địa chỉ chi tiết"
                    required
                    value={vm.addressForm.address}
                    placeholder="Số nhà, tên đường, phường/xã..."
                    onChangeText={value =>
                      vm.updateAddressField('address', value)
                    }
                  />
                  {vm.addressError ? (
                    <Text className="mb-3 text-caption-primary text-red-500">
                      {vm.addressError}
                    </Text>
                  ) : null}
                  <TouchableOpacity
                    className={`btn-primary min-h-[46px] ${
                      vm.isSavingAddress ? 'opacity-70' : ''
                    }`}
                    activeOpacity={0.9}
                    disabled={vm.isSavingAddress}
                    onPress={vm.saveAddress}
                  >
                    {vm.isSavingAddress ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text className="text-title-primary text-inverse">
                        Lưu địa chỉ
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {vm.error ? (
              <Text className="mt-4 text-caption-primary text-red-500">
                {vm.error}
              </Text>
            ) : null}
            {vm.paymentError ? (
              <Text className="mt-4 text-caption-primary text-red-500">
                {vm.paymentError}
              </Text>
            ) : null}
            {vm.successMessage ? (
              <Text className="mt-4 text-caption-primary text-emerald-600">
                {vm.successMessage}
              </Text>
            ) : null}

            <OrderSummary
              items={summary.items}
              subtotal={summary.subtotal}
              shipping={summary.shipping}
              total={summary.total}
              currencySymbol={currencySymbol}
              wallet={wallet}
              canPay={vm.canPay}
              addressReady={Boolean(vm.selectedAddress)}
              isSubmitting={
                vm.step === 'payment' ? vm.isPaying : vm.isSavingAddress
              }
              isUpdatingQuantity={vm.isUpdatingQuantity}
              onChangeQuantity={vm.changeQuantity}
              onPay={vm.openConfirm}
              onSaveAddress={vm.saveAddress}
              onDeposit={handleDeposit}
            />
          </ScrollView>

          <ConfirmPurchaseModal
            visible={vm.confirmVisible}
            itemCount={vm.itemCount}
            wallet={wallet}
            total={summary.total}
            currencySymbol={currencySymbol}
            isPaying={vm.isPaying}
            onCancel={vm.closeConfirm}
            onConfirm={vm.pay}
          />
        </>
      )}
      <PaymentSuccessModal
        visible={vm.successVisible}
        onTrackOrder={handleTrackOrder}
      />
    </SafeAreaView>
  );
}

export default CheckoutScreen;
