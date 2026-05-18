// Description: Advertising screen showing user's ad campaigns with empty state.
import React from 'react';
import {
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Megaphone, Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../../../navigation/constants/routes';
import { useAdvertisingViewModel } from '../../application/view-models/useAdvertisingViewModel';

function AdvertisingScreen() {
  const navigation = useNavigation<any>();
  const { ads, isLoading } = useAdvertisingViewModel();

  const isEmpty = !isLoading && ads.length === 0;

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="dark-content" />

      {/* Top App Bar */}
      <View className="surface-topbar flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.goBack()}>
          <ArrowLeft size={22} color="#0000ff" />
        </TouchableOpacity>

        <Text className="text-title-primary text-[#1a1c1e]">Quảng cáo</Text>

        <TouchableOpacity
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.navigate(ROUTES.CREATE_AD)}>
          <Text className="text-body-primary text-[#0000e6] font-semibold">Tạo</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="flex-grow"
        showsVerticalScrollIndicator={false}>
        {isEmpty ? (
          /* Empty State */
          <View className="flex-1 items-center justify-center px-8 py-20">
            {/* Icon container */}
            <View className="mb-6 h-28 w-28 items-center justify-center rounded-full bg-[#f1f5f9]">
              <Megaphone size={48} color="#94a3b8" />
            </View>

            {/* Title */}
            <Text className="text-heading text-[#1a1c1e] mb-3 text-center">
              Chưa có bài viết
            </Text>

            {/* Description */}
            <Text className="text-body-secondary text-[#64748b] mb-8 text-center leading-6">
              Bạn chưa tạo chiến dịch quảng cáo nào. Bắt đầu tạo quảng cáo để tiếp cận thêm khách hàng.
            </Text>

            {/* CTA Button */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate(ROUTES.CREATE_AD)}
              className="btn-primary flex-row items-center gap-2 px-8 py-4">
              <Plus size={18} color="#ffffff" />
              <Text className="text-body-primary font-semibold text-white">
                Tạo quảng cáo mới
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Ad list (future state) */
          <View className="px-5 pt-4 pb-8">
            {ads.map(ad => (
              <TouchableOpacity
                key={ad.id}
                activeOpacity={0.8}
                className="surface-card mb-3 px-5 py-4">
                <Text className="text-title-primary text-[#1a1c1e]">{ad.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default AdvertisingScreen;
