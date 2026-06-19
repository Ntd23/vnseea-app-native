// Description: Event post card component for the home feed.
// Displays events in Facebook-style card layout.
import React, { useCallback } from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CalendarDays,
  MapPin,
  Users,
  Share2,
  CalendarCheck,
  Star,
  Edit,
} from 'lucide-react-native';
import type { EventsItem } from '../../domain/types/events.types';
import {
  FeedCardContent,
  FeedCardSurface,
  FeedGlassActionBar,
  FeedGlassActionButton,
  FeedMediaFrame,
} from '../../../feed/presentation/components/FeedCardChrome';

interface EventPostCardProps {
  event: EventsItem;
  onPress?: (event: EventsItem) => void;
  onProfilePress?: (userId: string) => void;
  onShare?: (event: EventsItem) => void;
  onInterestedPress?: (event: EventsItem) => void;
  onGoingPress?: (event: EventsItem) => void;
  onEditPress?: (event: EventsItem) => void;
}

const BRAND_BLUE = '#0000ff';
const SLATE_GRAY = '#65676B';

// Date formatter helper
function formatEventDate(dateStr?: string): string {
  if (!dateStr) return 'Sắp diễn ra';
  try {
    // Parse YYYY-MM-DD
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      const month = parseInt(parts[1], 10);
      return `${day}\nThg ${month}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

// Time formatter helper
function formatEventTime(timeStr?: string): string {
  if (!timeStr) return '';
  // HH:MM:SS -> HH:MM
  if (timeStr.length >= 5) {
    return timeStr.slice(0, 5);
  }
  return timeStr;
}

const EventPostCard = React.memo(function EventPostCard({
  event,
  onPress,
  onProfilePress,
  onShare,
  onInterestedPress,
  onGoingPress,
  onEditPress,
}: EventPostCardProps) {
  const handlePress = useCallback(() => {
    onPress?.(event);
  }, [onPress, event]);

  const handleProfilePress = useCallback(() => {
    if (event.user_data?.user_id) {
      onProfilePress?.(String(event.user_data.user_id));
    }
  }, [onProfilePress, event.user_data?.user_id]);

  const handleSharePress = useCallback(() => {
    onShare?.(event);
  }, [onShare, event]);

  const handleInterestedPress = useCallback(() => {
    onInterestedPress?.(event);
  }, [onInterestedPress, event]);

  const handleGoingPress = useCallback(() => {
    onGoingPress?.(event);
  }, [onGoingPress, event]);

  const handleEditPress = useCallback(() => {
    onEditPress?.(event);
  }, [onEditPress, event]);

  // Fallbacks for variable WoWonder event field names
  const title = event.event_name || event.name || 'Sự kiện';
  const coverUrl = event.event_cover || event.cover;
  const description = event.event_description || event.description;
  const location = event.event_location || event.location || 'Chưa có địa điểm';
  const dateText = formatEventDate(event.event_start_date || event.start_date);
  const timeText = formatEventTime(event.event_start_time || event.start_time);
  
  // Attendees calculation
  const going = Number(event.going_count || 0);
  const interested = Number(event.interested_count || 0);
  const attendeesText = going > 0 
    ? `${going} người tham gia` 
    : interested > 0 
      ? `${interested} người quan tâm` 
      : 'Chưa có người tham gia';

  return (
    <FeedCardSurface>
      {/* Publisher Header (Matches other feed posts) */}
      <FeedCardContent className="pb-2">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            className="flex-row items-center flex-1 mr-2"
            activeOpacity={0.8}
            onPress={handleProfilePress}
          >
            {event.user_data?.avatar ? (
              <Image
                source={{ uri: event.user_data.avatar }}
                className="h-10 w-10 rounded-full"
                resizeMode="cover"
              />
            ) : (
              <View className="h-10 w-10 items-center justify-center rounded-full bg-blue-600">
                <CalendarDays size={20} color="#FFFFFF" />
              </View>
            )}
            <View className="ml-3 flex-1">
              <View className="flex-row items-center flex-wrap">
                <Text className="text-title-primary font-bold text-[#050505] flex-shrink mr-2" numberOfLines={1}>
                  {event.user_data?.full_name || event.user_data?.name || 'Ban tổ chức'}
                </Text>
                <View className="bg-blue-50 rounded px-1.5 py-0.5" style={{ flexShrink: 0 }}>
                  <Text className="text-[10px] font-bold uppercase text-[#0866FF]">
                    Sự kiện
                  </Text>
                </View>
              </View>
              <Text className="text-caption-secondary text-[12px] text-[#65676B] mt-0.5" numberOfLines={1}>
                Công khai
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Event Header Name / Description */}
        <View className="mt-3">
          <Text className="text-body-primary font-bold text-[16px] text-[#050505]" numberOfLines={2}>{title}</Text>
          {description ? (
            <Text className="text-body-primary mt-1 text-[#65676B] text-[13px] leading-relaxed" numberOfLines={3}>
              {description}
            </Text>
          ) : null}
        </View>
      </FeedCardContent>

      {/* Cover Image */}
      <FeedMediaFrame>
        <TouchableOpacity activeOpacity={0.95} onPress={handlePress}>
          {coverUrl ? (
            <Image
              source={{ uri: coverUrl }}
              className="w-full"
              style={{ aspectRatio: 1.6 }}
              resizeMode="cover"
              fadeDuration={0}
            />
          ) : (
            <View
              className="w-full items-center justify-center bg-slate-200"
              style={{ aspectRatio: 1.6 }}
            >
              <CalendarDays size={48} color="#94A3B8" />
            </View>
          )}
        </TouchableOpacity>
      </FeedMediaFrame>

      {/* Event Details (Date badge + Info block) */}
      <FeedCardContent className="pb-3">
        <View className="flex-row border-b border-[#F0F2F5] pb-4 mb-3">
          {/* Calendar style Date block */}
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#0000ff]/10">
            <Text className="text-center text-[13px] font-bold uppercase text-[#0866FF] leading-tight">
              {dateText}
            </Text>
          </View>
          
          <View className="ml-4 flex-1 justify-center">
            {timeText ? (
              <View className="flex-row items-center">
                <CalendarDays size={14} color={BRAND_BLUE} />
                <Text className="ml-2 text-[13px] text-[#65676B] font-medium">
                  {timeText}
                </Text>
              </View>
            ) : null}
            <View className="flex-row items-center mt-1">
              <MapPin size={14} color={BRAND_BLUE} style={{ flexShrink: 0 }} />
              <Text className="ml-2 text-[13px] text-[#65676B] flex-shrink font-medium" numberOfLines={1}>
                {location}
              </Text>
            </View>
          </View>
        </View>

        {/* Attendees Summary */}
        <View className="flex-row items-center justify-between pb-1.5">
          <View className="flex-row items-center">
            <Users size={16} color={SLATE_GRAY} />
            <Text className="ml-2 text-[13px] text-[#65676B] font-semibold">
              {attendeesText}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <FeedGlassActionBar className="mt-2 border-t border-[#F0F2F5] pt-3.5">
          {event.is_owner ? (
            <>
              <FeedGlassActionButton
                className="flex-1 flex-row items-center justify-center py-1.5 px-1"
                activeOpacity={0.75}
                onPress={handleEditPress}
              >
                <Edit size={18} color="#0866FF" />
                <Text className="ml-2 text-[13px] font-semibold text-[#0866FF]" numberOfLines={1}>
                  Sửa
                </Text>
              </FeedGlassActionButton>
              
              <FeedGlassActionButton
                className="flex-1 flex-row items-center justify-center py-1.5 px-1"
                activeOpacity={0.75}
                onPress={handleSharePress}
              >
                <Share2 size={18} color="#65676B" />
                <Text className="ml-2 text-[13px] font-semibold text-[#65676B]" numberOfLines={1}>
                  Chia sẻ
                </Text>
              </FeedGlassActionButton>
            </>
          ) : (
            <>
              <FeedGlassActionButton
                className="flex-1 flex-row items-center justify-center py-1.5 px-1"
                activeOpacity={0.75}
                onPress={handleInterestedPress}
              >
                <Star size={18} color={event.is_interested ? '#EAB308' : '#65676B'} fill={event.is_interested ? '#EAB308' : 'none'} />
                <Text 
                  className="ml-2 text-[13px] font-semibold" 
                  style={{ color: event.is_interested ? '#EAB308' : '#65676B' }}
                  numberOfLines={1}
                >
                  {event.is_interested ? 'Quan tâm' : 'Quan tâm'}
                </Text>
              </FeedGlassActionButton>

              <FeedGlassActionButton
                className="flex-1 flex-row items-center justify-center py-1.5 px-1"
                activeOpacity={0.75}
                onPress={handleGoingPress}
              >
                <CalendarCheck size={18} color={event.is_going ? '#10B981' : '#65676B'} />
                <Text 
                  className="ml-2 text-[13px] font-semibold" 
                  style={{ color: event.is_going ? '#10B981' : '#65676B' }}
                  numberOfLines={1}
                >
                  {event.is_going ? 'Tham gia' : 'Tham gia'}
                </Text>
              </FeedGlassActionButton>

              <FeedGlassActionButton
                className="flex-1 flex-row items-center justify-center py-1.5 px-1"
                activeOpacity={0.75}
                onPress={handleSharePress}
              >
                <Share2 size={18} color="#65676B" />
                <Text className="ml-2 text-[13px] font-semibold text-[#65676B]" numberOfLines={1}>
                  Chia sẻ
                </Text>
              </FeedGlassActionButton>
            </>
          )}
        </FeedGlassActionBar>
      </FeedCardContent>
    </FeedCardSurface>
  );
});

export { EventPostCard };
export default EventPostCard;
