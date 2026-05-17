// Description: Renders the VNSEEA-style calls list screen translated from the Stitch reference.
import React from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  History,
  Menu,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  PhoneOutgoing,
  Plus,
  Search,
  Video,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const profileAvatar =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDDMxZeLkYZFBvoygmSWZXW4pfr9DMaLyGE0uog2SYzF6qBfmJa0MKMCtMoRQpPKEulrK2wiRfg7OkyrZnFstIjSQJlT6rBAO_Ey4ybTC9riiqSRWgXvo8BOW8_dy-cNVvAp9k2WY3u26KzEfDKy4VEykjBdcFoiHNN-_0eN7oMdWDI1jxzEIICfLKkceMCH4hRfalPhM4tpmmGsJmJpV1ik2LFlS8Caxh7vQ2awti-aPMnBVcKEgSdelZIq-Xug1nwaNMXEQY2q_4';

type CallItem = {
  id: string;
  name: string;
  time: string;
  status: 'outgoing' | 'missed' | 'incoming';
  action: 'call' | 'video';
  avatarUrl?: string;
  initials?: string;
  online?: boolean;
};

const calls: CallItem[] = [
  {
    id: '1',
    name: 'Linh Nguyễn',
    time: 'Hôm nay, 10:45',
    status: 'outgoing',
    action: 'call',
    online: true,
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCGi7ymmp0d7NE5DqNPiMaRNlhRkEdlcO0eShr60IPloJWaGvf-He9hnbYnUZa0LVSMCE_tBfC7Yfkn9jcti9fPVkATBiHZjY5lNLOwTMoZqCCqlg_hPf650gDqE6IgE5DhoDTGzVtDZWVyq6kyCyf90jKYDXfjAcj1RKRCWFgtOeVC4zuSUs0_C8vy5YX7hRRYN18vFOrkAhelijxLL2aPAIlJ6XbD7qBd7ML2fX-esg3c473b7-eYatHkJpdG4SXG5JnTOXVn4l8',
  },
  {
    id: '2',
    name: 'Minh Hoàng',
    time: 'Hôm nay, 09:12',
    status: 'missed',
    action: 'video',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA7WUERTH_fqLaFdrb78cpv_LwA1Q-x3vKpUqYhPS-EjXw_cAZgpWTAkxzrzOkshF7Sa0QgjS84LssJEVfFXDwvIychQCaSfEDVKiH3zzMPZG7ISlRL_qsDGN5LBQDuCFojA9qNUG3GsqEj2KpQ1K_e2OatT2rcoaGcBivzMiAOZNdJCsfiHesE3eA5awrh0p89oMJIDch_7hP5aNEfQLCSe8SdMFH05Ru1WAe9rOKguDGddJ8ZSqixFUnYC3jeaPXzseVyMnajO_I',
  },
  {
    id: '3',
    name: 'Thảo Nguyên',
    time: 'Hôm qua, 18:30',
    status: 'incoming',
    action: 'call',
    initials: 'TN',
  },
  {
    id: '4',
    name: 'Phương Anh',
    time: 'Hôm qua, 14:20',
    status: 'outgoing',
    action: 'video',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBr0s5cKg5I8Ew_jZkg8tbXlOX3yX56ZUui-BAfq5Cps5tcMbbVYXtT-VGiSqoKDtlhNGOOX-pjMaGYDagLceeoGdj8tGPraLI8SFDF39MeUkTvH3E-J7ux1Eu_3M12Mr26Bb9TtV5AXYibuX46ziWqNxIwyYMLYiqXF9Ju1AV50d2k2qjemIXbuUI9dfgi-qg4HWtgsJk_QGAenm0odOBsgIQMtEXzC8an1UvjEqRg6lgK1i_Nifs_mUhT21vFXGPolwu31F3kjJA',
  },
  {
    id: '5',
    name: 'Tuấn Trần',
    time: '05 Th06, 09:15',
    status: 'incoming',
    action: 'call',
    avatarUrl:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA4C39XxOzM_UsYKXtwF8BoDFEYdNnEy5fs-f1ZTagxqiMS2acwU_JSNMhpsg3Zz6gtr4KJdkkPxPVnYHL9hridf5wfH6kwsXxNSVwx9DZ0-onnYlwdJOC65cQOZ_SbTF9UlVjUqO5lvuYAfQXM-ys1DknTobsIO2SKxsAUwStRkPHdPfTGWb0HDi7d0NrhD1CwbjJ1_OLBEZMn8J7pewesi-e4LnJ9-saT0doB9LnOt-S0YilWjrCScxWMEJdw4isuEZ3jQrhYms4',
  },
];

