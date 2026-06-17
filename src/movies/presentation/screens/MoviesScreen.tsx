// Description: Renders VNSEEA movies grid with API data, category filters and beautiful card layout.
import React from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity as Pressable,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Clapperboard,
  Play,
  Star,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { useMoviesViewModel } from '../../application/view-models/useMoviesViewModel';
import type { MovieItem } from '../../domain/types/movies.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';

type MoviesNav = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 48) / 2; // 2 columns with gap
const BRAND = '#0000ff';

const categories = [
  { key: 'Tất cả', label: 'Tất cả' },
  { key: 'action', label: 'Hành động' },
  { key: 'drama', label: 'Kịch tính' },
  { key: 'comedy', label: 'Hài' },
  { key: 'romance', label: 'Tình cảm' },
  { key: 'horror', label: 'Kinh dị' },
  { key: 'scifi', label: 'Viễn tưởng' },
  { key: 'anime', label: 'Anime' },
];

interface MovieCardProps {
  movie: MovieItem;
  onPress: () => void;
}

function MovieCard({ movie, onPress }: MovieCardProps) {
  const qualityColors: Record<string, string> = {
    hd: '#22c55e',
    'hd-tv': '#22c55e',
    dvd: '#f59e0b',
    sd: '#94a3b8',
  };
  const qualityColor = movie.quality ? qualityColors[movie.quality] || BRAND : BRAND;

  return (
    <Pressable
      onPress={onPress}
      activeOpacity={0.9}
      className="mb-4 rounded-2xl bg-white shadow-md"
      style={{
        width: CARD_WIDTH,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
      }}
    >
      {/* Thumbnail */}
      <View className="relative overflow-hidden rounded-t-2xl">
        <Image
          source={{ uri: movie.cover }}
          className="w-full"
          style={{ height: CARD_WIDTH * 1.3 }}
          resizeMode="cover"
        />

        {/* Gradient Overlay */}
        <View className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Play Button */}
        <View className="absolute inset-0 items-center justify-center">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
            <Play size={22} color={BRAND} fill={BRAND} />
          </View>
        </View>

        {/* Quality Badge */}
        {movie.quality && (
          <View
            className="absolute left-2 top-2 rounded-md px-2 py-1"
            style={{ backgroundColor: qualityColor }}
          >
            <Text className="text-[10px] font-bold text-white">
              {movie.quality.toUpperCase()}
            </Text>
          </View>
        )}

        {/* Duration (if available) */}
        {movie.source && (
          <View className="absolute bottom-2 right-2 rounded-md bg-black/70 px-2 py-1">
            <Text className="text-caption-secondary text-white">Film</Text>
          </View>
        )}
      </View>

      {/* Info */}
      <View className="p-3">
        <Text
          className="text-[15px] font-semibold leading-tight text-slate-800"
          numberOfLines={2}
        >
          {movie.name || movie.title || 'Không có tiêu đề'}
        </Text>

        <View className="mt-2 flex-row items-center justify-between">
          {/* Country / Year */}
          <View className="flex-row items-center gap-1">
            {movie.release && (
              <Text className="text-caption-secondary text-slate-500">
                {movie.release}
              </Text>
            )}
            {movie.country && (
              <>
                <Text className="text-caption-secondary text-slate-300">•</Text>
                <Text className="text-caption-secondary text-slate-500">
                  {movie.country}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Genre Tags */}
        {movie.genre && (
          <View className="mt-2 flex-row flex-wrap gap-1">
            <View className="rounded-full bg-slate-100 px-2 py-0.5">
              <Text className="text-[10px] font-medium text-slate-600">
                {movie.genre}
              </Text>
            </View>
          </View>
        )}
      </View>
    </Pressable>
  );
}

