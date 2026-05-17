// Description: Renders a simple VNSEEA movies list with category filters and movie metadata.
import React, { useState } from 'react';
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
  Funnel,
  MoreHorizontal,
  Play,
  UserRound,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';

type MoviesNav = NativeStackNavigationProp<RootStackParamList>;

const BRAND = '#0000ff';

const categories = [
  'Tất cả',
  'Hành động',
  'Tình cảm',
  'Kịch tính',
  'Viễn tưởng',
];

const movies = [
  {
    id: 'movie-1',
    title: 'The Blacklist Season 8 Pro...',
    author: '@WoWonder Combined',
    views: '13,8k Views',
    year: '2020',
    duration: '4:10',
    category: 'Kịch tính',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDwxrqMew5PJMq6mhuLxq2y7TSCTQYoZYKFCiKMJRiXb3O8trPkp8uowUFdSN8OOBClL6D6WrmR4Yn-XF2aIGY9MzTU8aoiK1OtcLpdGXLZTymzEKrrS907K4STCYp5dLiljJTTh4id3Kox2luE1P63CVMmWwPyDD9DDXqL8LT6Xu7FXnrpPRht3Par9zbMIZNuX2V2HMq8rZUgL_ZvDZGW3Un2fnOCfGWJWaDyHCXtYIbNvsoj01CMKduZNhwNczJ8OIRXB9z09oI',
  },
  {
    id: 'movie-2',
    title: '12 Rounds',
    author: '@WoWonder Combined',
    views: '28,7k Views',
    year: '2009',
    duration: '1:13',
    category: 'Hành động',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBeuEoNhnNe4tKwcptDyvCz2Nxwj8tID-pnJ7W_8FkZrKXcRJ2aBpyUWkMjW62IullcNGCqTioXAr9RFhXxCz4cOHDYmZsKFNcb2fpDaqKkO3XvkF_fKr_DgDLeqXNKanhuj4rWZ1NO2kuVs72oIsAwQxR1QyJHZQhNuKn4oTMm2ccP1nWQ8UpZe5TMp47i7h9zcBUCheDZlZo5x1ymGdnHCdJNKJfB24Rdco-cCqha8JlcQVY6WecEzApGznehSpoaxTztiR-Mpxg',
  },
  {
    id: 'movie-3',
    title: 'Hẹn Ước Mùa Mưa',
    author: '@VNSEEA Movies',
    views: '19,1k Views',
    year: '2024',
    duration: '2:25',
    category: 'Tình cảm',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDW3GBPbX6pdbVTa5d81a4TO_z5HZOaKs83gL0QxEXmEKcVLDJdbsW6fu-Eye1NYUaS0OAsHKIazI-XJ-2K8VQ8Mwqlk8AKTOUIE5Pch8EwYy8YiSiNnij11WuocqzrqvYZoeztHa2z9adIotqMA0ylSb_KL5TUsKHaY9QcXiBrp-Nib02NesPtlvT9q53loBGSw1Vw08m7fu36ZlMVxKyAnQr6LMYUmxSPdrQ3DAkS8Q84IsOe_U8JdidBF7H8EGBbmo0ECx6KXpY',
  },
  {
    id: 'movie-4',
    title: 'Đại Dương Ánh Sáng',
    author: '@VNSEEA Studio',
    views: '34,2k Views',
    year: '2023',
    duration: '3:42',
    category: 'Viễn tưởng',
    image:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuDe9acRISV4g1IyjDxfMj0Sgo0IYCrKWCozthvi4moliXrdlcq6uKr5KYuOpldLnwsv5-C_ZtPJ6sWt84dzHdg9zfrhYiF8-S3gIgfPVAPvqxNH7wjHQv98HosfvidDh6z6S_F1VGAVJRKkozhe247DBgovJe7D3OOU4prhmZPBg7OO2DlRMtms4wYtnIyW-WsY0lrv1HX2StRZfSi85zJkptJPGpDLZ_6I8Qj4gtgHxi0P_BNnhVqifVJeQRLmDWwZVEC9MTv3WiQ',
  },
];

function MoviesScreen() {
  const navigation = useNavigation<MoviesNav>();
  const [activeCategory, setActiveCategory] = useState(categories[0]);

  const visibleMovies =
    activeCategory === 'Tất cả'
      ? movies
      : movies.filter(movie => movie.category === activeCategory);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View className="h-16 flex-row items-center border-b border-slate-100 bg-white px-4">
        <TouchableOpacity
          className="h-11 w-11 items-center justify-center rounded-full"
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={28} color="#111827" />
        </TouchableOpacity>
        <Text className="ml-5 text-[32px] font-normal text-[#111827]">
          Movies
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-28"
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          horizontal
          className="border-b border-slate-100 bg-white"
          contentContainerClassName="gap-3 px-4 py-3"
          showsHorizontalScrollIndicator={false}
        >
          {categories.map(category => {
            const isActive = category === activeCategory;
            return (
              <TouchableOpacity
                key={category}
                className={`rounded-full px-4 py-2 ${
                  isActive ? 'bg-[#0000ff]' : 'bg-slate-100'
                }`}
                activeOpacity={0.8}
                onPress={() => setActiveCategory(category)}
              >
                <Text
                  className={`text-caption-primary ${
                    isActive ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {visibleMovies.map(movie => (
          <TouchableOpacity
            key={movie.id}
            className="mb-5 bg-white"
            activeOpacity={0.88}
          >
            <View className="relative">
              <Image
                source={{ uri: movie.image }}
                className="h-[288px] w-full"
                resizeMode="cover"
              />
              <View className="absolute bottom-4 right-4 rounded-lg bg-black/70 px-3 py-2">
                <Text className="text-caption-primary text-white">
                  {movie.duration}
                </Text>
              </View>
            </View>

            <View className="flex-row px-5 py-4">
              <View className="h-14 w-14 items-center justify-center rounded-full bg-[#0000ff]/10">
                <UserRound size={28} color={BRAND} />
              </View>

              <View className="ml-4 flex-1">
                <View className="flex-row items-center justify-between">
                  <Text
                    className="flex-1 text-[28px] font-normal text-[#3f3f46]"
                    numberOfLines={1}
                  >
                    {movie.title}
                  </Text>
                  <MoreHorizontal size={28} color="#CBD5E1" />
                </View>

                <View className="mt-2 flex-row items-center">
                  <Text
                    className="w-[48%] text-[23px] leading-7 text-[#3f3f46]"
                    numberOfLines={2}
                  >
                    {movie.author}
                  </Text>
                  <Text className="ml-3 text-[20px] text-[#3f3f46]">
                    {movie.views}
                  </Text>
                  <Text className="ml-4 text-[20px] text-[#3f3f46]">
                    {movie.year}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        className="absolute bottom-6 right-5 h-16 w-16 items-center justify-center rounded-full bg-[#0000ff]"
        activeOpacity={0.88}
        onPress={() => {
          const currentIndex = categories.indexOf(activeCategory);
          const nextIndex = (currentIndex + 1) % categories.length;
          setActiveCategory(categories[nextIndex]);
        }}
      >
        <Funnel size={28} color="#FFFFFF" fill="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

export default MoviesScreen;
