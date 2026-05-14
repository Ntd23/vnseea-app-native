// Description: Renders the Stitch Facebook-style VNSEEA feed inside the main tab shell.
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
  Bell,
  Edit3,
  ImageIcon,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Share2,
  ShoppingBag,
  Smile,
  Tag,
  ThumbsUp,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';

const images = {
  me: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBzOiwu9eVVr13_YUuLqFaZS5DMZSQjPQqGVp3m79mrFIOksxUaafxT6NOD7hWY1ovOOtnGqlKKmPy3vZS5LhbiBbX6XQyXexcys3dCd700wiTgDGs4KRiq5vM64_gByXbAgZ356Xg_1i8PN9yGMKSGadOq-PYlT497w8_Ab1upM7ybuluWZspaikqyZ-BtES8q1oKfjZ9BHYtV1APztnG0dp7bW-4y0QkJh46DJatsljh0w0WsaL0Os2nes04dtts1t6X_kG8wXqw',
  thao: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDVjT2j3-JWVTKbI9Szqgq45cHChxxv3Ti1Eq_fcnSCFqKQMU6i0MB2ZiF4ZQZxXpPKN56QvCsXYQLmwOLBwurBMEEug9Gqu5YCyj33_RibQH5jVVKXqwApduV9h-Jcgyze8qOaBc0z5l-IqPUj5RJA2U0HNfn2S7Pk9DTtRsNM1KXRNGXdTgJDuEDY2tVnTEFjvksSHOUPV3Mo__d0yEsEbhPGGMGTrqli4Vn1D6fAdsrbw2VKZObiOKRw2UGau-Lq0fFb2RqdgHA',
  minh: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCdfITHvQjrR8L1_2sOLHIyey49H2Emaaqjat63iank6DIpDpcuNWXZG3VolK_uQg7B4_O9tHNvRbnghZ-w-jsbH6wGnCp44b_M0hl4bD94H0H4RlmtbEb1VaUG5ErpUbhhh3yOhrtln4kAzX6M8x5f0J78QITGv6UcXFqv2JWMK-AjccElyllcECcIqhV-vZMRy92dx7-bL3Eh9skc6DwjFCcYHGtxdxVyy0xduMmUzC_9HPKN5--f0mnYKNCoWS8NzhmK9y2ZYhc',
  linh: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDwDnldb1oeJtQc5Ty502_VoV-RGFH2GnRP5swMZTqgDBPlAiACC4p9OPJoM73IH3Xizl2Npy6FSl3hGqCDxxSh0rnXYsIObvcET0hTEGV2ShtwgUMGOLfPi21i-UDy3gtzkN2-DCUwbXTV7yNimbjJ6lxcaOBcIij9Ss1Ohscnc4N7FHd_s6VxQwBMN8yYLVNGW0lasCy80nX4ghwNxggXCisqCgEgAt0J4adXJxFM472_FNhdfaQ0zZZ6UDGXhcQWP3R_d9lrUvs',
  thanhAvatar:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCAi1HrpI_JeiBSBNZgzEjac4CDZufeONeHZFaeQsPWPupV_LZFU7BsPKiSSUaVQE4Qxv4H7F0CDVCR8LBEwgwxXBGB2-4xfpVZy_QHh6LJZEEfltVlAKw_gmO5nzxFr4iS8wswp0s7xQkukbRZ7tMqVth8ExvGeFR4PeENK7xYOVSUCXa76YosWtKjxSMafzJVwRIqQPfps6KkYDk3drQP9y9BoCvUHX80omFueDhTP6a5um8cQM9d1D3inWLOuNFbwrI8tx_qoSI',
  scenic:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAowyP14vMWb2lmxJ3IviTjBnvm7fYAYbcMD4rDqmPNrlSAU9vJqF5uU92MSxvTUHADVPoQoqdATPchdY19bt09zvrNEG7YFxz5jfTSO4AFtQQHd_s7dLY1ADdrHKwErHhPL1lRrB7v-FWrxBrxQvDvg39mTJGkyrCnwZmPkBRJpy9P4FVyAmup7jC0Wdsk5FzGy8YG1wpW9POpoQjC-Chlnwr1ClKAgx1SDwMSECuZ9s118CleNcRUq4NCkLbsbsYzVullqdTidhs',
  longAvatar:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuD1WMz8a0A0LOOR4XQmtgcx8NK5XVWk6fFVbsoaFj_hHQYmSGcX-hhys95HYg758SaumnM4pCGChaFl7SYR_5jQlHiiLvVMWI1LKGjbu4mgXTiTjMVRMKSFcbsSwGe2vpc0X2TEwBLaFYqCfJI-IOk03xODemSJlDSm1GNKEf2pKHtn0-xb9_sCH61WhE0TraQYxFO0wUb7pIQXlilbmTzpM1X4ejSNP6CCHJVXGAAwW0Of1RFi2NVFHhwIxBJFgu8oGRgLlzz8Ykg',
  galleryOne:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDdFRXJWZNZM_1MT0ZlnLfsnMoHjpzSc68XAB3euQa75mardov7I40wMT_7osCSBbFH15ZJWSl_kZor-OdyT5Kgupj1yIqQ8R3KAyKBg02ewt5B-taq75pstRGscuEPABajN7FjEK_7CBNQU0KeX2X-iHzn9YBBM8FVmXiZN0Th49InVT7FIH9BEZ1X_7spmzic7QN2A45sPSwLVhvPCX-jXmgukW6qUTWDs26kVpGNk-tPCbpLTP2toQjnSmYdFaIFQa_wpnPVDzA',
  galleryTwo:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDoM0j0eB99BtjoLe53u9ZsuzdkvOwJ9mMSSUSFkKzXBkqGBYsPNu4VPv3pzG299vMHqCD0jNQPyVZCmqBWkgouRL9mC64GBQQ_sggMH0Dujv8WTYh208k6ARCSwozWheUICf5QLhgdnWAaghX-E0C5McV_bt4TqDy6rvYdH_bAv85m82CWKTT5Rg9TScoac9viO5aUHQHCkSR-fr25_FJyLCue0cRMHlsUkkiO79Q7Z48ZjgnSmDY329BGJMkthyZ_bl2B9498rcE',
  galleryThree:
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDH-V8R7QLEDhYsZV3ofxqoU-i0vwiS-tdcmlL1NQgIP2uN6s4pzZGRRQ9nq5_iI8sEYf4q3fIwIIJRwPHm0GeO8V1T-t8jS523mr3fHMYKFUrUdo8W83lJ7kmKl2pIeuNAY2CNLH-9T7DZeuaIwQKz_aO10Ebgr4lpFIx3b5JJm4aV0-uZ_eSZBcC60g01Joq3AgUnhNKyzJ22npyaeviY1bwRzrCgUeXoj6bwTrkXwg-OjABPgnwfxdFOBQg9KOTlEef0BJWSjCg',
};

