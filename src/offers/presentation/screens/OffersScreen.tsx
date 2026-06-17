// Description: Renders VNSEEA offers list with real API data and beautiful card layout.
import React from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity as Pressable,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Tag,
  Ticket,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { useOffersViewModel } from '../../application/view-models/useOffersViewModel';
import type { OfferItem, DiscountType, DISCOUNT_TYPE_LABELS } from '../../domain/types/offers.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type OffersNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

const DISCOUNT_LABELS: Record<DiscountType, string> = {
  discount_percent: 'Giảm %',
  discount_amount: 'Giảm tiền',
  buy_get_discount: 'Mua X tặng Y',
  spend_get_off: 'Chi tiêu được giảm',
  free_shipping: 'Miễn phí ship',
};

function formatDiscount(offer: OfferItem): string {
  if (offer.discount_percent > 0) {
    return `-${offer.discount_percent}%`;
  }
  if (offer.discount_amount > 0) {
    return `-${offer.discount_amount.toLocaleString()}đ`;
  }
  if (offer.discount_type === 'free_shipping') {
    return 'FREE';
  }
  if (offer.discount_type === 'buy_get_discount') {
    return `Mua ${offer.buy} tặng ${offer.get_price}`;
  }
  if (offer.discount_type === 'spend_get_off' && offer.spend > 0 && offer.amount_off > 0) {
    return `Chi ${offer.spend.toLocaleString()}đ giảm ${offer.amount_off}đ`;
  }
  return 'Ưu đãi';
}

function formatExpireDate(expireDate: string): string {
  if (!expireDate) return '';
  // Format: YYYY-MM-DD
  const parts = expireDate.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return expireDate;
}

interface OfferCardProps {
  offer: OfferItem;
  onPress: () => void;
}

function OfferCard({ offer, onPress }: OfferCardProps) {
  const discountText = formatDiscount(offer);
  const isPercent = offer.discount_percent > 0;

  return (
    <Pressable
      onPress={onPress}
      activeOpacity={0.9}
      className="mb-4 overflow-hidden rounded-2xl bg-white shadow-sm"
    >
      <View className="flex-row p-3 gap-4">
        {/* Image */}
        <View className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {offer.image ? (
            <Image
              source={{ uri: offer.image }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Ticket size={40} color="#94a3b8" />
            </View>
          )}
          {/* Discount Badge */}
          <View
            className="absolute left-0 top-0 rounded-br-xl px-2 py-1"
            style={{ backgroundColor: isPercent ? '#ef4444' : '#22c55e' }}
          >
            <Text className="text-[10px] font-bold text-white">{discountText}</Text>
          </View>
        </View>

        {/* Content */}
        <View className="flex-1 justify-between py-1">
          <View>
            <Text
              className="text-[15px] font-bold leading-tight text-slate-800"
              numberOfLines={2}
            >
              {offer.description || 'Ưu đãi đặc biệt'}
            </Text>
            {offer.page && (
              <Text className="mt-1 text-[12px] text-slate-500">
                {offer.page.page_title}
              </Text>
            )}
            {offer.discounted_items && (
              <Text className="mt-1 text-[12px] text-slate-400">
                {offer.discounted_items}
              </Text>
            )}
          </View>

          {/* Expire Date */}
          {offer.expire_date && (
            <View className="mt-2 flex-row items-center">
              <View className="rounded-md bg-red-50 px-2 py-1">
                <Text className="text-[11px] font-medium text-red-600">
                  Hết hạn: {formatExpireDate(offer.expire_date)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function EmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center py-16">
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-slate-100">
        <Tag size={48} color="#94a3b8" />
      </View>
      <Text className="text-[18px] font-semibold text-slate-700">
        Chưa có ưu đãi nào
      </Text>
      <Text className="mt-2 text-center text-[13px] text-slate-500">
        Hãy quay lại sau để xem các ưu đãi mới
      </Text>
      <Pressable
        className="mt-6 rounded-full bg-[#0000ff] px-8 py-3"
        activeOpacity={0.8}
        onPress={onRetry}
      >
        <Text className="text-[14px] font-semibold text-white">Tải lại</Text>
      </Pressable>
    </View>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-red-50">
        <Text className="text-4xl">😢</Text>
      </View>
      <Text className="text-[18px] font-semibold text-slate-700">
        Đã xảy ra lỗi
      </Text>
      <Text className="mt-2 text-center text-[13px] text-slate-500">{error}</Text>
      <Pressable
        className="mt-6 rounded-full bg-[#0000ff] px-8 py-3"
        activeOpacity={0.8}
        onPress={onRetry}
      >
        <Text className="text-[14px] font-semibold text-white">Thử lại</Text>
      </Pressable>
    </View>
  );
}

function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator size="large" color={BRAND} />
      <Text className="mt-4 text-[13px] text-slate-500">Đang tải ưu đãi...</Text>
    </View>
  );
}

function OffersScreen() {
  const navigation = useNavigation<OffersNav>();
  const { offers, isLoading, error, reload } = useOffersViewModel();

  const handleOfferPress = (offer: OfferItem) => {
    // TODO: Navigate to offer detail if needed
    console.log('Offer pressed:', offer.id);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f1f4fb]" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#f1f4fb" />

      {/* Header */}
      <View className="flex-row items-center justify-between bg-[#f1f4fb] px-4 pb-3">
        <View className="flex-row items-center gap-3">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
          >
            <ArrowLeft size={22} color="#1e293b" />
          </Pressable>
          <View>
            <Text className="text-[22px] font-bold text-slate-800">Ưu đãi</Text>
            <Text className="text-[12px] text-slate-500">
              {offers.length} ưu đãi
            </Text>
          </View>
        </View>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-2"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={reload}
            colors={[BRAND]}
            tintColor={BRAND}
          />
        }
      >
        {/* Section Title */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[16px] font-semibold text-slate-800">
            Ưu đãi hấp dẫn
          </Text>
          <Text className="text-[12px] text-slate-400">
            {offers.length} ưu đãi
          </Text>
        </View>

        {isLoading && offers.length === 0 ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : offers.length === 0 ? (
          <EmptyState onRetry={reload} />
        ) : (
          offers.map(offer => (
            <OfferCard
              key={offer.id}
              offer={offer}
              onPress={() => handleOfferPress(offer)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default OffersScreen;
