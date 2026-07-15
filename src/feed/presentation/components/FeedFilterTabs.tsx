// Description: Shared feed chrome filter tabs used by home feed and group detail surfaces.
import React, { useMemo } from 'react';
import { Compass, Image as ImageIcon, MapPin, ShoppingBag, Video } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { ROUTES } from '../../../navigation/constants/routes';
import { navigateToReels } from '../../../navigation/reelsNavigation';
import { FeedSourceFilterBar } from './FeedSourceFilterBar';

export type FeedFilterTabKey = 'all' | 'photos';
export type FeedFilterActiveSource = FeedFilterTabKey | 'following';

export function FeedFilterTabs({
  activeSource,
  onChangeSource,
}: {
  activeSource: FeedFilterActiveSource;
  onChangeSource: (source: FeedFilterTabKey) => void;
}) {
  const navigation = useNavigation<any>();
  const items = useMemo(
    () => [
      {
        key: 'all' as FeedFilterTabKey,
        accessibilityLabel: 'All',
        icon: (active: boolean) => (
          <Compass
            size={24}
            color={active ? '#0758ff' : '#9ca3af'}
            strokeWidth={active ? 2.5 : 2.0}
          />
        ),
      },
      {
        key: 'nearby' as const,
        accessibilityLabel: 'Nearby',
        icon: () => (
          <MapPin
            size={24}
            color="#9ca3af"
            strokeWidth={2.0}
          />
        ),
        onPress: () => navigation.navigate(ROUTES.NEARBY_USERS),
      },
      {
        key: 'photos' as FeedFilterTabKey,
        accessibilityLabel: 'Photos',
        icon: (active: boolean) => (
          <ImageIcon
            size={24}
            color={active ? '#0758ff' : '#9ca3af'}
            strokeWidth={active ? 2.5 : 2.0}
          />
        ),
      },
      {
        key: 'videos' as const,
        accessibilityLabel: 'Video',
        icon: () => (
          <Video
            size={24}
            color="#9ca3af"
            strokeWidth={2.0}
          />
        ),
        onPress: () => navigateToReels(navigation, { source: 'home' }),
      },
      {
        key: 'marketplace' as const,
        accessibilityLabel: 'Marketplace',
        icon: () => (
          <ShoppingBag
            size={24}
            color="#9ca3af"
            strokeWidth={2.0}
          />
        ),
        onPress: () => navigation.navigate(ROUTES.MARKETPLACE),
      },
    ],
    [navigation],
  );

  return (
    <FeedSourceFilterBar
      activeKey={activeSource}
      items={items}
      onChange={key => {
        if (key === 'all' || key === 'photos') {
          onChangeSource(key);
        }
      }}
    />
  );
}

export default FeedFilterTabs;
