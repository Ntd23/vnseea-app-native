// Description: Renders the referral rewards screen with yellow copy-link card and social share buttons.
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CheckCircle2,
  Coins,
  Copy,
  Info,
  Megaphone,
  ShieldCheck,
  User,
  UserRoundCheck,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../../navigation/types';
import { useAffiliatesViewModel } from '../../application/view-models/useAffiliatesViewModel';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type AffiliatesNav = NativeStackNavigationProp<RootStackParamList>;

const AFFILIATE_COPY = {
  vi: {
    header: 'Giới thiệu và nhận thưởng',
    bannerText: 'Kiếm tới {reward} cho mỗi người dùng mà bạn giới thiệu cho chúng tôi!',
    copyBtn: 'Sao chép',
    shareLabel: 'Chia sẻ với',
    requirementsTitle: 'Điều kiện nhận tiền của bạn',
    requirementsSub: 'Tài khoản của bạn phải đầy đủ thông tin và đã xác minh trước khi nhận thưởng.',
    referredTitle: 'Người đã giới thiệu',
    referredSub: 'Người được giới thiệu chỉ đủ điều kiện khi cập nhật đầy đủ thông tin và xác minh tài khoản thành công.',
    emptyReferred: 'Chưa có người được giới thiệu.',
    loading: 'Đang tải dữ liệu giới thiệu...',
    retry: 'Chạm để thử lại',
  },
  en: {
    header: 'Refer & Earn',
    bannerText: 'Earn up to {reward} for each user you refer to us!',
    linkLabel: 'Your referral link is',
    copyBtn: 'Copy',
    shareLabel: 'Share with',
    requirementsTitle: 'Your earning requirements',
    requirementsSub: 'Your account must have complete info and be verified before receiving rewards.',
    referredTitle: 'Referred Users',
    referredSub: 'Referred users are only eligible once they complete their profile and verify their account.',
    emptyReferred: 'No referred users yet.',
    loading: 'Loading referral data...',
    retry: 'Tap to retry',
  },
};

const SHARE_CHANNELS = [
  { name: 'Facebook', color: '#3b5998', label: 'f' },
  { name: 'Twitter', color: '#00aced', label: 't' },
  { name: 'WhatsApp', color: '#25d366', label: 'w' },
  { name: 'Pinterest', color: '#cb2027', label: 'p' },
  { name: 'LinkedIn', color: '#007bb6', label: 'in' },
];

function RequirementChip({ label, completed }: { label: string; completed: boolean }) {
  return (
    <View className="flex-1 min-h-[56px] flex-row items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 border border-slate-100">
      {completed ? (
        <CheckCircle2 size={16} color="#16a34a" />
      ) : (
        <Info size={16} color="#94a3b8" />
      )}
      <Text className="flex-1 text-[11px] font-bold text-slate-800 leading-tight">{label}</Text>
    </View>
  );
}

