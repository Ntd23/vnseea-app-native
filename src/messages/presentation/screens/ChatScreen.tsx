// Description: Renders a Messages chat conversation with media, voice notes, and LiveKit call actions.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  UIManager,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FileText,
  ImagePlus,
  Info,
  Link as LinkIcon,
  LogOut,
  Mic,
  Pencil,
  Phone,
  PhoneMissed,
  Play,
  Send,
  Square,
  Trash2,
  UserMinus,
  UserPlus,
  Video,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  launchImageLibrary,
  type MediaType,
} from 'react-native-image-picker';
import VideoPlayer from 'react-native-video';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { useChatViewModel } from '../../application/view-models/useChatViewModel';
import { useGroupLiveKitCallSession } from '../../application/view-models/useGroupLiveKitCallSession';
import { useLiveKitCallSession } from '../../application/view-models/useLiveKitCallSession';
import type {
  GroupAddableUser,
  GroupChatInfo,
  GroupChatMember,
  GroupSharedAssets,
  MessageAttachment,
  MessageItem,
} from '../../domain/types/messages.types';
import { AudioPlayer } from '../../../shared-kernel/presentation/components/AudioPlayer';
import { useAudioRecorder } from '../../../shared-kernel/application/hooks/useAudioRecorder';
import { formatAudioDuration } from '../../../shared-kernel/application/utils/audioFiles';

type ChatScreenProps = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.CHAT
>;

type ChatMediaViewerItem = {
  uri: string;
  type: 'image' | 'video';
};

type OpenChatMedia = (
  media: ChatMediaViewerItem,
  mediaItems?: ChatMediaViewerItem[],
) => void;

