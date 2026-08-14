// Description: Shows group-first identity for posts surfaced in the Home feed.
import React, { useCallback } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Globe2, MoreHorizontal, Users } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import type { GroupItem } from '../../../community/domain/types/community.types';
import type {
  FeedGroupContext,
  FeedPublisher,
} from '../../domain/types/feed.types';

type GroupPostHeaderNav = NativeStackNavigationProp<RootStackParamList>;

type GroupPostIdentityHeaderProps = {
  group: FeedGroupContext;
  publisher: FeedPublisher;
  publisherName: string;
  time: string;
  privacyLabel: string;
  PrivacyIcon: typeof Globe2;
  onPublisherPress?: () => void;
  onMorePress?: () => void;
  containerClassName?: string;
};

export const GroupPostIdentityHeader = React.memo(
  function GroupPostIdentityHeader({
    group,
    publisher,
    publisherName,
    time,
    privacyLabel,
    PrivacyIcon,
    onPublisherPress,
    onMorePress,
    containerClassName = 'mb-4 flex-row items-center justify-between',
  }: GroupPostIdentityHeaderProps) {
    const navigation = useNavigation<GroupPostHeaderNav>();

    const handleGroupPress = useCallback(() => {
      const routeGroup: GroupItem = {
        id: group.id,
        groupId: group.id,
        groupName: group.username,
        groupTitle: group.title,
        privacy: group.privacy,
        avatar: group.avatarUrl,
        cover: group.coverUrl,
        url: group.url,
      };
      navigation.navigate(ROUTES.GROUP_DETAIL, { group: routeGroup });
    }, [group, navigation]);

    return (
      <View className={containerClassName}>
        <View className="min-w-0 flex-1 flex-row items-center">
          <TouchableOpacity
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel={group.title}
            className="relative h-12 w-12"
            onPress={handleGroupPress}
          >
            {group.avatarUrl ? (
              <Image
                source={{ uri: group.avatarUrl }}
                className="h-11 w-11 rounded-[13px] bg-slate-100"
                resizeMode="cover"
                resizeMethod="resize"
              />
            ) : (
              <View className="h-11 w-11 items-center justify-center rounded-[13px] bg-red-50">
                <Users size={21} color="#B91C1C" />
              </View>
            )}

            {publisher.avatarUrl ? (
              <View className="absolute bottom-0 right-0 h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white">
                <Image
                  source={{ uri: publisher.avatarUrl }}
                  className="h-5 w-5 rounded-full"
                  resizeMode="cover"
                  resizeMethod="resize"
                />
              </View>
            ) : null}
          </TouchableOpacity>

          <View className="ml-3 min-w-0 flex-1">
            <TouchableOpacity
              activeOpacity={0.78}
              accessibilityRole="button"
              accessibilityLabel={group.title}
              onPress={handleGroupPress}
            >
              <Text
                numberOfLines={1}
                className="text-[15px] font-extrabold text-slate-950"
              >
                {group.title}
              </Text>
            </TouchableOpacity>

            <View className="mt-0.5 min-w-0 flex-row items-center">
              <TouchableOpacity
                activeOpacity={0.75}
                disabled={!onPublisherPress}
                className="max-w-[48%]"
                onPress={onPublisherPress}
              >
                <Text
                  numberOfLines={1}
                  className="text-[12px] font-semibold text-slate-600"
                >
                  {publisherName}
                </Text>
              </TouchableOpacity>
              <Text className="text-[12px] text-slate-500">
                {' '}
                {'\u2022'} {time} {'\u2022'}{' '}
              </Text>
              <PrivacyIcon
                size={12}
                color="#64748B"
                accessibilityLabel={privacyLabel}
              />
            </View>
          </View>
        </View>

        {onMorePress ? (
          <TouchableOpacity
            activeOpacity={0.72}
            accessibilityRole="button"
            accessibilityLabel="More"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="ml-2 h-10 w-10 items-center justify-center rounded-full"
            onPress={onMorePress}
          >
            <MoreHorizontal size={22} color="#64748B" />
          </TouchableOpacity>
        ) : null}
      </View>
    );
  },
);

export default GroupPostIdentityHeader;