const filters = ['Tất cả', 'Nhỡ', 'Gần đây'];

function CallStatusIcon({ status }: { status: CallItem['status'] }) {
  if (status === 'missed') {
    return <PhoneMissed size={13} color="#EF4444" />;
  }

  if (status === 'incoming') {
    return <PhoneIncoming size={13} color="#64748B" />;
  }

  return <PhoneOutgoing size={13} color="#0000FF" />;
}

function Avatar({ item }: { item: CallItem }) {
  if (item.avatarUrl) {
    return (
      <View className="relative">
        <Image
          source={{ uri: item.avatarUrl }}
          className="h-12 w-12 rounded-full"
          resizeMode="cover"
        />
        {item.online ? (
          <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-[#22c55e]" />
        ) : null}
      </View>
    );
  }

  return (
    <View className="h-12 w-12 items-center justify-center rounded-full bg-[#e0e0ff]">
      <Text className="text-title-primary text-brand">{item.initials}</Text>
    </View>
  );
}

function CallRow({ item }: { item: CallItem }) {
  const isMissed = item.status === 'missed';
  const ActionIcon = item.action === 'video' ? Video : Phone;

  return (
    <View className="mb-3 flex-row items-center justify-between rounded-xl border border-[rgba(0,0,0,0.04)] bg-white p-4">
      <View className="min-w-0 flex-1 flex-row items-center">
        <Avatar item={item} />
        <View className="ml-4 min-w-0 flex-1">
          <Text
            className={`text-title-primary ${
              isMissed ? 'text-[#EF4444]' : 'text-[#0b1c30]'
            }`}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View className="mt-1 flex-row items-center">
            <CallStatusIcon status={item.status} />
            <Text className="ml-1 text-caption-secondary">{item.time}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        className="h-10 w-10 items-center justify-center rounded-full bg-[#eff4ff]"
        activeOpacity={0.8}
      >
        <ActionIcon size={19} color="#0000FF" strokeWidth={2.1} />
      </TouchableOpacity>
    </View>
  );
}

function CallScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#f8f9ff]" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0000FF" />

      <View className="surface-brand h-14 flex-row items-center justify-between px-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
          >
            <Menu size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <Text className="ml-1 text-heading text-inverse">Cuộc gọi</Text>
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.8}
          >
            <Search size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Image
            source={{ uri: profileAvatar }}
            className="h-8 w-8 rounded-full border-2 border-white/25"
            resizeMode="cover"
          />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-28 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerClassName="gap-2 pb-6"
        >
          {filters.map((filter, index) => (
            <TouchableOpacity
              key={filter}
              className={`rounded-full px-4 py-2 ${
                index === 0 ? 'surface-brand' : 'bg-[#e5eeff]'
              }`}
              activeOpacity={0.8}
            >
              <Text
                className={`text-title-primary ${
                  index === 0 ? 'text-inverse' : 'text-[#454558]'
                }`}
              >
                {filter}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {calls.map(item => (
          <CallRow key={item.id} item={item} />
        ))}

        <View className="mt-12 items-center opacity-40">
          <History size={48} color="#64748B" />
          <Text className="mt-2 text-body-secondary">
            Xem thêm lịch sử cuộc gọi
          </Text>
        </View>
      </ScrollView>

      <TouchableOpacity
        className="absolute bottom-8 right-8 h-14 w-14 items-center justify-center rounded-2xl bg-[#0000ff]"
        activeOpacity={0.85}
      >
        <View className="relative">
          <PhoneCall size={26} color="#FFFFFF" />
          <Plus
            size={13}
            color="#FFFFFF"
            style={{ position: 'absolute', right: -5, top: -5 }}
          />
        </View>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default CallScreen;
