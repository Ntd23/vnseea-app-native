import { APP_BRAND_COLOR } from '../../../../shared-kernel/presentation/theme/appColors';
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  BookOpen,
  Flag,
  Link2,
  Share2,
  UserRound,
  UsersRound,
} from 'lucide-react-native';

export type FeedShareCarouselDestination =
  | 'story'
  | 'timeline'
  | 'page'
  | 'group'
  | 'copy'
  | 'more';

interface FeedShareDestinationCarouselProps {
  title: string;
  selected: FeedShareCarouselDestination;
  labels: Record<FeedShareCarouselDestination, string>;
  disabled: boolean;
  onSelect: (destination: FeedShareCarouselDestination) => void;
}

const DESTINATIONS = [
  { id: 'story', Icon: BookOpen },
  { id: 'timeline', Icon: UserRound },
  { id: 'page', Icon: Flag },
  { id: 'group', Icon: UsersRound },
  { id: 'copy', Icon: Link2 },
  { id: 'more', Icon: Share2 },
] as const;

export function FeedShareDestinationCarousel({
  title,
  selected,
  labels,
  disabled,
  onSelect,
}: FeedShareDestinationCarouselProps) {
  return (
    <View className="mt-5 pb-2">
      <Text className="mb-3 px-1 text-[16px] font-extrabold text-slate-900">
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContent}
      >
        {DESTINATIONS.map(({ id, Icon }) => {
          const active = selected === id;
          return (
            <TouchableOpacity
              key={id}
              activeOpacity={0.85}
              disabled={disabled}
              onPress={() => onSelect(id)}
              className="mr-3 w-[74px] items-center"
            >
              <View
                className={`h-14 w-14 items-center justify-center rounded-full border ${
                  active
                    ? 'border-brand bg-brand-soft'
                    : 'border-slate-200 bg-slate-100'
                }`}
              >
                <Icon size={23} color={active ? APP_BRAND_COLOR : '#475569'} />
              </View>
              <Text
                className={`mt-1.5 text-center text-[11px] font-bold ${
                  active ? 'text-brand' : 'text-slate-700'
                }`}
                numberOfLines={2}
              >
                {labels[id]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  horizontalContent: {
    paddingRight: 8,
  },
});
