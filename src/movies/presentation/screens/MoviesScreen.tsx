// English description: Renders the API-backed movie catalog with phtml-style filters.
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity as Pressable,
  View,
} from 'react-native';
import {
  ArrowLeft,
  Check,
  Clapperboard,
  Film,
  Funnel,
  Play,
  Plus,
  Star,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import { useMoviesViewModel } from '../../application/view-models/useMoviesViewModel';
import type { MovieItem } from '../../domain/types/movies.types';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import {
  MOVIE_COUNTRY_KEYS,
  MOVIE_GENRE_KEYS,
} from '../../domain/types/movies.types';
import { languageStorage } from '../../../shared-kernel/infrastructure/storage/languageStorage';

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
        <Pressable
          className="h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm"
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.navigate(ROUTES.CREATE_MOVIE)}
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.06,
            shadowRadius: 8,
          }}
        >
          <Plus size={22} color={BRAND} />
        </Pressable>
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

type MovieSort = 'new' | 'recommended' | 'watched';

const VI_GENRES: Record<string, string> = {
  action: 'Hành động', comedy: 'Hài', drama: 'Chính kịch', horror: 'Kinh dị',
  mythological: 'Thần thoại', war: 'Chiến tranh', adventure: 'Phiêu lưu',
  family: 'Gia đình', sport: 'Thể thao', animation: 'Hoạt hình', crime: 'Tội phạm',
  fantasy: 'Giả tưởng', musical: 'Nhạc kịch', romance: 'Tình cảm', thriller: 'Giật gân',
  history: 'Lịch sử', documentary: 'Tài liệu', tvshow: 'TV Show',
};

const VI_COUNTRIES: Record<string, string> = {
  'united-states': 'Hoa Kỳ', china: 'Trung Quốc', india: 'Ấn Độ', iran: 'Iran',
  japan: 'Nhật Bản', turkey: 'Thổ Nhĩ Kỳ', russia: 'Nga', france: 'Pháp',
  'united-kingdom': 'Anh', vietnam: 'Việt Nam',
};

function CatalogMovieCard({ movie }: { movie: MovieItem }) {
  const navigation = useNavigation<any>();
  const rating = Number(movie.rating ?? 0);
  return (
    <Pressable
      activeOpacity={0.85}
      className="mb-5"
      style={{ width: CARD_WIDTH }}
      onPress={() => navigation.navigate(ROUTES.MOVIE_DETAIL, { movie })}>
      <View
        className="overflow-hidden rounded-[4px] bg-white"
        style={{ elevation: 3, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 4 }}>
        <Image
          source={{ uri: movie.cover }}
          className="w-full bg-[#e5e7eb]"
          style={{ height: CARD_WIDTH * 1.45 }}
          resizeMode="cover"
        />
        <View className="absolute left-2 top-2 flex-row items-center rounded-full bg-[#8b8b8b]/90 px-1.5 py-1">
          <Star size={13} color="#ffffff" fill="#ffffff" />
          <Text className="ml-0.5 text-xs font-semibold text-white">
            {Number.isFinite(rating) ? rating.toFixed(rating % 1 === 0 ? 0 : 1) : '0'}
          </Text>
        </View>
      </View>
      <Text className="mt-3 text-center text-sm font-semibold text-[#374151]" numberOfLines={1}>
        {movie.name || movie.title || 'Không có tiêu đề'}
      </Text>
      <Text className="mt-1 text-center text-xs text-[#64748b]" numberOfLines={1}>
        {VI_GENRES[String(movie.genre ?? '').toLowerCase()] || movie.genre || movie.category || ''}
      </Text>
    </Pressable>
  );
}

