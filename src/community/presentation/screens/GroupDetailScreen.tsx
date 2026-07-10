// Description: Renders a WoWonder-style group profile with composer, filters, and group metadata.
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BarChart3,
  Edit3,
  FileText,
  Globe2,
  Grid3X3,
  Image as ImageIcon,
  Info,
  Music,
  Search,
  Smile,
  Tag,
  Users,
  Video,
} from 'lucide-react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedSourceFilterBar } from '../../../feed/presentation/components/FeedSourceFilterBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import { CreatePostModal } from '../../../feed/presentation/screens/CreatePostScreen';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { sessionStorage } from '../../../shared-kernel/infrastructure/storage/sessionStorage';

type GroupDetailNav = NativeStackNavigationProp<RootStackParamList>;
type GroupDetailRoute = RouteProp<RootStackParamList, typeof ROUTES.GROUP_DETAIL>;
type GroupDetailTab = 'posts' | 'info' | 'photos' | 'videos' | 'music';

const BRAND = '#0000ff';
const FALLBACK_COVER =
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1400&auto=format&fit=crop';

const GROUP_DETAIL_COPY = {
  vi: {
    membersCountSuffix: 'Các thành viên',
    btnEdit: 'Chỉnh sửa',
    btnView: 'Xem nhóm',
    composerPlaceholder: 'Hôm nay bạn thế nào ?',
    actionPhoto: 'Hình ảnh',
    actionVideo: 'Video',
    actionPoll: 'Thăm dò',
    postsEmpty: 'Không có bài đăng nào để hiển thị',
    searchTitle: 'Tìm kiếm các bài viết',
    searchPlaceholder: 'Tìm kiếm bài viết...',
    sectionInfo: 'Thông tin',
    sectionAbout: 'Về',
    noAbout: 'Chưa có mô tả nhóm.',
    membersStats: '+0 Tuần này',
    postsStatsSuffix: 'bài viết',
    fallbackUsername: 'Thành viên',
    privacyPublic: 'Công cộng',
    privacyPrivate: 'Riêng tư',
    categoryOther: 'Khác',
    groupContextMissingTitle: 'Không đăng được',
    groupContextMissingMessage: 'Không tìm thấy nhóm để đăng bài.',
  },
  en: {
    membersCountSuffix: 'Members',
    btnEdit: 'Edit',
    btnView: 'View Group',
    composerPlaceholder: 'What\'s on your mind?',
    actionPhoto: 'Photos',
    actionVideo: 'Videos',
    actionPoll: 'Poll',
    postsEmpty: 'No posts to display',
    searchTitle: 'Search Posts',
    searchPlaceholder: 'Search posts...',
    sectionInfo: 'Information',
    sectionAbout: 'About',
    noAbout: 'No group description yet.',
    membersStats: '+0 This week',
    postsStatsSuffix: 'posts',
    fallbackUsername: 'Member',
    privacyPublic: 'Public',
    privacyPrivate: 'Private',
    categoryOther: 'Other',
    groupContextMissingTitle: 'Cannot post',
    groupContextMissingMessage: 'Group context was not found.',
  }
};

function formatCompact(value?: number) {
  const safeValue = Number(value ?? 0);
  if (safeValue >= 1000000) return `${(safeValue / 1000000).toFixed(1)}M`;
  if (safeValue >= 1000) return `${(safeValue / 1000).toFixed(1)}K`;
  return String(Math.round(safeValue));
}

