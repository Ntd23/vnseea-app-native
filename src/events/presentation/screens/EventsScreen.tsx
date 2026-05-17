// Description: Renders the VNSEEA events list with event discovery and app-bar create navigation.
import React from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Plus,
  Users,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ROUTES } from '../../../navigation/constants/routes';
import type { RootStackParamList } from '../../../navigation/types';

type EventsNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

const events = [
  {
    id: 'event-1',
    title: 'VNSEEA Product Meetup',
    date: '18 Thg 5',
    time: '19:00',
    location: 'Quận 1, TP. HCM',
    attendees: '1,2K người quan tâm',
    image:
      'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 'event-2',
    title: 'Design System Workshop',
    date: '25 Thg 5',
    time: '09:30',
    location: 'Online',
    attendees: '842 người tham gia',
    image:
      'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop',
  },
  {
    id: 'event-3',
    title: 'Founder Coffee Talk',
    date: '02 Thg 6',
    time: '08:00',
    location: 'Ba Đình, Hà Nội',
    attendees: '418 người quan tâm',
    image:
      'https://images.unsplash.com/photo-1517048676732-d65bc937f952?q=80&w=1200&auto=format&fit=crop',
  },
];

function EventsScreen() {
  const navigation = useNavigation<EventsNav>();

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
        <Text className="text-title-primary text-inverse">Sự kiện</Text>
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
      >
        <View className="mb-4 flex-row gap-3">
          {['Sắp diễn ra', 'Online', 'Gần bạn'].map((tab, index) => (
            <View
              key={tab}
              className={`rounded-full px-4 py-2 ${
                index === 0 ? 'surface-brand' : 'surface-muted'
              }`}
            >
              <Text
                className={
                  index === 0
                    ? 'text-caption-primary text-inverse'
                    : 'text-caption-secondary'
                }
              >
                {tab}
              </Text>
            </View>
          ))}
        </View>

        {events.map(event => (
          <View key={event.id} className="surface-card mb-4 overflow-hidden">
            <Image
              source={{ uri: event.image }}
              className="h-40 w-full"
              resizeMode="cover"
            />
            <View className="p-4">
              <View className="flex-row">
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#0000ff]/10">
                  <Text className="text-center text-title-primary text-brand">
                    {event.date}
                  </Text>
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-title-primary">{event.title}</Text>
                  <View className="mt-2 flex-row items-center">
                    <CalendarDays size={15} color={BRAND} />
                    <Text className="ml-2 text-caption-secondary">
                      {event.time}
                    </Text>
                  </View>
                  <View className="mt-1 flex-row items-center">
                    <MapPin size={15} color={BRAND} />
                    <Text className="ml-2 text-caption-secondary">
                      {event.location}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3">
                <View className="flex-row items-center">
                  <Users size={16} color={BRAND} />
                  <Text className="ml-2 text-caption-secondary">
                    {event.attendees}
                  </Text>
                </View>
                <TouchableOpacity
                  className="rounded-full bg-[#0000ff]/10 px-4 py-2"
                  activeOpacity={0.8}
                >
                  <Text className="text-caption-primary text-brand">
                    Quan tâm
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

export default EventsScreen;
