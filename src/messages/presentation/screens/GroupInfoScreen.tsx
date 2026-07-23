import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Bell,
  BellOff,
  Camera,
  Check,
  ChevronRight,
  Crown,
  Edit3,
  FileText,
  LogOut,
  Pin,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import {
  launchImageLibrary,
  type MediaType,
} from 'react-native-image-picker';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useAppTheme } from '../../../shared-kernel/application/hooks/useAppTheme';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';
import { subscribeToMessageInvalidations } from '../../infrastructure/realtime/messageRealtimeRuntime';
import type {
  GroupAddableUser,
  GroupChatInfo,
  GroupChatMember,
  MessageAttachment,
} from '../../domain/types/messages.types';
import { ConversationScreenHeader } from '../components/ConversationScreenHeader';

type Props = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.GROUP_INFO
>;

type ActionSheet = 'add' | 'edit' | null;

const repository = createMessagesRepository();
const BRAND = APP_BRAND_COLOR;
const styles = StyleSheet.create({
  darkScreen: { backgroundColor: '#020617' },
  scrollContent: { paddingBottom: 36 },
});

const COPY = {
  vi: {
    title: 'Thông tin nhóm',
    members: (count: number) => `${count} thành viên`,
    search: 'Tìm kiếm',
    mute: 'Tắt thông báo',
    unmute: 'Bật thông báo',
    pinned: 'Tin nhắn đã ghim',
    sharedAssets: 'File phương tiện, liên kết và tệp',
    membersTitle: 'Thành viên',
    addMembers: 'Thêm thành viên',
    editGroup: 'Chỉnh sửa nhóm',
    clearMine: 'Xóa lịch sử với tôi',
    leave: 'Rời nhóm',
    deleteGroup: 'Xóa nhóm',
    groupName: 'Tên nhóm',
    findMembers: 'Tìm người để thêm',
    noCandidates: 'Không tìm thấy người dùng có thể thêm.',
    cancel: 'Hủy',
    save: 'Lưu thay đổi',
    add: (count: number) => `Thêm ${count} người`,
    retry: 'Thử lại',
    loadError: 'Không thể tải thông tin nhóm.',
    clearTitle: 'Xóa lịch sử với tôi?',
    clearMessage:
      'Các tin nhắn hiện tại sẽ chỉ bị ẩn trên tài khoản của bạn. Thành viên khác vẫn xem được.',
    leaveTitle: 'Rời nhóm?',
    leaveMessage: 'Bạn sẽ không còn nhận tin nhắn mới từ nhóm này.',
    deleteTitle: 'Xóa nhóm?',
    deleteMessage:
      'Nhóm và toàn bộ lịch sử sẽ bị xóa với tất cả thành viên.',
    removeTitle: (name: string) => `Xóa ${name} khỏi nhóm?`,
  },
  en: {
    title: 'Group details',
    members: (count: number) => `${count} members`,
    search: 'Search',
    mute: 'Mute notifications',
    unmute: 'Unmute notifications',
    pinned: 'Pinned messages',
    sharedAssets: 'Media, links and files',
    membersTitle: 'Members',
    addMembers: 'Add members',
    editGroup: 'Edit group',
    clearMine: 'Clear history for me',
    leave: 'Leave group',
    deleteGroup: 'Delete group',
    groupName: 'Group name',
    findMembers: 'Find people to add',
    noCandidates: 'No eligible users found.',
    cancel: 'Cancel',
    save: 'Save changes',
    add: (count: number) => `Add ${count} people`,
    retry: 'Try again',
    loadError: 'Unable to load group details.',
    clearTitle: 'Clear history for you?',
    clearMessage:
      'Current messages will only be hidden on your account. Other members can still see them.',
    leaveTitle: 'Leave group?',
    leaveMessage: 'You will no longer receive new messages from this group.',
    deleteTitle: 'Delete group?',
    deleteMessage: 'The group and its history will be deleted for everyone.',
    removeTitle: (name: string) => `Remove ${name} from the group?`,
  },
};

