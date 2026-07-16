// Description: Renders a horizontal carousel of featured fundraising campaigns
// for the home feed. Mirrors the SuggestedGroupsCarousel /
// SuggestedPagesCarousel pattern so the feed stays visually consistent.

import React, { useCallback } from 'react';
import {
  FlatList,
  Image,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { HeartHandshake, Users } from 'lucide-react-native';
import type { FundingItem } from '../../domain/types/funding.types';

// Local minimal copy contract — only the strings this carousel
// needs. Mirrors the shape used by other feed carousels so callers
// can pass the same `FEED_COPY` object without us pulling in the
// whole FeedScreen module (which would create a circular dep).
export type FeedFundingCopy = {
  fundingTitle: string;
  fundingSubtitle: string;
  fundingFallback: string;
  fundingGoal: string;
  viewFunding: string;
  seeAll: string;
};

const FUNDING_SKELETONS = ['funding-skeleton-1', 'funding-skeleton-2', 'funding-skeleton-3'];

const CAROUSEL_SEPARATOR_STYLE = { width: 12 };

function CarouselSeparator() {
  return <View style={CAROUSEL_SEPARATOR_STYLE} />;
}

function formatMoney(amount: number, symbol: string): string {
  return `${amount.toLocaleString('vi-VN')}${symbol || 'VNSEEA'}`;
}

interface FeedFundingCarouselProps {
  campaigns: FundingItem[];
  isLoading: boolean;
  copy: FeedFundingCopy;
  currencySymbol: string;
  onOpenFundingList: () => void;
  onOpenCampaign: (campaign: FundingItem) => void;
}

const FeedFundingCarousel = React.memo(function FeedFundingCarousel({
  campaigns,
  isLoading,
  copy,
  currencySymbol,
  onOpenFundingList,
  onOpenCampaign,
}: FeedFundingCarouselProps) {
  // Render nothing if the user has no campaigns and we're not loading
  // — keeps the feed quiet for accounts that don't have fundraisers
  // yet.
  if (!isLoading && campaigns.length === 0) return null;

  const data: Array<FundingItem | string> =
    campaigns.length > 0 ? campaigns : FUNDING_SKELETONS;

  const renderItem = useCallback(
    ({ item }: { item: FundingItem | string }) => {
      if (typeof item === 'string') {
        // Skeleton placeholder. Matches the same look as the
        // groups / pages skeletons so the feed rhythm is
        // consistent while data loads.
        return (
          <View className="w-[240px] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white">
            <View className="h-28 bg-[#eef2f7]" />
            <View className="p-3">
              <View className="h-4 w-32 rounded-full bg-[#eef2f7]" />
              <View className="mt-2 h-3 w-20 rounded-full bg-[#eef2f7]" />
              <View className="mt-3 h-2 w-full rounded-full bg-[#eef2f7]" />
            </View>
          </View>
        );
      }

      const raised = parseFloat(item.raised || '0');
      const goal = parseFloat(item.amount || '1');
      const percent =
        goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0;
      const donor = item.user_data;
      const donorName = donor
        ? `${donor.first_name ?? ''} ${donor.last_name ?? ''}`.trim() ||
          donor.username
        : null;

      return (
        <TouchableOpacity
          className="w-[240px] overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white"
          activeOpacity={0.88}
          onPress={() => onOpenCampaign(item)}
        >
          {/* Cover image */}
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              className="h-28 w-full"
              resizeMode="cover"
              fadeDuration={0}
            />
          ) : (
            <View className="h-28 w-full items-center justify-center bg-[#eef2ff]">
              <HeartHandshake size={32} color="#0000ff" />
            </View>
          )}

          <View className="p-3">
            <Text
              className="text-[14px] font-extrabold text-[#111827]"
              numberOfLines={2}
            >
              {item.title || copy.fundingFallback}
            </Text>

            {donorName ? (
              <Text
                className="mt-0.5 text-[12px] font-semibold text-[#64748b]"
                numberOfLines={1}
              >
                bởi {donorName}
              </Text>
            ) : null}

            {/* Progress bar */}
            <View className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-[#e2e8f0]">
              <View
                className="h-1.5 rounded-full bg-[#0000ff]"
                style={{ width: `${percent}%` }}
              />
            </View>

            <View className="mt-2 flex-row items-center justify-between">
              <View>
                <Text className="text-[12px] font-bold text-[#0000ff]">
                  {formatMoney(raised, currencySymbol)}
                </Text>
                <Text className="text-[10px] font-semibold text-[#94a3b8]">
                  {copy.fundingGoal} {formatMoney(goal, currencySymbol)}
                </Text>
              </View>
              <View className="rounded-full bg-[#eef0ff] px-2 py-0.5">
                <Text className="text-[11px] font-bold text-[#0000ff]">
                  {percent}%
                </Text>
              </View>
            </View>

            <View className="mt-3 flex-row items-center justify-center rounded-xl bg-[#e7f0ff] py-2">
              <HeartHandshake size={14} color="#0000ff" />
              <Text className="ml-1 text-[12px] font-extrabold text-[#0000ff]">
                {copy.viewFunding}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [copy, currencySymbol, onOpenCampaign],
  );

  return (
    <View className="border-y border-[#e5e7eb] bg-white py-4">
      <View className="mb-3 flex-row items-center justify-between px-4">
        <View>
          <Text className="text-[17px] font-extrabold text-[#111827]">
            {copy.fundingTitle}
          </Text>
          <Text className="mt-0.5 text-[12px] font-semibold text-[#64748b]">
            {copy.fundingSubtitle}
          </Text>
        </View>
        <TouchableOpacity activeOpacity={0.75} onPress={onOpenFundingList}>
          <Text className="text-[14px] font-extrabold text-[#0866ff]">
            {copy.seeAll}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList<FundingItem | string>
        horizontal
        data={data}
        keyExtractor={item =>
          typeof item === 'string' ? item : String(item.id)
        }
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        ItemSeparatorComponent={CarouselSeparator}
        nestedScrollEnabled
        initialNumToRender={3}
        maxToRenderPerBatch={3}
        windowSize={3}
        removeClippedSubviews={Platform.OS === 'android'}
        renderItem={renderItem}
      />
    </View>
  );
});

export default FeedFundingCarousel;
