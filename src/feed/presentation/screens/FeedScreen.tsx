// Description: Renders the Stitch Facebook-style VNSEEA feed inside the main tab shell.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import VideoPlayer from 'react-native-video';
import {
  Edit3,
  ImageIcon,
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
import type { ReactionType } from '../../../reels/domain/types/reels.types';
import { ALL_REACTION_TYPES } from '../../../reels/domain/types/reels.types';

// ── Facebook-style reaction lookup tables ─────────────────────────────────
// Same shape we use in the comments sheet, kept local here so the feed
// module stays self-contained (no shared "design tokens" file yet).

const REACTION_EMOJI: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  haha: '😂',
  wow: '😮',
  sad: '😢',
  angry: '😡',
};

const REACTION_LABEL: Record<ReactionType, string> = {
  like: 'Đã thích',
  love: 'Yêu thích',
  haha: 'Haha',
  wow: 'Wow',
  sad: 'Buồn',
  angry: 'Phẫn nộ',
};

const REACTION_COLOR: Record<ReactionType, string> = {
  like: '#0866ff',
  love: '#f33e58',
  haha: '#f7b125',
  wow: '#f7b125',
  sad: '#f7b125',
  angry: '#e9710f',
};

// Floating picker pill geometry — used to clamp X within the viewport.
const PICKER_WIDTH = 282;
const PICKER_HEIGHT = 52;
const PICKER_GAP = 8;
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { RootStackRouteName } from '../../../navigation/types';
import CreateActionSheet from '../../../shared-kernel/presentation/components/CreateActionSheet';
import { useFeedViewModel } from '../../application/view-models/useFeedViewModel';
import { postCreatedEvents } from '../../application/events/postCreatedEvents';
import type {
  FeedTextPost,
  FeedVideoPost,
} from '../../domain/types/feed.types';
import { ReelCommentsSheet } from '../../../reels/presentation/components/ReelCommentsSheet';
import { useFeedCommentsViewModel } from '../../application/view-models/useFeedCommentsViewModel';

type FeedNav = NativeStackNavigationProp<RootStackParamList>;

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

