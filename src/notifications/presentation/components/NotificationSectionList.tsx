// Description: Renders the notification list as a flat stream matching the screenshot (no section headers).

import React from 'react';
import { View } from 'react-native';
import type { NotificationsItem } from '../../domain/types/notifications.types';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import NotificationCard from './NotificationCard';

interface NotificationSectionListProps {
  items: NotificationsItem[];
  language: AppLanguage;
  pendingActions: Set<string>;
  onItemPress: (item: NotificationsItem) => void;
  onItemLongPress: (item: NotificationsItem) => void;
  onAcceptGroupChat: (groupChatId: string) => void;
  onRejectGroupChat: (groupChatId: string) => void;
  labels: {
    acceptInvite: string;
    rejectInvite: string;
  };
}

export default function NotificationSectionList({
  items,
  language,
  pendingActions,
  onItemPress,
  onItemLongPress,
  onAcceptGroupChat,
  onRejectGroupChat,
  labels,
}: NotificationSectionListProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View>
      {items.map((item, index) => {
        const isGroupChatInvite = item.type === 'added_you_to_group';
        const isPending =
          isGroupChatInvite && item.groupChatId
            ? pendingActions.has(item.groupChatId)
            : false;
        return (
          <NotificationCard
            key={item.id}
            item={item}
            index={index}
            language={language}
            onPress={onItemPress}
            onLongPress={
              isGroupChatInvite ? undefined : onItemLongPress
            }
            onAcceptGroupChat={
              isGroupChatInvite ? onAcceptGroupChat : undefined
            }
            onRejectGroupChat={
              isGroupChatInvite ? onRejectGroupChat : undefined
            }
            isPending={isPending}
            labels={labels}
          />
        );
      })}
    </View>
  );
}
