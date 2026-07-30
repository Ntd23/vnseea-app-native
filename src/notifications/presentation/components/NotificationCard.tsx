// Description: Animated notification card matching the screenshot design.
// Card has a colored left border (per notification type), circular avatar
// with a small action badge, primary text with a timestamp, and a trailing
// unread dot + overflow menu on the right.

import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
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
import {
  GROUP_CHAT_INVITE_NOTIFICATION,
  type NotificationsItem,
} from '../../domain/types/notifications.types';
import { formatNotificationText } from '../../application/i18n/notificationCopy';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';

interface NotificationCardProps {
  item: NotificationsItem;
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

type IconComponent = React.ComponentType<{
  size: number;
  color: string;
  strokeWidth?: number;
}>;

type NotificationStyle = {
  Icon: IconComponent;
  iconColor: string;
  borderColor: string;
};

const STYLE_BY_TYPE: Record<string, NotificationStyle> = {
  following: { Icon: UserPlus, iconColor: '#3B82F6', borderColor: '#3B82F6' },
  liked_post: { Icon: Heart, iconColor: '#EF4444', borderColor: '#EF4444' },
  wondered_post: { Icon: Heart, iconColor: '#F59E0B', borderColor: '#F59E0B' },
  shared_post: { Icon: Share2, iconColor: '#0EA5E9', borderColor: '#0EA5E9' },
  liked_page: { Icon: Flag, iconColor: APP_BRAND_COLOR, borderColor: APP_BRAND_COLOR },
  comment: {
    Icon: MessageCircle,
    iconColor: APP_BRAND_COLOR,
    borderColor: APP_BRAND_COLOR,
  },
  comment_reply: {
    Icon: MessageCircle,
    iconColor: APP_BRAND_COLOR,
    borderColor: APP_BRAND_COLOR,
  },
  comment_mention: {
    Icon: MessageCircle,
    iconColor: APP_BRAND_COLOR,
    borderColor: APP_BRAND_COLOR,
  },
  post_mention: {
    Icon: MessageCircle,
    iconColor: APP_BRAND_COLOR,
    borderColor: APP_BRAND_COLOR,
  },
  profile_wall_post: {
    Icon: ImageIcon,
    iconColor: '#A855F7',
    borderColor: '#A855F7',
  },
  visited_profile: {
    Icon: UserCheck,
    iconColor: '#64748B',
    borderColor: '#64748B',
  },
  joined_group: {
    Icon: UserCheck,
    iconColor: '#22C55E',
    borderColor: '#22C55E',
  },
  accepted_request: {
    Icon: UserCheck,
    iconColor: '#22C55E',
    borderColor: '#22C55E',
  },
  interested_event: {
    Icon: CalendarDays,
    iconColor: '#EF4444',
    borderColor: '#EF4444',
  },
  going_event: {
    Icon: CalendarDays,
    iconColor: '#22C55E',
    borderColor: '#22C55E',
  },
  invited_event: {
    Icon: CalendarDays,
    iconColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  added_you_to_group: {
    Icon: Users,
    iconColor: '#22C55E',
    borderColor: '#22C55E',
  },
  group_chat_invite: {
    Icon: Users,
    iconColor: APP_BRAND_COLOR,
    borderColor: APP_BRAND_COLOR,
  },
  accept_group_chat_request: {
    Icon: Users,
    iconColor: '#22C55E',
    borderColor: '#22C55E',
  },
  declined_group_chat_request: {
    Icon: Users,
    iconColor: '#EF4444',
    borderColor: '#EF4444',
  },
};

function getNotificationStyle(type: string): NotificationStyle {
  return (
    STYLE_BY_TYPE[type] ?? {
      Icon: Bell,
      iconColor: '#94a3b8',
      borderColor: '#94a3b8',
    }
  );
}

function formatRelativeTime(
  createdAt: number | undefined,
  language: AppLanguage,
): string {
  if (!createdAt) {
    return language === 'vi' ? 'V?a xong' : 'Just now';
  }
  const now = Date.now();
  const diff = Math.max(0, Math.floor((now - createdAt) / 1000));
  if (diff < 60) {
    return language === 'vi' ? 'V?a xong' : 'Just now';
  }
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return language === 'vi' ? `${m} ph?t tr??c` : `${m} min ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return language === 'vi' ? `${h} gi? tr??c` : `${h}h ago`;
  }
  if (diff < 86400 * 7) {
    const d = Math.floor(diff / 86400);
    return language === 'vi' ? `${d} ng?y tr??c` : `${d}d ago`;
  }
  try {
    const date = new Date(createdAt);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}`;
  } catch {
    return language === 'vi' ? 'V?a xong' : 'Just now';
  }
}

function NotificationCard({
  item,
  language,
  onPress,
  onLongPress,
  onAcceptGroupChat,
  onRejectGroupChat,
  isPending,
  labels,
}: NotificationCardProps) {
  const { Icon, iconColor, borderColor } = getNotificationStyle(item.type);

  const text = useMemo(
    () => formatNotificationText(item, language),
    [item, language],
  );

  const relativeTime = useMemo(
    () => formatRelativeTime(item.createdAt, language),
    [item.createdAt, language],
  );

  const isGroupChatInvite = item.type === GROUP_CHAT_INVITE_NOTIFICATION;
  const avatar = item.notifier?.avatarUrl;
  const hasAvatar = Boolean(avatar);
  const isUnread = !item.seen;

  return (
    <Animated.View
      exiting={SlideOutRight.duration(220).easing(Easing.in(Easing.cubic))}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => onPress(item)}
        onLongPress={onLongPress ? () => onLongPress(item) : undefined}
        style={{
          backgroundColor: '#ffffff',
          shadowColor: '#0f172a',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
          borderLeftWidth: 4,
          borderLeftColor: borderColor,
        }}
        className="mb-3 pl-3 pr-3.5 py-3.5 rounded-2xl border border-slate-100"
      >
        <View className="flex-row items-start">
          {/* Avatar Container */}
          <View className="relative">
            {hasAvatar ? (
              <Image
                source={{ uri: avatar }}
                className="h-12 w-12 rounded-full bg-slate-100"
                resizeMode="cover"
              />
            ) : (
              <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-50">
                <Icon size={22} color={iconColor} />
              </View>
            )}

            {/* Overlapping Action Badge at bottom-right of avatar */}
            <View
              className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full border-2 border-white"
              style={{ backgroundColor: iconColor }}
            >
              <Icon size={10} color="#FFFFFF" strokeWidth={3} />
            </View>
          </View>

          {/* Text Content */}
          <View className="ml-3 flex-1 pr-1">
            <Text
              className="text-[14.5px] font-semibold text-slate-800 leading-snug"
              numberOfLines={3}
            >
              {text}
            </Text>
            <Text className="mt-1 text-[12px] font-medium text-slate-400">
              {relativeTime}
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
                    isPending ? 'bg-brand/40' : 'bg-brand'
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
          <View className="ml-1 items-end justify-between self-stretch py-0.5">
            {/* Unread blue dot */}
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: isUnread ? APP_BRAND_COLOR : 'transparent' }}
            />

            {/* Menu options trigger */}
            <TouchableOpacity
              onPress={() => onLongPress?.(item)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MoreHorizontal size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default memo(NotificationCard);
