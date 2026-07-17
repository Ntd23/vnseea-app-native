// English description: Displays movie metadata, playback, related movies, sharing, and comments.
import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { SafeAreaFeedHeader } from '../../../feed/presentation/components/SafeAreaFeedHeader';
import { Pressable } from 'react-native';
import { useMovieDetailViewModel } from '../../application/view-models/useMovieDetailViewModel';
import { useMoviesViewModel } from '../../application/view-models/useMoviesViewModel';
import { KeyboardSafeView } from '../../../shared-kernel/presentation/components/KeyboardSafeView';

type MovieDetailRoute = RouteProp<RootStackParamList, typeof ROUTES.MOVIE_DETAIL>;

export default function MovieDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<MovieDetailRoute>();
  const language = useAppLanguage();
  const isVi = language === 'vi';
  const movie = route.params.movie;
  const [commentText, setCommentText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const commentInputRef = useRef<TextInput>(null);
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

  const title = movie.name || movie.title || (isVi ? 'Phim' : 'Movie');
  const shareMovie = () => Share.share({ message: `${title}\n${movie.url || movie.source || ''}` });
  const sendComment = async () => {
    if (await submitComment(commentText)) setCommentText('');
  };
  const revealCommentInput = useCallback(() => {
    const input = commentInputRef.current;
    if (!input) return;
    scrollViewRef.current?.scrollResponderScrollNativeHandleToKeyboard(
      input,
      24,
      true,
    );
  }, []);

  return (
    <KeyboardSafeView style={{ flex: 1, backgroundColor: '#edf2ff' }}>
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <SafeAreaFeedHeader />

      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View className="min-h-[170px] justify-end bg-[#526268] px-5 pb-5" style={{ position: 'relative', paddingTop: 60 }}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{
              position: 'absolute',
              left: 12,
              top: 12,
              zIndex: 10,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={20} color="#ffffff" />
          </Pressable>
          <Pressable
            onPress={shareMovie}
            style={{
              position: 'absolute',
              right: 12,
              top: 12,
              zIndex: 10,
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Share2 size={18} color="#ffffff" />
          </Pressable>
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
          <MovieInfo label={isVi ? 'Diễn viên' : 'Stars'} value={movie.stars} />
          <MovieInfo label={isVi ? 'Thể loại' : 'Genre'} value={String(movie.genre || '').toUpperCase()} accent />
          <MovieInfo label={isVi ? 'Đạo diễn / Nhà sản xuất' : 'Producer / Director'} value={movie.producer} accent />
          <MovieInfo label={isVi ? 'Lượt xem' : 'Views'} value={String(movie.views ?? 0)} accent />
          <View className="mt-2 flex-row items-center">
            <Text className="text-sm text-[#4b5563]">{isVi ? 'Chia sẻ với:' : 'Share with:'}</Text>
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
            <Text className="ml-2 text-sm font-semibold text-[#111827]">{isVi ? 'Hơn như thế này' : 'More like this'}</Text>
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
            <Text className="ml-2 text-sm font-semibold text-[#111827]">{comments.length} {isVi ? 'Bình luận' : 'Comments'}</Text>
          </View>
          <View className="mt-4 flex-row items-center">
            <TextInput
              ref={commentInputRef}
              className="h-12 flex-1 rounded-full border border-[#d7dce4] px-4 text-sm text-[#111827]"
              placeholder={isVi ? "Viết bình luận và nhấn enter" : "Write a comment and press enter"}
              placeholderTextColor="#9ca3af"
              value={commentText}
              onChangeText={setCommentText}
              onFocus={revealCommentInput}
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
    </KeyboardSafeView>
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
