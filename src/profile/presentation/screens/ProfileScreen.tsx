// Description: Renders the VNSEEA-style profile screen with user-backed API data.
import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Briefcase,
  Camera,
  Clock,
  Edit3,
  MapPin,
  MoreHorizontal,
  PlusCircle,
  Rss,
  Search,
  User,
  Verified,
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useProfileViewModel } from '../../application/view-models/useProfileViewModel';

type ProfileNav = NativeStackNavigationProp<RootStackParamList>;
type ProfileRoute = RouteProp<RootStackParamList, typeof ROUTES.PROFILE>;

const FALLBACK_COVER =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCNqLNeeWsi7Qk4abx08XCTrKI5CmUGgDCiX-kH7Y_8LIIX5Slo9GRgEra_4deGp5e9pYozUmQdYGZi1sNQSks0QtbNWgpmn5gJgrF62Z8I8UMQpqKiMHLQ8Rzd9oUUIITFJPuwExVflVdeB1fRKjSGDO7zAocaZElLgpqJr6Mjvoj2FKOUVfnTk8XxnkG5WNijLpmXavW9TFlNhtlfLYbSE2qofOA8or7d_AfsUWZV43ADdtVFNH7VwEEazqapaL-Vndqksu_vDnE';
const FALLBACK_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBg12HbWQ9COz6EW-AyHRwh6TTRPdTun5HWxmzi1GHtkTwHjsF2VhXQV6yg-mCV0YYTXBDcEOCpZdcTGiCK1PpdUNPDQs6XTApo0nb_7Vi7IJPOfkXwbA1cq6d18Fft2V5ELBI4ZKLT6lvpj4O-9EBj3u3QfGt-Dzy_wf-DNRLwVAEeuaiEJ4B2Fvch4B0S9tk5tMCvbYQwuzGl0ttLC2hVIJh1Oj6Dn4dp6ueFANa1Yxy__ZIQLHKmtsMh2U8NBz0DLPHRlOZOzF4';
const FALLBACK_FRIENDS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuD1ieW2j4f-Xpi2IQaTOfhldZV_bq_cxNC3J8YvwLIMj3JoQf59xE_k7gRHQjjfMpGvfe3N9VNdzWDpAJ-EaJMQZhPXHulWgUWPbW4p7bHmW8OCX3bQIQjt8Qa3T5sb48Em_nnY7VjvCY9Heq0Pf628HeYvVWT_YM5vqrvie_uqkbTUIvDtIe0FeZycbHduWhd6UbIZM7YqZ2FRIhIsQZgSiH0JCdMCHho07QUOFTmuK8RExLIncYMPS2HCsqjehGsRdnDzIx7Ybrw',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDLWS5tf0Fpf1ZFDA8P_g7Gl6UFYvTeEdbq0rTHTrnIJFduAXKiZilywPSKobKVJmePltF4AL3UzBkk86bs_-nCNz21jwD7bIY4qdP0TW7-e8IaeD7K_I1_x9z7CY766cwG1ylT91GzYqnWsS4RT8sCyL7FGgLp9PgrttHr18EyTTnJ5q9ohUrT9wLqxfikI6VjZ3R7Yt0S1ii4gM3UjuX0GR4JJeQj7M6QJI_vyBu-PAzJn0IF7i4EFtXmnRSAjppkw1CfWjMcuVE',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDBM__UehaAgiDA9uC3Kw8OPZ3kYz67EbNRd0wutGdRStdNAQuO0bto9DiVW1VWK8Yedmg9NDq7gtlhaK1r-06a7Da1fs5flP275bMscPfGbnGLhLuJ4AvhV57akqf3YcT1OuEZ8ec6CzJxl9QXZpFcb2iJ5XcAwJcy4PfAo3-wMa2kEGtv108qFxXFyCnHe38B1ei1Jrx-dxSsVshOyAE4UluTEh_assYq9hyzWTJa2d71vIxqOp-U1-5oh8O1wKYT0Kivx75ge0U',
];

function DetailRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View className="mb-3 flex-row items-center">
      {icon}
      <Text className="ml-3 flex-1 text-body-primary">{text}</Text>
    </View>
  );
}

function ProfileScreen() {
  const navigation = useNavigation<ProfileNav>();
  const route = useRoute<ProfileRoute>();
  const { profile, followers, following, isLoading, error, loadProfile } =
    useProfileViewModel();

  useEffect(() => {
    loadProfile({
      userId: route.params?.userId,
      includeFriends: true,
    }).catch(() => undefined);
  }, [loadProfile, route.params?.userId]);

  const displayName = profile?.name ?? profile?.username ?? 'Người dùng';
  const username = profile?.username ? `@${profile.username}` : '';
  const coverUrl = profile?.coverUrl ?? FALLBACK_COVER;
  const avatarUrl = profile?.avatarUrl ?? FALLBACK_AVATAR;
  const followerCount = followers.length;
  const followingCount = following.length;
  const friendAvatars =
    followers.length > 0
      ? followers.slice(0, 5).map(friend => friend.avatarUrl ?? FALLBACK_AVATAR)
      : FALLBACK_FRIENDS;

  return (
    <SafeAreaView className="flex-1 surface-base">
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View className="surface-topbar min-h-[72px] flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text
          allowFontScaling={false}
          className="max-w-[70%] text-heading"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          {displayName}
        </Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.navigate(ROUTES.SEARCH)}
        >
          <Search size={21} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="h-44">
          <Image
            source={{ uri: coverUrl }}
            className="h-full w-full"
            resizeMode="cover"
          />
          <TouchableOpacity className="absolute bottom-3 right-3 max-w-[48%] flex-row items-center rounded-lg bg-white/90 px-3 py-2">
            <Camera size={17} color="#0F172A" />
            <Text
              allowFontScaling={false}
              className="ml-2 flex-1 text-caption-primary"
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              Sửa ảnh bìa
            </Text>
          </TouchableOpacity>
        </View>

        <View className="px-4">
          <View className="-mt-12">
            <View className="h-32 w-32 rounded-full border-4 border-white bg-white">
              <Image
                source={{ uri: avatarUrl }}
                className="h-full w-full rounded-full"
                resizeMode="cover"
              />
              <View className="absolute bottom-2 right-2 h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-100">
                <Camera size={18} color="#0F172A" />
              </View>
            </View>
          </View>

          <View className="mt-3 flex-row items-center">
            <Text
              allowFontScaling={false}
              className="max-w-[85%] text-[28px] font-bold leading-tight text-black"
              numberOfLines={2}
            >
              {displayName}
            </Text>
            {profile?.verified && (
              <Verified
                className="ml-2"
                size={24}
                color="#0000FF"
                fill="#0000FF"
              />
            )}
          </View>
          {!!username && (
            <Text className="mt-1 text-body-secondary" numberOfLines={1}>
              {username}
            </Text>
          )}

          {isLoading && !profile && (
            <View className="mt-5 items-center">
              <ActivityIndicator color="#0000FF" />
              <Text
                allowFontScaling={false}
                className="mt-2 text-caption-secondary"
              >
                Đang tải hồ sơ
              </Text>
            </View>
          )}

          {!!error && (
            <View className="mt-4 min-h-[52px] justify-center rounded-xl border border-red-100 bg-red-50 px-4 py-3">
              <Text
                allowFontScaling={false}
                className="text-caption-primary text-red-600"
              >
                {error}
              </Text>
            </View>
          )}

          <View className="my-4 min-h-[86px] flex-row justify-center border-y border-slate-200 py-4">
            <View className="flex-1 items-center justify-center px-1">
              <Text allowFontScaling={false} className="text-title-primary">
                {followerCount}
              </Text>
              <Text
                allowFontScaling={false}
                className="mt-1 text-center text-caption-secondary"
                numberOfLines={2}
              >
                Người theo dõi
              </Text>
            </View>
            <View className="flex-1 items-center justify-center border-x border-slate-200 px-1">
              <Text allowFontScaling={false} className="text-title-primary">
                {followingCount}
              </Text>
              <Text
                allowFontScaling={false}
                className="mt-1 text-center text-caption-secondary"
                numberOfLines={2}
              >
                Đang theo dõi
              </Text>
            </View>
            <View className="flex-1 items-center justify-center px-1">
              <Text allowFontScaling={false} className="text-title-primary">
                {profile?.points ?? 0}
              </Text>
              <Text
                allowFontScaling={false}
                className="mt-1 text-center text-caption-secondary"
                numberOfLines={2}
              >
                Điểm
              </Text>
            </View>
          </View>

          <View className="mb-5 flex-row gap-2">
            <TouchableOpacity className="btn-primary min-h-[56px] flex-1">
              <PlusCircle size={19} color="#FFFFFF" />
              <Text
                allowFontScaling={false}
                className="text-title-primary text-inverse"
                numberOfLines={1}
              >
                Theo dõi
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="btn-secondary min-h-[56px] flex-1">
              <Edit3 size={18} color="#0F172A" />
              <Text
                allowFontScaling={false}
                className="text-title-primary"
                numberOfLines={1}
              >
                Chỉnh sửa
              </Text>
            </TouchableOpacity>
            <TouchableOpacity className="surface-muted h-[56px] w-[56px] items-center justify-center rounded-xl">
              <MoreHorizontal size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>

          <View className="surface-card p-5">
            <Text className="mb-4 text-heading">Chi tiết</Text>
            <DetailRow
              icon={<User size={20} color="#64748B" />}
              text={profile?.pro ? 'Thành viên VIP Member' : 'Thành viên'}
            />
            {!!profile?.working && (
              <DetailRow
                icon={<Briefcase size={20} color="#64748B" />}
                text={`Làm việc tại ${profile.working}`}
              />
            )}
            {!!profile?.address && (
              <DetailRow
                icon={<MapPin size={20} color="#64748B" />}
                text={`Sống tại ${profile.address}`}
              />
            )}
            <DetailRow
              icon={<Clock size={20} color="#64748B" />}
              text={profile?.lastSeenText ?? 'Đang hoạt động'}
            />
            <DetailRow
              icon={<Rss size={20} color="#64748B" />}
              text={`Có ${followerCount} người theo dõi`}
            />
            {!!profile?.about && (
              <Text className="mt-1 text-body-secondary">{profile.about}</Text>
            )}
            <TouchableOpacity className="surface-muted mt-3 items-center rounded-lg py-3">
              <Text className="text-title-primary text-brand">
                Chỉnh sửa chi tiết
              </Text>
            </TouchableOpacity>
          </View>

          <View className="surface-card mb-8 mt-5 p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <View>
                <Text className="text-heading">Bạn bè</Text>
                <Text className="text-caption-secondary">
                  {followerCount} người theo dõi
                </Text>
              </View>
              <Text className="text-title-primary text-brand">Tìm bạn bè</Text>
            </View>
            <View className="flex-row flex-wrap gap-3">
              {friendAvatars.map((friend, index) => (
                <View key={`${friend}-${index}`} className="w-[30%]">
                  <Image
                    source={{ uri: friend }}
                    className="h-24 w-full rounded-xl"
                    resizeMode="cover"
                  />
                  <Text className="mt-1 text-caption-primary" numberOfLines={1}>
                    {followers[index]?.name ??
                      ['Trần Văn A', 'Lê Thị B', 'Nguyễn C'][index] ??
                      'Bạn bè'}
                  </Text>
                </View>
              ))}
              <View className="w-[30%] items-center justify-center rounded-xl bg-slate-100">
                <Text className="text-title-secondary">
                  +{Math.max(followerCount - friendAvatars.length, 0)}
                </Text>
                <Text className="text-caption-secondary">Xem tất cả</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default ProfileScreen;