function MoviesCatalogScreen() {
  const navigation = useNavigation<MoviesNav>();
  const {
    movies,
    isLoading,
    error,
    activeGenre,
    setActiveGenre,
    activeCountry,
    setActiveCountry,
    reload,
  } = useMoviesViewModel();
  const isVi = languageStorage.getLanguage() === 'vi';
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<MovieSort>('new');
  const [filterOpen, setFilterOpen] = useState(false);

  const visibleMovies = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase();
    let items = movies.filter(movie => {
      if (!keyword) return true;
      return [movie.name, movie.title, movie.genre, movie.country, movie.release]
        .some(value => String(value ?? '').toLocaleLowerCase().includes(keyword));
    });

    const currentYear = String(new Date().getFullYear());
    if (sort === 'recommended') {
      const recommended = items.filter(movie =>
        String(movie.release ?? '') === currentYear
        || ['hd', 'dvd', 'hd-tv'].includes(String(movie.quality ?? '').toLowerCase()),
      );
      if (recommended.length > 0) items = recommended;
    }

    return [...items].sort((left, right) =>
      sort === 'watched'
        ? Number(right.views ?? 0) - Number(left.views ?? 0)
        : Number(right.id ?? 0) - Number(left.id ?? 0),
    );
  }, [movies, search, sort]);

  const tabs: Array<{ key: MovieSort; label: string; Icon: typeof Film }> = [
    { key: 'new', label: isVi ? 'Mới' : 'New', Icon: Film },
    { key: 'recommended', label: isVi ? 'Khuyến khích' : 'Recommended', Icon: Sparkles },
    { key: 'watched', label: isVi ? 'Xem nhiều nhất' : 'Most watched', Icon: TrendingUp },
  ];

  const genres = [
    { value: 'Tất cả', label: isVi ? 'Tất cả' : 'All' },
    ...MOVIE_GENRE_KEYS.map(value => ({ value, label: isVi ? VI_GENRES[value] : value })),
  ];
  const countries = [
    { value: 'Tất cả', label: isVi ? 'Tất cả' : 'All' },
    ...MOVIE_COUNTRY_KEYS.map(value => ({ value, label: isVi ? VI_COUNTRIES[value] : value })),
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#eaf0ff]" edges={['top']}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <View className="h-12 flex-row items-center border-b border-[#e5e7eb] bg-white px-3">
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <ArrowLeft size={22} color="#0000ff" />
        </Pressable>
        <Text className="ml-3 text-base font-semibold text-[#111827]">{isVi ? 'Phim' : 'Movies'}</Text>
      </View>

      <View className="bg-white px-3 pb-4 pt-3">
        <View className="flex-row items-center gap-2">
          <TextInput
            className="h-11 flex-1 rounded-[5px] bg-[#eeeeee] px-3 text-sm text-[#111827]"
            placeholder={isVi ? 'Tìm kiếm' : 'Search'}
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
          <Pressable
            className="h-11 w-11 items-center justify-center rounded-full bg-[#eef1f5]"
            onPress={() => setFilterOpen(true)}>
            <Funnel size={19} color="#475569" />
          </Pressable>
        </View>

        <View className="mt-3 flex-row flex-wrap justify-center gap-3">
          {tabs.map(({ key, label, Icon }) => {
            const active = sort === key;
            return (
              <Pressable
                key={key}
                className={`min-h-[38px] flex-row items-center rounded-full border px-4 ${active ? 'border-[#0000ff] bg-[#eef2ff]' : 'border-[#e5e7eb] bg-white'}`}
                onPress={() => setSort(key)}>
                <Icon size={14} color={active ? '#0000ff' : '#475569'} />
                <Text className={`ml-2 text-xs font-semibold ${active ? 'text-[#0000ff]' : 'text-[#475569]'}`}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 28, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={reload} colors={[BRAND]} tintColor={BRAND} />}>
        {isLoading && movies.length === 0 ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : visibleMovies.length === 0 ? (
          <EmptyState onRetry={() => { setSearch(''); setActiveGenre('Tất cả'); setActiveCountry('Tất cả'); }} />
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {visibleMovies.map(movie => <CatalogMovieCard key={String(movie.id)} movie={movie} />)}
          </View>
        )}
      </ScrollView>

      <Modal visible={filterOpen} transparent animationType="slide" onRequestClose={() => setFilterOpen(false)}>
        <View className="flex-1 justify-end bg-black/35">
          <Pressable className="flex-1" onPress={() => setFilterOpen(false)} />
          <View className="h-[72%] rounded-t-2xl bg-white pb-5">
            <View className="items-center py-3"><View className="h-1.5 w-12 rounded-full bg-[#cbd5e1]" /></View>
            <Text className="border-b border-[#e5e7eb] px-4 pb-3 text-base font-semibold text-[#111827]">{isVi ? 'Bộ lọc phim' : 'Movie filters'}</Text>
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 30 }} showsVerticalScrollIndicator persistentScrollbar>
              <Text className="mb-2 text-sm font-semibold text-[#374151]">{isVi ? 'Thể loại' : 'Genre'}</Text>
              <View className="flex-row flex-wrap gap-2">
                {genres.map(item => {
                  const active = activeGenre === item.value;
                  return (
                    <Pressable key={item.value} className={`flex-row items-center border px-3 py-2 ${active ? 'border-[#0000ff] bg-[#eef2ff]' : 'border-[#e5e7eb]'}`} onPress={() => setActiveGenre(item.value)}>
                      {active && <Check size={14} color="#0000ff" />}
                      <Text className={`text-xs ${active ? 'ml-1 text-[#0000ff]' : 'text-[#475569]'}`}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text className="mb-2 mt-6 text-sm font-semibold text-[#374151]">{isVi ? 'Quốc gia' : 'Country'}</Text>
              <View className="flex-row flex-wrap gap-2">
                {countries.map(item => {
                  const active = activeCountry === item.value;
                  return (
                    <Pressable key={item.value} className={`flex-row items-center border px-3 py-2 ${active ? 'border-[#0000ff] bg-[#eef2ff]' : 'border-[#e5e7eb]'}`} onPress={() => setActiveCountry(item.value)}>
                      {active && <Check size={14} color="#0000ff" />}
                      <Text className={`text-xs ${active ? 'ml-1 text-[#0000ff]' : 'text-[#475569]'}`}>{item.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
            <Pressable className="mx-4 h-11 items-center justify-center rounded-[5px] bg-[#0000ff]" onPress={() => setFilterOpen(false)}>
              <Text className="font-semibold text-white">{isVi ? 'Áp dụng' : 'Apply'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default MoviesCatalogScreen;
