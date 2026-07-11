// Description: Renders the VNSEEA events list with event discovery and app-bar create navigation.
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CalendarDays,
  Edit3,
  Footprints,
  Heart,
  MapPin,
  Plus,
} from 'lucide-react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useEventsViewModel } from '../../application/view-models/useEventsViewModel';
import type { EventsTab } from '../../application/view-models/useEventsViewModel';
import type { EventsItem } from '../../domain/types/events.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { FeedHeader } from '../../../feed/presentation/components/FeedHeader';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getEventsCopy } from '../../application/i18n/eventsCopy';
import {
  showToast,
  ToastContainer,
} from '../../../shared-kernel/presentation/components/ToastNotification';

type EventsNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

function formatEventDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '--/--/--';
  try {
    const parts = dateStr.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    const date = parts
      ? new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]))
      : new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
      return dateStr;
    }
    return [
      String(date.getDate()).padStart(2, '0'),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getFullYear()).slice(-2),
    ].join('-');
  } catch {
    return dateStr;
  }
}

// Event Card Component
function EventCard({
  event,
  onPress,
  onEditPress,
  onGoingPress,
  onInterestedPress,
  busyAction,
  copy,
}: {
  event: EventsItem;
  onPress?: () => void;
  onEditPress?: () => void;
  onGoingPress?: () => void;
  onInterestedPress?: () => void;
  busyAction?: 'going' | 'interested' | null;
  copy: Record<string, string>;
}) {
  const dateLabel = formatEventDate(event.start_date ?? event.event_start_date);
  const isOwner = event.is_owner === true;
  const title = event.name ?? event.event_name ?? copy.eventsTitle;
  const location = event.location ?? event.event_location;
  const cover = event.cover ?? event.event_cover;

  return (
    <View className="mb-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <View className="relative h-48 w-full bg-slate-100">
          {cover ? (
            <Image source={{ uri: cover }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <View className="h-full w-full items-center justify-center bg-[#eef1ff]">
              <CalendarDays size={52} color={BRAND} />
            </View>
          )}

          <View className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1">
            <Text className="text-[12px] font-bold text-white">{dateLabel}</Text>
          </View>

          {location ? (
            <View className="absolute bottom-0 left-0 right-0 flex-row items-center bg-black/45 px-3 py-3">
              <MapPin size={16} color="#FFFFFF" fill="#FFFFFF" />
              <Text className="ml-1 flex-1 text-[13px] font-medium text-white" numberOfLines={1}>
                {location}
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>

      <View className="p-3">
        <TouchableOpacity activeOpacity={0.75} onPress={onPress}>
          <Text className="mb-3 text-[19px] font-semibold text-slate-900" numberOfLines={2}>
            {title}
          </Text>
        </TouchableOpacity>

        {isOwner ? (
          <TouchableOpacity
            className="min-h-[44px] flex-row items-center justify-center rounded-md bg-slate-200 px-4"
            activeOpacity={0.8}
            onPress={onEditPress}
          >
            <Edit3 size={15} color="#334155" />
            <Text className="ml-2 text-[13px] font-semibold text-slate-700">{copy.edit}</Text>
          </TouchableOpacity>
        ) : (
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="min-h-[46px] flex-1 flex-row items-center justify-center rounded-md bg-slate-100 px-3"
              activeOpacity={0.8}
              disabled={busyAction !== null}
              onPress={onGoingPress}
            >
              {busyAction === 'going' ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <>
                  <Footprints size={17} color="#0F172A" />
                  <Text className="ml-2 text-[12px] font-semibold text-slate-800">
                    {event.is_going ? copy.joined : copy.join}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="min-h-[46px] flex-1 flex-row items-center justify-center rounded-md bg-slate-100 px-3"
              activeOpacity={0.8}
              disabled={busyAction !== null}
              onPress={onInterestedPress}
            >
              {busyAction === 'interested' ? (
                <ActivityIndicator size="small" color="#0F172A" />
              ) : (
                <>
                  <Heart
                    size={17}
                    color="#0F172A"
                    fill={event.is_interested ? '#0F172A' : 'transparent'}
                  />
                  <Text className="ml-2 text-[12px] font-semibold text-slate-800">
                    {event.is_interested ? copy.interested : copy.interest}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function EventsScreen() {
  const navigation = useNavigation<EventsNav>();
  const {
    events,
    isLoading,
    error,
    loadEventsTab,
    toggleGoing,
    toggleInterested,
  } = useEventsViewModel();
  const [activeTab, setActiveTab] = useState<EventsTab>('browse');
  const [busyRsvp, setBusyRsvp] = useState<{
    eventId: string;
    action: 'going' | 'interested';
  } | null>(null);
  const [language] = useState<AppLanguage>(languageStorage.getLanguage());
  const copy = getEventsCopy(language);

  const tabs = useMemo<Array<{ key: EventsTab; label: string }>>(() => [
    { key: 'browse', label: copy.tabBrowse },
    { key: 'going', label: copy.tabGoing },
    { key: 'invited', label: copy.tabInvited },
    { key: 'interested', label: copy.tabInterested },
    { key: 'past', label: copy.tabPast },
    { key: 'mine', label: copy.tabMine },
  ], [copy]);

  const refreshActiveTab = useCallback(() => {
    return loadEventsTab(activeTab);
  }, [activeTab, loadEventsTab]);

  useFocusEffect(useCallback(() => {
    void refreshActiveTab();
  }, [refreshActiveTab]));

  const handleTabPress = (tab: EventsTab) => {
    setActiveTab(tab);
  };

  const handleRsvp = useCallback(async (
    event: EventsItem,
    action: 'going' | 'interested',
  ) => {
    const eventId = String(event.id);
    setBusyRsvp({ eventId, action });

    try {
      const result = action === 'going'
        ? await toggleGoing(event.id)
        : await toggleInterested(event.id);

      if (!result.success) {
        showToast({
          message: result.error ?? copy.error,
          type: 'error',
        });
        return;
      }

      showToast({ message: copy.rsvpUpdated, type: 'success' });
      await refreshActiveTab();
    } finally {
      setBusyRsvp(null);
    }
  }, [copy.error, copy.rsvpUpdated, refreshActiveTab, toggleGoing, toggleInterested]);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <FeedHeader />

      <View className="h-[54px] flex-row items-stretch border-b border-slate-200 bg-white pl-1 pr-2">
        <ScrollView
          horizontal
          className="flex-1"
          contentContainerStyle={{ alignItems: 'stretch' }}
          showsHorizontalScrollIndicator={false}
        >
          {tabs.map(tab => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                className="min-h-[54px] justify-center border-b-2 px-3"
                style={{ borderBottomColor: isActive ? BRAND : 'transparent' }}
                activeOpacity={0.78}
                onPress={() => handleTabPress(tab.key)}
              >
                <Text
                  className="text-[13px] font-semibold"
                  style={{ color: isActive ? BRAND : '#64748B' }}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          className="my-2 ml-2 min-w-[78px] flex-row items-center justify-center rounded-md bg-[#0000ff] px-3"
          activeOpacity={0.82}
          onPress={() => navigation.navigate(ROUTES.CREATE_EVENT)}
        >
          <Plus size={17} color="#FFFFFF" />
          <Text className="ml-1 text-[13px] font-bold text-white">{copy.createShort}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-24 pt-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refreshActiveTab}
            tintColor={BRAND}
          />
        }
      >
        {error ? (
          <View className="mb-4 rounded-lg bg-red-50 px-4 py-3">
            <Text className="text-center text-sm font-semibold text-red-600">{error}</Text>
          </View>
        ) : null}

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
            onGoingPress={() => void handleRsvp(event, 'going')}
            onInterestedPress={() => void handleRsvp(event, 'interested')}
            busyAction={
              busyRsvp?.eventId === String(event.id)
                ? busyRsvp.action
                : null
            }
            copy={copy}
          />
        ))}
      </ScrollView>
      <ToastContainer />
    </View>
  );
}

export default EventsScreen;