function GroupAvatar({
  avatar,
  size = 92,
}: {
  avatar?: string;
  size?: number;
}) {
  if (avatar) {
    return (
      <Image
        source={{ uri: avatar }}
        style={{ height: size, width: size, borderRadius: size / 2 }}
        className="border-2 border-white bg-slate-100"
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={{ height: size, width: size, borderRadius: size / 2 }}
      className="items-center justify-center border-2 border-white bg-red-100"
    >
      <Users size={Math.round(size * 0.48)} color="#ff4d4f" />
    </View>
  );
}

function SectionTitle({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <View className="flex-row items-center border-b border-slate-100 px-4 py-3">
      <View className="h-7 w-7 items-center justify-center rounded-full bg-[#0000ff]">
        {icon}
      </View>
      <Text className="ml-2 text-title-primary">{title}</Text>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  right,
}: {
  icon: React.ReactNode;
  label: string;
  right?: string;
}) {
  return (
    <View className="flex-row items-center border-b border-slate-100 px-4 py-2.5">
      <View className="w-7 items-center">{icon}</View>
      <Text className="ml-2 flex-1 text-caption-secondary">{label}</Text>
      {right ? <Text className="text-caption-primary text-green-600">{right}</Text> : null}
    </View>
  );
}

function GroupDetailScreen() {
  const language = useAppLanguage();
  const copy = GROUP_DETAIL_COPY[language] ?? GROUP_DETAIL_COPY.vi;
  const navigation = useNavigation<GroupDetailNav>();
  const route = useRoute<GroupDetailRoute>();
  const group = route.params?.group;
  const profile = sessionStorage.getUserProfile();
  const activeUserAvatar = profile?.avatarUrl;
  const activeUserDisplayName = profile?.name || copy.fallbackUsername;
  const [activeTab, setActiveTab] = useState<GroupDetailTab>('posts');
  const [searchQuery, setSearchQuery] = useState('');
  const [composerModalVisible, setComposerModalVisible] = useState(false);
  const [composerInitialAction, setComposerInitialAction] = useState<'photo' | 'video' | 'product' | 'poll' | undefined>(undefined);
  const groupTitle = group?.groupTitle || group?.groupName || 'Nhóm';
  const groupCover = group?.cover || FALLBACK_COVER;
  const groupAbout = group?.about || copy.noAbout;
  const privacyLabel = group?.privacy === 'private' ? copy.privacyPrivate : copy.privacyPublic;
  const membersCount = group?.members ?? 0;
  const categoryLabel = group?.category || copy.categoryOther;
  const canEdit = Boolean(group?.isOwner);
  const targetGroupId = group?.groupId || group?.id ? String(group?.groupId || group?.id) : undefined;
  const handleCreatePost = useCallback(
    (initialAction?: 'photo' | 'video' | 'poll') => {
      if (!targetGroupId) {
        Alert.alert(copy.groupContextMissingTitle, copy.groupContextMissingMessage);
        return;
      }

      setComposerInitialAction(initialAction);
      setComposerModalVisible(true);
    },
    [copy.groupContextMissingMessage, copy.groupContextMissingTitle, targetGroupId],
  );
  const handleCloseComposer = useCallback(() => {
    setComposerModalVisible(false);
    setComposerInitialAction(undefined);
  }, []);
  const handleComposerCreated = useCallback(() => {
    setComposerInitialAction(undefined);
    setActiveTab('posts');
  }, []);
  const handleEditGroup = useCallback(
    () => {
      if (group) {
        navigation.navigate(ROUTES.EDIT_GROUP, { group });
      }
    },
    [group, navigation],
  );
  const filterItems = useMemo(
    () => [
      {
        key: 'posts' as GroupDetailTab,
        accessibilityLabel: 'Posts',
        icon: (active: boolean) => (
          <FileText size={22} color={active ? '#111827' : '#9ca3af'} strokeWidth={active ? 2.6 : 2} />
        ),
      },
      {
        key: 'info' as GroupDetailTab,
        accessibilityLabel: 'Info',
        icon: (active: boolean) => (
          <Info size={22} color={active ? '#111827' : '#9ca3af'} strokeWidth={active ? 2.6 : 2} />
        ),
      },
      {
        key: 'photos' as GroupDetailTab,
        accessibilityLabel: 'Photos',
        icon: (active: boolean) => (
          <ImageIcon size={22} color="#22c55e" strokeWidth={active ? 2.6 : 2} />
        ),
      },
      {
        key: 'videos' as GroupDetailTab,
        accessibilityLabel: 'Videos',
        icon: (active: boolean) => (
          <Video size={22} color="#3b82f6" strokeWidth={active ? 2.6 : 2} />
        ),
      },
      {
        key: 'music' as GroupDetailTab,
        accessibilityLabel: 'Music',
        icon: (active: boolean) => (
          <Music size={22} color="#f59e0b" strokeWidth={active ? 2.6 : 2} />
        ),
      },
    ],
    [],
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <FeedHeader />

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10"
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-white">
          <Image source={{ uri: groupCover }} className="h-32 w-full bg-slate-200" resizeMode="cover" />
          <View className="items-center px-4 pb-5">
            <View className="-mt-12">
              <GroupAvatar avatar={group?.avatar} />
            </View>
            <Text className="mt-3 text-center text-heading">{groupTitle}</Text>
            <Text className="mt-1 text-center text-caption-secondary">
              {formatCompact(membersCount)} {copy.membersCountSuffix}
            </Text>
            {canEdit ? (
              <TouchableOpacity
                activeOpacity={0.84}
                onPress={handleEditGroup}
                style={{
                  marginTop: 16,
                  minHeight: 36,
                  borderRadius: 18,
                  borderWidth: 1,
                  borderColor: '#CBD5E1',
                  backgroundColor: '#FFFFFF',
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: 20,
                }}
              >
                <Edit3 size={15} color="#475569" />
                <Text className="ml-2 text-caption-primary" style={{ color: '#475569', fontWeight: '700' }}>{copy.btnEdit}</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Post Composer - Aligned, beautifully responsive, and doesn't wrap/break */}
        <View className="mt-3 bg-white px-4 py-4 border-y border-slate-100">
          <View className="flex-row items-center">
            {activeUserAvatar ? (
              <Image
                source={{ uri: activeUserAvatar }}
                className="h-10 w-10 rounded-full bg-slate-100"
              />
            ) : (
              <View className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <Users size={20} color="#94A3B8" />
              </View>
            )}
            <TouchableOpacity activeOpacity={0.84} onPress={() => handleCreatePost()} className="ml-3 flex-1">
              <Text className="text-title-primary" style={{ fontWeight: '700' }}>{activeUserDisplayName}</Text>
              <Text className="mt-0.5 text-caption-secondary">{copy.composerPlaceholder}</Text>
            </TouchableOpacity>
            <Smile size={22} color="#94A3B8" />
          </View>
          <View className="mt-4 flex-row items-center gap-2">
            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => handleCreatePost('photo')}
              style={{
                flex: 1,
                minHeight: 36,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 18,
                backgroundColor: '#F8FAFC',
                borderWidth: 1,
                borderColor: '#F1F5F9',
                paddingHorizontal: 6,
              }}
            >
              <ImageIcon size={15} color="#38bdf8" />
              <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '600', color: '#475569' }} numberOfLines={1}>{copy.actionPhoto}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => handleCreatePost('video')}
              style={{
                flex: 1,
                minHeight: 36,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 18,
                backgroundColor: '#F8FAFC',
                borderWidth: 1,
                borderColor: '#F1F5F9',
                paddingHorizontal: 6,
              }}
            >
              <Video size={15} color="#22c55e" />
              <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '600', color: '#475569' }} numberOfLines={1}>{copy.actionVideo}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.84}
              onPress={() => handleCreatePost('poll')}
              style={{
                flex: 1,
                minHeight: 36,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 18,
                backgroundColor: '#F8FAFC',
                borderWidth: 1,
                borderColor: '#F1F5F9',
                paddingHorizontal: 6,
              }}
            >
              <BarChart3 size={15} color="#14b8a6" />
              <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '600', color: '#475569' }} numberOfLines={1}>{copy.actionPoll}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <FeedSourceFilterBar
          activeKey={activeTab}
          items={filterItems}
          onChange={setActiveTab}
        />

        <View className="border-y border-blue-50 bg-white py-12">
          <View className="items-center justify-center">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <Grid3X3 size={28} color="#94A3B8" />
            </View>
            <Text className="mt-4 text-center text-body-secondary" style={{ color: '#64748B' }}>
              {copy.postsEmpty}
            </Text>
          </View>
        </View>

        <View className="bg-white px-4 py-4 border-y border-slate-100">
          <Text className="mb-2 text-title-primary" style={{ fontWeight: '700' }}>{copy.searchTitle}</Text>
          <View className="min-h-[44px] flex-row items-center border border-slate-200 rounded-xl px-3 bg-slate-50">
            <Search size={17} color="#94A3B8" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="ml-2 flex-1 text-body-primary"
              placeholder={copy.searchPlaceholder}
              placeholderTextColor="#94A3B8"
            />
          </View>
        </View>

        <View className="mt-3 bg-white">
          <SectionTitle icon={<Info size={14} color="#FFFFFF" />} title={copy.sectionInfo} />
          <InfoRow
            icon={<Users size={17} color="#64748B" />}
            label={`${formatCompact(membersCount)} ${copy.membersCountSuffix}`}
            right={copy.membersStats}
          />
          <InfoRow icon={<Globe2 size={17} color="#64748B" />} label={privacyLabel} />
          <InfoRow icon={<Tag size={17} color="#64748B" />} label={categoryLabel} />
          <InfoRow icon={<FileText size={17} color="#64748B" />} label={`0 ${copy.postsStatsSuffix}`} />
        </View>

        <View className="mt-3 bg-white">
          <SectionTitle icon={<FileText size={14} color="#FFFFFF" />} title={copy.sectionAbout} />
          <Text className="px-4 py-4 text-body-secondary">{groupAbout}</Text>
        </View>
      </ScrollView>

      <CreatePostModal
        visible={composerModalVisible}
        onClose={handleCloseComposer}
        onCreated={handleComposerCreated}
        groupId={targetGroupId}
        initialAction={composerInitialAction}
      />
    </View>
  );
}

export default GroupDetailScreen;
