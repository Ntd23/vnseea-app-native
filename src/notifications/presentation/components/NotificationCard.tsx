// Description: Animated notification card.
// Uses Reanimated FadeInDown + SlideOutRight for smooth insert / delete,
// icon-chip badge for the notification type, optional accept/reject row
// for group-chat invites.

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
  Heart,
  Image as ImageIcon,
  MessageCircle,
  Share2,
  ThumbsUp,
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
  following: { Icon: UserPlus, iconColor: '#1877F2' },
  liked_post: { Icon: Heart, iconColor: '#F33E58' },
  wondered_post: { Icon: Heart, iconColor: '#F7B125' },
  shared_post: { Icon: Share2, iconColor: '#65676B' },
  comment: { Icon: MessageCircle, iconColor: '#1877F2' },
  comment_reply: { Icon: MessageCircle, iconColor: '#1877F2' },
  profile_wall_post: { Icon: ImageIcon, iconColor: '#1877F2' },
  visited_profile: { Icon: UserCheck, iconColor: '#65676B' },
  joined_group: { Icon: UserCheck, iconColor: '#1877F2' },
  accepted_request: { Icon: UserCheck, iconColor: '#34A853' },
  interested_event: { Icon: CalendarDays, iconColor: '#EA4335' },
  going_event: { Icon: CalendarDays, iconColor: '#34A853' },
  added_you_to_group: { Icon: Users, iconColor: '#0000FF' },
  accept_group_chat_request: { Icon: Users, iconColor: '#34A853' },
  declined_group_chat_request: { Icon: Users, iconColor: '#DC2626' },
};

function getNotificationIcon(type: string) {
  return ICON_BY_TYPE[type] ?? { Icon: Bell, iconColor: '#65676B' };
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
        className={`surface-card mb-3 px-4 py-3.5 ${
          !item.seen ? 'border-[#0000ff]/15' : ''
        }`}
        style={
          !item.seen
            ? {
                backgroundColor: '#F5F8FF',
                borderColor: 'rgba(0, 0, 255, 0.18)',
              }
            : undefined
        }
      >
        <View className="flex-row">
          <View className="relative">
            {hasAvatar ? (
              <Image
                source={{ uri: avatar }}
                className="h-12 w-12 rounded-full bg-slate-100"
                resizeMode="cover"
              />
            ) : (
              <View
                className="h-12 w-12 items-center justify-center rounded-full"
                style={{ backgroundColor: `${iconColor}22` }}
              >
                <Icon size={20} color={iconColor} />
              </View>
            )}
            <View
              className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border-2 border-white"
              style={{ backgroundColor: iconColor }}
            >
              <Icon size={12} color="#FFFFFF" />
            </View>
          </View>

          <View className="ml-3.5 flex-1">
            <View className="flex-row items-start justify-between">
              <Text
                className="flex-1 text-body-primary leading-snug"
                numberOfLines={3}
              >
                {text}
              </Text>
              {!item.seen ? (
                <View className="ml-2 mt-1 h-2 w-2 rounded-full bg-[#0000ff]" />
              ) : null}
            </View>
            <Text className="mt-1 text-caption-secondary">
              {item.timeText || (language === 'vi' ? 'Vừa xong' : 'Just now')}
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
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default memo(NotificationCard);