const filters = ['Mới nhất', 'Phổ biến', 'Yêu thích nhất'];
const stories = [
  { name: 'Thảo Vy', image: images.thao, active: true },
  { name: 'Minh Quân', image: images.minh, active: true },
  { name: 'Linh Chi', image: images.linh, active: false },
];

function IconButton({ children }: { children: React.ReactNode }) {
  return (
    <TouchableOpacity
      className="h-10 w-10 items-center justify-center rounded-full"
      activeOpacity={0.75}
    >
      {children}
    </TouchableOpacity>
  );
}

function Avatar({ uri, size = 40 }: { uri: string; size?: number }) {
  return (
    <Image
      source={{ uri }}
      style={{ height: size, width: size }}
      className="rounded-full"
      resizeMode="cover"
    />
  );
}

function ActionButton({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <TouchableOpacity className="flex-row items-center" activeOpacity={0.75}>
      {icon}
      <Text
        className={`ml-2 text-title-secondary ${active ? 'text-brand' : ''}`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function FeedHeader() {
  const navigation = useNavigation<any>();

  return (
    <View className="surface-topbar h-20 flex-row items-center justify-between px-4">
      <View className="flex-row items-center">
        <IconButton>
          <Menu size={24} color="#0000FF" />
        </IconButton>
        <Text className="ml-1 text-display text-brand">WoWonder</Text>
      </View>
      <View className="flex-row items-center">
        <IconButton>
          <Search size={22} color="#0000FF" />
        </IconButton>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.75}
          onPress={() => navigation.navigate(ROUTES.CREATE_PAGE)}
        >
          <Plus size={24} color="#0000FF" />
        </TouchableOpacity>
        <IconButton>
          <Bell size={22} color="#0000FF" />
        </IconButton>
      </View>
    </View>
  );
}

function FilterTabs() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2 px-4 py-4"
    >
      {filters.map((filter, index) => (
        <TouchableOpacity
          key={filter}
          className={`rounded-full px-6 py-2 ${
            index === 0 ? 'surface-brand' : 'surface-muted'
          }`}
          activeOpacity={0.8}
        >
          <Text
            className={
              index === 0
                ? 'text-title-primary text-inverse'
                : 'text-title-secondary'
            }
          >
            {filter}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function ComposerCard() {
  return (
    <View className="surface-card mx-4 mb-6 p-4">
      <View className="mb-3 flex-row items-center border-b border-slate-200 pb-3">
        <Avatar uri={images.me} />
        <TouchableOpacity
          className="surface-muted ml-3 min-h-[42px] flex-1 justify-center rounded-full px-4"
          activeOpacity={0.8}
        >
          <Text className="text-body-secondary">Bạn đang nghĩ gì?</Text>
        </TouchableOpacity>
      </View>
      <View className="flex-row items-center justify-between">
        <ActionButton
          icon={<ImageIcon size={20} color="#45BD62" />}
          label="Thư viện"
        />
        <ActionButton
          icon={<Tag size={20} color="#0000FF" />}
          label="Gắn thẻ"
        />
        <ActionButton
          icon={<Smile size={20} color="#F59E0B" />}
          label="Cảm xúc"
        />
      </View>
    </View>
  );
}

function StoriesRow() {
  return (
    <View className="mb-6">
      <View className="mb-3 flex-row items-center justify-between px-4">
        <Text className="text-heading">Tin tức mới</Text>
        <TouchableOpacity activeOpacity={0.8}>
          <Text className="text-title-primary text-brand">Xem tất cả</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-3 px-4"
      >
        <View className="surface-card h-48 w-28 overflow-hidden">
          <Image
            source={{ uri: images.me }}
            className="h-32 w-full"
            resizeMode="cover"
          />
          <View className="h-14 items-center justify-center bg-white">
            <View className="absolute -top-4 h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-blue-600">
              <Plus size={17} color="#FFFFFF" />
            </View>
            <Text className="mt-3 text-caption-primary">Tạo tin</Text>
          </View>
        </View>

        {stories.map(story => (
          <View
            key={story.name}
            className={`h-48 w-28 overflow-hidden rounded-2xl ${
              story.active ? '' : 'opacity-80'
            }`}
          >
            <Image
              source={{ uri: story.image }}
              className="h-full w-full"
              resizeMode="cover"
            />
            <View className="absolute inset-0 bg-black/20" />
            <View
              className={`absolute left-2 top-2 h-10 w-10 overflow-hidden rounded-full border-2 ${
                story.active ? 'border-blue-600' : 'border-slate-300'
              } bg-white p-0.5`}
            >
              <Image
                source={{ uri: story.image }}
                className="h-full w-full rounded-full"
                resizeMode="cover"
              />
            </View>
            <Text className="absolute bottom-2 left-2 right-2 text-caption-primary text-white">
              {story.name}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function GreetingCard() {
  return (
    <View className="preview-panel mx-4 mb-6 flex-row items-center justify-between p-4">
      <View className="flex-1 pr-3">
        <Text className="text-heading">Chào buổi tối, Nguyễn Dũng</Text>
        <Text className="mt-1 text-body-secondary">
          Buổi tối là cách cuộc sống nói rằng bạn đang gần hơn với giấc mơ của
          mình.
        </Text>
      </View>
      <Text className="text-4xl">🌅</Text>
    </View>
  );
}

function PostHeader({
  avatar,
  name,
  time,
  badge,
}: {
  avatar?: string;
  name: string;
  time: string;
  badge?: string;
}) {
  return (
    <View className="mb-4 flex-row items-center justify-between">
      <View className="flex-row items-center">
        {avatar ? (
          <Avatar uri={avatar} />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-600">
            <ShoppingBag size={20} color="#FFFFFF" />
          </View>
        )}
        <View className="ml-3">
          <View className="flex-row items-center">
            <Text className="text-title-primary">{name}</Text>
            {badge ? (
              <Text className="surface-muted ml-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">
                {badge}
              </Text>
            ) : null}
          </View>
          <Text className="text-caption-secondary">{time} • Công khai</Text>
        </View>
      </View>
      <MoreHorizontal size={22} color="#94A3B8" />
    </View>
  );
}

function ReactionSummary({
  likes,
  comments,
  shares,
}: {
  likes: string;
  comments: string;
  shares: string;
}) {
  return (
    <View className="mb-4 flex-row items-center justify-between">
      <View className="flex-row items-center">
        <View className="h-5 w-5 items-center justify-center rounded-full bg-blue-600">
          <ThumbsUp size={10} color="#FFFFFF" />
        </View>
        <View className="-ml-1 h-5 w-5 items-center justify-center rounded-full bg-red-500">
          <Text className="text-[10px] text-white">♥</Text>
        </View>
        <Text className="ml-2 text-caption-secondary">{likes}</Text>
      </View>
      <Text className="text-caption-secondary">
        {comments} bình luận · {shares} chia sẻ
      </Text>
    </View>
  );
}

function PostActions({ liked = false }: { liked?: boolean }) {
  return (
    <View className="flex-row items-center justify-between border-t border-slate-200 pt-4">
      <ActionButton
        active={liked}
        icon={<ThumbsUp size={19} color={liked ? '#0000FF' : '#64748B'} />}
        label="Thích"
      />
      <ActionButton
        icon={<MessageCircle size={19} color="#64748B" />}
        label="Bình luận"
      />
      <ActionButton
        icon={<Share2 size={19} color="#64748B" />}
        label="Chia sẻ"
      />
    </View>
  );
}

function ScenicPost() {
  return (
    <View className="surface-card mx-4 mb-6 overflow-hidden">
      <View className="p-5">
        <PostHeader
          avatar={images.thanhAvatar}
          name="Thanh Thảo"
          time="Vừa xong"
        />
        <Text className="text-body-primary">
          Hôm nay bầu trời thật đẹp! Đã lâu lắm rồi mới có thời gian thong dong
          như thế này. 🌿✨ #hanoi #chill #peaceful
        </Text>
      </View>
      <Image
        source={{ uri: images.scenic }}
        className="h-56 w-full"
        resizeMode="cover"
      />
      <View className="p-5">
        <ReactionSummary likes="42 lượt thích" comments="12" shares="4" />
        <PostActions liked />
      </View>
    </View>
  );
}

function SponsoredPost() {
  return (
    <View className="surface-card mx-4 mb-6 overflow-hidden">
      <View className="p-5">
        <PostHeader
          name="SF Corporation"
          time="15 phút trước"
          badge="Được tài trợ"
        />
        <Text className="text-body-primary">
          Khám phá giải pháp công nghệ mới nhất cho doanh nghiệp của bạn. Tối ưu
          hóa quy trình làm việc và tăng năng suất ngay hôm nay! 🚀
        </Text>
      </View>
      <View className="preview-panel mx-5 mb-5 h-56 items-center justify-center px-6">
        <Text className="text-display text-brand">S&F Corporation</Text>
        <Text className="mt-3 text-center text-title-primary">
          Dẫn đầu kỷ nguyên số
        </Text>
        <TouchableOpacity className="btn-primary mt-6 px-8" activeOpacity={0.9}>
          <Text className="text-title-primary text-inverse">Tìm hiểu ngay</Text>
        </TouchableOpacity>
      </View>
      <View className="border-t border-slate-200 p-5">
        <PostActions />
      </View>
    </View>
  );
}

function GalleryPost() {
  return (
    <View className="surface-card mx-4 mb-6 overflow-hidden">
      <View className="p-5">
        <PostHeader
          avatar={images.longAvatar}
          name="Hoàng Long"
          time="2 giờ trước"
        />
        <Text className="text-body-primary">
          Cuối tuần rực rỡ tại Đà Lạt. Không khí se lạnh thật là tuyệt vời! 🌲🍓
        </Text>
      </View>
      <View className="h-64 flex-row gap-1 px-5">
        <Image
          source={{ uri: images.galleryOne }}
          className="h-full flex-1 rounded-l-2xl"
          resizeMode="cover"
        />
        <View className="flex-1 gap-1">
          <Image
            source={{ uri: images.galleryTwo }}
            className="flex-1 rounded-tr-2xl"
            resizeMode="cover"
          />
          <View className="flex-1 overflow-hidden rounded-br-2xl">
            <Image
              source={{ uri: images.galleryThree }}
              className="h-full w-full"
              resizeMode="cover"
            />
            <View className="absolute inset-0 items-center justify-center bg-black/45">
              <Text className="text-heading text-white">+3</Text>
            </View>
          </View>
        </View>
      </View>
      <View className="p-5">
        <ReactionSummary likes="125" comments="42" shares="8" />
        <PostActions />
      </View>
    </View>
  );
}

function FeedScreen() {
  return (
    <SafeAreaView className="flex-1 surface-base">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <FeedHeader />
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-24"
          showsVerticalScrollIndicator={false}
        >
          <FilterTabs />
          <ComposerCard />
          <StoriesRow />
          <GreetingCard />
          <ScenicPost />
          <SponsoredPost />
          <GalleryPost />
        </ScrollView>
        <TouchableOpacity
          className="surface-brand absolute bottom-6 right-5 h-14 w-14 items-center justify-center rounded-full"
          activeOpacity={0.9}
        >
          <Edit3 size={26} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default FeedScreen;