function ActionButton({
  Icon,
  label,
  onPress,
  busy,
}: {
  Icon: LucideIcon;
  label: string;
  onPress: () => void;
  busy?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      className="w-1/4 items-center px-1"
      disabled={busy}
      onPress={onPress}
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-brand/10">
        {busy ? (
          <ActivityIndicator color={BRAND} />
        ) : (
          <Icon size={22} color={BRAND} />
        )}
      </View>
      <Text
        className="mt-2 text-center text-[12px] font-medium text-slate-700 dark:text-slate-200"
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MenuRow({
  Icon,
  label,
  onPress,
  destructive,
  isLast,
}: {
  Icon: LucideIcon;
  label: string;
  onPress: () => void;
  destructive?: boolean;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      className={`min-h-[56px] flex-row items-center px-4 py-3 ${
        isLast ? '' : 'border-b border-slate-200 dark:border-slate-700'
      }`}
      onPress={onPress}
    >
      <Icon size={21} color={destructive ? '#DC2626' : '#475569'} />
      <Text
        className={`ml-3 flex-1 text-[15px] ${
          destructive ? 'text-red-600' : 'text-slate-900 dark:text-white'
        }`}
      >
        {label}
      </Text>
      <ChevronRight size={19} color="#94A3B8" />
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
    <View className="mb-5 px-4">
      <Text className="mb-2 px-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
        {title}
      </Text>
      <View className="surface-card overflow-hidden rounded-lg">{children}</View>
    </View>
  );
}

function MemberRow({
  member,
  canRemove,
  onOpen,
  onRemove,
}: {
  member: GroupChatMember;
  canRemove: boolean;
  onOpen: () => void;
  onRemove: () => void;
}) {
  return (
    <TouchableOpacity
      className="min-h-[62px] flex-row items-center border-b border-slate-100 px-4 py-2 dark:border-slate-700"
      onPress={onOpen}
    >
      <View className="relative">
        <Image
          source={{ uri: member.avatar }}
          className="h-11 w-11 rounded-full bg-slate-200"
        />
        {member.isOnline ? (
          <View className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
        ) : null}
      </View>
      <View className="ml-3 flex-1">
        <View className="flex-row items-center">
          <Text className="text-[14px] font-semibold text-slate-900 dark:text-white">
            {member.name}
          </Text>
          {member.isOwner ? (
            <Crown className="ml-2" size={14} color="#D97706" />
          ) : null}
        </View>
        <Text className="text-xs text-slate-500">@{member.username}</Text>
      </View>
      {canRemove ? (
        <TouchableOpacity
          accessibilityLabel={`Xóa ${member.name} khỏi nhóm`}
          className="h-10 w-10 items-center justify-center rounded-full bg-red-50"
          onPress={event => {
            event.stopPropagation();
            onRemove();
          }}
        >
          <UserMinus size={18} color="#DC2626" />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

export default function GroupInfoScreen({ navigation, route }: Props) {
  const { chat } = route.params;
  const language = useAppLanguage();
  const copy = COPY[language];
  const { isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [groupInfo, setGroupInfo] = useState<GroupChatInfo>();
  const [notificationsMuted, setNotificationsMuted] = useState(
    Boolean(chat.notificationsMuted),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState('');
  const [sheet, setSheet] = useState<ActionSheet>(null);
  const [groupName, setGroupName] = useState(chat.name);
  const [groupAvatar, setGroupAvatar] = useState<MessageAttachment>();
  const [query, setQuery] = useState('');
  const [addableUsers, setAddableUsers] = useState<GroupAddableUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const groupId = chat.groupId || chat.chatId || chat.userId;

  const loadGroupInfo = useCallback(async (showLoader = false) => {
    if (!groupId) return;
    if (showLoader) setIsLoading(true);
    setError('');
    try {
      const nextInfo = await repository.getGroupInfo(groupId);
      setGroupInfo(nextInfo);
      setGroupName(nextInfo.name);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : copy.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [copy.loadError, groupId]);

  useFocusEffect(
    useCallback(() => {
      loadGroupInfo(false).catch(() => undefined);
      const unsubscribe = subscribeToMessageInvalidations(() => {
        loadGroupInfo(false).catch(() => undefined);
      });
      return unsubscribe;
    }, [loadGroupInfo]),
  );

  useEffect(() => {
    if (sheet !== 'add') return;
    let cancelled = false;
    repository
      .searchAddableUsers(groupId, query.trim())
      .then(users => {
        if (!cancelled) setAddableUsers(users);
      })
      .catch(() => {
        if (!cancelled) setAddableUsers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [groupId, query, sheet]);

  useEffect(() => {
    if (!sheet) return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        setSheet(null);
        return true;
      },
    );
    return () => subscription.remove();
  }, [sheet]);

  const exitToMessages = useCallback(() => {
    navigation.popTo(ROUTES.MESSAGES);
  }, [navigation]);

  const toggleNotifications = useCallback(async () => {
    setIsMutating(true);
    const nextMuted = !notificationsMuted;
    try {
      await repository.setConversationNotifications(chat, !nextMuted);
      setNotificationsMuted(nextMuted);
    } catch (caught) {
      Alert.alert(copy.title, caught instanceof Error ? caught.message : copy.retry);
    } finally {
      setIsMutating(false);
    }
  }, [chat, copy.retry, copy.title, notificationsMuted]);

  const openEditSheet = useCallback(() => {
    setGroupName(groupInfo?.name || chat.name);
    setGroupAvatar(undefined);
    setSheet('edit');
  }, [chat.name, groupInfo?.name]);

  const pickAvatar = useCallback(async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo' as MediaType,
      selectionLimit: 1,
      quality: 0.8,
    });
    const asset = result.assets?.[0];
    if (!asset?.uri) return;
    const uri =
      Platform.OS === 'android' &&
      !/^[a-z][a-z0-9+.-]*:\/\//i.test(asset.uri)
        ? `file://${asset.uri}`
        : asset.uri;
    setGroupAvatar({
      uri,
      name: asset.fileName || `group-${Date.now()}.jpg`,
      type: asset.type || 'image/jpeg',
      mediaType: 'image',
    });
  }, []);

  const saveGroup = useCallback(async () => {
    if (!groupName.trim()) return;
    setIsMutating(true);
    try {
      const next = await repository.editGroup(groupId, {
        name: groupName.trim(),
        avatar: groupAvatar,
      });
      setGroupInfo(next);
      setSheet(null);
    } catch (caught) {
      Alert.alert(copy.editGroup, caught instanceof Error ? caught.message : copy.retry);
    } finally {
      setIsMutating(false);
    }
  }, [copy.editGroup, copy.retry, groupAvatar, groupId, groupName]);

  const addMembers = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setIsMutating(true);
    try {
      await repository.addGroupUsers(groupId, [...selectedIds]);
      setSelectedIds(new Set());
      setSheet(null);
      await loadGroupInfo(false);
    } catch (caught) {
      Alert.alert(copy.addMembers, caught instanceof Error ? caught.message : copy.retry);
    } finally {
      setIsMutating(false);
    }
  }, [copy.addMembers, copy.retry, groupId, loadGroupInfo, selectedIds]);

  const removeMember = useCallback((member: GroupChatMember) => {
    Alert.alert(copy.removeTitle(member.name), '', [
      { text: copy.cancel, style: 'cancel' },
      {
        text: language === 'vi' ? 'Xóa' : 'Remove',
        style: 'destructive',
        onPress: () => {
          repository
            .removeGroupUser(groupId, member.id)
            .then(() => loadGroupInfo(false))
            .catch(caught =>
              Alert.alert(
                copy.membersTitle,
                caught instanceof Error ? caught.message : copy.retry,
              ),
            );
        },
      },
    ]);
  }, [copy, groupId, language, loadGroupInfo]);

  const clearGroupHistory = useCallback(() => {
    Alert.alert(copy.clearTitle, copy.clearMessage, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: language === 'vi' ? 'Xóa' : 'Clear',
        style: 'destructive',
        onPress: () => {
          repository.clearGroupHistory(chat).catch(caught =>
            Alert.alert(
              copy.clearMine,
              caught instanceof Error ? caught.message : copy.retry,
            ),
          );
        },
      },
    ]);
  }, [chat, copy, language]);

  const leaveGroup = useCallback(() => {
    Alert.alert(copy.leaveTitle, copy.leaveMessage, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.leave,
        style: 'destructive',
        onPress: () => {
          repository
            .leaveGroup(groupId)
            .then(exitToMessages)
            .catch(caught =>
              Alert.alert(
                copy.leave,
                caught instanceof Error ? caught.message : copy.retry,
              ),
            );
        },
      },
    ]);
  }, [copy, exitToMessages, groupId]);

  const deleteGroup = useCallback(() => {
    Alert.alert(copy.deleteTitle, copy.deleteMessage, [
      { text: copy.cancel, style: 'cancel' },
      {
        text: copy.deleteGroup,
        style: 'destructive',
        onPress: () => {
          repository
            .deleteGroup(groupId)
            .then(exitToMessages)
            .catch(caught =>
              Alert.alert(
                copy.deleteGroup,
                caught instanceof Error ? caught.message : copy.retry,
              ),
            );
        },
      },
    ]);
  }, [copy, exitToMessages, groupId]);

  const memberRows = useMemo(() => groupInfo?.members ?? [], [groupInfo?.members]);

  return (
    <SafeAreaView
      className="flex-1 surface-base"
      edges={['top']}
      style={isDark ? styles.darkScreen : undefined}
    >
      <FocusAwareStatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ConversationScreenHeader title={copy.title} onBack={() => navigation.goBack()} />

      {isLoading && !groupInfo ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={BRAND} />
        </View>
      ) : error && !groupInfo ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-sm text-red-600">{error}</Text>
          <TouchableOpacity
            className="mt-4 rounded-lg bg-brand px-4 py-3"
            onPress={() => loadGroupInfo(true)}
          >
            <Text className="font-semibold text-white">{copy.retry}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View className="items-center px-4 pb-7 pt-6">
            <Image
              source={{ uri: groupInfo?.avatar || chat.avatar }}
              className="h-28 w-28 rounded-full bg-slate-200"
            />
            <Text className="mt-3 text-[24px] font-bold text-slate-950 dark:text-white">
              {groupInfo?.name || chat.name}
            </Text>
            <Text className="mt-1 text-sm text-slate-500">
              {copy.members(groupInfo?.memberCount ?? 0)}
            </Text>

            <View className="mt-6 w-full flex-row justify-center">
              <ActionButton
                Icon={Search}
                label={copy.search}
                onPress={() => navigation.navigate(ROUTES.CONVERSATION_SEARCH, { chat })}
              />
              <ActionButton
                Icon={notificationsMuted ? Bell : BellOff}
                label={notificationsMuted ? copy.unmute : copy.mute}
                busy={isMutating}
                onPress={toggleNotifications}
              />
              <ActionButton
                Icon={Pin}
                label={copy.pinned}
                onPress={() => navigation.navigate(ROUTES.CONVERSATION_PINNED, { chat })}
              />
              {groupInfo?.isOwner ? (
                <ActionButton
                  Icon={UserPlus}
                  label={copy.addMembers}
                  onPress={() => setSheet('add')}
                />
              ) : null}
            </View>
          </View>

          <Section title={language === 'vi' ? 'Thông tin cuộc trò chuyện' : 'Conversation info'}>
            <MenuRow
              Icon={FileText}
              label={copy.sharedAssets}
              isLast
              onPress={() => navigation.navigate(ROUTES.CONVERSATION_MEDIA, { chat })}
            />
          </Section>

          <Section title={copy.membersTitle}>
            {memberRows.map(member => (
              <MemberRow
                key={member.id}
                member={member}
                canRemove={Boolean(groupInfo?.isOwner) && !member.isOwner}
                onOpen={() => navigateToUserProfile(navigation, member.id)}
                onRemove={() => removeMember(member)}
              />
            ))}
            {memberRows.length === 0 ? (
              <Text className="px-4 py-5 text-center text-sm text-slate-500">
                {language === 'vi' ? 'Chưa có thành viên.' : 'No members.'}
              </Text>
            ) : null}
            {groupInfo?.isOwner ? (
              <MenuRow
                Icon={Edit3}
                label={copy.editGroup}
                isLast
                onPress={openEditSheet}
              />
            ) : null}
          </Section>

          <Section title={language === 'vi' ? 'Hành động' : 'Actions'}>
            <MenuRow
              Icon={Trash2}
              label={copy.clearMine}
              onPress={clearGroupHistory}
            />
            {groupInfo?.isOwner ? (
              <MenuRow
                Icon={Trash2}
                label={copy.deleteGroup}
                destructive
                isLast
                onPress={deleteGroup}
              />
            ) : (
              <MenuRow
                Icon={LogOut}
                label={copy.leave}
                destructive
                isLast
                onPress={leaveGroup}
              />
            )}
          </Section>
        </ScrollView>
      )}

      {sheet ? (
        <View className="absolute inset-0 bg-black/40">
        <KeyboardAvoidingView
          className="flex-1 justify-end"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            activeOpacity={1}
            className="flex-1"
            onPress={() => setSheet(null)}
          />
          <View
            className="max-h-[82%] rounded-t-3xl bg-white pt-4 dark:bg-slate-900"
            style={{ paddingBottom: Math.max(insets.bottom, 24) }}
          >
            <View className="flex-row items-center justify-between px-5 pb-3">
              <Text className="text-lg font-bold text-slate-950 dark:text-white">
                {sheet === 'add' ? copy.addMembers : copy.editGroup}
              </Text>
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800"
                onPress={() => setSheet(null)}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {sheet === 'add' ? (
              <>
                <TextInput
                  className="mx-5 mb-3 rounded-xl bg-slate-100 px-4 py-3 text-slate-950 dark:bg-slate-800 dark:text-white"
                  placeholder={copy.findMembers}
                  placeholderTextColor="#94A3B8"
                  value={query}
                  onChangeText={setQuery}
                />
                <ScrollView keyboardShouldPersistTaps="handled">
                  {addableUsers.map(user => {
                    const selected = selectedIds.has(user.id);
                    return (
                      <TouchableOpacity
                        key={user.id}
                        className="flex-row items-center px-5 py-2"
                        onPress={() =>
                          setSelectedIds(current => {
                            const next = new Set(current);
                            if (next.has(user.id)) next.delete(user.id);
                            else next.add(user.id);
                            return next;
                          })
                        }
                      >
                        <Image source={{ uri: user.avatar }} className="h-11 w-11 rounded-full bg-slate-200" />
                        <View className="ml-3 flex-1">
                          <Text className="font-semibold text-slate-900 dark:text-white">{user.name}</Text>
                          <Text className="text-xs text-slate-500">@{user.username}</Text>
                        </View>
                        <View className={`h-7 w-7 items-center justify-center rounded-full ${selected ? 'bg-brand' : 'border border-slate-300'}`}>
                          {selected ? <Check size={16} color="#FFFFFF" /> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                  {addableUsers.length === 0 ? (
                    <Text className="px-5 py-6 text-center text-sm text-slate-500">{copy.noCandidates}</Text>
                  ) : null}
                </ScrollView>
                <TouchableOpacity
                  className="mx-5 mt-3 min-h-[48px] items-center justify-center rounded-xl bg-brand disabled:opacity-40"
                  disabled={selectedIds.size === 0 || isMutating}
                  onPress={addMembers}
                >
                  {isMutating ? <ActivityIndicator color="#FFFFFF" /> : <Text className="font-bold text-white">{copy.add(selectedIds.size)}</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <View className="px-5">
                <TouchableOpacity className="mb-4 items-center" onPress={pickAvatar}>
                  <View className="relative h-24 w-24">
                    <Image
                      source={{ uri: groupAvatar?.uri || groupInfo?.avatar || chat.avatar }}
                      className="h-24 w-24 rounded-full bg-slate-200"
                    />
                    <View className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full bg-brand">
                      <Camera size={17} color="#FFFFFF" />
                    </View>
                  </View>
                </TouchableOpacity>
                <TextInput
                  className="rounded-xl bg-slate-100 px-4 py-3 text-slate-950 dark:bg-slate-800 dark:text-white"
                  placeholder={copy.groupName}
                  placeholderTextColor="#94A3B8"
                  value={groupName}
                  onChangeText={setGroupName}
                />
                <TouchableOpacity
                  className="mt-4 min-h-[48px] items-center justify-center rounded-xl bg-brand"
                  disabled={isMutating || !groupName.trim()}
                  onPress={saveGroup}
                >
                  {isMutating ? <ActivityIndicator color="#FFFFFF" /> : <Text className="font-bold text-white">{copy.save}</Text>}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
