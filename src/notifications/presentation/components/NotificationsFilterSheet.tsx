// Description: Bottom-sheet style modal that lets the user filter the
// notifications list by type (All, Likes, Comments, Follows, Groups, Events, Group chats).

import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CalendarDays,
  Check,
  Heart,
  Inbox,
  MessageCircle,
  MessageSquare,
  UserPlus,
  Users,
} from 'lucide-react-native';
import type { NotificationFilterType } from '../../application/i18n/notificationCopy';

interface NotificationsFilterSheetProps {
  visible: boolean;
  onClose: () => void;
  active: NotificationFilterType;
  onSelect: (filter: NotificationFilterType) => void;
  labels: {
    title: string;
    filterAll: string;
    filterLikes: string;
    filterComments: string;
    filterFollows: string;
    filterGroups: string;
    filterEvents: string;
    filterGroupChats: string;
    close: string;
  };
}

const ICON_MAP: Record<NotificationFilterType, React.ComponentType<{ size: number; color: string }>> = {
  all: Inbox,
  likes: Heart,
  comments: MessageCircle,
  follows: UserPlus,
  groups: Users,
  events: CalendarDays,
  groupChats: MessageSquare,
};

const COLOR_MAP: Record<NotificationFilterType, string> = {
  all: '#0000ff',
  likes: '#F33E58',
  comments: '#1877F2',
  follows: '#65676B',
  groups: '#0000ff',
  events: '#EA4335',
  groupChats: '#0000ff',
};

const ORDER: NotificationFilterType[] = [
  'all',
  'likes',
  'comments',
  'follows',
  'groups',
  'events',
  'groupChats',
];

const LABEL_KEY: Record<NotificationFilterType, keyof NotificationsFilterSheetProps['labels']> = {
  all: 'filterAll',
  likes: 'filterLikes',
  comments: 'filterComments',
  follows: 'filterFollows',
  groups: 'filterGroups',
  events: 'filterEvents',
  groupChats: 'filterGroupChats',
};

export default function NotificationsFilterSheet({
  visible,
  onClose,
  active,
  onSelect,
  labels,
}: NotificationsFilterSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end bg-black/40"
        onPress={onClose}
      >
        <Pressable
          onPress={e => e.stopPropagation?.()}
          className="rounded-t-3xl bg-white px-4 pb-6 pt-4"
        >
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-heading">{labels.title}</Text>
            <TouchableOpacity
              activeOpacity={0.8}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              onPress={onClose}
              className="rounded-full bg-slate-100 px-4 py-1.5"
            >
              <Text className="text-caption-primary">{labels.close}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 480 }}
          >
            {ORDER.map(id => {
              const Icon = ICON_MAP[id];
              const color = COLOR_MAP[id];
              const isActive = active === id;
              const label = labels[LABEL_KEY[id]];
              return (
                <TouchableOpacity
                  key={id}
                  activeOpacity={0.85}
                  onPress={() => {
                    onSelect(id);
                    onClose();
                  }}
                  className={`mb-2 flex-row items-center rounded-xl px-3 py-3 ${
                    isActive ? 'bg-blue-50' : 'bg-slate-50'
                  }`}
                >
                  <View
                    className="h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${color}1A` }}
                  >
                    <Icon size={18} color={color} />
                  </View>
                  <Text
                    className={`ml-3 flex-1 text-[15px] ${
                      isActive
                        ? 'font-semibold text-[#0000ff]'
                        : 'font-medium text-slate-800'
                    }`}
                  >
                    {label}
                  </Text>
                  {isActive ? <Check size={18} color="#0000ff" /> : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
