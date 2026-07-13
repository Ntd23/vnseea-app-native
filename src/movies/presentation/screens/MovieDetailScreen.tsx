// English description: Displays movie metadata, playback, related movies, sharing, and comments.
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import VideoPlayer from 'react-native-video';
import {
  ArrowLeft,
  ArrowRight,
  Clapperboard,
  MessageCircle,
  Share2,
  Star,
} from 'lucide-react-native';
import type { RootStackParamList } from '../../../navigation/types';
import { ROUTES } from '../../../navigation/constants/routes';
import FocusAwareStatusBar from '../../../shared-kernel/presentation/components/FocusAwareStatusBar';
import { useMovieDetailViewModel } from '../../application/view-models/useMovieDetailViewModel';
import { useMoviesViewModel } from '../../application/view-models/useMoviesViewModel';

type MovieDetailRoute = RouteProp<RootStackParamList, typeof ROUTES.MOVIE_DETAIL>;

export default function MovieDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<MovieDetailRoute>();
  const movie = route.params.movie;
  const [commentText, setCommentText] = useState('');
  const {
    comments,
    isLoadingComments,
    isSubmittingComment,
    error,
    submitComment,
  } = useMovieDetailViewModel(movie.id);
  const { movies } = useMoviesViewModel();
  const relatedMovies = useMemo(() => movies
    .filter(item => String(item.id) !== String(movie.id) && item.genre === movie.genre)
    .slice(0, 6), [movie.genre, movie.id, movies]);

  const title = movie.name || movie.title || 'Phim';
  const shareMovie = () => Share.share({ message: `${title}\n${movie.url || movie.source || ''}` });
  const sendComment = async () => {
    if (await submitComment(commentText)) setCommentText('');
  };

  return (
    <SafeAreaView className="flex-1 bg-[#edf2ff]" edges={['top']}>
      <FocusAwareStatusBar barStyle="light-content" backgroundColor="#0000ff" />
      <View className="h-12 flex-row items-center bg-[#0000ff] px-3">
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <ArrowLeft size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text className="ml-3 flex-1 text-base font-semibold text-white" numberOfLines={1}>{title}</Text>
        <TouchableOpacity onPress={shareMovie} hitSlop={10}><Share2 size={20} color="#ffffff" /></TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="min-h-[170px] justify-end bg-[#526268] px-5 pb-5">
          <Text className="text-[28px] font-normal text-white" numberOfLines={2}>{title}</Text>
          <View className="mt-3 flex-row items-center">
            <Star size={17} color="#ffc000" fill="#ffc000" />
            <Text className="ml-2 text-sm text-white">{Number(movie.rating ?? 0).toFixed(1)}</Text>
            <Text className="mx-2 text-white/70">•</Text>
            <Text className="text-sm text-white">{movie.duration || 0} min</Text>
            <Text className="mx-2 text-white/70">•</Text>
            <Text className="text-sm text-white">{movie.release || '--'}</Text>
          </View>
        </View>

        <View className="bg-white px-3 py-4">
          <Text className="text-sm leading-6 text-[#4b5563]">{movie.description || ''}</Text>
          <MovieInfo label="Các ngôi sao" value={movie.stars} />
          <MovieInfo label="Thể loại" value={String(movie.genre || '').toUpperCase()} accent />
          <MovieInfo label="Người sản xuất" value={movie.producer} accent />
          <MovieInfo label="Lượt xem" value={String(movie.views ?? 0)} accent />
          <View className="mt-2 flex-row items-center">
            <Text className="text-sm text-[#4b5563]">Chia sẻ với:</Text>
            <TouchableOpacity className="ml-3 h-7 w-7 items-center justify-center bg-[#337ab7]" onPress={shareMovie}>
              <Text className="font-bold text-white">f</Text>
            </TouchableOpacity>
            <TouchableOpacity className="ml-2 h-7 w-7 items-center justify-center bg-[#55acee]" onPress={shareMovie}>
              <Share2 size={15} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View className="mt-5 aspect-video overflow-hidden bg-black">
            {movie.source ? (
              <VideoPlayer
                source={{ uri: movie.source }}
                controls
                paused
                resizeMode="contain"
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <Image source={{ uri: movie.cover }} className="h-full w-full" resizeMode="cover" />
            )}
          </View>
        </View>

        <View className="mt-3 bg-white px-3 pb-5">
          <View className="min-h-[52px] flex-row items-center border-b border-[#e5e7eb]">
            <Clapperboard size={18} color="#0000ff" />
            <Text className="ml-2 text-sm font-semibold text-[#111827]">Hơn như thế này</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingVertical: 16 }}>
            {relatedMovies.map(item => (
              <TouchableOpacity
                key={String(item.id)}
                className="w-32"
                onPress={() => navigation.push(ROUTES.MOVIE_DETAIL, { movie: item })}>
                <Image source={{ uri: item.cover }} className="h-48 w-32 rounded-[4px] bg-[#e5e7eb]" resizeMode="cover" />
                <Text className="mt-2 text-center text-sm font-semibold text-[#374151]" numberOfLines={2}>{item.name || item.title}</Text>
                <Text className="mt-1 text-center text-xs text-[#64748b]">{item.release || ''}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View className="mt-3 bg-white px-3 pb-8">
          <View className="min-h-[52px] flex-row items-center border-b border-[#e5e7eb]">
            <MessageCircle size={18} color="#0000ff" />
            <Text className="ml-2 text-sm font-semibold text-[#111827]">{comments.length} Bình luận</Text>
          </View>
          <View className="mt-4 flex-row items-center">
            <TextInput
              className="h-12 flex-1 rounded-full border border-[#d7dce4] px-4 text-sm text-[#111827]"
              placeholder="Viết bình luận và nhấn enter"
              placeholderTextColor="#9ca3af"
              value={commentText}
              onChangeText={setCommentText}
              onSubmitEditing={sendComment}
            />
            <TouchableOpacity
              className="ml-2 h-12 w-12 items-center justify-center rounded-full bg-[#0000ff]"
              disabled={isSubmittingComment || !commentText.trim()}
              onPress={sendComment}>
              {isSubmittingComment ? <ActivityIndicator color="#ffffff" /> : <ArrowRight size={21} color="#ffffff" />}
            </TouchableOpacity>
          </View>
          {!!error && <Text className="mt-2 text-xs text-red-600">{error}</Text>}
          {isLoadingComments && <ActivityIndicator className="mt-4" color="#0000ff" />}
          {comments.map(comment => (
            <View key={String(comment.id)} className="mt-4 flex-row border-t border-[#f1f5f9] pt-3">
              {comment.userAvatar ? <Image source={{ uri: comment.userAvatar }} className="h-9 w-9 rounded-full" /> : <View className="h-9 w-9 rounded-full bg-[#e5e7eb]" />}
              <View className="ml-3 flex-1">
                <Text className="text-sm font-semibold text-[#111827]">{comment.userName}</Text>
                <Text className="mt-1 text-sm text-[#4b5563]">{comment.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MovieInfo({ label, value, accent = false }: { label: string; value?: string; accent?: boolean }) {
  if (!value) return null;
  return (
    <View className="mt-3 flex-row flex-wrap">
      <Text className="text-sm text-[#4b5563]">{label}: </Text>
      <Text className={`text-sm ${accent ? 'text-[#0000ff]' : 'text-[#374151]'}`}>{value}</Text>
    </View>
  );
}