function AffiliatesScreen() {
  const navigation = useNavigation<AffiliatesNav>();
  const language = useAppLanguage();
  const copy = AFFILIATE_COPY[language] || AFFILIATE_COPY.vi;
  const isVi = language === 'vi';

  const {
    referralLink,
    earningPerUserText,
    requirements,
    referredUsers,
    isLoading,
    error,
    reload,
    handleCopy,
    handleShare,
  } = useAffiliatesViewModel();

  const hasData = Boolean(referralLink);

  // Parse banner text with reward amount
  const bannerText = copy.bannerText.replace('{reward}', earningPerUserText);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" />

      {/* Header */}
      <View className="h-16 flex-row items-center justify-between border-b border-slate-100 bg-white px-4">
        <TouchableOpacity
          activeOpacity={0.82}
          onPress={() => navigation.goBack()}
          className="h-11 w-11 items-center justify-center rounded-full bg-slate-50"
        >
          <ArrowLeft size={24} color="#0000ff" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-xl font-extrabold text-slate-950" numberOfLines={1}>
          {copy.header}
        </Text>
        <View className="w-11" />
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {isLoading && !hasData ? (
          <View className="m-4 items-center justify-center bg-white rounded-3xl p-8 border border-slate-100">
            <ActivityIndicator size="small" color="#0000ff" />
            <Text className="mt-3 text-sm font-bold text-slate-500">{copy.loading}</Text>
          </View>
        ) : null}

        {error && !hasData ? (
          <TouchableOpacity
            activeOpacity={0.82}
            onPress={reload}
            className="m-4 items-center justify-center bg-white rounded-3xl p-8 border border-slate-100"
          >
            <Text className="text-center text-sm font-extrabold text-red-500 mb-2">{error}</Text>
            <Text className="text-sm font-extrabold text-blue-600">{copy.retry}</Text>
          </TouchableOpacity>
        ) : null}

        {hasData ? (
          <View className="px-4 pt-5 gap-y-5">
            {error ? (
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={reload}
                className="rounded-2xl bg-red-50 border border-red-100 p-4"
              >
                <Text className="text-center text-sm font-extrabold text-red-500">{error}</Text>
              </TouchableOpacity>
            ) : null}

            {/* Yellow Banner Card (Mockup Match) */}
            <View
              className="rounded-3xl bg-[#fcd34d] p-5 items-center"
              style={{
                shadowColor: '#f59e0b',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 2,
              }}
            >
              <Text className="text-amber-950 font-black text-lg text-center leading-6 mb-4">
                {bannerText}
              </Text>

              {/* Link Input & Copy Row */}
              <View className="flex-row gap-x-2 w-full mb-6">
                <View className="flex-1 justify-center border border-amber-600/10 bg-amber-500/10 rounded-2xl px-4 min-h-[48px]">
                  <Text className="text-amber-950 font-bold text-sm" numberOfLines={1}>
                    {referralLink}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.82}
                  onPress={handleCopy}
                  className="bg-amber-950 rounded-2xl px-5 justify-center items-center flex-row gap-x-1.5 min-h-[48px]"
                >
                  <Copy size={16} color="#ffffff" />
                </TouchableOpacity>
              </View>

              {/* Megaphone Custom Illustration */}
              <View className="h-32 w-32 items-center justify-center border border-dashed border-amber-950/15 rounded-full relative">
                {/* Communication Waves */}
                <View className="absolute inset-2 border border-dotted border-amber-950/10 rounded-full" />
                
                {/* Orbit User Icons */}
                <View className="absolute top-1 left-7 h-6 w-6 items-center justify-center rounded-full bg-[#f43f5e]">
                  <User size={12} color="#ffffff" />
                </View>
                <View className="absolute bottom-4 left-0 h-6 w-6 items-center justify-center rounded-full bg-[#10b981]">
                  <User size={12} color="#ffffff" />
                </View>
                <View className="absolute bottom-4 right-1 h-6 w-6 items-center justify-center rounded-full bg-[#3b82f6]">
                  <User size={12} color="#ffffff" />
                </View>

                {/* Center Coin */}
                <View className="absolute bottom-11 right-6 h-8 w-8 items-center justify-center rounded-full bg-[#fbbf24] border border-amber-400">
                  <Coins size={16} color="#78350f" />
                </View>

                {/* Rotated Megaphone */}
                <View style={{ transform: [{ rotate: '-15deg' }] }}>
                  <Megaphone size={40} color="#f43f5e" />
                </View>
              </View>
            </View>

            {/* Share Section (Mockup Match) */}
            <View className="items-center py-2">
              <Text className="text-slate-500 font-bold text-xs mb-3">{copy.shareLabel}</Text>
              <View className="flex-row gap-x-3.5">
                {SHARE_CHANNELS.map(channel => (
                  <TouchableOpacity
                    key={channel.name}
                    activeOpacity={0.8}
                    onPress={handleShare}
                    style={{ backgroundColor: channel.color }}
                    className="h-11 w-11 items-center justify-center rounded-full"
                  >
                    <Text className="text-white font-extrabold text-lg lowercase leading-none" style={{ marginTop: Platform.OS === 'ios' ? 0 : -3 }}>
                      {channel.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Earning Requirements */}
            <View className="rounded-3xl bg-white p-5 border border-slate-100 shadow-sm">
              <Text className="text-base font-extrabold text-slate-900">{copy.requirementsTitle}</Text>
              <Text className="text-slate-500 font-medium text-xs mt-1.5 leading-5">
                {copy.requirementsSub}
              </Text>
              <View className="flex-row gap-x-2.5 mt-4">
                {requirements.map(requirement => (
                  <RequirementChip
                    key={requirement.id}
                    label={requirement.label}
                    completed={requirement.completed}
                  />
                ))}
              </View>
            </View>

            {/* Referred Users List */}
            <View className="rounded-3xl bg-white p-5 border border-slate-100 shadow-sm">
              <View className="flex-row justify-between items-start mb-4">
                <View className="flex-1 mr-3">
                  <Text className="text-base font-extrabold text-slate-900">{copy.referredTitle}</Text>
                  <Text className="text-slate-500 font-medium text-xs mt-1.5 leading-5">
                    {copy.referredSub}
                  </Text>
                </View>
                <View className="h-7 w-7 items-center justify-center rounded-full bg-slate-50 border border-slate-100">
                  <Info size={14} color="#64748b" />
                </View>
              </View>

              {referredUsers.length === 0 ? (
                <View className="min-h-[112px] items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/30">
                  <UserRoundCheck size={24} color="#94a3b8" />
                  <Text className="mt-2 text-xs font-bold text-slate-400">{copy.emptyReferred}</Text>
                </View>
              ) : (
                referredUsers.map(user => (
                  <View key={user.id} className="flex-row items-center gap-x-3 rounded-2xl bg-slate-50/50 p-3 mt-3 border border-slate-100">
                    {user.avatar ? (
                      <Image source={{ uri: user.avatar }} className="w-10 h-10 rounded-full bg-slate-100" />
                    ) : (
                      <View className="w-10 h-10 rounded-full bg-blue-50 items-center justify-center">
                        <Text className="text-blue-600 font-bold text-sm">
                          {(user.name || user.username || '?').slice(0, 1).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="text-sm font-extrabold text-slate-800" numberOfLines={1}>{user.name}</Text>
                      <Text className="text-xs font-bold text-slate-400 mt-0.5">@{user.username}</Text>
                    </View>
                    <Text className={`text-xs font-extrabold ${user.qualified ? 'text-green-600' : 'text-yellow-600'}`}>
                      {user.qualified ? (isVi ? 'Đủ điều kiện' : 'Qualified') : (isVi ? 'Đang chờ' : 'Pending')}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export default AffiliatesScreen;
