import {
  APP_BRAND_COLOR,
  APP_COLORS,
} from '../../../shared-kernel/presentation/theme/appColors';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  Bell,
  BellOff,
  ChevronRight,
  Flag,
  FolderOpen,
  MessageSquarePlus,
  Pin,
  Search,
  Share2,
  Trash2,
  UserRound,
  UserRoundX,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigateToUserProfile } from '../../../navigation/profileNavigation';
import { createMessagesRepository } from '../../infrastructure/repositories/ApiMessagesRepository';
import { useAppTheme } from '../../../shared-kernel/application/hooks/useAppTheme';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import { ConversationScreenHeader } from '../components/ConversationScreenHeader';

type Props = NativeStackScreenProps<
  RootStackParamList,
  typeof ROUTES.CONVERSATION_DETAILS
>;

const repository = createMessagesRepository();
const BRAND = APP_BRAND_COLOR;
const REPORT_REASONS = [
  'Spam hoặc lừa đảo',
  'Quấy rối hoặc bắt nạt',
  'Nội dung không phù hợp',
  'Lý do khác',
];

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
  const { isDark } = useAppTheme();
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      className="w-1/4 items-center px-1"
      onPress={onPress}
      disabled={busy}
    >
      <View className="h-12 w-12 items-center justify-center rounded-full bg-brand/10">
        {busy ? (
          <ActivityIndicator color={BRAND} />
        ) : (
          <Icon size={22} color={BRAND} />
        )}
      </View>
      <Text
        className="mt-2 text-center text-[12px] font-medium"
        style={{ color: isDark ? '#E2E8F0' : '#334155' }}
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
  subtitle,
  value,
  destructive,
  onPress,
  isLast,
}: {
  Icon: LucideIcon;
  label: string;
  subtitle?: string;
  value?: string;
  destructive?: boolean;
  onPress: () => void;
  isLast?: boolean;
}) {
  const { isDark } = useAppTheme();
  const color = destructive ? '#DC2626' : isDark ? '#CBD5E1' : '#334155';
  return (
    <TouchableOpacity
      accessibilityRole="button"
      className="min-h-[58px] flex-row items-center px-4 py-3"
      style={
        !isLast
          ? {
              borderBottomWidth: 1,
              borderBottomColor: isDark ? '#293241' : '#E2E8F0',
            }
          : undefined
      }
      onPress={onPress}
    >
      <View className="w-10 items-start">
        <Icon size={22} color={color} />
      </View>
      <View className="flex-1">
        <Text
          className="text-[15px] font-medium"
          style={{
            color: destructive ? '#DC2626' : isDark ? '#F8FAFC' : '#0F172A',
          }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text
            className="mt-0.5 text-[12px]"
            style={{ color: isDark ? '#94A3B8' : '#64748B' }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {value ? (
        <Text
          className="mr-2 text-sm"
          style={{ color: isDark ? '#94A3B8' : '#64748B' }}
        >
          {value}
        </Text>
      ) : null}
      {!destructive ? <ChevronRight size={20} color="#94A3B8" /> : null}
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
  const { isDark } = useAppTheme();
  return (
    <View className="mb-6 px-4">
      <Text className="mb-2 px-1 text-[14px] font-bold text-slate-500 dark:text-slate-400">
        {title}
      </Text>
      <View
        className="surface-card overflow-hidden rounded-lg"
        style={
          isDark
            ? { backgroundColor: '#111827', borderColor: '#293241' }
            : undefined
        }
      >
        {children}
      </View>
    </View>
  );
}

export default function ConversationDetailsScreen({
  navigation,
  route,
}: Props) {
  const { chat } = route.params;
  const { isDark } = useAppTheme();
  const participantId = useMemo(
    () => chat.participantId || chat.userId || '',
    [chat.participantId, chat.userId],
  );
  const [notificationsMuted, setNotificationsMuted] = useState(
    Boolean(chat.notificationsMuted),
  );
  const [conversationChat, setConversationChat] = useState(
    chat.hasConversationRecord ? chat : undefined,
  );
  const [isMuting, setIsMuting] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0]);
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  const didToggleNotificationsRef = useRef(false);

  useEffect(() => {
    if (!participantId) return;
    let cancelled = false;
    didToggleNotificationsRef.current = false;
    repository
      .findUserConversation(participantId)
      .then(found => {
        if (cancelled || !found) return;
        setConversationChat(found);
        if (!didToggleNotificationsRef.current) {
          setNotificationsMuted(Boolean(found.notificationsMuted));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [participantId]);

  const toggleNotifications = useCallback(async () => {
    setIsMuting(true);
    didToggleNotificationsRef.current = true;
    try {
      const resolvedChat =
        conversationChat ??
        (participantId
          ? await repository.findUserConversation(participantId)
          : undefined);
      if (!resolvedChat?.chatId) {
        Alert.alert('Không thể cập nhật', 'Cuộc trò chuyện chưa có mã hợp lệ.');
        return;
      }
      const nextMuted = !notificationsMuted;
      await repository.setConversationNotifications(
        resolvedChat,
        !nextMuted,
      );
      setConversationChat(resolvedChat);
      setNotificationsMuted(nextMuted);
    } catch (error) {
      Alert.alert(
        'Không thể cập nhật thông báo',
        error instanceof Error ? error.message : 'Vui lòng thử lại.',
      );
    } finally {
      setIsMuting(false);
    }
  }, [conversationChat, notificationsMuted, participantId]);

  const openCreateGroup = useCallback(() => {
    if (!participantId) return;
    navigation.navigate(ROUTES.CREATE_GROUP_CHAT, {
      initialMember: {
        id: participantId,
        name: chat.name,
        username: chat.username,
        avatar: chat.avatar,
      },
    });
  }, [chat.avatar, chat.name, chat.username, navigation, participantId]);

  const blockUser = useCallback(() => {
    if (!participantId) return;
    Alert.alert(
      `Chặn ${chat.name}?`,
      'Hai người sẽ không thể nhắn tin cho nhau cho đến khi bạn bỏ chặn trong Cài đặt.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Chặn',
          style: 'destructive',
          onPress: async () => {
            try {
              await repository.blockConversationUser(participantId);
              navigation.popTo(ROUTES.MESSAGES);
            } catch (error) {
              Alert.alert(
                'Không thể chặn',
                error instanceof Error ? error.message : 'Vui lòng thử lại.',
              );
            }
          },
        },
      ],
    );
  }, [chat.name, navigation, participantId]);

  const deleteConversation = useCallback(() => {
    if (!participantId) return;
    Alert.alert(
      'Xóa đoạn chat?',
      'Lịch sử cuộc trò chuyện sẽ bị xóa khỏi tài khoản của bạn.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await repository.deleteConversation(participantId);
              navigation.popTo(ROUTES.MESSAGES);
            } catch (error) {
              Alert.alert(
                'Không thể xóa đoạn chat',
                error instanceof Error ? error.message : 'Vui lòng thử lại.',
              );
            }
          },
        },
      ],
    );
  }, [navigation, participantId]);

  const submitReport = useCallback(async () => {
    if (!participantId || !reportReason.trim()) return;
    setIsReporting(true);
    try {
      const reason = [reportReason, reportDetails.trim()]
        .filter(Boolean)
        .join(': ');
      const result = await repository.reportConversationUser(
        participantId,
        reason,
      );
      setReportVisible(false);
      setReportDetails('');
      Alert.alert(
        result.alreadyReported ? 'Đã báo cáo trước đó' : 'Đã gửi báo cáo',
        result.alreadyReported
          ? 'Báo cáo hiện có vẫn được giữ nguyên.'
          : 'Cảm ơn bạn đã giúp VNSEEA an toàn hơn.',
      );
    } catch (error) {
      Alert.alert(
        'Không thể gửi báo cáo',
        error instanceof Error ? error.message : 'Vui lòng thử lại.',
      );
    } finally {
      setIsReporting(false);
    }
  }, [participantId, reportDetails, reportReason]);

  return (
    <SafeAreaView
      className="flex-1 surface-base"
      edges={['top']}
      style={isDark ? { backgroundColor: '#020617' } : undefined}
    >
      <FocusAwareStatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#020617' : '#F1F4FB'}
      />
      <ConversationScreenHeader
        title={chat.name}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 36 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center px-4 pb-7 pt-6">
          <View className="relative">
            <Image
              source={{ uri: chat.avatar }}
              className="h-28 w-28 rounded-full bg-slate-200"
            />
            {chat.isOnline ? (
              <View className="absolute bottom-1 right-1 h-6 w-6 rounded-full border-[3px] border-white bg-green-500" />
            ) : null}
          </View>
          <Text
            className="mt-3 text-[24px] font-bold"
            style={{ color: isDark ? '#F8FAFC' : '#020617' }}
          >
            {chat.name}
          </Text>
          <Text
            className="mt-1 text-sm"
            style={{ color: isDark ? '#94A3B8' : '#64748B' }}
          >
            {chat.username ? `@${chat.username}` : 'Cuộc trò chuyện 1-1'}
          </Text>
          {chat.isOnline ? (
            <Text className="mt-1 text-xs font-medium text-green-600">
              Đang hoạt động
            </Text>
          ) : null}

          <View className="mt-6 flex-row">
            <ActionButton
              Icon={UserRound}
              label="Trang cá nhân"
              onPress={() =>
                participantId &&
                navigateToUserProfile(navigation, participantId)
              }
            />
            <ActionButton
              Icon={Search}
              label="Tìm kiếm"
              onPress={() =>
                navigation.navigate(ROUTES.CONVERSATION_SEARCH, { chat })
              }
            />
            <ActionButton
              Icon={notificationsMuted ? Bell : BellOff}
              label={notificationsMuted ? 'Bật thông báo' : 'Tắt thông báo'}
              onPress={toggleNotifications}
              busy={isMuting}
            />
            <ActionButton
              Icon={MessageSquarePlus}
              label="Tạo nhóm"
              onPress={openCreateGroup}
            />
          </View>
        </View>

        <Section title="Thông tin cuộc trò chuyện">
          <MenuRow
            Icon={FolderOpen}
            label="File phương tiện, liên kết và tệp"
            onPress={() =>
              navigation.navigate(ROUTES.CONVERSATION_MEDIA, {
                chat: conversationChat ?? chat,
              })
            }
            isLast
          />
        </Section>

        <Section title="Hành động">
          <MenuRow
            Icon={Pin}
            label="Tin nhắn đã ghim"
            onPress={() =>
              navigation.navigate(ROUTES.CONVERSATION_PINNED, {
                chat: conversationChat ?? chat,
              })
            }
          />
          <MenuRow
            Icon={Share2}
            label="Chia sẻ thông tin liên hệ"
            onPress={() =>
              Share.share({
                title: `Liên hệ ${chat.name}`,
                message: [
                  `${chat.name}${chat.username ? ` (@${chat.username})` : ''}`,
                  chat.username
                    ? `${apiConfig.webBaseUrl.replace(/\/+$/, '')}/${
                        chat.username
                      }`
                    : '',
                ]
                  .filter(Boolean)
                  .join('\n'),
              })
            }
            isLast
          />
        </Section>

        <Section title="Quyền riêng tư và hỗ trợ">
          <MenuRow Icon={UserRoundX} label="Chặn" onPress={blockUser} />
          <MenuRow
            Icon={Flag}
            label="Báo cáo"
            subtitle="Báo cáo tài khoản hoặc nội dung không phù hợp"
            onPress={() => setReportVisible(true)}
          />
          <MenuRow
            Icon={Trash2}
            label="Xóa đoạn chat"
            destructive
            onPress={deleteConversation}
            isLast
          />
        </Section>
      </ScrollView>

      <Modal
        visible={reportVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportVisible(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="rounded-t-3xl px-5 pb-8 pt-4"
            style={{ backgroundColor: isDark ? '#111827' : '#FFFFFF' }}
          >
            <View className="mb-3 flex-row items-center justify-between">
              <Text
                className="text-lg font-bold"
                style={{ color: isDark ? '#F8FAFC' : '#020617' }}
              >
                Báo cáo cuộc trò chuyện
              </Text>
              <TouchableOpacity
                className="h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }}
                onPress={() => setReportVisible(false)}
              >
                <X size={20} color="#475569" />
              </TouchableOpacity>
            </View>
            <View className="flex-row flex-wrap gap-2">
              {REPORT_REASONS.map(reason => (
                <TouchableOpacity
                  key={reason}
                  className="rounded-full border px-3 py-2"
                  style={{
                    borderColor:
                      reportReason === reason
                        ? BRAND
                        : isDark
                        ? '#475569'
                        : '#CBD5E1',
                    backgroundColor:
                      reportReason === reason
                        ? APP_COLORS.brand.soft
                        : 'transparent',
                  }}
                  onPress={() => setReportReason(reason)}
                >
                  <Text
                    style={{
                      color:
                        reportReason === reason
                          ? BRAND
                          : isDark
                          ? '#CBD5E1'
                          : '#475569',
                    }}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              className="mt-4 min-h-[92px] rounded-xl border border-slate-200 px-4 py-3 text-slate-900 dark:text-white"
              style={
                isDark
                  ? { backgroundColor: '#0F172A', borderColor: '#334155' }
                  : undefined
              }
              placeholder="Mô tả thêm (không bắt buộc)"
              placeholderTextColor="#94A3B8"
              multiline
              textAlignVertical="top"
              value={reportDetails}
              onChangeText={setReportDetails}
            />
            <TouchableOpacity
              className="mt-4 min-h-[48px] items-center justify-center rounded-xl bg-brand"
              onPress={submitReport}
              disabled={isReporting}
            >
              {isReporting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text className="font-bold text-white">Gửi báo cáo</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