function IconButton({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      className="h-10 w-10 items-center justify-center rounded-full"
      activeOpacity={0.75}
      onPress={onPress}
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
  const navigation = useNavigation<FeedNav>();
  const [sheetVisible, setSheetVisible] = useState(false);
  const handleCreateNavigate = useCallback(
    (route: RootStackRouteName) => {
      if (route === ROUTES.CREATE_EVENT) {
        navigation.navigate(ROUTES.CREATE_EVENT);
      }

      if (route === ROUTES.CREATE_PRODUCT) {
        navigation.navigate(ROUTES.CREATE_PRODUCT);
      }

      if (route === ROUTES.CREATE_PAGE) {
        navigation.navigate(ROUTES.CREATE_PAGE);
      }

      if (route === ROUTES.CREATE_GROUP) {
        navigation.navigate(ROUTES.CREATE_GROUP);
      }

      if (route === ROUTES.CREATE_REEL) {
        navigation.navigate(ROUTES.CREATE_REEL);
      }

      if (route === ROUTES.CREATE_POST) {
        navigation.navigate(ROUTES.CREATE_POST);
      }
    },
    [navigation],
  );

  return (
    <>
      <View className="surface-topbar h-20 flex-row items-center justify-between px-4">
        <View className="flex-row items-center">
          <Text className="ml-1 text-display text-brand">VNSEEA</Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.75}
            onPress={() => navigation.navigate(ROUTES.SEARCH)}
          >
            <Search size={22} color="#0000FF" />
          </TouchableOpacity>
          <TouchableOpacity
            className="h-10 w-10 items-center justify-center rounded-full"
            activeOpacity={0.75}
            onPress={() => setSheetVisible(true)}
          >
            <Plus size={24} color="#0000FF" />
          </TouchableOpacity>
          <IconButton onPress={() => navigation.navigate(ROUTES.MESSAGES)}>
            <MessageCircle size={22} color="#0000FF" />
          </IconButton>
        </View>
      </View>
      <CreateActionSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        onNavigate={handleCreateNavigate}
      />
    </>
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

function ComposerCard({ onPress }: { onPress: () => void }) {
  // The whole card is a single nav entry-point to CreatePostScreen.
  // We expose `onPress` separately on the text bubble AND on each
  // action button so the user can tap anywhere natural — Facebook lets
  // you tap "Photo" / "Feeling" to land directly inside the composer.
  return (
    <View className="surface-card mx-4 mb-6 p-4">
      <View className="mb-3 flex-row items-center border-b border-slate-200 pb-3">
        <Avatar uri={images.me} />
        <TouchableOpacity
          className="surface-muted ml-3 min-h-[42px] flex-1 justify-center rounded-full px-4"
          activeOpacity={0.8}
          onPress={onPress}
        >
          <Text className="text-body-secondary">Bạn đang nghĩ gì?</Text>
        </TouchableOpacity>
      </View>
      <View className="flex-row items-center justify-between">
        <TouchableOpacity
          className="flex-row items-center"
          activeOpacity={0.75}
          onPress={onPress}
        >
          <ImageIcon size={20} color="#45BD62" />
          <Text className="ml-2 text-title-secondary">Thư viện</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-row items-center"
          activeOpacity={0.75}
          onPress={onPress}
        >
          <Tag size={20} color="#0000FF" />
          <Text className="ml-2 text-title-secondary">Gắn thẻ</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-row items-center"
          activeOpacity={0.75}
          onPress={onPress}
        >
          <Smile size={20} color="#F59E0B" />
          <Text className="ml-2 text-title-secondary">Cảm xúc</Text>
        </TouchableOpacity>
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

function formatCount(count: number) {
  if (!Number.isFinite(count) || count <= 0) return '0';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function formatPostTime(timestamp?: number) {
  if (!timestamp) return 'Vừa xong';
  const now = Math.floor(Date.now() / 1000);
  const diff = Math.max(0, now - timestamp);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(timestamp * 1000).toLocaleDateString('vi-VN');
}

function HomeVideoPostCard({
  post,
  onReact,
  onOpenPicker,
  onCommentTap,
  isActive,
  onReportLayout,
}: {
  post: FeedVideoPost;
  onReact: (postId: string, reaction: ReactionType) => void;
  onOpenPicker: (postId: string, x: number, y: number) => void;
  onCommentTap: (postId: string) => void;
  isActive: boolean;
  onReportLayout: (id: string, y: number, height: number) => void;
}) {
  const [manuallyPaused, setManuallyPaused] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!isActive) {
      setManuallyPaused(false);
    }
  }, [isActive]);

  const playing = isActive && !manuallyPaused;

  // Need an on-screen position for the "Thích" button so the picker
  // anchors above it (matches the Facebook web/mobile pattern).
  const likeButtonRef = useRef<View>(null);

  const handleLikeTap = useCallback(() => {
    // Default reaction is 'like' — same as Facebook. Tapping again clears
    // it (the view-model handles the toggle-off).
    onReact(post.id, 'like');
  }, [onReact, post.id]);

  const handleLikeLongPress = useCallback(() => {
    if (!likeButtonRef.current) {
      onOpenPicker(post.id, 100, 200);
      return;
    }
    likeButtonRef.current.measureInWindow((x, y, width) => {
      onOpenPicker(post.id, x + width / 2, y);
    });
  }, [onOpenPicker, post.id]);

  return (
    <View
      onLayout={(e) => {
        const { y, height } = e.nativeEvent.layout;
        onReportLayout(post.id, y, height);
      }}
      className="surface-card mx-4 mb-6 overflow-hidden"
    >
      <View className="p-5">
        <PostHeader
          avatar={post.publisher.avatarUrl}
          name={post.publisher.name}
          time={formatPostTime(post.postedAt)}
        />
        {post.caption ? (
          <Text className="text-body-primary">{post.caption}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setManuallyPaused(prev => !prev)}
        className="h-56 w-full bg-black"
      >
        <VideoPlayer
          source={{ uri: post.videoUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
          paused={!playing}
          controls={false}
          muted={muted}
          repeat
          ignoreSilentSwitch="ignore"
          poster={post.thumbnailUrl}
          posterResizeMode="cover"
        />
        {/* Big play button overlay while paused */}
        {!playing ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                backgroundColor: 'rgba(0,0,0,0.55)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 26, marginLeft: 4 }}>
                ▶
              </Text>
            </View>
          </View>
        ) : null}
        {/* Mute toggle — top-right when playing */}
        {playing ? (
          <TouchableOpacity
            onPress={() => setMuted(m => !m)}
            activeOpacity={0.85}
            style={{
              position: 'absolute',
              top: 10,
              right: 10,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(0,0,0,0.45)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16 }}>
              {muted ? '🔇' : '🔊'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
      <View className="p-5">
        <VideoReactionSummary
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          myReaction={post.myReaction}
        />
        <VideoPostActions
          myReaction={post.myReaction}
          likeButtonRef={likeButtonRef}
          onLikeTap={handleLikeTap}
          onLikeLongPress={handleLikeLongPress}
          onCommentTap={() => onCommentTap(post.id)}
        />
      </View>
    </View>
  );
}

// ── Facebook-style summary row above the action buttons ──────────────────
// Shows a stacked emoji badge ("👍❤️") followed by either the viewer's
// own reaction label ("Bạn và 14 người khác") OR a generic count when the
// viewer hasn't reacted.
function VideoReactionSummary({
  likeCount,
  commentCount,
  myReaction,
}: {
  likeCount: number;
  commentCount: number;
  myReaction: ReactionType | null;
}) {
  // Don't render the row at all if nobody has reacted AND there are no
  // comments — keeps simple posts visually quiet, FB-style.
  if (likeCount <= 0 && commentCount <= 0) return null;

  const othersCount = myReaction ? Math.max(0, likeCount - 1) : likeCount;
  const summaryLeft = (() => {
    if (myReaction && othersCount > 0) {
      return `Bạn và ${formatCount(othersCount)} người khác`;
    }
    if (myReaction) {
      return 'Bạn';
    }
    if (likeCount > 0) {
      return formatCount(likeCount);
    }
    return '';
  })();

  return (
    <View className="mb-4 flex-row items-center justify-between">
      {/* Left: reaction badge + label — flex-1 so it doesn't crowd the right */}
      <View className="mr-2 flex-1 flex-row items-center">
        {likeCount > 0 ? (
          <>
            {/* Show ONLY the viewer's active reaction OR a generic thumbs-up.
                Never render both stacked — that caused the double-emoji bug
                when swapping reactions (old icon stayed, new one appeared
                on top). */}
            {myReaction && myReaction !== 'like' ? (
              <View className="h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-white">
                <Text style={{ fontSize: 11 }}>{REACTION_EMOJI[myReaction]}</Text>
              </View>
            ) : (
              <View className="h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                <ThumbsUp size={10} color="#FFFFFF" />
              </View>
            )}
            <Text
              className="ml-2 text-caption-secondary"
              numberOfLines={1}
              style={{ flexShrink: 1 }}
            >
              {summaryLeft}
            </Text>
          </>
        ) : null}
      </View>
      {/* Right: comment count — no flex so it stays at its natural width */}
      {commentCount > 0 ? (
        <Text className="text-caption-secondary" numberOfLines={1}>
          {formatCount(commentCount)} bình luận
        </Text>
      ) : null}
    </View>
  );
}

// ── Action row — Thích / Bình luận / Chia sẻ ─────────────────────────────
// The "Thích" button is the interesting one:
//   • Label + color change to mirror the current reaction (Đã thích = blue,
//     Yêu thích = red, Haha/Wow/Sad = yellow, Phẫn nộ = orange)
//   • Long-press opens the picker pill (handled by the parent screen via
//     `onLikeLongPress` which measures this button's on-screen position)
function VideoPostActions({
  myReaction,
  likeButtonRef,
  onLikeTap,
  onLikeLongPress,
  onCommentTap,
}: {
  myReaction: ReactionType | null;
  // React 19+'s `useRef<View>(null)` returns `RefObject<View | null>`,
  // so we widen the type here to accept it. Same Pressable ref target,
  // just a stricter null-check in the type.
  likeButtonRef: React.RefObject<View | null>;
  onLikeTap: () => void;
  onLikeLongPress: () => void;
  onCommentTap: () => void;
}) {
  const label = myReaction ? REACTION_LABEL[myReaction] : 'Thích';
  const color = myReaction ? REACTION_COLOR[myReaction] : '#64748B';

  return (
    <View className="flex-row items-center justify-between border-t border-slate-200 pt-4">
      <Pressable
        ref={likeButtonRef}
        onPress={onLikeTap}
        onLongPress={onLikeLongPress}
        delayLongPress={280}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        className="flex-row items-center"
      >
        {myReaction ? (
          <Text style={{ fontSize: 18 }}>{REACTION_EMOJI[myReaction]}</Text>
        ) : (
          <ThumbsUp size={19} color={color} />
        )}
        <Text
          style={{
            marginLeft: 6,
            color,
            fontWeight: myReaction ? '700' : '600',
            fontSize: 14,
          }}
        >
          {label}
        </Text>
      </Pressable>

      <TouchableOpacity
        className="flex-row items-center"
        activeOpacity={0.75}
        onPress={onCommentTap}
      >
        <MessageCircle size={19} color="#64748B" />
        <Text style={{ marginLeft: 6, color: '#64748B', fontSize: 14 }}>
          Bình luận
        </Text>
      </TouchableOpacity>

      <TouchableOpacity className="flex-row items-center" activeOpacity={0.75}>
        <Share2 size={19} color="#64748B" />
        <Text style={{ marginLeft: 6, color: '#64748B', fontSize: 14 }}>
          Chia sẻ
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Floating reaction picker (Facebook-style 6-emoji pill) ────────────────
// Renders in a transparent full-screen Modal so it always floats above
// every other content (cards, sticky header, etc.). Position is clamped
// inside the viewport so a long-press near the right edge still shows the
// full pill.
function ReactionPickerOverlay({
  anchor,
  onPick,
  onDismiss,
}: {
  anchor: { postId: string; x: number; y: number } | null;
  onPick: (reaction: ReactionType) => void;
  onDismiss: () => void;
}) {
  if (!anchor) return null;

  const screenWidth = Dimensions.get('window').width;
  const left = Math.max(
    10,
    Math.min(anchor.x - PICKER_WIDTH / 2, screenWidth - PICKER_WIDTH - 10),
  );
  const top = Math.max(40, anchor.y - PICKER_HEIGHT - PICKER_GAP);

  return (
    <Modal
      transparent
      visible
      animationType="fade"
      onRequestClose={onDismiss}
      statusBarTranslucent
    >
      <Pressable
        onPress={onDismiss}
        style={{ flex: 1, backgroundColor: 'transparent' }}
      >
        <View
          style={{
            position: 'absolute',
            left,
            top,
            width: PICKER_WIDTH,
            height: PICKER_HEIGHT,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 8,
            backgroundColor: '#fff',
            borderRadius: 26,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 10,
            elevation: 12,
          }}
        >
          {ALL_REACTION_TYPES.map(type => (
            <TouchableOpacity
              key={type}
              activeOpacity={0.7}
              onPress={() => onPick(type)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
            >
              <Text style={{ fontSize: 28, lineHeight: 32 }}>
                {REACTION_EMOJI[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

function HomeVideoPosts({
  posts,
  isLoading,
  error,
  onReact,
  onOpenPicker,
  onCommentTap,
  activeVideoId,
  onReportLayout,
  onReportSectionY,
}: {
  posts: FeedVideoPost[];
  isLoading: boolean;
  error: string | null;
  onReact: (postId: string, reaction: ReactionType) => void;
  onOpenPicker: (postId: string, x: number, y: number) => void;
  onCommentTap: (postId: string) => void;
  activeVideoId: string | null;
  onReportLayout: (id: string, y: number, height: number) => void;
  onReportSectionY: (y: number) => void;
}) {
  if (isLoading && posts.length === 0) {
    return (
      <View className="surface-card mx-4 mb-6 items-center p-5">
        <ActivityIndicator color="#0000FF" size="small" />
        <Text className="mt-2 text-body-secondary">Đang tải video...</Text>
      </View>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <View onLayout={(e) => onReportSectionY(e.nativeEvent.layout.y)}>
      <View className="mb-3 flex-row items-center justify-between px-4">
        <Text className="text-heading">Video mới</Text>
        {error ? <Text className="text-caption-secondary">Không tải thêm được</Text> : null}
      </View>
      {posts.map(post => (
        <HomeVideoPostCard
          key={post.id}
          post={post}
          onReact={onReact}
          onOpenPicker={onOpenPicker}
          onCommentTap={onCommentTap}
          isActive={activeVideoId === post.id}
          onReportLayout={onReportLayout}
        />
      ))}
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

// ── Text / photo post card ────────────────────────────────────────────
// Renders a non-video post from `vm.textPosts`. Same FB-style chrome as
// the mock posts (header → caption → photos → reaction summary → action
// row) but data-driven instead of hardcoded.
function TextPostCard({
  post,
  onReact,
  onOpenPicker,
  onCommentTap,
}: {
  post: FeedTextPost;
  onReact: (postId: string, reaction: ReactionType) => void;
  onOpenPicker: (postId: string, x: number, y: number) => void;
  onCommentTap: (postId: string) => void;
}) {
  const likeButtonRef = useRef<View>(null);
  const handleLikeTap = useCallback(
    () => onReact(post.id, 'like'),
    [onReact, post.id],
  );
  const handleLikeLongPress = useCallback(() => {
    if (!likeButtonRef.current) {
      onOpenPicker(post.id, 100, 200);
      return;
    }
    likeButtonRef.current.measureInWindow((x, y, width) => {
      onOpenPicker(post.id, x + width / 2, y);
    });
  }, [onOpenPicker, post.id]);

  // Photo grid: 1 photo → big, 2+ → 2-column. Same shape as the composer
  // grid for visual consistency.
  const single = post.photos.length === 1;

  return (
    <View className="surface-card mx-4 mb-6 overflow-hidden">
      <View className="p-5">
        <PostHeader
          avatar={post.publisher.avatarUrl}
          name={post.publisher.name}
          time={formatPostTime(post.postedAt)}
        />
        {post.caption ? (
          <Text className="text-body-primary">{post.caption}</Text>
        ) : null}
        {post.feeling ? (
          <Text className="mt-1 text-caption-secondary">
            đang cảm thấy {post.feeling.label ?? post.feeling.value}{' '}
            {post.feeling.emoji ?? ''}
          </Text>
        ) : null}
      </View>
      {post.photos.length > 0 ? (
        <View className="flex-row flex-wrap px-1">
          {post.photos.map(url => (
            <View
              key={url}
              style={{
                width: single ? '100%' : '50%',
                aspectRatio: single ? 1.4 : 1,
                padding: 2,
              }}
            >
              <Image
                source={{ uri: url }}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 8,
                  backgroundColor: '#F1F5F9',
                }}
                resizeMode="cover"
              />
            </View>
          ))}
        </View>
      ) : null}
      <View className="p-5">
        <VideoReactionSummary
          likeCount={post.likeCount}
          commentCount={post.commentCount}
          myReaction={post.myReaction}
        />
        <VideoPostActions
          myReaction={post.myReaction}
          likeButtonRef={likeButtonRef}
          onLikeTap={handleLikeTap}
          onLikeLongPress={handleLikeLongPress}
          onCommentTap={() => onCommentTap(post.id)}
        />
      </View>
    </View>
  );
}

// Section wrapper — header + empty/loading/error states + list of cards.
function TextPostFeed({
  posts,
  isLoading,
  error,
  onReact,
  onOpenPicker,
  onCommentTap,
}: {
  posts: FeedTextPost[];
  isLoading: boolean;
  error: string | null;
  onReact: (postId: string, reaction: ReactionType) => void;
  onOpenPicker: (postId: string, x: number, y: number) => void;
  onCommentTap: (postId: string) => void;
}) {
  if (isLoading && posts.length === 0) {
    return (
      <View className="surface-card mx-4 mb-6 items-center p-5">
        <ActivityIndicator color="#0000FF" size="small" />
        <Text className="mt-2 text-body-secondary">Đang tải bài viết...</Text>
      </View>
    );
  }
  if (posts.length === 0) {
    return null;
  }
  return (
    <View>
      <View className="mb-3 flex-row items-center justify-between px-4">
        <Text className="text-heading">Bài viết mới</Text>
        {error ? (
          <Text className="text-caption-secondary">Không tải thêm được</Text>
        ) : null}
      </View>
      {posts.map(post => (
        <TextPostCard
          key={post.id}
          post={post}
          onReact={onReact}
          onOpenPicker={onOpenPicker}
          onCommentTap={onCommentTap}
        />
      ))}
    </View>
  );
}

function FeedScreen() {
  const navigation = useNavigation<FeedNav>();
  const vm = useFeedViewModel();

  // Subscribe to the global "post created" event so the home feed gets
  // an instant prepend the moment CreatePostScreen finishes. We mount
  // ONCE per FeedScreen instance and unsubscribe on unmount so dropped
  // events never leak into stale listeners.
  useEffect(() => {
    const unsubscribe = postCreatedEvents.subscribe(post => {
      vm.prependTextPost(post);
    });
    return unsubscribe;
  }, [vm]);

  const goToCreatePost = useCallback(() => {
    navigation.navigate(ROUTES.CREATE_POST);
  }, [navigation]);

  const commentVm = useFeedCommentsViewModel({
    onCommentCountChange: vm.updateCommentCount,
  });

  // The comment sheet is shared by both video and text posts — look up
  // the active post in both lists so the comment count badge stays
  // accurate regardless of which type triggered it.
  const selectedCommentPost = useMemo(
    () =>
      vm.videoPosts.find(post => post.id === commentVm.selectedCommentPostId) ??
      vm.textPosts.find(post => post.id === commentVm.selectedCommentPostId) ??
      null,
    [vm.videoPosts, vm.textPosts, commentVm.selectedCommentPostId],
  );

  const handleRetryComments = useCallback(() => {
    if (commentVm.selectedCommentPostId) {
      commentVm.openComments(commentVm.selectedCommentPostId);
    }
  }, [commentVm]);

  // Viewport tracking & Autoplay logic for ScrollView video cards
  const [videoSectionY, setVideoSectionY] = useState(0);
  const cardLayouts = useRef<Record<string, { y: number; height: number }>>({});
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const handleReportSectionY = useCallback((y: number) => {
    setVideoSectionY(y);
  }, []);

  const handleReportLayout = useCallback((id: string, y: number, height: number) => {
    cardLayouts.current[id] = { y, height };
  }, []);

  const handleScroll = useCallback((event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const viewportHeight = Dimensions.get('window').height;
    const viewportCenter = scrollY + viewportHeight / 2;

    let closestId: string | null = null;
    let minDistance = Infinity;

    for (const [id, layout] of Object.entries(cardLayouts.current)) {
      const cardAbsoluteY = videoSectionY + layout.y;
      const cardCenter = cardAbsoluteY + layout.height / 2;
      const distance = Math.abs(viewportCenter - cardCenter);

      const isVisible =
        cardAbsoluteY + layout.height > scrollY &&
        cardAbsoluteY < scrollY + viewportHeight;

      if (isVisible && distance < minDistance) {
        minDistance = distance;
        closestId = id;
      }
    }

    setActiveVideoId(closestId);
  }, [videoSectionY]);

  // Autoplay the first video on mount / load
  useEffect(() => {
    if (vm.videoPosts.length > 0 && !activeVideoId) {
      setActiveVideoId(vm.videoPosts[0].id);
    }
  }, [vm.videoPosts, activeVideoId]);

  // Reaction picker state — anchored to whichever "Thích" button was
  // long-pressed. Stored at this level (not inside each card) so only one
  // picker can ever be open at a time AND the picker can float above
  // every card without being clipped by the parent ScrollView.
  const [pickerAnchor, setPickerAnchor] = useState<{
    postId: string;
    x: number;
    y: number;
  } | null>(null);

  const handleOpenPicker = useCallback(
    (postId: string, x: number, y: number) => {
      setPickerAnchor({ postId, x, y });
    },
    [],
  );

  const handlePickReaction = useCallback(
    (reaction: ReactionType) => {
      if (!pickerAnchor) return;
      // The picker is shared between video posts and text posts. Look
      // up which list owns the anchored post so we hit the right
      // optimistic-state slice — calling the wrong one would no-op
      // visually (state never matches) and confuse the rollback.
      const isText = vm.textPosts.some(p => p.id === pickerAnchor.postId);
      if (isText) {
        vm.toggleTextPostReaction(pickerAnchor.postId, reaction);
      } else {
        vm.toggleReaction(pickerAnchor.postId, reaction);
      }
      setPickerAnchor(null);
    },
    [pickerAnchor, vm],
  );

  return (
    <SafeAreaView className="flex-1 surface-base">
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <FeedHeader />
      <View className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="pb-24"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
        >
          <FilterTabs />
          <ComposerCard onPress={goToCreatePost} />
          <StoriesRow />
          <GreetingCard />
          <HomeVideoPosts
            posts={vm.videoPosts}
            isLoading={vm.isLoadingVideos}
            error={vm.videoError}
            onReact={vm.toggleReaction}
            onOpenPicker={handleOpenPicker}
            onCommentTap={commentVm.openComments}
            activeVideoId={activeVideoId}
            onReportLayout={handleReportLayout}
            onReportSectionY={handleReportSectionY}
          />
          <TextPostFeed
            posts={vm.textPosts}
            isLoading={vm.isLoadingTextPosts}
            error={vm.textPostsError}
            onReact={vm.toggleTextPostReaction}
            onOpenPicker={handleOpenPicker}
            onCommentTap={commentVm.openComments}
          />
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
      <ReactionPickerOverlay
        anchor={pickerAnchor}
        onPick={handlePickReaction}
        onDismiss={() => setPickerAnchor(null)}
      />
      <ReelCommentsSheet
        visible={commentVm.isCommentsOpen}
        comments={commentVm.comments}
        commentCount={selectedCommentPost?.commentCount ?? commentVm.comments.length}
        isLoading={commentVm.isCommentsLoading}
        isLoadingMore={commentVm.isCommentsLoadingMore}
        isSubmitting={commentVm.isSubmittingComment}
        error={commentVm.commentError}
        repliesById={commentVm.repliesById}
        loadingRepliesIds={commentVm.loadingRepliesIds}
        replyingTo={commentVm.replyingTo}
        onClose={commentVm.closeComments}
        onEndReached={commentVm.loadMoreComments}
        onRetry={handleRetryComments}
        onSubmit={commentVm.submitComment}
        onSubmitReply={commentVm.submitReply}
        onSetReaction={commentVm.setCommentReaction}
        onDelete={commentVm.deleteComment}
        onLoadReplies={commentVm.loadReplies}
        onCollapseReplies={commentVm.collapseReplies}
        onStartReply={commentVm.startReplyTo}
        onCancelReply={commentVm.cancelReply}
        onRetryFailedComment={commentVm.retryFailedComment}
        onDeleteFailedComment={commentVm.deleteFailedComment}
      />
    </SafeAreaView>
  );
}

export default FeedScreen;
