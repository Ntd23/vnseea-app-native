// Description: Renders the VNSEEA events list with event discovery and app-bar create navigation.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CalendarDays,
  Edit3,
  MapPin,
  Plus,
  Users,
} from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useEventsViewModel } from '../../application/view-models/useEventsViewModel';
import type { EventsItem } from '../../domain/types/events.types';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getEventsCopy } from '../../application/i18n/eventsCopy';

type EventsNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

// Helper function to format date
function formatEventDate(dateStr: string | null | undefined): { day: string; month: string } {
  if (!dateStr) return { day: '--', month: 'N/A' };
  try {
    const parts = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    const date = parts
      ? new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]))
      : new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return { day: '--', month: 'N/A' };
    }
    return {
      day: String(date.getDate()).padStart(2, '0'),
      month: date.toLocaleDateString('vi-VN', { month: 'short' }),
    };
  } catch {
    return { day: '--', month: 'N/A' };
  }
}

// Event Card Component
function EventCard({
  event,
  onPress,
  onEditPress,
  copy,
}: {
  event: EventsItem;
  onPress?: () => void;
  onEditPress?: () => void;
  copy: Record<string, string>;
}) {
  const { day, month } = formatEventDate(event.start_date ?? event.event_start_date);
  // Check if current user is the owner of this event (poster_id matches current user)
  const isOwner = event.is_owner === true;
  const title = event.name ?? event.event_name ?? copy.eventTitle;
  const location = event.location ?? event.event_location;
  const startTime = event.start_time ?? event.event_start_time;
  const cover = event.cover ?? event.event_cover;
  console.log('[EventCard] Event ID:', event.id, 'is_owner:', isOwner);

  return (
    <TouchableOpacity
      className="surface-card mb-4 overflow-hidden"
      activeOpacity={0.9}
      onPress={onPress}
    >
      {cover && (
        <Image
          source={{ uri: cover }}
          className="h-40 w-full"
          resizeMode="cover"
        />
      )}
      <View className="p-4">
        <View className="flex-row">
          <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#0000ff]/10">
            <Text className="text-center text-[18px] font-bold text-brand">{day}</Text>
            <Text className="text-center text-[12px] text-brand">{month}</Text>
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-title-primary" numberOfLines={2}>{title}</Text>
            <View className="mt-2 flex-row items-center">
              <CalendarDays size={15} color={BRAND} />
              <Text className="ml-2 text-caption-secondary">
                {startTime || 'N/A'}
              </Text>
            </View>
            {location && (
              <View className="mt-1 flex-row items-center">
                <MapPin size={15} color={BRAND} />
                <Text className="ml-2 text-caption-secondary" numberOfLines={1}>
                  {location}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3">
          <View className="flex-row items-center">
            <Users size={16} color={BRAND} />
            <Text className="ml-2 text-caption-secondary">
              {event.going_count ? `${event.going_count} người tham gia` : 'Chưa có ai tham gia'}
            </Text>
          </View>

          {/* Buttons based on ownership */}
          {isOwner ? (
            <TouchableOpacity
              className="flex-row items-center rounded-full bg-green-500 px-4 py-2"
              activeOpacity={0.8}
              onPress={onEditPress}
            >
              <Edit3 size={14} color="#FFFFFF" />
              <Text className="ml-1 text-caption-primary text-white font-semibold">{copy.edit}</Text>
            </TouchableOpacity>
          ) : (
            <View className="flex-row gap-2">
              <TouchableOpacity
                className="rounded-full bg-[#0000ff]/10 px-4 py-2"
                activeOpacity={0.8}
                onPress={() => {
                  console.log('[EventCard] Join event:', event.id);
                }}
              >
                <Text className="text-caption-primary text-brand font-semibold">
                  {event.is_going ? copy.joined : copy.join}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="rounded-full bg-[#f59e0b]/10 px-4 py-2"
                activeOpacity={0.8}
                onPress={() => {
                  console.log('[EventCard] Interested event:', event.id);
                }}
              >
                <Text className="text-caption-primary text-[#f59e0b] font-semibold">
                  {event.is_interested ? copy.interested : copy.interest}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EventsScreen() {
  const navigation = useNavigation<EventsNav>();
  const { events, isLoading, fetchEvents, fetchMyEvents } = useEventsViewModel();
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [language] = useState<AppLanguage>(languageStorage.getLanguage());
  const copy = getEventsCopy(language);

  useFocusEffect(useCallback(() => {
    // Load events based on active tab
    if (activeTab === 'my') {
      fetchMyEvents();
    } else {
      fetchEvents();
    }
  }, [activeTab, fetchEvents, fetchMyEvents]));

  const handleTabPress = (tab: 'all' | 'my') => {
    setActiveTab(tab);
  };

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={BRAND} />

      <View className="surface-brand h-14 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-title-primary text-inverse">
          {activeTab === 'my' ? copy.myEvents : copy.eventsTitle}
        </Text>
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.navigate(ROUTES.CREATE_EVENT)}
        >
          <Plus size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-24 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => {
              if (activeTab === 'my') {
                fetchMyEvents();
              } else {
                fetchEvents();
              }
            }}
            tintColor={BRAND}
          />
        }
      >
        {/* Tabs */}
        <View className="mb-4 flex-row gap-3">
          <TouchableOpacity
            className={`rounded-full px-4 py-2 ${activeTab === 'all' ? 'surface-brand' : 'surface-muted'}`}
            onPress={() => handleTabPress('all')}
          >
            <Text className={activeTab === 'all' ? 'text-caption-primary text-inverse' : 'text-caption-secondary'}>
              {copy.all}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`rounded-full px-4 py-2 ${activeTab === 'my' ? 'surface-brand' : 'surface-muted'}`}
            onPress={() => handleTabPress('my')}
          >
            <Text className={activeTab === 'my' ? 'text-caption-primary text-inverse' : 'text-caption-secondary'}>
              {copy.my}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Loading State */}
        {isLoading && events.length === 0 && (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color={BRAND} />
            <Text className="mt-4 text-body-secondary">{copy.loading}</Text>
          </View>
        )}

        {/* Empty State */}
        {!isLoading && events.length === 0 && (
          <View className="items-center justify-center py-20">
            <CalendarDays size={64} color="#CBD5E1" />
            <Text className="mt-4 text-title-primary">{copy.noEvents}</Text>
            <Text className="mt-2 text-center text-body-secondary">
              {copy.noEventsDesc}
            </Text>
            <TouchableOpacity
              className="btn-primary mt-6 min-h-[48px] px-8"
              activeOpacity={0.9}
              onPress={() => navigation.navigate(ROUTES.CREATE_EVENT)}
            >
              <Plus size={20} color="#FFFFFF" />
              <Text className="ml-2 text-title-primary text-inverse">{copy.createEvent}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Events List */}
        {events.map(event => (
          <EventCard
            key={event.id}
            event={event}
            onPress={() => {
              navigation.navigate(ROUTES.EVENT_DETAIL, { event });
            }}
            onEditPress={() => {
              navigation.navigate(ROUTES.EDIT_EVENT, { event });
            }}
            copy={copy}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default EventsScreen;
