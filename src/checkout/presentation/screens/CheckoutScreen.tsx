// Description: Marketplace payment screen after selecting cart items.
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Truck,
  Wallet,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { CheckoutItem } from '../../domain/types/checkout.types';
import { useCheckoutViewModel } from '../../application/view-models/useCheckoutViewModel';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';

type CheckoutNav = NativeStackNavigationProp<RootStackParamList>;
type CheckoutRoute = RouteProp<RootStackParamList, typeof ROUTES.CHECKOUT>;

function formatMoney(value: number, symbol: string) {
  const roundedValue = Math.round(Number.isFinite(value) ? value : 0);
  return `${roundedValue.toLocaleString('vi-VN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  })} ${symbol}`;
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
      <Text className="ml-3 text-sm font-extrabold text-slate-900">
        {formatMoney(item.total, item.currencySymbol)}
      </Text>
    </View>
  );
}

function ConfirmPurchaseModal({
  visible,
  itemCount,
  total,
  currencySymbol,
  isPaying,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  itemCount: number;
  total: number;
  currencySymbol: string;
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
            Xác nhận đặt đơn
          </Text>
          <Text className="mt-3 text-center text-sm font-medium leading-6 text-slate-500">
            Đơn hàng của bạn sẽ được gửi tới người bán qua tin nhắn để xác nhận giao dịch.
          </Text>
          <View className="mt-6 rounded-2xl bg-slate-50 px-4 py-4">
            <View className="flex-row justify-between py-2">
              <Text className="text-sm font-semibold text-slate-500">Sản phẩm</Text>
              <Text className="text-sm font-extrabold text-slate-900">{itemCount}</Text>
            </View>
            <View className="mt-2 flex-row justify-between border-t border-slate-100 pt-4">
              <Text className="text-base font-extrabold text-slate-950">
                Tổng thanh toán
              </Text>
              <Text className="text-base font-extrabold text-[#0000ff]">
                {formatMoney(total, currencySymbol)}
              </Text>
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
                  Xác nhận đặt đơn
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
        <View className="w-full rounded-3xl bg-white px-5 py-6 shadow-lg">
          <View className="mx-auto h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 size={32} color="#16A34A" />
          </View>
          <Text className="mt-5 text-center text-xl font-extrabold text-slate-950">
            Đặt đơn hàng thành công
          </Text>
          <Text className="mt-3 text-center text-sm font-medium leading-6 text-slate-500">
            Đơn hàng đã được ghi nhận và gửi thông tin sản phẩm cùng thông tin của bạn tới người bán qua tin nhắn.
          </Text>
          <TouchableOpacity
            className="mt-6 min-h-[48px] items-center justify-center rounded-full bg-[#0000ff]"
            activeOpacity={0.9}
            onPress={onTrackOrder}
          >
            <Text className="text-base font-extrabold text-white">
              Xem tin nhắn
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

  const summary = vm.selectedSummary;
  const wallet = vm.walletBalance?.wallet ?? 0;
  const currencySymbol =
    summary?.currencySymbol || vm.walletBalance?.currencySymbol || 'VNSEEA';
  const missingAmount = summary ? Math.max(0, summary.total - wallet) : 0;

  const handleDeposit = useCallback(() => {
    navigation.navigate(ROUTES.DEPOSIT, { returnTo: ROUTES.CHECKOUT });
  }, [navigation]);

  const handleTrackOrder = useCallback(() => {
    vm.closeSuccess();
    navigation.navigate(ROUTES.MESSAGES);
  }, [navigation, vm]);

  const handleChangeAddress = useCallback(() => {
    navigation.navigate(ROUTES.SHIPPING_ADDRESS, {
      selectedProductIds,
      selectedAddressId: vm.selectedAddressId || undefined,
    });
  }, [navigation, selectedProductIds, vm.selectedAddressId]);

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
          <Text className="text-2xl font-extrabold text-slate-950">Thanh toán</Text>
          <Text className="mt-0.5 text-sm font-semibold text-slate-500">
            Kiểm tra đơn hàng trước khi xác nhận
          </Text>
        </View>
      </View>

      {vm.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0000FF" />
          <Text className="mt-3 text-sm font-semibold text-slate-500">
            Đang tải thông tin thanh toán...
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
                <TouchableOpacity activeOpacity={0.8} onPress={handleChangeAddress}>
                  <Text className="text-sm font-extrabold text-[#0000ff]">
                    {vm.selectedAddress ? 'Thay đổi' : 'Thêm địa chỉ'}
                  </Text>
                </TouchableOpacity>
              </View>

              {vm.selectedAddress ? (
                <View className="mt-4 rounded-2xl bg-slate-50 p-4">
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
                </View>
              ) : (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={handleChangeAddress}
                  className="mt-4 flex-row items-center rounded-2xl border border-dashed border-blue-200 bg-blue-50 px-4 py-4"
                >
                  <Truck size={22} color="#0000FF" />
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-extrabold text-[#0000ff]">
                      Thêm địa chỉ giao hàng
                    </Text>
                    <Text className="mt-0.5 text-sm font-medium text-slate-500">
                      Thông tin giao hàng được quản lý ở màn riêng.
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>

            <View className="mt-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <Text className="text-lg font-extrabold text-slate-950">
                Sản phẩm thanh toán
              </Text>
              <View className="mt-3">
                {summary.items.map(item => (
                  <OrderLine key={item.id} item={item} />
                ))}
              </View>
            </View>

            <View className="mt-4 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <Text className="text-lg font-extrabold text-slate-950">
                Tóm tắt thanh toán
              </Text>
              <View className="mt-4 gap-3">
                <View className="flex-row justify-between">
                  <Text className="text-sm font-semibold text-slate-500">Tạm tính</Text>
                  <Text className="text-sm font-extrabold text-slate-900">
                    {formatMoney(summary.subtotal, currencySymbol)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm font-semibold text-slate-500">Phí giao hàng</Text>
                  <Text className="text-sm font-extrabold text-slate-900">
                    {summary.shipping > 0
                      ? formatMoney(summary.shipping, currencySymbol)
                      : 'Miễn phí'}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-sm font-semibold text-slate-500">Số dư ví</Text>
                  <Text className="text-sm font-extrabold text-slate-900">
                    {formatMoney(wallet, currencySymbol)}
                  </Text>
                </View>
                <View className="mt-1 flex-row justify-between border-t border-slate-100 pt-4">
                  <Text className="text-base font-extrabold text-slate-950">
                    Tổng thanh toán
                  </Text>
                  <Text className="text-lg font-extrabold text-[#0000ff]">
                    {formatMoney(summary.total, currencySymbol)}
                  </Text>
                </View>
              </View>
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
                onPress={handleChangeAddress}
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
                    <CreditCard size={19} color="#FFFFFF" />
                    <Text className="ml-2 text-base font-extrabold text-white">
                      Đặt đơn hàng
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <ConfirmPurchaseModal
            visible={vm.confirmVisible}
            itemCount={vm.itemCount}
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
