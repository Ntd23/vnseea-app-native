// Description: Add money to wallet with backend-provided payment methods.
import React, {useCallback, useEffect} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {ArrowLeft, CheckCircle2, RefreshCw, Wallet, X} from 'lucide-react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../navigation/types';
import {useDepositViewModel} from '../../application/view-models/useDepositViewModel';

type DepositNav = NativeStackNavigationProp<RootStackParamList>;

const PRESET_AMOUNTS = [
  {label: '50.000 đ', value: 50000},
  {label: '100.000 đ', value: 100000},
  {label: '200.000 đ', value: 200000},
  {label: '500.000 đ', value: 500000},
  {label: '1.000.000 đ', value: 1000000},
];

interface SepayOrder {
  qr_url?: string;
  order_code?: string;
  amount?: number;
  bank_code?: string;
  account_number?: string;
  account_name?: string;
  status?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount) + ' đ';
}

function PaymentIcon({method}: {method: string}) {
  const configs: Record<string, {bg: string; label: string}> = {
    sepay: {bg: '#10B981', label: 'S'},
    paypal: {bg: '#003087', label: 'P'},
    stripe: {bg: '#635BFF', label: 'S'},
  };
  const config = configs[method] || {bg: '#64748B', label: '?'};

  return (
    <View
      className="h-12 w-12 items-center justify-center rounded-xl"
      style={{backgroundColor: config.bg}}>
      <Text className="text-xl font-bold text-white">{config.label}</Text>
    </View>
  );
}

function DetailRow({label, value}: {label: string; value?: string | number}) {
  if (!value) {
    return null;
  }

  return (
    <View className="mt-2 flex-row justify-between gap-4">
      <Text className="text-sm text-slate-500">{label}</Text>
      <Text className="flex-1 text-right text-sm font-semibold text-slate-800">{value}</Text>
    </View>
  );
}