const MAX_MEDIA_ATTACHMENTS = 10;
const IMAGE_GROUP_WINDOW_SECONDS = 120;
const IMAGE_GALLERY_WIDTH = 268;
const IMAGE_GALLERY_GAP = 3;
const IMAGE_GALLERY_TILE_SIZE = (IMAGE_GALLERY_WIDTH - IMAGE_GALLERY_GAP) / 2;

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Format time
function formatMessageTime(timestamp: number) {
  if (!timestamp) return '';
  return new Date(timestamp * 1000).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format date separator
function formatDateSeparator(timestamp: number): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const messageDate = new Date(timestamp * 1000);
  messageDate.setHours(0, 0, 0, 0);
  const diffDays = Math.floor((today.getTime() - messageDate.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  return messageDate.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
}

function buildMessageListItems(messages: MessageItem[]): ChatMessageListItem[] {
  const items: ChatMessageListItem[] = [];

  for (let index = 0; index < messages.length; ) {
    const message = messages[index];
    if (!isImageMessage(message)) {
      items.push({ kind: 'message', id: message.id, message });
      index += 1;
      continue;
    }

    const group = [message];
    let nextIndex = index + 1;
    while (nextIndex < messages.length) {
      const nextMessage = messages[nextIndex];
      const previousMessage = group[group.length - 1];
      const isNearPrevious =
        Math.abs(previousMessage.time - nextMessage.time) <=
        IMAGE_GROUP_WINDOW_SECONDS;

      if (
        !isImageMessage(nextMessage) ||
        nextMessage.isSentByMe !== message.isSentByMe ||
        !isNearPrevious
      ) {
        break;
      }

      group.push(nextMessage);
      nextIndex += 1;
    }

    items.push(
      group.length > 1
        ? {
            kind: 'image-group',
            id: `image-group-${group.map(item => item.id).join('-')}`,
            messages: group,
          }
        : { kind: 'message', id: message.id, message },
    );
    index = nextIndex;
  }

  return items;
}

function assetToAttachment(asset: Asset): MessageAttachment | undefined {
  if (!asset.uri) return undefined;

  const isVideo =
    asset.type?.startsWith('video/') ||
    /\.(mp4|mov|webm|m4v)$/i.test(asset.fileName ?? '');
  const uri =
    Platform.OS === 'android' && !/^[a-z][a-z0-9+.-]*:\/\//i.test(asset.uri)
      ? `file://${asset.uri}`
      : asset.uri;

  return {
    uri,
    name: asset.fileName ?? `chat-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
    type: asset.type ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
    mediaType: isVideo ? 'video' : 'image',
  };
}

function formatCallDuration(duration: number) {
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = duration % 60;
  const parts: string[] = [];

  if (hours > 0) parts.push(`${hours} giờ`);
  if (minutes > 0) parts.push(`${minutes} phút`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} giây`);

  return parts.join(' ');
}

function getCallDetail(message: MessageItem) {
  const callEvent = message.callEvent!;
  const { status, statusBy, initiatorId, receiverId, isInitiator, isReceiver } =
    callEvent;

  if (status === 'calling') {
    return isInitiator ? 'Đang gọi...' : 'Cuộc gọi đến';
  }

  if (status === 'started') {
    if (!callEvent.isGroupCall) return 'Đang gọi...';
    return isInitiator ? 'Bạn đã bắt đầu' : 'Cuộc gọi đã bắt đầu';
  }

  if (status === 'left') {
    return 'Đã rời cuộc gọi';
  }

  if (status === 'cancelled') {
    if (statusBy === initiatorId) {
      return isInitiator ? 'Bạn đã hủy cuộc gọi' : 'Người gọi đã hủy cuộc gọi';
    }

    return 'Cuộc gọi đã bị hủy';
  }

  if (status === 'declined') {
    if (statusBy === receiverId) {
      return isReceiver ? 'Bạn đã từ chối' : 'Người nhận đã từ chối';
    }

    if (statusBy === initiatorId) {
      return isInitiator ? 'Bạn đã hủy cuộc gọi' : 'Người gọi đã hủy cuộc gọi';
    }

    return 'Cuộc gọi đã bị từ chối';
  }

  if (status === 'missed' || status === 'no_answer') {
    return isInitiator ? 'Không trả lời' : 'Cuộc gọi nhỡ';
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  if (!name) return null;

  return (
    <View className="flex-row items-center px-4 py-2">
      <Image source={{ uri: avatar }} className="mr-2 h-7 w-7 rounded-full" />
      <View className="rounded-2xl bg-[#E4E6F0] px-4 py-3">
        <Text className="text-sm text-gray-600">
          {name} đang nhắn{dots}
        </Text>
      </View>
    </View>
  );
}

function getCallTitle(callEvent: MessageItem['callEvent']) {
  if (!callEvent) return 'Cuộc gọi';
  if (callEvent.callType === 'video') {
    return callEvent.isGroupCall ? 'Cuộc gọi video nhóm' : 'Cuộc gọi video';
  }
  return callEvent.isGroupCall ? 'Cuộc gọi thoại nhóm' : 'Cuộc gọi thoại';
}

function CallEventContent({ message }: { message: MessageItem }) {
  const callEvent = message.callEvent!;
  const hasErrorStatus = [
    'cancelled',
    'declined',
    'missed',
    'no_answer',
    'busy',
  ].includes(callEvent.status);
  const Icon =
    hasErrorStatus && callEvent.callType === 'audio'
      ? PhoneMissed
      : callEvent.callType === 'video'
      ? Video
      : Phone;
  const iconColor = message.isSentByMe
    ? '#ffffff'
    : hasErrorStatus
    ? '#dc2626'
    : '#2563eb';

  return (
    <View className="flex-row items-center">
      <View
        className={`mr-2 h-10 w-10 items-center justify-center rounded-full ${
          message.isSentByMe
            ? 'bg-white/20'
            : hasErrorStatus
            ? 'bg-red-100'
            : 'bg-blue-100'
        }`}
      >
        <Icon size={19} color={iconColor} />
      </View>
      <View className="shrink">
        <Text
          className={`text-sm font-bold ${
            message.isSentByMe ? 'text-white' : 'text-gray-900'
          }`}
        >
          {getCallTitle(callEvent)}
        </Text>
        <Text
          className={`mt-0.5 text-xs ${
            message.isSentByMe
              ? 'text-blue-100'
              : hasErrorStatus
              ? 'text-red-600'
              : 'text-gray-500'
          }`}
        >
          {getCallDetail(message)}
        </Text>
      </View>
    </View>
  );
}

// Message Bubble
function MessageBubble({
  message,
  avatar,
  onOpenMedia,
}: {
  message: MessageItem;
  avatar: string;
  onOpenMedia: OpenChatMedia;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const isMediaOnly = !message.callEvent && !message.message && (
    message.mediaType === 'image' || message.mediaType === 'video' || message.mediaType === 'audio');

  const bubbleBg = message.isSentByMe ? 'bg-[#0084FF]' : 'bg-[#F0F2F5]';
  const textColor = message.isSentByMe ? 'text-white' : 'text-gray-900';
  const subTextColor = message.isSentByMe ? 'text-blue-100' : 'text-gray-500';
  const borderRadius = isMediaOnly ? 'rounded-2xl' : message.isSentByMe ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md';

  return (
    <Animated.View
      style={{
        flexDirection: 'row',
        marginBottom: 6,
        paddingHorizontal: 12,
        justifyContent: message.isSentByMe ? 'flex-end' : 'flex-start',
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {!message.isSentByMe && (
        <Image source={{ uri: avatar }} className="mr-2 h-8 w-8 rounded-full" />
      )}
      <TouchableOpacity
        activeOpacity={0.9}
        className={`max-w-[75%] ${bubbleBg} ${borderRadius} px-3 py-2 ${message.deliveryState === 'sending' ? 'opacity-80' : ''}`}
      >
        {message.callEvent && <CallEventContent message={message} />}

function ImageMessageGroup({
  messages,
  avatar,
  onOpenMedia,
}: {
  messages: MessageItem[];
  avatar: string;
  onOpenMedia: OpenChatMedia;
}) {
  const orderedMessages = [...messages].reverse();
  const visibleMessages = orderedMessages.slice(0, 4);
  const hiddenCount = Math.max(
    0,
    orderedMessages.length - visibleMessages.length,
  );
  const newestMessage = messages[0];
  const viewerItems = orderedMessages.map(message => ({
    uri: message.media!,
    type: 'image' as const,
  }));
  const captions = orderedMessages
    .map(message => message.message.trim())
    .filter(Boolean);
  const deliveryState = messages.find(
    message => message.deliveryState,
  )?.deliveryState;

  return (
    <View
      className={`mb-2 flex-row px-3 ${
        newestMessage.isSentByMe ? 'justify-end' : 'justify-start'
      } ${deliveryState === 'sending' ? 'opacity-70' : ''}`}
    >
      {!newestMessage.isSentByMe && (
        <Image
          source={{ uri: avatar }}
          className="mr-2 mt-1 h-7 w-7 rounded-full bg-gray-200"
        />
      )}
      <View style={styles.imageGalleryBody}>
        <View style={styles.imageGallery}>
          {visibleMessages.map((message, index) => (
            <TouchableOpacity
              key={message.id}
              activeOpacity={0.9}
              onPress={() => {
                onOpenMedia(
                  { uri: message.media!, type: 'image' },
                  viewerItems,
                );
              }}
              style={styles.imageGalleryTile}
            >
              <Image
                source={{ uri: message.media }}
                style={styles.imageGalleryImage}
                resizeMode="cover"
              />
              {hiddenCount > 0 && index === visibleMessages.length - 1 ? (
                <View style={styles.imageGalleryMore}>
                  <Text className="text-2xl font-bold text-white">
                    +{hiddenCount}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
        {captions.length > 0 ? (
          <Text className="mt-1 text-[15px] leading-5 text-gray-900">
            {captions.join('\n')}
          </Text>
        ) : null}
        <Text className="mt-1 text-right text-[10px] text-gray-500">
          {deliveryState === 'sending'
            ? 'Đang gửi...'
            : deliveryState === 'failed'
            ? 'Gửi thất bại'
            : formatMessageTime(newestMessage.time)}
        </Text>
      </View>
    </View>
  );
}

        {message.mediaType === 'audio' && (
          <View className="w-64">
            <AudioPlayer uri={message.media!} compact accentColor={message.isSentByMe ? '#fff' : '#0084FF'} />
          </View>
        )}

  return (
    <View
      className={`mb-2 flex-row px-3 ${
        message.isSentByMe ? 'justify-end' : 'justify-start'
      }`}
    >
      {!message.isSentByMe && (
        <Image
          source={{ uri: avatar }}
          className="mr-2 mt-1 h-7 w-7 rounded-full bg-gray-200"
        />
      )}
      <View
        className={`max-w-[78%] ${
          isMediaOnly
            ? ''
            : message.isSentByMe
            ? 'rounded-2xl rounded-br-md bg-blue-600 px-3 py-2'
            : 'rounded-2xl rounded-bl-md bg-gray-100 px-3 py-2'
        } ${message.deliveryState === 'sending' ? 'opacity-70' : ''}`}
      >
        {message.callEvent ? (
          <CallEventContent message={message} />
        ) : (
          <>
            <MessageMedia message={message} onOpenMedia={onOpenMedia} />
            {!!message.message && (
              <Text
                className={`text-[15px] leading-5 ${
                  message.isSentByMe ? 'text-white' : 'text-gray-900'
                }`}
              >
                {message.message}
              </Text>
            )}
          </>
        )}
        <Text
          className={`mt-1 text-right text-[10px] ${
            message.deliveryState === 'failed'
              ? isMediaOnly
                ? 'text-red-600'
                : 'text-red-100'
              : isMediaOnly
              ? 'text-gray-500'
              : message.isSentByMe
              ? 'text-blue-100'
              : 'text-gray-500'
          }`}
        >
          {message.deliveryState === 'sending'
            ? 'Đang gửi...'
            : message.deliveryState === 'failed'
            ? 'Gửi thất bại'
            : formatMessageTime(message.time)}
        </Text>
      </View>
    </View>
  );
}

type GroupInfoSection = 'members' | 'media' | 'files' | 'links';

function SectionHeader({
  title,
  isOpen,
  onPress,
}: {
  title: string;
  isOpen: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center justify-between border-t border-gray-100 px-5 py-4"
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Text className="text-base font-bold text-gray-950">{title}</Text>
      <ChevronDown
        size={20}
        color="#111827"
        style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}
      />
    </TouchableOpacity>
  );
}

function GroupMemberRow({
  member,
  canRemove,
  onRemove,
}: {
  member: GroupChatMember;
  canRemove: boolean;
  onRemove: (member: GroupChatMember) => void;
}) {
  return (
    <View className="flex-row items-center px-5 py-2">
      <Image
        source={{ uri: member.avatar }}
        className="h-10 w-10 rounded-full bg-gray-200"
      />
      <View className="ml-3 flex-1">
        <Text className="text-sm font-semibold text-gray-900">
          {member.name}
        </Text>
        <Text className="text-xs text-gray-500">
          {member.isOwner
            ? 'Chủ nhóm'
            : member.isAdmin
            ? 'Admin'
            : `@${member.username}`}
        </Text>
      </View>
      {canRemove ? (
        <TouchableOpacity
          className="h-9 w-9 items-center justify-center rounded-full bg-red-50"
          activeOpacity={0.8}
          onPress={() => onRemove(member)}
        >
          <UserMinus size={18} color="#dc2626" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function AddableUserRow({
  user,
  selected,
  onToggle,
}: {
  user: GroupAddableUser;
  selected: boolean;
  onToggle: (user: GroupAddableUser) => void;
}) {
  return (
    <TouchableOpacity
      className="flex-row items-center px-5 py-2"
      activeOpacity={0.8}
      onPress={() => onToggle(user)}
    >
      <Image
        source={{ uri: user.avatar }}
        className="h-10 w-10 rounded-full bg-gray-200"
      />
      <View className="ml-3 flex-1">
        <Text className="text-sm font-semibold text-gray-900">{user.name}</Text>
        <Text className="text-xs text-gray-500">@{user.username}</Text>
      </View>
      <View
        className={`h-7 w-7 items-center justify-center rounded-full ${
          selected ? 'bg-blue-600' : 'border border-gray-300 bg-white'
        }`}
      >
        {selected ? <Check size={16} color="#ffffff" /> : null}
      </View>
    </TouchableOpacity>
  );
}

function GroupInfoModal({
  visible,
  groupInfo,
  assets,
  addableUsers,
  selectedAddableIds,
  addableQuery,
  editName,
  isLoading,
  isLoadingAddableUsers,
  expandedSections,
  onClose,
  onToggleSection,
  onChangeAddableQuery,
  onSearchAddableUsers,
  onToggleAddableUser,
  onSubmitAddUsers,
  onChangeEditName,
  onPickAvatar,
  onSaveGroup,
  onClearHistory,
  onLeaveGroup,
  onRemoveMember,
}: {
  visible: boolean;
  groupInfo: GroupChatInfo | null;
  assets: GroupSharedAssets | null;
  addableUsers: GroupAddableUser[];
  selectedAddableIds: Set<string>;
  addableQuery: string;
  editName: string;
  isLoading: boolean;
  isLoadingAddableUsers: boolean;
  expandedSections: Set<GroupInfoSection>;
  onClose: () => void;
  onToggleSection: (section: GroupInfoSection) => void;
  onChangeAddableQuery: (value: string) => void;
  onSearchAddableUsers: () => void;
  onToggleAddableUser: (user: GroupAddableUser) => void;
  onSubmitAddUsers: () => void;
  onChangeEditName: (value: string) => void;
  onPickAvatar: () => void;
  onSaveGroup: () => void;
  onClearHistory: () => void;
  onLeaveGroup: () => void;
  onRemoveMember: (member: GroupChatMember) => void;
}) {
  const isMembersOpen = expandedSections.has('members');
  const isMediaOpen = expandedSections.has('media');
  const isFilesOpen = expandedSections.has('files');
  const isLinksOpen = expandedSections.has('links');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        <View className="flex-row items-center justify-between border-b border-gray-100 px-5 py-4">
          <Text className="text-lg font-bold text-gray-950">Thông tin</Text>
          <TouchableOpacity
            className="h-9 w-9 items-center justify-center rounded-full bg-gray-100"
            activeOpacity={0.8}
            onPress={onClose}
          >
            <X size={20} color="#111827" />
          </TouchableOpacity>
        </View>

        {isLoading && !groupInfo ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="items-center px-5 py-6">
              <Image
                source={{ uri: groupInfo?.avatar }}
                className="h-24 w-24 rounded-full bg-red-100"
              />
              <View className="mt-4 flex-row items-center">
                <Text className="text-2xl font-bold text-gray-950">
                  {groupInfo?.name ?? 'Nhóm'}
                </Text>
                {groupInfo?.isOwner ? (
                  <TouchableOpacity
                    className="ml-2 h-9 w-9 items-center justify-center rounded-full bg-gray-100"
                    activeOpacity={0.8}
                    onPress={onPickAvatar}
                  >
                    <Pencil size={17} color="#475569" />
                  </TouchableOpacity>
                ) : null}
              </View>
              <Text className="mt-1 text-sm text-gray-500">
                {groupInfo?.memberCount ?? 0} thành viên
              </Text>

              {groupInfo?.isOwner ? (
                <View className="mt-4 w-full">
                  <TextInput
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-base text-gray-900"
                    placeholder="Tên nhóm"
                    placeholderTextColor="#94a3b8"
                    value={editName}
                    onChangeText={onChangeEditName}
                  />
                  <TouchableOpacity
                    className="mt-3 rounded-2xl bg-blue-600 py-3"
                    activeOpacity={0.85}
                    onPress={onSaveGroup}
                  >
                    <Text className="text-center text-base font-bold text-white">
                      Lưu thay đổi
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>

            {groupInfo?.isOwner ? (
              <View className="border-t border-gray-100 px-5 py-4">
                <View className="flex-row items-center">
                  <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-50">
                    <UserPlus size={20} color="#0000ff" />
                  </View>
                  <Text className="ml-3 text-base font-semibold text-gray-900">
                    Thêm thành viên
                  </Text>
                </View>
                <View className="mt-3 flex-row">
                  <TextInput
                    className="mr-2 flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-sm text-gray-900"
                    placeholder="Tìm thành viên"
                    placeholderTextColor="#94a3b8"
                    value={addableQuery}
                    onChangeText={onChangeAddableQuery}
                    onSubmitEditing={onSearchAddableUsers}
                  />
                  <TouchableOpacity
                    className="h-12 w-12 items-center justify-center rounded-2xl bg-blue-600"
                    activeOpacity={0.85}
                    onPress={onSearchAddableUsers}
                  >
                    {isLoadingAddableUsers ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <UserPlus size={19} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                </View>
                {addableUsers.map(user => (
                  <AddableUserRow
                    key={user.id}
                    user={user}
                    selected={selectedAddableIds.has(user.id)}
                    onToggle={onToggleAddableUser}
                  />
                ))}
                {!isLoadingAddableUsers && addableUsers.length === 0 ? (
                  <Text className="mt-3 rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
                    Chua co goi y. Nguoi dung da follow qua lai va chua o trong
                    nhom se hien o day.
                  </Text>
                ) : null}
                {selectedAddableIds.size > 0 ? (
                  <TouchableOpacity
                    className="mt-2 rounded-2xl bg-blue-600 py-3"
                    activeOpacity={0.85}
                    onPress={onSubmitAddUsers}
                  >
                    <Text className="text-center text-sm font-bold text-white">
                      Thêm {selectedAddableIds.size} người
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            <SectionHeader
              title="Thành viên nhóm"
              isOpen={isMembersOpen}
              onPress={() => onToggleSection('members')}
            />
            {isMembersOpen ? (
              <View className="pb-3">
                {(groupInfo?.members ?? []).map(member => (
                  <GroupMemberRow
                    key={member.id}
                    member={member}
                    canRemove={
                      Boolean(groupInfo?.isOwner) &&
                      !member.isOwner &&
                      member.id !== groupInfo?.ownerId
                    }
                    onRemove={onRemoveMember}
                  />
                ))}
              </View>
            ) : null}

            <SectionHeader
              title="Ảnh/Video"
              isOpen={isMediaOpen}
              onPress={() => onToggleSection('media')}
            />
            {isMediaOpen ? (
              <View className="flex-row flex-wrap px-5 pb-4">
                {(assets?.media ?? []).length === 0 ? (
                  <Text className="py-3 text-sm text-gray-500">
                    Chưa có Ảnh/Video được chia sẻ trong hội thoại này
                  </Text>
                ) : (
                  assets!.media.map(item => (
                    <Image
                      key={item.id}
                      source={{ uri: item.uri }}
                      className="mr-2 mt-2 h-20 w-20 rounded-xl bg-gray-100"
                    />
                  ))
                )}
              </View>
            ) : null}

            <SectionHeader
              title="File"
              isOpen={isFilesOpen}
              onPress={() => onToggleSection('files')}
            />
            {isFilesOpen ? (
              <View className="px-5 pb-4">
                {(assets?.files ?? []).length === 0 ? (
                  <Text className="py-3 text-sm text-gray-500">
                    Chưa có File được chia sẻ trong hội thoại này
                  </Text>
                ) : (
                  assets!.files.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      className="flex-row items-center py-2"
                      activeOpacity={0.8}
                      onPress={() =>
                        Linking.openURL(item.uri).catch(() => undefined)
                      }
                    >
                      <FileText size={18} color="#0000ff" />
                      <Text className="ml-2 flex-1 text-sm font-semibold text-gray-900">
                        {item.name}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : null}

            <SectionHeader
              title="Link"
              isOpen={isLinksOpen}
              onPress={() => onToggleSection('links')}
            />
            {isLinksOpen ? (
              <View className="px-5 pb-4">
                {(assets?.links ?? []).length === 0 ? (
                  <Text className="py-3 text-sm text-gray-500">
                    Chưa có Link được chia sẻ trong hội thoại này
                  </Text>
                ) : (
                  assets!.links.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      className="flex-row items-center py-2"
                      activeOpacity={0.8}
                      onPress={() =>
                        Linking.openURL(item.url).catch(() => undefined)
                      }
                    >
                      <LinkIcon size={18} color="#0000ff" />
                      <Text className="ml-2 flex-1 text-sm font-semibold text-blue-700">
                        {item.title}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            ) : null}

            <View className="mt-2 border-t border-gray-100 px-5 py-4">
              <TouchableOpacity
                className="flex-row items-center py-3"
                activeOpacity={0.8}
                onPress={onClearHistory}
              >
                <Trash2 size={19} color="#111827" />
                <Text className="ml-3 text-base text-gray-950">
                  Xóa lịch sử trò chuyện
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center py-3"
                activeOpacity={0.8}
                onPress={onLeaveGroup}
              >
                <LogOut size={19} color="#dc2626" />
                <Text className="ml-3 text-base text-red-600">Rời nhóm</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

function ChatScreen({ navigation, route }: ChatScreenProps) {
  const { chat } = route.params;
  const {
    messages,
    groupInfo,
    groupSharedAssets,
    addableUsers,
    isLoading,
    isLoadingGroupInfo,
    isLoadingAddableUsers,
    isLoadingMore,
    isRefreshing,
    error,
    loadInitial,
    loadOlder,
    refreshLatest,
    sendMessage,
    loadGroupInfo,
    searchAddableUsers,
    addGroupUsers,
    removeGroupUser,
    clearGroupHistory,
    leaveGroup,
    editGroup,
  } = useChatViewModel(chat);

  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [isGroupInfoVisible, setIsGroupInfoVisible] = useState(false);
  const [expandedGroupInfoSections, setExpandedGroupInfoSections] = useState<
    Set<GroupInfoSection>
  >(new Set(['members', 'media', 'files', 'links']));
  const [addableQuery, setAddableQuery] = useState('');
  const [selectedAddableIds, setSelectedAddableIds] = useState<Set<string>>(
    new Set(),
  );
  const [editGroupName, setEditGroupName] = useState(chat.name);
  const [editGroupAvatar, setEditGroupAvatar] = useState<
    MessageAttachment | undefined
  >(undefined);
  const [viewerMediaItems, setViewerMediaItems] = useState<
    ChatMediaViewerItem[]
  >([]);
  const [viewerMediaIndex, setViewerMediaIndex] = useState(0);
  const [isViewerMuted, setIsViewerMuted] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const recorder = useAudioRecorder();
  const messageItems = useMemo(
    () => buildMessageListItems(messages),
    [messages],
  );
  const viewerMedia = viewerMediaItems[viewerMediaIndex];

  // Keyboard listeners
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardWillShow', () => {
      setIsKeyboardVisible(true);
      // Only scroll if user was at bottom
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSub = Keyboard.addListener('keyboardWillHide', () => {
      setIsKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Group messages by date (reversed for inverted FlatList)
  const groupedData = useMemo(() => {
    const items: (MessageItem | { type: 'date'; time: number })[] = [];
    let lastDate = '';

    // Sort messages oldest first, newest last
    const sortedMessages = [...messages].sort((a, b) => a.time - b.time);

    sortedMessages.forEach(msg => {
      const msgDate = new Date(msg.time * 1000).toDateString();
      if (msgDate !== lastDate) {
        lastDate = msgDate;
        items.push({ type: 'date', time: msg.time });
      }
      items.push(msg);
    });

    return items;
  }, [messages]);

  // Auto scroll to bottom when new messages arrive (only if at bottom or keyboard visible)
  useEffect(() => {
    if (messages.length > 0 && (isAtBottom || isKeyboardVisible)) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
        setShowJumpToLatest(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [messages.length, isAtBottom, isKeyboardVisible]);

  useEffect(() => {
    const latestMessageId = messages[0]?.id;

    if (
      previousLatestMessageIdRef.current &&
      latestMessageId &&
      latestMessageId !== previousLatestMessageIdRef.current &&
      !isAtBottom &&
      !isKeyboardVisible
    ) {
      setShowJumpToLatest(true);
    }

    if (isAtBottom || isKeyboardVisible) {
      setShowJumpToLatest(false);
    }

    previousLatestMessageIdRef.current = latestMessageId;
  }, [isAtBottom, isKeyboardVisible, messages]);

  // Track scroll position
  const handleScroll = useCallback((event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isAtBottomNow = layoutMeasurement.height + contentOffset.y >= contentSize.height - 50;
    if (isAtBottom !== isAtBottomNow) {
      setIsAtBottom(isAtBottomNow);
    }

    if (contentOffset.y <= 80 && !isLoadingMore && hasMore) {
      loadOlder().catch(() => undefined);
    }
  }, [hasMore, isAtBottom, isLoadingMore, loadOlder]);

  const handleOpenMedia = useCallback<OpenChatMedia>((media, mediaItems = [media]) => {
    const items = mediaItems.length > 0 ? mediaItems : [media];
    const index = items.findIndex(item => item.uri === media.uri);
    setViewerMediaItems(items);
    setViewerMediaIndex(Math.max(0, index));
    setIsViewerMuted(false);
  }, []);

  const handleCloseMedia = useCallback(() => {
    setViewerMediaItems([]);
    setViewerMediaIndex(0);
  }, []);

  const handleSend = useCallback(async () => {
    if (!text.trim() && attachments.length === 0) return;

    // Animate send button
    Animated.sequence([
      Animated.timing(sendAnim, { toValue: 0.8, duration: 50, useNativeDriver: true }),
      Animated.spring(sendAnim, { toValue: 1, friction: 3, useNativeDriver: true }),
    ]).start();

    const nextText = text;
    const nextAttachments = attachments;
    setText('');
    setAttachments([]);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    if (nextAttachments.length === 0) {
      await sendMessage(nextText);
    } else {
      for (const [index, attachment] of nextAttachments.entries()) {
        await sendMessage(index === 0 ? nextText : '', attachment);
      }
    }
  }, [attachments, sendMessage, text, sendAnim]);

  const handlePickMedia = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'mixed' as MediaType,
      selectionLimit: MAX_MEDIA_ATTACHMENTS,
      quality: 0.8,
    });

    if (result.didCancel || result.errorCode) return;

    const selected: MessageAttachment[] = [];
    for (const asset of result.assets ?? []) {
      if (!asset.uri) continue;
      const isVideo = asset.type?.startsWith('video/') || /\.(mp4|mov|webm|m4v)$/i.test(asset.fileName ?? '');
      const uri = Platform.OS === 'android' && !/^[a-z][a-z0-9+.-]*:\/\//i.test(asset.uri) ? `file://${asset.uri}` : asset.uri;
      selected.push({
        uri,
        name: asset.fileName ?? `chat-${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
        type: asset.type ?? (isVideo ? 'video/mp4' : 'image/jpeg'),
        mediaType: isVideo ? 'video' : 'image',
      });
    }

    if (selected.length > 0) {
      setAttachments(current => {
        const filtered = current.filter(a => a.mediaType !== 'audio');
        return [...filtered, ...selected].slice(0, MAX_MEDIA_ATTACHMENTS);
      });
    }
  }, []);

  const handleToggleRecording = useCallback(async () => {
    try {
      if (recorder.isRecording) {
        const audio = await recorder.stopRecording();
        if (audio) setAttachments([{ ...audio, mediaType: 'audio' }]);
        return;
      }
      setAttachments([]);
      await recorder.startRecording();
    } catch {
      Alert.alert('Lỗi', 'Không ghi âm được');
    }
  }, [recorder]);

  const { startOutgoingCall } = useLiveKitCallSession();
  const { startGroupCall } = useGroupLiveKitCallSession();

  const groupId = useMemo(() => {
    if (chat.chatType !== 'group') return '';
    return (
      chat.groupId ||
      chat.chatId ||
      chat.userId ||
      chat.id.replace(/^group:/, '')
    );
  }, [chat.chatId, chat.chatType, chat.groupId, chat.id, chat.userId]);

  useEffect(() => {
    if (chat.chatType !== 'group') return;

    loadGroupInfo().catch(() => undefined);
  }, [chat.chatType, loadGroupInfo]);

  const handleStartCall = useCallback(
    (callType: 'audio' | 'video') => {
      const recipientId = chat.participantId || chat.userId || chat.chatId;
      if (!recipientId) {
        Alert.alert('Không gọi được', 'Thiếu mã người nhận cuộc gọi.');
        return;
      }

      const callParams = {
        recipientId,
        callType,
        direction: 'outgoing' as const,
        peer: {
          id: recipientId,
          name: chat.name,
          avatar: chat.avatar,
          username: chat.username,
        },
      };
      startOutgoingCall(callParams);
      navigation.navigate(ROUTES.CALL_ROOM, callParams);
    },
    [
      chat.avatar,
      chat.chatId,
      chat.name,
      chat.participantId,
      chat.userId,
      chat.username,
      navigation,
      startOutgoingCall,
    ],
  );

  const handleStartGroupCall = useCallback(
    (callType: 'audio' | 'video') => {
      if (!groupId) {
        Alert.alert('Không gọi được', 'Thiếu mã nhóm để bắt đầu cuộc gọi.');
        return;
      }
      const callParams = {
        groupId,
        callType,
        direction: 'outgoing' as const,
        groupName: chat.name,
        groupAvatar: chat.avatar,
      };
      startGroupCall(callParams);
      navigation.navigate(ROUTES.GROUP_CALL_ROOM, callParams);
    },
    [chat.avatar, chat.name, groupId, navigation, startGroupCall],
  );

  const handleOpenGroupInfo = useCallback(() => {
    if (chat.chatType !== 'group') return;
    setIsGroupInfoVisible(true);
    setExpandedGroupInfoSections(
      new Set(['members', 'media', 'files', 'links']),
    );
    setSelectedAddableIds(new Set());
    loadGroupInfo()
      .then(info => {
        if (info?.name) setEditGroupName(info.name);
        if (info?.isOwner) {
          setAddableQuery('');
          searchAddableUsers('').catch(() => undefined);
        }
      })
      .catch(() => undefined);
  }, [chat.chatType, loadGroupInfo, searchAddableUsers]);

  const handleToggleGroupInfoSection = useCallback(
    (section: GroupInfoSection) => {
      setExpandedGroupInfoSections(current => {
        const next = new Set(current);
        if (next.has(section)) {
          next.delete(section);
        } else {
          next.add(section);
        }
        return next;
      });
    },
    [],
  );

  const handleSearchAddableUsers = useCallback(() => {
    searchAddableUsers(addableQuery).catch(caught => {
      Alert.alert(
        'Không tìm được thành viên',
        caught instanceof Error ? caught.message : 'Vui lòng thử lại.',
      );
    });
  }, [addableQuery, searchAddableUsers]);

  const handleToggleAddableUser = useCallback((user: GroupAddableUser) => {
    setSelectedAddableIds(current => {
      const next = new Set(current);
      if (next.has(user.id)) {
        next.delete(user.id);
      } else {
        next.add(user.id);
      }
      return next;
    });
  }, []);

  const handleSubmitAddUsers = useCallback(() => {
    const userIds = [...selectedAddableIds];
    addGroupUsers(userIds)
      .then(success => {
        if (success) {
          setSelectedAddableIds(new Set());
          setAddableQuery('');
          searchAddableUsers('').catch(() => undefined);
        }
      })
      .catch(caught => {
        Alert.alert(
          'Không thêm được thành viên',
          caught instanceof Error ? caught.message : 'Vui lòng thử lại.',
        );
      });
  }, [addGroupUsers, searchAddableUsers, selectedAddableIds]);

  const handlePickGroupAvatar = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.8,
      includeBase64: false,
    });
    const asset = result.assets?.[0];
    const attachment = asset ? assetToAttachment(asset) : undefined;
    if (attachment) {
      setEditGroupAvatar({ ...attachment, mediaType: 'image' });
    }
  }, []);

  const handleSaveGroup = useCallback(() => {
    editGroup({
      name: editGroupName.trim() || groupInfo?.name,
      avatar: editGroupAvatar,
    })
      .then(info => {
        if (info) {
          setEditGroupAvatar(undefined);
          setEditGroupName(info.name);
        }
      })
      .catch(caught => {
        Alert.alert(
          'Không lưu được nhóm',
          caught instanceof Error ? caught.message : 'Vui lòng thử lại.',
        );
      });
  }, [editGroup, editGroupAvatar, editGroupName, groupInfo?.name]);

  const handleClearGroupHistory = useCallback(() => {
    Alert.alert('Xóa lịch sử trò chuyện', 'Bạn muốn xóa lịch sử nhóm này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          clearGroupHistory()
            .then(success => {
              if (success) {
                loadInitial().catch(() => undefined);
                loadGroupInfo().catch(() => undefined);
              }
            })
            .catch(caught => {
              Alert.alert(
                'Không xóa được lịch sử',
                caught instanceof Error ? caught.message : 'Vui lòng thử lại.',
              );
            });
        },
      },
    ]);
  }, [clearGroupHistory, loadGroupInfo, loadInitial]);

  const handleLeaveGroup = useCallback(() => {
    Alert.alert('Rời nhóm', 'Bạn sẽ không còn nhận tin nhắn từ nhóm này.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Rời nhóm',
        style: 'destructive',
        onPress: () => {
          leaveGroup()
            .then(success => {
              if (success) {
                setIsGroupInfoVisible(false);
                navigation.goBack();
              }
            })
            .catch(caught => {
              Alert.alert(
                'Không rời được nhóm',
                caught instanceof Error ? caught.message : 'Vui lòng thử lại.',
              );
            });
        },
      },
    ]);
  }, [leaveGroup, navigation]);

  const handleRemoveGroupMember = useCallback(
    (member: GroupChatMember) => {
      Alert.alert('Xóa thành viên', `Xóa ${member.name} khỏi nhóm?`, [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: () => {
            removeGroupUser(member.id).catch(caught => {
              Alert.alert(
                'Không xóa được thành viên',
                caught instanceof Error ? caught.message : 'Vui lòng thử lại.',
              );
            });
          },
        },
      ]);
    },
    [removeGroupUser],
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View className="flex-row items-center border-b border-gray-200 px-3 py-2">
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full" activeOpacity={0.7} onPress={() => navigation.goBack()}>
            <ArrowLeft size={22} color="#050505" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              if (chat.chatType === 'group') {
                // Extract group ID from format "group:123" -> 123
                const groupIdStr = chat.id.replace(/^group:/, '');
                const groupId = parseInt(groupIdStr, 10);
                // Navigate to Group Info screen
                navigation.navigate(ROUTES.GROUP_INFO, {
                  groupId: groupId,
                  groupName: chat.name,
                  avatar: chat.avatar,
                  memberCount: 0, // TODO: pass actual member count
                });
              } else if (chat.chatType === 'user') {
                navigation.navigate(ROUTES.PROFILE, { userId: chat.userId });
              }
            }}
          >
            <Image source={{ uri: chat.avatar }} className="ml-1 h-11 w-11 rounded-full" />
          </TouchableOpacity>
          <Image
            source={{ uri: chat.avatar }}
            className="ml-1 h-10 w-10 rounded-full bg-gray-200"
          />
          <View className="ml-3 flex-1">
            <Text
              className="text-base font-bold text-gray-900"
              numberOfLines={1}
            >
              {chat.name}
            </Text>
            <Text className="text-xs text-gray-500">
              {chat.chatType === 'group'
                ? `${groupInfo?.memberCount ?? ''} thành viên`
                : chat.isOnline
                ? 'Đang hoạt động'
                : `@${chat.username}`}
            </Text>
          </View>
          {chat.chatType === 'user' ? (
            <>
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full"
                activeOpacity={0.75}
                onPress={() => handleStartCall('audio')}
              >
                <Phone size={21} color="#0000ff" />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full"
                activeOpacity={0.75}
                onPress={() => handleStartCall('video')}
              >
                <Video size={22} color="#0000ff" />
              </TouchableOpacity>
            </>
          ) : chat.chatType === 'group' ? (
            <>
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full"
                activeOpacity={0.75}
                onPress={() => handleStartGroupCall('audio')}
              >
                <Phone size={21} color="#0000ff" />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full"
                activeOpacity={0.75}
                onPress={() => handleStartGroupCall('video')}
              >
                <Video size={22} color="#0000ff" />
              </TouchableOpacity>
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full"
                activeOpacity={0.75}
                onPress={handleOpenGroupInfo}
              >
                <Info size={21} color="#0000ff" />
              </TouchableOpacity>
              {groupInfo?.isOwner ? (
                <TouchableOpacity
                  className="h-10 w-10 items-center justify-center rounded-full"
                  activeOpacity={0.75}
                  onPress={handleClearGroupHistory}
                >
                  <Trash2 size={20} color="#ef4444" />
                </TouchableOpacity>
              ) : null}
            </>
          ) : null}
        </View>

        {/* Messages */}
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563eb" />
            <Text className="mt-3 text-sm text-gray-500">
              Đang tải tin nhắn...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={groupedData}
            keyExtractor={(item) => 'type' in item ? `date-${item.time}` : item.id}
            renderItem={({ item }) => {
              if ('type' in item) return <DateSeparator timestamp={item.time} />;
              return <MessageBubble message={item} avatar={chat.avatar} onOpenMedia={handleOpenMedia} />;
            }}
            contentContainerStyle={{ paddingVertical: 12, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
            onScroll={handleScroll}
            scrollEventThrottle={100}
            initialNumToRender={18}
            maxToRenderPerBatch={12}
            windowSize={7}
            removeClippedSubviews={Platform.OS === 'android'}
            ListHeaderComponent={
              isLoadingMore ? (
                <ActivityIndicator
                  className="my-3"
                  size="small"
                  color="#2563eb"
                />
              ) : null
            }
            ListFooterComponent={
              <View className="pb-2">
                {(isTyping || isRecording) && (
                  <TypingIndicator name={chat.name} avatar={chat.avatar} />
                )}
              </View>
            }
            ListEmptyComponent={
              <View className="flex-1 items-center justify-center px-6 py-20">
                <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-gray-100">
                  <MessageCircle size={48} color="#9DA9BE" />
                </View>
                <Text className="text-lg font-semibold text-gray-900">Chào {chat.name}!</Text>
                <Text className="mt-2 text-center text-sm text-gray-500">Gửi tin nhắn để bắt đầu cuộc trò chuyện</Text>
              </View>
            }
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => refreshLatest().catch(() => undefined)} colors={['#0084FF']} tintColor="#0084FF" />}
          />
        )}

        {showJumpToLatest && (
          <TouchableOpacity
            className="absolute bottom-20 self-center rounded-full bg-blue-600 px-4 py-2 shadow-lg"
            activeOpacity={0.85}
            onPress={() => {
              setShowJumpToLatest(false);
              flatListRef.current?.scrollToEnd({ animated: true });
            }}
          >
            <Text className="text-xs font-semibold text-white">Tin nháº¯n má»›i</Text>
          </TouchableOpacity>
        )}

        {/* Error */}
        {!!error && (
          <TouchableOpacity className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-2" activeOpacity={0.8} onPress={() => loadInitial().catch(() => undefined)}>
            <Text className="text-center text-xs text-red-600">{error}</Text>
          </TouchableOpacity>
        )}

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <View className="border-t border-gray-200 bg-white px-3 pt-2">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 12 }}>
              {attachments.map((att, i) => (
                <View key={`${att.uri}-${i}`} className="h-20 w-20 overflow-hidden rounded-xl bg-gray-200">
                  {att.mediaType === 'image' && <Image source={{ uri: att.uri }} className="h-full w-full" resizeMode="cover" />}
                  {att.mediaType === 'video' && (
                    <>
                      <VideoPlayer source={{ uri: att.uri }} style={{ height: '100%', width: '100%' }} resizeMode="cover" paused muted />
                      <View className="absolute inset-0 items-center justify-center bg-black/30"><Play size={16} color="#fff" fill="#fff" /></View>
                    </>
                  )}
                  {att.mediaType === 'audio' && <View className="flex-1 items-center justify-center"><Mic size={20} color="#9DA9BE" /></View>}
                  <TouchableOpacity className="absolute right-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/60" onPress={() => setAttachments(current => current.filter((_, idx) => idx !== i))}>
                    <X size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Input Bar */}
        <View className="flex-row items-end border-t border-gray-200 bg-white px-3 py-2">
          <TouchableOpacity className="mr-2 h-10 w-10 items-center justify-center rounded-full" activeOpacity={0.7} onPress={() => handlePickMedia().catch(() => undefined)}>
            <ImagePlus size={22} color="#9DA9BE" />
          </TouchableOpacity>

          {recorder.isRecording ? (
            <View className="mr-2 h-10 flex-1 flex-row items-center rounded-full bg-red-50 px-4">
              <View className="mr-3 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              <Text className="mr-2 text-sm font-medium text-red-600">Đang ghi âm {formatAudioDuration(recorder.durationMs)}</Text>
              <TouchableOpacity onPress={() => recorder.cancelRecording()}>
                <X size={20} color="#DC2626" />
              </TouchableOpacity>
            </View>
          ) : (
            <TextInput
              className="mr-2 max-h-28 flex-1 rounded-full bg-gray-100 px-4 py-2.5 text-[15px] text-gray-900"
              placeholder="Tin nhắn"
              placeholderTextColor="#9DA9BE"
              multiline
              value={text}
              onChangeText={setText}
            />
          )}

          <TouchableOpacity
            className={`mr-2 h-10 w-10 items-center justify-center rounded-full ${recorder.isRecording ? 'bg-red-100' : 'bg-[#0084FF]/10'}`}
            activeOpacity={0.7}
            onPress={() => handleToggleRecording().catch(() => undefined)}
          >
            {recorder.isRecording ? <Square size={14} color="#DC2626" fill="#DC2626" /> : <Mic size={20} color="#0084FF" />}
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: sendAnim }] }}>
            <TouchableOpacity
              className={`h-10 w-10 items-center justify-center rounded-full ${canSend ? 'bg-[#0084FF]' : 'bg-[#0084FF]/30'}`}
              activeOpacity={0.8}
              disabled={!canSend}
              onPress={() => handleSend().catch(() => undefined)}
            >
              <Send size={18} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
      <GroupInfoModal
        visible={isGroupInfoVisible}
        groupInfo={groupInfo}
        assets={groupSharedAssets}
        addableUsers={addableUsers}
        selectedAddableIds={selectedAddableIds}
        addableQuery={addableQuery}
        editName={editGroupName}
        isLoading={isLoadingGroupInfo}
        isLoadingAddableUsers={isLoadingAddableUsers}
        expandedSections={expandedGroupInfoSections}
        onClose={() => setIsGroupInfoVisible(false)}
        onToggleSection={handleToggleGroupInfoSection}
        onChangeAddableQuery={setAddableQuery}
        onSearchAddableUsers={handleSearchAddableUsers}
        onToggleAddableUser={handleToggleAddableUser}
        onSubmitAddUsers={handleSubmitAddUsers}
        onChangeEditName={setEditGroupName}
        onPickAvatar={handlePickGroupAvatar}
        onSaveGroup={handleSaveGroup}
        onClearHistory={handleClearGroupHistory}
        onLeaveGroup={handleLeaveGroup}
        onRemoveMember={handleRemoveGroupMember}
      />
      <Modal
        visible={Boolean(viewerMedia)}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleCloseMedia}
      >
        <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
          <TouchableOpacity
            className="absolute right-4 top-4 z-10 h-11 w-11 items-center justify-center rounded-full bg-black/60"
            activeOpacity={0.8}
            onPress={handleCloseMedia}
          >
            <X size={23} color="#ffffff" />
          </TouchableOpacity>
          {viewerMediaItems.length > 1 && (
            <View className="absolute left-4 top-4 z-10 rounded-full bg-white/20 px-4 py-2">
              <Text className="text-sm font-semibold text-white">{viewerMediaIndex + 1}/{viewerMediaItems.length}</Text>
            </View>
          )}
          {viewerMedia?.type === 'image' ? (
            <Image source={{ uri: viewerMedia.uri }} className="h-full w-full" resizeMode="contain" />
          ) : viewerMedia?.type === 'video' ? (
            <>
              <VideoPlayer source={{ uri: viewerMedia.uri }} style={styles.viewerVideo} resizeMode="contain" controls paused={false} muted={isViewerMuted} />
              <TouchableOpacity className="absolute bottom-8 right-4 h-12 w-12 items-center justify-center rounded-full bg-white/20" activeOpacity={0.8} onPress={() => setIsViewerMuted(c => !c)}>
                {isViewerMuted ? <VolumeX size={22} color="#fff" /> : <Volume2 size={22} color="#fff" />}
              </TouchableOpacity>
            </>
          ) : null}
          {viewerMediaIndex > 0 && (
            <TouchableOpacity className="absolute left-4 top-1/2 h-14 w-14 items-center justify-center rounded-full bg-white/20 -translate-y-1/2" activeOpacity={0.8} onPress={() => setViewerMediaIndex(i => i - 1)}>
              <ChevronLeft size={28} color="#fff" />
            </TouchableOpacity>
          )}
          {viewerMediaIndex < viewerMediaItems.length - 1 && (
            <TouchableOpacity className="absolute right-4 top-1/2 h-14 w-14 items-center justify-center rounded-full bg-white/20 -translate-y-1/2" activeOpacity={0.8} onPress={() => setViewerMediaIndex(i => i + 1)}>
              <ChevronRight size={28} color="#fff" />
            </TouchableOpacity>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  messageVideo: { height: '100%', width: '100%', backgroundColor: '#000' },
  viewerVideo: { width: '100%', height: '100%', backgroundColor: '#000' },
});

export default ChatScreen;
