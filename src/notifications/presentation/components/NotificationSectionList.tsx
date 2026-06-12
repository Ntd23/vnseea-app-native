// Description: Renders the notification list grouped by time with section headers.
// Each card animates in with a staggered delay and exits with a slide-right.

import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import type { NotificationsItem } from '../../domain/types/notifications.types';
import {
  groupNotificationsByTime,
  type NotificationBucket,
} from '../../application/i18n/notificationCopy';
import type { AppLanguage } from '../../../shared-kernel/infrastructure/storage/languageStorage';
import NotificationCard from './NotificationCard';
import NotificationSectionHeader from './NotificationSectionHeader';

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
  const buckets: NotificationBucket[] = groupNotificationsByTime(
    items,
    language,
  );

  if (buckets.length === 0) {
    return null;
  }

  let runningIndex = 0;

  return (
    <View>
      {buckets.map(bucket => (
        <View key={bucket.key} className="mb-2">
          <NotificationSectionHeader title={bucket.title} />
          {bucket.items.map(item => {
            const isGroupChatInvite = item.type === 'added_you_to_group';
            const isPending =
              isGroupChatInvite && item.groupChatId
                ? pendingActions.has(item.groupChatId)
                : false;
            const index = runningIndex;
            runningIndex += 1;
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
      ))}
    </View>
  );
}
