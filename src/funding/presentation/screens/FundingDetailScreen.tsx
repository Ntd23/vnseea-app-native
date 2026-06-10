// Description: Renders the funding detail screen with progress, donor list, and
// donate / edit / delete actions.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowLeft,
  Calendar,
  HeartHandshake,
  MoreVertical,
  ShieldCheck,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react-native';
import { useFundingDetailViewModel } from '../../application/view-models/useFundingDetailViewModel';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';
import type { RootStackParamList } from '../../../navigation/types';
import type { FundingDonation } from '../../domain/types/funding.types';

type DetailNav = NativeStackNavigationProp<RootStackParamList>;
type DetailRoute = RouteProp<RootStackParamList, 'FundingDetail'>;

function formatMoney(amount: number, symbol: string): string {
  return `${amount.toLocaleString('vi-VN')}${symbol}`;
}

function formatTimeAgo(unixSeconds: number): string {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return '';
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

interface DonorRowProps {
  donation: FundingDonation;
  currencySymbol: string;
}

function DonorRow({ donation, currencySymbol }: DonorRowProps) {
  const donor = donation.user_data;
  const name =
    donor && (donor.first_name || donor.last_name)
      ? `${donor.first_name ?? ''} ${donor.last_name ?? ''}`.trim()
      : (donor?.username ?? 'Người ủng hộ ẩn danh');
  const amount = parseFloat(donation.amount || '0');

  return (
    <View className="flex-row items-center py-3">
      {donor?.avatar ? (
        <Image
          source={{ uri: donor.avatar }}
          className="h-10 w-10 rounded-full"
          resizeMode="cover"
        />
      ) : (
        <View className="avatar-md avatar-muted items-center justify-center">
          <User size={18} color="#475569" />
        </View>
      )}
      <View className="ml-3 flex-1">
        <Text className="text-title-secondary" numberOfLines={1}>
          {name}
        </Text>
        <Text className="mt-0.5 text-caption-secondary">
          {formatTimeAgo(donation.time)}
        </Text>
      </View>
      <Text className="text-title-primary text-brand">
        + {formatMoney(amount, currencySymbol)}
      </Text>
    </View>
  );
}

interface DonateModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => Promise<boolean>;
  isSubmitting: boolean;
  currencySymbol: string;
}

