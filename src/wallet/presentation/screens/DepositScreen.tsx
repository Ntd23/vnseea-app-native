// Description: Deposit money to wallet using Stripe payment.
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, CreditCard, Wallet } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';

type DepositNav = NativeStackNavigationProp<RootStackParamList>;

const PRESET_AMOUNTS = [
  { label: '50.000đ', value: 50000 },
  { label: '100.000đ', value: 100000 },
  { label: '200.000đ', value: 200000 },
  { label: '500.000đ', value: 500000 },
  { label: '1.000.000đ', value: 1000000 },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(amount);
}

function DepositScreen() {
  const navigation = useNavigation<DepositNav>();
  const [amount, setAmount] = useState<string>('');
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePresetPress = (value: number) => {
    setSelectedPreset(value);
    setAmount(String(value));
  };

  const handleAmountChange = (text: string) => {
    // Chỉ cho phép số
    const numericValue = text.replace(/[^0-9]/g, '');
    setAmount(numericValue);
    setSelectedPreset(null);
  };

  const numericAmount = parseInt(amount, 10) || 0;
  const isValidAmount = numericAmount >= 10000; // Tối thiểu 10,000đ

  const handleDeposit = async () => {
    if (!isValidAmount) {
      Alert.alert('Lỗi', 'Số tiền nạp tối thiểu là 10.000đ');
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Gọi API Stripe để tạo checkout session
      // const sessionId = await repository.createDepositSession(numericAmount);

      // Mock: Giả lập thành công
      await new Promise(resolve => setTimeout(resolve, 1500));

      Alert.alert(
        'Thành công',
        `Đã nạp ${formatCurrency(numericAmount)}đ vào ví!`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Lỗi',
        error instanceof Error ? error.message : 'Không thể nạp tiền. Vui lòng thử lại.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Top App Bar */}
      <View className="surface-brand flex-row items-center px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-heading text-inverse">
          Nạp tiền
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-12 pt-6"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Wallet Balance Card */}
        <View className="surface-card p-4 mb-6">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-caption-secondary">Số dư ví hiện tại</Text>
              <Text className="text-display font-bold text-brand mt-1">
                0đ
              </Text>
            </View>
            <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <Wallet size={24} color="#0000FF" />
            </View>
          </View>
        </View>

        {/* Amount Section */}
        <View className="mb-6">
          <Text className="text-title-primary mb-3">Chọn số tiền nạp</Text>

          {/* Preset Amounts */}
          <View className="flex-row flex-wrap gap-2 mb-4">
            {PRESET_AMOUNTS.map((preset) => (
              <TouchableOpacity
                key={preset.value}
                activeOpacity={0.8}
                onPress={() => handlePresetPress(preset.value)}
                className={`px-4 py-2.5 rounded-full border ${
                  selectedPreset === preset.value
                    ? 'bg-brand border-brand'
                    : 'bg-white border-[rgba(0,0,255,0.12)]'
                }`}>
                <Text
                  className={`text-sm font-semibold ${
                    selectedPreset === preset.value
                      ? 'text-inverse'
                      : 'text-brand'
                  }`}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Amount Input */}
          <View className="surface-card p-4">
            <Text className="text-caption-secondary mb-2">Hoặc nhập số tiền khác</Text>
            <View className="flex-row items-center border border-slate-200 rounded-xl px-4 py-3 bg-white">
              <TextInput
                value={amount}
                onChangeText={handleAmountChange}
                placeholder="Nhập số tiền..."
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                className="flex-1 text-base text-slate-900"
              />
              <Text className="text-base text-slate-600">đ</Text>
            </View>
            {numericAmount > 0 && numericAmount < 10000 && (
              <Text className="text-caption mt-2 text-red-500">
                Số tiền tối thiểu là 10.000đ
              </Text>
            )}
          </View>
        </View>

        {/* Selected Amount Display */}
        {numericAmount >= 10000 && (
          <View className="bg-blue-50 rounded-xl p-4 mb-6">
            <Text className="text-caption-secondary">Số tiền nạp</Text>
            <Text className="text-heading font-bold text-brand mt-1">
              {formatCurrency(numericAmount)}đ
            </Text>
          </View>
        )}

        {/* Payment Methods */}
        <View className="mb-6">
          <Text className="text-title-primary mb-3">Phương thức thanh toán</Text>
          <View className="surface-card overflow-hidden">
            <TouchableOpacity
              activeOpacity={0.8}
              className="flex-row items-center p-4 border-b border-[rgba(0,0,255,0.08)]">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-[#635BFF] mr-3">
                <CreditCard size={20} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Text className="text-body-primary font-semibold text-slate-900">
                  Thẻ Visa/Mastercard
                </Text>
                <Text className="text-caption-secondary mt-0.5">
                  Thanh toán an toàn qua Stripe
                </Text>
              </View>
              <View className="h-5 w-5 rounded-full bg-brand items-center justify-center">
                <View className="h-2 w-2 rounded-full bg-white" />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Info Text */}
        <View className="rounded-xl bg-slate-50 p-4 mb-6">
          <Text className="text-caption-secondary leading-relaxed">
            • Số tiền nạp tối thiểu: 10.000đ{'\n'}
            • Thanh toán được xử lý qua Stripe{'\n'}
            • Tiền sẽ được cộng vào ví ngay sau khi thanh toán thành công
          </Text>
        </View>

        {/* Deposit Button */}
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handleDeposit}
          disabled={!isValidAmount || isLoading}
          className={`rounded-full py-4 items-center shadow-brand ${
            isValidAmount && !isLoading ? 'bg-brand' : 'bg-slate-300'
          }`}>
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text className="text-body font-semibold text-inverse">
              Nạp tiền với Stripe
            </Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

export default DepositScreen;
