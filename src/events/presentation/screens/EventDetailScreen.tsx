// Description: Shows an event detail page with owner edit and delete actions.
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CalendarDays,
  Edit3,
  MapPin,
  Trash2,
  Users,
} from 'lucide-react-native';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';
import { useEventsViewModel } from '../../application/view-models/useEventsViewModel';
import { showToast, ToastContainer } from '../../../shared-kernel/presentation/components/ToastNotification';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  languageStorage,
  type AppLanguage,
} from '../../../shared-kernel/infrastructure/storage/languageStorage';
import { getEventsCopy } from '../../application/i18n/eventsCopy';

type EventDetailNav = NativeStackNavigationProp<RootStackParamList>;
type EventDetailRoute = RouteProp<RootStackParamList, typeof ROUTES.EVENT_DETAIL>;

const BRAND = '#0000ff';

function EventDetailScreen() {
  const navigation = useNavigation<EventDetailNav>();
  const route = useRoute<EventDetailRoute>();
  const { event } = route.params;
  const { isDeleting, deleteEvent } = useEventsViewModel();
  const [language] = useState<AppLanguage>(languageStorage.getLanguage());
  const copy = getEventsCopy(language);

  const readEventText = (value?: string | number | null, fallback = copy.notUpdated) => {
    if (value === undefined || value === null || value === '') return fallback;
    return String(value);
  };

  const title = event.name ?? event.event_name ?? copy.eventTitle;
  const description = event.description ?? event.event_description;
  const location = event.location ?? event.event_location;
  const startDate = event.start_date ?? event.event_start_date;
  const startTime = event.start_time ?? event.event_start_time;
  const endDate = event.end_date ?? event.event_end_date;
  const endTime = event.end_time ?? event.event_end_time;
  const cover = event.cover ?? event.event_cover;
  const isOwner = event.is_owner === true;

  const confirmDelete = () => {
    Alert.alert(
      copy.deleteEvent,
      copy.deleteConfirm,
      [
        { text: copy.cancel, style: 'cancel' },
        {
          text: copy.delete,
          style: 'destructive',
          onPress: async () => {
            const result = await deleteEvent(event.id);
            if (result.success) {
              showToast({ message: copy.deleteSuccess, type: 'success' });
              setTimeout(() => navigation.navigate(ROUTES.EVENTS), 800);
            } else {
              showToast({
                message: result.error ?? copy.deleteError,
                type: 'error',
              });
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 surface-base" edges={['top']}>
      <FocusAwareStatusBar barStyle="light-content" backgroundColor={BRAND} />

      <View className="surface-brand h-14 flex-row items-center justify-between px-4">
        <TouchableOpacity
          className="h-10 w-10 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text className="text-title-primary text-inverse">{copy.eventDetail}</Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-24"
        showsVerticalScrollIndicator={false}
      >
        {cover ? (
          <Image source={{ uri: cover }} className="h-56 w-full" resizeMode="cover" />
        ) : (
          <View className="h-44 w-full items-center justify-center bg-[#dfe4ff]">
            <CalendarDays size={48} color={BRAND} />
          </View>
        )}

        <View className="px-4 pt-4">
          <View className="surface-card p-5">
            <Text className="text-heading">{title}</Text>

            <View className="mt-5 gap-3">
              <View className="flex-row items-start">
                <CalendarDays size={20} color={BRAND} />
                <View className="ml-3 flex-1">
                  <Text className="text-title-secondary">{copy.time}</Text>
                  <Text className="mt-1 text-body-primary">
                    {readEventText(startDate)} {readEventText(startTime, '')}
                  </Text>
                  <Text className="text-caption-secondary">
                    {copy.end}: {readEventText(endDate)} {readEventText(endTime, '')}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <MapPin size={20} color={BRAND} />
                <View className="ml-3 flex-1">
                  <Text className="text-title-secondary">{copy.location}</Text>
                  <Text className="mt-1 text-body-primary">{readEventText(location)}</Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <Users size={20} color={BRAND} />
                <View className="ml-3 flex-1">
                  <Text className="text-title-secondary">{copy.participants}</Text>
                  <Text className="mt-1 text-body-primary">
                    {readEventText(event.going_count, '0')} {copy.participantsLabel}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View className="surface-card mt-4 p-5">
            <Text className="text-title-primary">{copy.description}</Text>
            <Text className="mt-3 text-body-primary">{readEventText(description)}</Text>
          </View>

          {isOwner && (
            <View className="mt-4 flex-row gap-3">
              <TouchableOpacity
                className="btn-primary min-h-[48px] flex-1"
                activeOpacity={0.9}
                onPress={() => navigation.navigate(ROUTES.EDIT_EVENT, { event })}
              >
                <Edit3 size={18} color="#FFFFFF" />
                <Text className="text-title-primary text-inverse">{copy.edit}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="min-h-[48px] flex-1 flex-row items-center justify-center rounded-full bg-red-500 px-5"
                activeOpacity={0.9}
                disabled={isDeleting}
                onPress={confirmDelete}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Trash2 size={18} color="#FFFFFF" />
                    <Text className="ml-2 text-title-primary text-inverse">{copy.delete}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      <ToastContainer />
    </SafeAreaView>
  );
}

export default EventDetailScreen;
