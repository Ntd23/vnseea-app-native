// Description: My Balance screen showing wallet overview data
import React from 'react';
import {ActivityIndicator, ScrollView, StatusBar, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ArrowLeft, CreditCard, RefreshCw, Wallet} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useEarningsViewModel} from '../../application/view-models/useEarningsViewModel';
import {ROUTES} from '../../../navigation/constants/routes';
import type {RootStackParamList} from '../../../navigation/types';

type BalanceNav = NativeStackNavigationProp<RootStackParamList>;

function formatCurrency(amount: number, symbol: string): string {
  const formatted = new Intl.NumberFormat('vi-VN').format(amount);
  return `${formatted} ${symbol}`;
}

/* ── Balance Card ── */
function BalanceCard({
  title,
  amount,
  symbol,
  icon: IconComponent,
  cardBg,
}: {
  title: string;
  amount: number;
  symbol: string;
  icon: React.ComponentType<{size: number; color: string}>;
  cardBg: string;
}) {
  return (
    <View className={`rounded-2xl p-4 ${cardBg}`}>
      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-caption-secondary">{title}</Text>
        <View className="h-10 w-10 items-center justify-center rounded-full bg-white/30">
          <IconComponent size={20} color="#0000ff" />
        </View>
      </View>
      <Text className="text-display font-bold text-primary">
        {formatCurrency(amount, symbol)}
      </Text>
    </View>
  );
}

/* ── Main screen ── */
function MyBalanceScreen() {
  const navigation = useNavigation<BalanceNav>();
  const {walletOverview, isLoading, error, reload} = useEarningsViewModel();

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 surface-base" edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View className="surface-brand flex-row items-center px-4 py-3">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-heading text-inverse">
            Số dư của tôi
          </Text>
          <View className="w-10" />
        </View>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0000ff" />
          <Text className="text-body-secondary mt-4">Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 surface-base" edges={['top']}>
        <StatusBar barStyle="light-content" />
        <View className="surface-brand flex-row items-center px-4 py-3">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-heading text-inverse">
            Số dư của tôi
          </Text>
          <View className="w-10" />
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-body text-center text-error mb-4">
            Đã xảy ra lỗi: {error}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => void reload()}
            className="flex-row items-center gap-2 rounded-full bg-[#eef0ff] px-6 py-3">
            <RefreshCw size={18} color="#0000ff" />
            <Text className="text-body font-semibold text-brand">Thử lại</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currencySymbol = walletOverview?.currencySymbol ?? '₫';
  const balance = walletOverview?.balance ?? 0;
  const withdrawableBalance = walletOverview?.withdrawableBalance ?? 0;

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Top App Bar */}
      <View className="surface-brand flex-row items-center px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-heading text-inverse">
          Số dư của tôi
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => void reload()}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <RefreshCw size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-12 pt-6"
        showsVerticalScrollIndicator={false}>
        {/* Main Wallet Balance Card */}
        <BalanceCard
          title="Số dư ví"
          amount={balance}
          symbol={currencySymbol}
          icon={Wallet}
          cardBg="bg-[#d3e4fe]"
        />

        {/* Withdrawable Balance Card */}
        <View className="mt-4">
          <BalanceCard
            title="Số dư khả dụng"
            amount={withdrawableBalance}
            symbol={currencySymbol}
            icon={CreditCard}
            cardBg="bg-[#eef0ff]"
          />
        </View>

        {/* Info Text */}
        <View className="mt-6 rounded-xl bg-white/50 p-4">
          <Text className="text-caption-secondary">
            Số dư khả dụng là số tiền bạn có thể rút về tài khoản. Số dư ví
            bao gồm cả các khoản đang xử lý.
          </Text>
        </View>

        {/* Withdraw Button */}
        {walletOverview?.canWithdraw && withdrawableBalance > 0 && (
          <TouchableOpacity
            activeOpacity={0.8}
            className="mt-4 items-center rounded-full bg-brand py-4 shadow-brand">
            <Text className="text-body font-semibold text-inverse">Rút tiền ngay</Text>
          </TouchableOpacity>
        )}

        {/* Deposit Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate(ROUTES.DEPOSIT, {})}
          className="mt-3 items-center rounded-full border-2 border-brand bg-transparent py-4">
          <Text className="text-body font-semibold text-brand">Nạp tiền</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

export default MyBalanceScreen;
