// Description: Shared feed chrome filter tabs used by home feed and group detail surfaces.
import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React, { useMemo } from 'react';
import { House, Image as ImageIcon, MapPin, ShoppingBag, Video } from 'lucide-react-native';
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
          <House
            size={28}
            color={active ? APP_BRAND_COLOR : '#626a77'}
            strokeWidth={active ? 2.8 : 2.0}
            fill="transparent"
          />
        ),
      },
      {
        key: 'nearby' as const,
        accessibilityLabel: 'Nearby',
        icon: () => (
          <MapPin
            size={28}
            color="#626a77"
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
            size={28}
            color={active ? APP_BRAND_COLOR : '#626a77'}
            strokeWidth={active ? 2.5 : 2.0}
          />
        ),
      },
      {
        key: 'videos' as const,
        accessibilityLabel: 'Video',
        icon: () => (
          <Video
            size={28}
            color="#626a77"
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
            size={28}
            color="#626a77"
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
      variant="header"
      onChange={key => {
        if (key === 'all' || key === 'photos') {
          onChangeSource(key);
        }
      }}
    />
  );
}

export default FeedFilterTabs;
