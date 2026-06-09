// Description: Renders an in-app detail view for a selected Page.
import React from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  BadgeCheck,
  Flag,
  Globe2,
  MapPin,
  ThumbsUp,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';

type PageDetailProps = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.PAGE_DETAIL
>;

function formatCount(value?: number) {
  const safeValue = value ?? 0;
  if (safeValue >= 1000000) return `${(safeValue / 1000000).toFixed(1)}M`;
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(1)}K`;
  return String(safeValue);
}

function PageHeroAvatar({ avatar, title }: { avatar?: string; title: string }) {
  if (avatar) {
    return (
      <Image
        source={{ uri: avatar }}
        className="h-24 w-24 rounded-full border-4 border-white bg-white"
        resizeMode="cover"
        accessibilityLabel={title}
      />
    );
  }

  return (
    <View className="h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-[#EEF2FF]">
      <Flag size={38} color="#0000FF" />
    </View>
  );
}

function PageHeroCover({ cover }: { cover?: string }) {
  if (cover) {
    return (
      <Image
        source={{ uri: cover }}
        className="h-48 w-full bg-slate-200"
        resizeMode="cover"
      />
    );
  }

  return (
    <View className="h-48 w-full items-center justify-center bg-[#EEF2FF]">
      <Flag size={54} color="rgba(0,0,255,0.28)" strokeWidth={1.8} />
    </View>
  );
}

function InfoRow({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <View className="flex-row items-start rounded-2xl bg-slate-50 px-4 py-3">
      <View className="mt-0.5">{icon}</View>
      <Text className="ml-3 flex-1 text-body-primary">{label}</Text>
    </View>
  );
}

function PageDetailScreen({ navigation, route }: PageDetailProps) {
  const { page } = route.params;
  const title = page.pageTitle || page.pageName || 'Trang';
  const handle = page.pageName ? `@${page.pageName}` : '';

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      <View className="surface-topbar h-16 flex-row items-center px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text className="ml-3 flex-1 text-heading" numberOfLines={1}>
          {title}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="overflow-hidden bg-white">
          <PageHeroCover cover={page.cover} />
          <View className="px-5 pb-5">
            <View className="-mt-12">
              <PageHeroAvatar avatar={page.avatar} title={title} />
            </View>

            <View className="mt-4 flex-row items-center">
              <Text className="flex-1 text-2xl font-bold text-slate-950">
                {title}
              </Text>
              {page.mapPinApproved ? (
                <View className="ml-3 rounded-full bg-blue-50 px-3 py-1">
                  <Text className="text-caption-primary text-brand">
                    Đã ghim
                  </Text>
                </View>
              ) : null}
            </View>

            {handle ? (
              <Text className="mt-1 text-body-secondary">{handle}</Text>
            ) : null}

            {page.pageDescription ? (
              <Text className="mt-4 text-body-primary">
                {page.pageDescription}
              </Text>
            ) : null}
          </View>
        </View>

        <View className="mt-4 gap-3 px-4">
          <InfoRow
            icon={<ThumbsUp size={18} color="#0000FF" />}
            label={`${formatCount(page.likes)} lượt thích`}
          />

          {page.address ? (
            <InfoRow
              icon={<MapPin size={18} color="#475569" />}
              label={page.address}
            />
          ) : null}

          {page.pageCategory ? (
            <InfoRow
              icon={<BadgeCheck size={18} color="#475569" />}
              label={page.pageCategory}
            />
          ) : null}

          {page.url ? (
            <InfoRow
              icon={<Globe2 size={18} color="#475569" />}
              label={page.url}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default PageDetailScreen;