function DonateModal({
  visible,
  onClose,
  onConfirm,
  isSubmitting,
  currencySymbol,
}: DonateModalProps) {
  const [amount, setAmount] = useState('');

  const handleConfirm = async () => {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ');
      return;
    }
    const ok = await onConfirm(value);
    if (ok) {
      setAmount('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 items-center justify-end bg-black/40"
        onPress={onClose}
      >
        <Pressable
          className="w-full rounded-t-[28px] bg-white px-5 pb-8 pt-5"
          onPress={event => event.stopPropagation()}
        >
          <View className="mb-4 flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-heading">Ủng hộ chiến dịch</Text>
              <Text className="mt-1 text-caption-secondary">
                Nhập số tiền bạn muốn ủng hộ.
              </Text>
            </View>
            <TouchableOpacity
              className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
              activeOpacity={0.85}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={onClose}
            >
              <X size={18} color="#334155" />
            </TouchableOpacity>
          </View>

          <View className="input-shell mb-4 flex-row items-center px-4">
            <Text className="text-title-primary text-brand">+</Text>
            <TextInput
              className="ml-3 flex-1 text-body-primary"
              placeholder="0"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
              value={amount}
              onChangeText={text => setAmount(text.replace(/[^0-9]/g, ''))}
            />
            <View className="ml-2 rounded-lg bg-[#eef0ff] px-3 py-1">
              <Text className="text-caption-primary text-brand">
                {currencySymbol}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            className="btn-primary min-h-[52px]"
            activeOpacity={0.9}
            onPress={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-title-primary text-inverse">
                Xác nhận ủng hộ
              </Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function FundingDetailScreen() {
  const navigation = useNavigation<DetailNav>();
  const route = useRoute<DetailRoute>();
  const fundId = route.params?.fundId ?? '';
  const currentUserId = sessionStorage.getSession()?.userId;
  const [donateModalVisible, setDonateModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const {
    campaign,
    donations,
    isLoading,
    isDonating,
    error,
    currencySymbol,
    reload,
    donate,
    confirmDelete,
  } = useFundingDetailViewModel(fundId);

  const handleDonate = useCallback(
    async (amount: number) => {
      const ok = await donate(amount);
      if (ok) {
        Alert.alert('Cảm ơn', 'Ủng hộ của bạn đã được gửi thành công.');
      }
      return ok;
    },
    [donate],
  );

  const isOwner = !!campaign && String(campaign.user_id) === String(currentUserId);

  if (isLoading && !campaign) {
    return (
      <SafeAreaView className="flex-1 surface-base" edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#0000ff" />
          <Text className="mt-4 text-caption-secondary">Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !campaign) {
    return (
      <SafeAreaView className="flex-1 surface-base" edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-title-primary">Đã xảy ra lỗi</Text>
          <Text className="mt-2 text-center text-caption-secondary">
            {error}
          </Text>
          <TouchableOpacity
            className="btn-primary mt-6 px-8 py-3"
            activeOpacity={0.9}
            onPress={reload}
          >
            <Text className="text-body-primary text-inverse font-semibold">
              Thử lại
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!campaign) {
    return (
      <SafeAreaView className="flex-1 surface-base" edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-title-primary">Không tìm thấy chiến dịch</Text>
          <TouchableOpacity
            className="btn-primary mt-6 px-8 py-3"
            activeOpacity={0.9}
            onPress={() => navigation.goBack()}
          >
            <Text className="text-body-primary text-inverse font-semibold">
              Quay lại
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const raised = parseFloat(campaign.raised || '0');
  const goal = parseFloat(campaign.amount || '1');
  const percent = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;
  const donor = campaign.user_data;
  const donorName =
    donor && (donor.first_name || donor.last_name)
      ? `${donor.first_name ?? ''} ${donor.last_name ?? ''}`.trim()
      : (donor?.username ?? 'Người tạo');

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View className="surface-topbar flex-row items-center justify-between px-4 pb-3">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full bg-white"
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#1e293b" />
        </TouchableOpacity>
        <Text className="text-title-primary">Chi tiết chiến dịch</Text>
        {isOwner ? (
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full bg-white"
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onPress={() => setMenuVisible(true)}
          >
            <MoreVertical size={20} color="#1e293b" />
          </TouchableOpacity>
        ) : (
          <View className="h-10 w-10" />
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-32"
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={{ uri: campaign.image }}
          className="h-56 w-full"
          resizeMode="cover"
        />

        <View className="px-5 pt-5">
          <Text className="text-display">{campaign.title}</Text>

          {/* Creator */}
          <View className="mt-3 flex-row items-center">
            {donor?.avatar ? (
              <Image
                source={{ uri: donor.avatar }}
                className="h-9 w-9 rounded-full"
                resizeMode="cover"
              />
            ) : (
              <View className="avatar-md avatar-muted items-center justify-center">
                <User size={18} color="#475569" />
              </View>
            )}
            <View className="ml-3 flex-row items-center">
              <ShieldCheck size={14} color="#0000ff" />
              <Text className="ml-1 text-caption-primary">{donorName}</Text>
            </View>
            <View className="ml-auto flex-row items-center">
              <Calendar size={14} color="#64748B" />
              <Text className="ml-1 text-caption-secondary">
                {formatTimeAgo(campaign.time)}
              </Text>
            </View>
          </View>

          {/* Progress Card */}
          <View className="surface-card mt-5 p-5">
            <View className="flex-row items-end justify-between">
              <View>
                <Text className="text-caption-secondary">Đã quyên góp</Text>
                <Text className="text-display text-brand">
                  {formatMoney(raised, currencySymbol)}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-caption-secondary">Mục tiêu</Text>
                <Text className="text-title-primary">
                  {formatMoney(goal, currencySymbol)}
                </Text>
              </View>
            </View>

            <View className="progress-track mt-4">
              <View
                className="progress-fill"
                style={{ width: `${percent}%` }}
              />
            </View>

            <View className="mt-3 flex-row items-center justify-between">
              <View className="rounded-full bg-[#eef0ff] px-3 py-1">
                <Text className="text-caption-primary text-brand">
                  {percent}% hoàn thành
                </Text>
              </View>
              <View className="flex-row items-center">
                <Users size={14} color="#64748B" />
                <Text className="ml-1 text-caption-secondary">
                  {donations.length} lượt ủng hộ
                </Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View className="mt-5">
            <Text className="text-label-primary">Mô tả</Text>
            <Text className="mt-2 text-body-primary">
              {campaign.description}
            </Text>
          </View>

          {/* Recent donations */}
          <View className="mt-6">
            <Text className="text-label-primary">Người ủng hộ gần đây</Text>
            {donations.length === 0 ? (
              <View className="form-note-panel mt-3 items-center p-5">
                <HeartHandshake size={28} color="#94a3b8" />
                <Text className="mt-2 text-caption-secondary">
                  Chưa có lượt ủng hộ nào.
                </Text>
              </View>
            ) : (
              <View className="surface-card mt-3 px-4">
                {donations.map((item, index) => (
                  <View key={item.id ?? index}>
                    <DonorRow
                      donation={item}
                      currencySymbol={currencySymbol}
                    />
                    {index < donations.length - 1 ? (
                      <View className="h-px bg-slate-200" />
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View className="surface-card mx-4 mb-4 flex-row items-center gap-3 rounded-2xl p-3">
        {isOwner ? (
          <View className="flex-1 flex-row items-center justify-center">
            <Trash2 size={16} color="#ef4444" />
            <Text className="ml-2 text-caption-primary text-red-500">
              Bạn là chủ chiến dịch
            </Text>
          </View>
        ) : (
          <>
            <View className="flex-1">
              <Text className="text-caption-secondary">Bạn muốn ủng hộ?</Text>
              <Text className="text-title-primary text-brand">
                {formatMoney(raised, currencySymbol)} /{' '}
                {formatMoney(goal, currencySymbol)}
              </Text>
            </View>
            <TouchableOpacity
              className="btn-primary flex-row items-center px-6 py-3"
              activeOpacity={0.9}
              onPress={() => setDonateModalVisible(true)}
            >
              <HeartHandshake size={18} color="#ffffff" />
              <Text className="ml-2 text-body-primary text-inverse font-semibold">
                Ủng hộ
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <DonateModal
        visible={donateModalVisible}
        onClose={() => setDonateModalVisible(false)}
        onConfirm={handleDonate}
        isSubmitting={isDonating}
        currencySymbol={currencySymbol}
      />

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setMenuVisible(false)}
        >
          <View className="absolute right-4 top-20 surface-card w-48 overflow-hidden p-0">
            <TouchableOpacity
              className="flex-row items-center px-4 py-3"
              activeOpacity={0.8}
              onPress={() => {
                setMenuVisible(false);
                Alert.alert('Sắp ra mắt', 'Chức năng chỉnh sửa sẽ được cập nhật sau.');
              }}
            >
              <MoreVertical size={16} color="#1e293b" />
              <Text className="ml-2 text-body-primary">Chỉnh sửa</Text>
            </TouchableOpacity>
            <View className="h-px bg-slate-200" />
            <TouchableOpacity
              className="flex-row items-center px-4 py-3"
              activeOpacity={0.8}
              onPress={() => {
                setMenuVisible(false);
                confirmDelete(() => {
                  Alert.alert('Đã xóa', 'Chiến dịch đã được xóa.', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                  ]);
                });
              }}
            >
              <Trash2 size={16} color="#ef4444" />
              <Text className="ml-2 text-body-primary text-red-500">Xóa</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

export default FundingDetailScreen;
