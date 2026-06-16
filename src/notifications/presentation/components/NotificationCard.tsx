// Description: Animated notification card matching the screenshot design.
// Uses white card background, rounded-[20px] corners, left blue border for unread,
// absolute date formatting (DD.MM.YY), and right-aligned unread dot + action menu.

import React, { memo, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  SlideOutRight,
} from 'react-native-reanimated';
import {
  Bell,
  CalendarDays,
  Check,
  Flag,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Share2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';
import type { NotificationsItem } from '../../domain/types/notifications.types';
import { formatNotificationText } from '../../application/i18n/notificationCopy';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';

interface NotificationCardProps {
  item: NotificationsItem;
  index: number;
  language: AppLanguage;
  onPress: (item: NotificationsItem) => void;
  onLongPress?: (item: NotificationsItem) => void;
  onAcceptGroupChat?: (groupChatId: string) => void;
  onRejectGroupChat?: (groupChatId: string) => void;
  isPending?: boolean;
  labels: {
    acceptInvite: string;
    rejectInvite: string;
  };
}

type IconComponent = React.ComponentType<{ size: number; color: string }>;

const ICON_BY_TYPE: Record<string, { Icon: IconComponent; iconColor: string }> = {
  following: { Icon: UserPlus, iconColor: '#94a3b8' }, // grey person silhouette
  liked_post: { Icon: Heart, iconColor: '#F33E58' },
  wondered_post: { Icon: Heart, iconColor: '#F7B125' },
  shared_post: { Icon: Share2, iconColor: '#65676B' },
  liked_page: { Icon: Flag, iconColor: '#1877F2' },
  comment: { Icon: MessageCircle, iconColor: '#3b82f6' }, // blue message bubble
  comment_reply: { Icon: MessageCircle, iconColor: '#3b82f6' },
  profile_wall_post: { Icon: ImageIcon, iconColor: '#1877F2' },
  visited_profile: { Icon: UserCheck, iconColor: '#94a3b8' }, // grey person icon
  joined_group: { Icon: UserCheck, iconColor: '#1877F2' },
  accepted_request: { Icon: UserCheck, iconColor: '#22c55e' }, // green group/person
  interested_event: { Icon: CalendarDays, iconColor: '#EA4335' },
  going_event: { Icon: CalendarDays, iconColor: '#22c55e' },
  added_you_to_group: { Icon: Users, iconColor: '#22c55e' }, // green group icon
  accept_group_chat_request: { Icon: Users, iconColor: '#22c55e' }, // green group icon
  declined_group_chat_request: { Icon: Users, iconColor: '#DC2626' },
};

function getNotificationIcon(type: string) {
  return ICON_BY_TYPE[type] ?? { Icon: Bell, iconColor: '#94a3b8' };
}

const ENTER_BASE = FadeInDown.duration(280).easing(Easing.out(Easing.cubic));

function NotificationCard({
  item,
  index,
  language,
  onPress,
  onLongPress,
  onAcceptGroupChat,
  onRejectGroupChat,
  isPending,
  labels,
}: NotificationCardProps) {
  const { Icon, iconColor } = getNotificationIcon(item.type);
  
  const text = useMemo(
    () => formatNotificationText(item, language),
    [item, language],
  );

  const formattedTime = useMemo(() => {
    if (!item.createdAt) return item.timeText;
    try {
      const date = new Date(item.createdAt);
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yy = String(date.getFullYear()).slice(-2);
      return `${dd}.${mm}.${yy}`;
    } catch {
      return item.timeText;
    }
  }, [item.createdAt, item.timeText]);

  const isGroupChatInvite = item.type === 'added_you_to_group';
  const avatar = item.notifier?.avatarUrl;
  const hasAvatar = Boolean(avatar);
  const entering = ENTER_BASE.delay(Math.min(index, 12) * 40);

  return (
    <Animated.View
      entering={entering}
      exiting={SlideOutRight.duration(220).easing(Easing.in(Easing.cubic))}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(item)}
        onLongPress={onLongPress ? () => onLongPress(item) : undefined}
        style={[
          {
            backgroundColor: '#ffffff',
            shadowColor: '#94a3b8',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.06,
            shadowRadius: 10,
            elevation: 2,
          },
          !item.seen
            ? { borderLeftWidth: 4, borderLeftColor: '#0000ff' }
            : { borderLeftWidth: 0 },
        ]}
        className="mb-3 px-4 py-4 rounded-[20px] border border-slate-100/70"
      >
        <View className="flex-row items-center">
          {/* Avatar Container */}
          <View className="relative">
            {hasAvatar ? (
              <Image
                source={{ uri: avatar }}
                className="h-14 w-14 rounded-full bg-slate-100"
                resizeMode="cover"
              />
            ) : (
              <View
                className="h-14 w-14 items-center justify-center rounded-full bg-slate-50"
              >
                <Icon size={24} color={iconColor} />
              </View>
            )}
            
            {/* Overlapping Action Badge at bottom-right of avatar */}
            <View
              className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border border-white"
              style={{ backgroundColor: iconColor }}
            >
              <Icon size={12} color="#FFFFFF" />
            </View>
          </View>

          {/* Text Content */}
          <View className="ml-4 flex-1 pr-2">
            <Text
              className="text-[15px] font-semibold text-slate-800 leading-snug"
              numberOfLines={3}
            >
              {text}
            </Text>
            <Text className="mt-1.5 text-[13px] text-slate-400">
              {formattedTime || (language === 'vi' ? 'Vừa xong' : 'Just now')}
            </Text>

            {isGroupChatInvite && onAcceptGroupChat && onRejectGroupChat ? (
              <View className="mt-3 flex-row">
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isPending}
                  onPress={() => {
                    if (item.groupChatId) onAcceptGroupChat(item.groupChatId);
                  }}
                  className={`mr-2 flex-1 flex-row items-center justify-center rounded-xl py-2.5 ${
                    isPending ? 'bg-blue-300' : 'bg-[#0000FF]'
                  }`}
                >
                  {isPending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Check size={16} color="#FFFFFF" />
                      <Text className="ml-2 text-[13px] font-semibold text-white">
                        {labels.acceptInvite}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isPending}
                  onPress={() => {
                    if (item.groupChatId) onRejectGroupChat(item.groupChatId);
                  }}
                  className="flex-1 flex-row items-center justify-center rounded-xl border border-red-300 py-2.5"
                >
                  {isPending ? (
                    <ActivityIndicator size="small" color="#dc2626" />
                  ) : (
                    <>
                      <X size={16} color="#dc2626" />
                      <Text className="ml-2 text-[13px] font-semibold text-red-500">
                        {labels.rejectInvite}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* Right Action/Indicator side */}
          <View className="h-12 justify-between items-end">
            {/* Unread blue dot */}
            {!item.seen ? (
              <View className="h-2.5 w-2.5 rounded-full bg-[#0000ff]" />
            ) : (
              <View className="h-2.5 w-2.5 bg-transparent" />
            )}

            {/* Menu options trigger */}
            <TouchableOpacity
              onPress={() => onLongPress?.(item)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="mt-auto"
            >
              <MoreHorizontal size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default memo(NotificationCard);
