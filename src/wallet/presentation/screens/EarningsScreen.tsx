import React, {useCallback} from 'react';
import {ScrollView, StatusBar, Text, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Banknote,
  ChevronRight,
  Share2,
  Star,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {RootStackParamList} from '../../../navigation/AppNavigator';
import {ROUTES} from '../../../navigation/constants/routes';
import {useEarningsViewModel} from '../../application/view-models/useEarningsViewModel';
import type {EarningsMenuItem} from '../../domain/types/wallet.types';

type EarningsNav = NativeStackNavigationProp<RootStackParamList>;

const ICON_MAP: Record<
  string,
  React.ComponentType<{size: number; color: string}>
> = {
  Users,
  Wallet,
  Star,
  Banknote,
  UserPlus,
  Share2,
};

/* ── Single menu row ── */
function MenuRow({
  item,
  isLast,
  onPress,
}: {
  item: EarningsMenuItem;
  isLast: boolean;
  onPress?: () => void;
}) {
  const IconComponent = ICON_MAP[item.iconKey];
  const chipBg =
    item.section === 'referral' ? 'bg-[#d3e4fe]' : 'bg-[#eef0ff]';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      className={`flex-row items-center justify-between px-4 py-3.5 ${
        !isLast ? 'border-b border-[rgba(0,0,255,0.08)]' : ''
      }`}>
      <View className="flex-row items-center gap-3">
        <View
          className={`h-10 w-10 items-center justify-center rounded-full ${chipBg}`}>
          {IconComponent ? (
            <IconComponent size={20} color="#0000ff" />
          ) : null}
        </View>
        <Text className="text-body-primary">{item.label}</Text>
      </View>
      <ChevronRight size={18} color="#94a3b8" />
    </TouchableOpacity>
  );
}

/* ── Section card ── */
function MenuSection({
  title,
  items,
  onItemPress,
}: {
  title: string;
  items: EarningsMenuItem[];
  onItemPress?: (id: string) => void;
}) {
  return (
    <View>
      <Text className="text-title-primary mb-2 px-2">{title}</Text>
      <View className="surface-card overflow-hidden">
        {items.map((item, index) => (
          <MenuRow
            key={item.id}
            item={item}
            isLast={index === items.length - 1}
            onPress={() => onItemPress?.(item.id)}
          />
        ))}
      </View>
    </View>
  );
}

/* ── Main screen ── */
function EarningsScreen() {
  const navigation = useNavigation<EarningsNav>();
  const {earningsItems, referralItems} = useEarningsViewModel();

  const handleItemPress = useCallback(
    (id: string) => {
      if (id === 'affiliates') {
        navigation.navigate(ROUTES.AFFILIATES);
      } else if (id === 'invite') {
        navigation.navigate(ROUTES.INVITE_FRIENDS);
      } else if (id === 'points') {
        navigation.navigate(ROUTES.MY_POINTS);
      } else if (id === 'withdraw') {
        navigation.navigate(ROUTES.WITHDRAWAL);
      }
    },
    [navigation],
  );

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" />

      {/* Top App Bar — brand blue */}
      <View className="surface-brand flex-row items-center px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-heading text-inverse">
          Thu nhập
        </Text>
        {/* Spacer to keep title centered */}
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-12 pt-4"
        showsVerticalScrollIndicator={false}>
        {/* Promo Banner */}
        <TouchableOpacity
          activeOpacity={0.8}
          className="flex-row items-center justify-between rounded-xl border border-[rgba(0,0,255,0.08)] bg-[#d3e4fe] p-4 shadow-sm">
          <View className="flex-1 pr-4">
            <Text className="text-heading">Tăng thu nhập của bạn</Text>
            <Text className="text-body-secondary mt-1 leading-tight">
              Khám phá các chương trình tiếp thị liên kết mới nhất.
            </Text>
          </View>
          <ChevronRight size={24} color="#0000ff" />
        </TouchableOpacity>

        {/* Section: Thu nhập */}
        <View className="mt-6">
          <MenuSection title="Thu nhập" items={earningsItems} onItemPress={handleItemPress} />
        </View>

        {/* Section: Giới thiệu bạn bè */}
        <View className="mt-6">
          <MenuSection title="Giới thiệu bạn bè" items={referralItems} onItemPress={handleItemPress} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default EarningsScreen;
