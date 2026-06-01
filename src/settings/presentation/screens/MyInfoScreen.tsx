// Description: Displays the authenticated viewer's real profile information.
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  AtSign,
  BriefcaseBusiness,
  Cake,
  Globe2,
  GraduationCap,
  IdCard,
  Info,
  Mail,
  MapPin,
  Phone,
  UserRound,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import type { UserProfile } from '../../../user/domain/types/user.types';
import { useMyInfoViewModel } from '../../application/view-models/useMyInfoViewModel';

type MyInfoNav = NativeStackNavigationProp<RootStackParamList>;
type InfoIcon = React.ComponentType<{ size: number; color: string }>;

function showValue(value: string | number | null | undefined) {
  const text = String(value ?? '').trim();
  return text || 'Chưa cập nhật';
}

function genderText(profile: UserProfile) {
  if (profile.genderText) return profile.genderText;
  if (profile.gender === 'male') return 'Nam';
  if (profile.gender === 'female') return 'Nữ';
  return profile.gender;
}

function websiteUrl(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function InfoRow({
  Icon,
  label,
  value,
  onPress,
}: {
  Icon: InfoIcon;
  label: string;
  value?: string | number | null;
  onPress?: () => void;
}) {
  const displayValue = showValue(value);
  const hasValue = displayValue !== 'Chưa cập nhật';

  return (
    <TouchableOpacity
      activeOpacity={onPress && hasValue ? 0.75 : 1}
      disabled={!onPress || !hasValue}
      onPress={onPress}
      className="flex-row items-start border-b border-slate-100 px-4 py-3.5"
    >
      <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-blue-50">
        <Icon size={18} color="#2563EB" />
      </View>
      <View className="flex-1">
        <Text className="text-xs font-medium text-slate-500">{label}</Text>
        <Text
          className={`mt-0.5 text-[15px] ${
            hasValue ? 'text-slate-900' : 'text-slate-400'
          }`}
        >
          {displayValue}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-4">
      <Text className="mb-2 px-4 text-xs font-bold uppercase text-slate-500">
        {title}
      </Text>
      <View className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
        {children}
      </View>
    </View>
  );
}

function MyInfoScreen() {
  const navigation = useNavigation<MyInfoNav>();
  const { profile, isLoading, isRefreshing, error, refresh, retry } =
    useMyInfoViewModel();

  const openWebsite = useCallback(() => {
    if (!profile?.website) return;
    Linking.openURL(websiteUrl(profile.website)).catch(() => undefined);
  }, [profile?.website]);

  const openEmail = useCallback(() => {
    if (!profile?.email) return;
    Linking.openURL(`mailto:${profile.email}`).catch(() => undefined);
  }, [profile?.email]);

  const openPhone = useCallback(() => {
    if (!profile?.phoneNumber) return;
    Linking.openURL(`tel:${profile.phoneNumber}`).catch(() => undefined);
  }, [profile?.phoneNumber]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <View className="h-14 flex-row items-center border-b border-slate-100 bg-white px-3">
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => navigation.goBack()}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <ArrowLeft size={23} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-2 text-lg font-bold text-slate-900">
          Thông tin của tôi
        </Text>
      </View>

      {isLoading && !profile ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="mt-3 text-sm text-slate-500">
            Đang tải thông tin...
          </Text>
        </View>
      ) : !profile ? (
        <View className="flex-1 items-center justify-center px-8">
          <Info size={42} color="#94A3B8" />
          <Text className="mt-4 text-center text-base font-semibold text-slate-800">
            Không tải được thông tin cá nhân
          </Text>
          <Text className="mt-2 text-center text-sm text-slate-500">
            {error ?? 'Vui lòng thử lại sau.'}
          </Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => retry().catch(() => undefined)}
            className="mt-5 rounded-full bg-blue-600 px-5 py-2.5"
          >
            <Text className="font-semibold text-white">Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerClassName="px-4 pb-8"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => refresh().catch(() => undefined)}
              colors={['#2563EB']}
              tintColor="#2563EB"
            />
          }
        >
          <View className="mt-4 overflow-hidden rounded-2xl bg-white">
            <View className="h-28 bg-blue-100">
              {profile.coverUrl ? (
                <Image
                  source={{ uri: profile.coverUrl }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
              ) : null}
            </View>
            <View className="px-4 pb-4">
              {profile.avatarUrl ? (
                <Image
                  source={{ uri: profile.avatarUrl }}
                  className="-mt-10 h-20 w-20 rounded-full border-4 border-white bg-slate-200"
                  resizeMode="cover"
                />
              ) : (
                <View className="-mt-10 h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-blue-100">
                  <Text className="text-2xl font-bold text-blue-700">
                    {(profile.name ?? profile.username ?? '?')
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>
              )}
              <Text className="mt-2 text-xl font-bold text-slate-900">
                {showValue(profile.name)}
              </Text>
              <Text className="mt-0.5 text-sm text-slate-500">
                {profile.username
                  ? `@${profile.username}`
                  : 'Chưa cập nhật tên người dùng'}
              </Text>
            </View>
          </View>

          {error ? (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => retry().catch(() => undefined)}
              className="mt-3 rounded-xl bg-amber-50 px-4 py-3"
            >
              <Text className="text-sm text-amber-800">
                Không làm mới được dữ liệu. Nhấn để thử lại.
              </Text>
            </TouchableOpacity>
          ) : null}

          <Section title="Tài khoản">
            <InfoRow Icon={IdCard} label="ID người dùng" value={profile.id} />
            <InfoRow Icon={AtSign} label="Tên người dùng" value={profile.username} />
            <InfoRow Icon={Mail} label="Email" value={profile.email} onPress={openEmail} />
            <InfoRow
              Icon={Phone}
              label="Số điện thoại"
              value={profile.phoneNumber}
              onPress={openPhone}
            />
          </Section>

          <Section title="Thông tin cá nhân">
            <InfoRow Icon={UserRound} label="Họ" value={profile.lastName} />
            <InfoRow Icon={UserRound} label="Tên" value={profile.firstName} />
            <InfoRow Icon={UserRound} label="Giới tính" value={genderText(profile)} />
            <InfoRow Icon={Cake} label="Ngày sinh" value={profile.birthday} />
          </Section>

          <Section title="Giới thiệu">
            <InfoRow Icon={Info} label="Giới thiệu bản thân" value={profile.about} />
            <InfoRow Icon={BriefcaseBusiness} label="Nơi làm việc" value={profile.working} />
            <InfoRow Icon={GraduationCap} label="Trường học" value={profile.school} />
            <InfoRow Icon={MapPin} label="Địa chỉ" value={profile.address} />
            <InfoRow
              Icon={Globe2}
              label="Website"
              value={profile.website}
              onPress={openWebsite}
            />
          </Section>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

export default MyInfoScreen;