function QRModal({
  isChecking,
  onCheck,
  onClose,
  order,
  paymentCheckError,
  paymentCompleted,
}: {
  isChecking: boolean;
  onCheck: () => void;
  onClose: () => void;
  order: SepayOrder | null;
  paymentCheckError: string | null;
  paymentCompleted: boolean;
}) {
  return (
    <Modal visible={Boolean(order)} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/50">
        <View className="max-h-[92%] rounded-t-3xl bg-white px-6 pb-8 pt-5">
          <View className="mb-4 flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-bold text-slate-900">Thanh toán SePay</Text>
              <Text className="mt-1 text-sm text-slate-500">Quét QR bằng ứng dụng ngân hàng</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              <X size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="items-center">
              {order?.qr_url ? (
                <View className="mb-4 h-64 w-64 items-center justify-center rounded-xl bg-slate-100">
                  <Image
                    source={{uri: order.qr_url}}
                    className="h-60 w-60"
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View className="mb-4 h-64 w-64 items-center justify-center rounded-xl bg-slate-100">
                  <ActivityIndicator size="large" color="#0000FF" />
                </View>
              )}
            </View>

            <View className="rounded-xl bg-slate-50 p-4">
              <DetailRow label="Ngân hàng" value={order?.bank_code} />
              <DetailRow label="Chủ tài khoản" value={order?.account_name} />
              <DetailRow label="Số tài khoản" value={order?.account_number} />
              <DetailRow label="Nội dung chuyển khoản" value={order?.order_code} />
              <DetailRow
                label="Số tiền"
                value={order?.amount ? formatCurrency(order.amount) : undefined}
              />
            </View>

            <Text className="mt-4 text-sm leading-relaxed text-slate-600">
              Chuyển đúng số tiền và nội dung phía trên. Ứng dụng sẽ tự kiểm tra giao dịch định kỳ.
            </Text>

            {paymentCompleted ? (
              <View className="mt-4 flex-row items-center rounded-xl bg-emerald-50 p-4">
                <CheckCircle2 size={20} color="#059669" />
                <Text className="ml-2 flex-1 text-sm font-semibold text-emerald-700">
                  Đã nhận thanh toán. Số dư ví đã được cập nhật.
                </Text>
              </View>
            ) : (
              <View className="mt-4 rounded-xl bg-amber-50 p-4">
                <Text className="text-sm font-semibold text-amber-700">Đang chờ thanh toán</Text>
                <Text className="mt-1 text-sm text-amber-600">
                  Bạn có thể bấm kiểm tra ngay sau khi hoàn tất chuyển khoản.
                </Text>
              </View>
            )}

            {paymentCheckError && (
              <Text className="mt-3 text-sm text-red-500">{paymentCheckError}</Text>
            )}

            {!paymentCompleted && (
              <TouchableOpacity
                activeOpacity={0.85}
                disabled={isChecking}
                onPress={onCheck}
                className={`mt-5 flex-row items-center justify-center rounded-full py-4 ${
                  isChecking ? 'bg-blue-300' : 'bg-blue-600'
                }`}>
                {isChecking ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <RefreshCw size={18} color="#FFFFFF" />
                    <Text className="ml-2 text-base font-semibold text-white">
                      Kiểm tra thanh toán
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function DepositScreen() {
  const navigation = useNavigation<DepositNav>();
  const {
    amount,
    balance,
    canSubmit,
    checkSepayPayment,
    closeSepayOrder,
    isCheckingPayment,
    isLoadingMethods,
    isProcessing,
    numericAmount,
    paymentCheckError,
    paymentCompleted,
    selectedMethod,
    selectedPreset,
    selectPreset,
    sepayOrder,
    setSelectedMethod,
    startDeposit,
    topupMethods,
    updateAmount,
  } = useDepositViewModel();

  useEffect(() => {
    if (!paymentCompleted) {
      return;
    }

    Alert.alert('Nạp tiền thành công', 'Số dư ví của bạn đã được cập nhật.', [
      {
        text: 'OK',
        onPress: () => {
          closeSepayOrder();
          navigation.goBack();
        },
      },
    ]);
  }, [closeSepayOrder, navigation, paymentCompleted]);

  const handleDeposit = useCallback(async () => {
    try {
      await startDeposit();
    } catch (error) {
      Alert.alert(
        'Không thể nạp tiền',
        error instanceof Error ? error.message : 'Đã xảy ra lỗi. Vui lòng thử lại.',
      );
    }
  }, [startDeposit]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View className="flex-row items-center border-b border-slate-200 bg-white px-4 py-3">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mr-4"
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-slate-900">Nạp tiền vào ví</Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 py-6 pb-12"
        keyboardShouldPersistTaps="handled">
        <View className="mb-6 rounded-2xl bg-white p-5 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm text-slate-500">Số dư hiện tại</Text>
              <Text className="mt-1 text-2xl font-bold text-blue-600">
                {formatCurrency(balance)}
              </Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <Wallet size={24} color="#0000FF" />
            </View>
          </View>
        </View>

        <Text className="mb-3 text-base font-semibold text-slate-900">Chọn số tiền</Text>

        <View className="mb-3 flex-row flex-wrap gap-2">
          {PRESET_AMOUNTS.map(preset => (
            <TouchableOpacity
              key={preset.value}
              activeOpacity={0.8}
              onPress={() => selectPreset(preset.value)}
              className={`rounded-full border px-4 py-2.5 ${
                selectedPreset === preset.value
                  ? 'border-blue-600 bg-blue-600'
                  : 'border-slate-200 bg-white'
              }`}>
              <Text
                className={`text-sm font-semibold ${
                  selectedPreset === preset.value ? 'text-white' : 'text-slate-700'
                }`}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View className="mb-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <View className="flex-row items-center">
            <TextInput
              value={amount}
              onChangeText={updateAmount}
              placeholder="Nhập số tiền khác..."
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              className="flex-1 text-base text-slate-900"
            />
            <Text className="text-base text-slate-500">đ</Text>
          </View>
        </View>
        {numericAmount > 0 && numericAmount < 10000 && (
          <Text className="mb-4 text-sm text-red-500">Số tiền tối thiểu: 10.000 đ</Text>
        )}

        {numericAmount >= 10000 && (
          <View className="mb-6 rounded-xl bg-blue-50 p-4">
            <Text className="text-sm text-slate-500">Số tiền nạp</Text>
            <Text className="mt-1 text-xl font-bold text-blue-600">
              {formatCurrency(numericAmount)}
            </Text>
          </View>
        )}

        <Text className="mb-3 text-base font-semibold text-slate-900">
          Phương thức thanh toán
        </Text>

        {isLoadingMethods ? (
          <View key="payment-methods-loading" className="items-center rounded-xl bg-white p-8">
            <ActivityIndicator size="large" color="#0000FF" />
          </View>
        ) : topupMethods.length > 0 ? (
          <View
            key="payment-methods-list"
            className="overflow-hidden rounded-xl bg-white shadow-sm">
            {topupMethods.map((method, index) => (
              <TouchableOpacity
                key={method.value}
                activeOpacity={0.8}
                onPress={() => setSelectedMethod(method.value)}
                className={`flex-row items-center p-4 ${
                  index < topupMethods.length - 1 ? 'border-b border-slate-100' : ''
                } ${selectedMethod === method.value ? 'bg-blue-50' : ''}`}>
                <PaymentIcon method={method.value} />
                <View className="ml-3 flex-1">
                  <Text className="font-semibold text-slate-900">{method.label}</Text>
                  {method.note && <Text className="text-sm text-slate-500">{method.note}</Text>}
                  <Text className="text-sm text-slate-400">
                    {method.type === 'qr' ? 'Thanh toán bằng mã QR' : 'Thanh toán trực tuyến'}
                  </Text>
                </View>
                <View
                  className={`h-6 w-6 items-center justify-center rounded-full border-2 ${
                    selectedMethod === method.value
                      ? 'border-blue-600 bg-blue-600'
                      : 'border-slate-300'
                  }`}>
                  {selectedMethod === method.value && (
                    <View className="h-2.5 w-2.5 rounded-full bg-white" />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View key="payment-methods-empty" className="items-center rounded-xl bg-white p-6">
            <Text className="text-slate-500">Hiện chưa có phương thức thanh toán</Text>
          </View>
        )}

        <View className="mt-6 rounded-xl bg-slate-50 p-4">
          <Text className="text-sm leading-relaxed text-slate-500">
            Số tiền nạp tối thiểu: 10.000 đ{'\n'}
            Số dư được cập nhật sau khi thanh toán thành công.
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => handleDeposit()}
          disabled={!canSubmit}
          className={`mt-6 items-center rounded-full py-4 ${
            canSubmit ? 'bg-blue-600' : 'bg-slate-300'
          }`}>
          {isProcessing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-base font-semibold text-white">
              {selectedMethod ? 'Tiếp tục' : 'Chọn phương thức thanh toán'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <QRModal
        isChecking={isCheckingPayment}
        onCheck={() => checkSepayPayment()}
        onClose={closeSepayOrder}
        order={sepayOrder}
        paymentCheckError={paymentCheckError}
        paymentCompleted={paymentCompleted}
      />
    </SafeAreaView>
  );
}