function EmptyState({ onRetry }: { onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-slate-100">
        <Clapperboard size={48} color="#94a3b8" />
      </View>
      <Text className="text-[18px] font-semibold text-slate-700">
        Không tìm thấy phim
      </Text>
      <Text className="mt-2 text-center text-body-secondary text-slate-500">
        Hiện tại không có phim nào trong danh mục này
      </Text>
      <Pressable
        className="mt-6 rounded-full bg-[#0000ff] px-8 py-3"
        activeOpacity={0.8}
        onPress={onRetry}
      >
        <Text className="text-[14px] font-semibold text-white">Xem tất cả</Text>
      </Pressable>
    </View>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center px-8 py-20">
      <View className="mb-6 h-24 w-24 items-center justify-center rounded-full bg-red-50">
        <Text className="text-4xl">😢</Text>
      </View>
      <Text className="text-[18px] font-semibold text-slate-700">
        Đã xảy ra lỗi
      </Text>
      <Text className="mt-2 text-center text-body-secondary text-slate-500">
        {error}
      </Text>
      <Pressable
        className="mt-6 rounded-full bg-[#0000ff] px-8 py-3"
        activeOpacity={0.8}
        onPress={onRetry}
      >
        <Text className="text-[14px] font-semibold text-white">Thử lại</Text>
      </Pressable>
    </View>
  );
}

function LoadingState() {
  return (
    <View className="flex-1 items-center justify-center py-20">
      <ActivityIndicator size="large" color={BRAND} />
      <Text className="mt-4 text-body-secondary text-slate-500">
        Đang tải phim...
      </Text>
    </View>
  );
}

function MoviesScreen() {
  const navigation = useNavigation<MoviesNav>();
  const { movies, isLoading, error, activeGenre, setActiveGenre, reload } =
    useMoviesViewModel();

  return (
    <SafeAreaView className="flex-1 bg-[#f1f4fb]" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#f1f4fb" />

      {/* Header */}
      <View className="flex-row items-center justify-between bg-[#f1f4fb] px-4 pb-3">
        <View className="flex-row items-center gap-3">
          <Pressable
            className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
            activeOpacity={0.8}
            onPress={() => navigation.goBack()}
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 8,
            }}
          >
            <ArrowLeft size={22} color="#1e293b" />
          </Pressable>
          <View>
            <Text className="text-[22px] font-bold text-slate-800">Phim</Text>
            <Text className="text-caption-secondary text-slate-500">
              {movies.length} phim
            </Text>
          </View>
        </View>
      </View>

      {/* Category Filter */}
      <View className="bg-[#f1f4fb] pb-2">
        <ScrollView
          horizontal
          contentContainerClassName="gap-2 px-4"
          contentContainerStyle={{ paddingBottom: 8 }}
          showsHorizontalScrollIndicator={false}
        >
          {categories.map(cat => {
            const isActive = activeGenre === cat.key;
            return (
              <Pressable
                key={cat.key}
                className={`rounded-full px-4 py-2 ${
                  isActive ? 'bg-[#0000ff]' : 'bg-white'
                }`}
                activeOpacity={0.8}
                onPress={() => setActiveGenre(cat.key)}
                style={
                  !isActive
                    ? {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.04,
                        shadowRadius: 4,
                      }
                    : {}
                }
              >
                <Text
                  className={`text-[13px] font-medium ${
                    isActive ? 'text-white' : 'text-slate-600'
                  }`}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8 pt-2"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={reload}
            colors={[BRAND]}
            tintColor={BRAND}
          />
        }
      >
        {/* Section Title */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[16px] font-semibold text-slate-800">
            {activeGenre === 'Tất cả' ? 'Phim mới nhất' : 'Phim theo thể loại'}
          </Text>
          <Text className="text-caption-secondary text-slate-400">
            {movies.length} phim
          </Text>
        </View>

        {isLoading && movies.length === 0 ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : movies.length === 0 ? (
          <EmptyState onRetry={() => setActiveGenre('Tất cả')} />
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {movies.map(movie => (
              <MovieCard
                key={movie.id}
                movie={movie}
                onPress={() => {
                  // TODO: Navigate to movie detail
                  console.log('Movie pressed:', movie.id);
                }}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default MoviesScreen;
