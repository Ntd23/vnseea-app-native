// Description: Live stream viewer room - shows live metadata, comments, and actions.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronDown,
  Eye,
  Heart,
  RefreshCw,
  Send,
  Share2,
  Smile,
  X,
} from 'lucide-react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLiveRoomViewModel } from '../../application/view-models/useLiveViewModel';
import { LiveCameraPreview } from '../components/LiveCameraPreview';
import { LiveKitStreamView } from '../components/LiveKitStreamView';
import type { LiveSession, LiveStreamComment } from '../../domain/types/live.types';

type LiveRouteParams = {
  postId: number;
  isHost?: boolean;
  liveSession?: LiveSession;
};

const { width: windowWidth, height: windowHeight } = Dimensions.get('window');

const commentsContentStyle = { paddingBottom: 10 };

export default function LiveRoomScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<{ params: LiveRouteParams }, 'params'>>();
  const {
    postId,
    isHost: routeIsHost = false,
    liveSession: routeLiveSession,
  } = route.params || {
    postId: 0,
    isHost: false,
    liveSession: undefined,
  };

  const {
    streamInfo,
    liveSession,
    comments,
    viewerCount,
    reactionsCount,
    reactionEvents,
    isHost: streamIsHost,
    isLoading,
    hasLoadedComments,
    error,
    sendComment,
    react,
    leave,
    currentUserProfile,
  } = useLiveRoomViewModel(postId, routeLiveSession);

  const [commentText, setCommentText] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const inputRef = React.useRef<TextInput>(null);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  const insets = useSafeAreaInsets();
  const isHost = routeIsHost || streamIsHost;
  const hasLiveKitSession = Boolean(liveSession?.wsUrl && liveSession?.token);
  
  const [fallingEmojis, setFallingEmojis] = useState<Array<{
    id: string;
    emoji: string;
    x: number;
    animY: Animated.Value;
  }>>([]);
  const [reactionToasts, setReactionToasts] = useState<Array<{
    id: string;
    name: string;
    emoji: string;
  }>>([]);

  const spawnEmojiRain = useCallback((emoji: string, count: number) => {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const id = Math.random().toString(36).substring(2, 9);
        const x = Math.random() * (windowWidth - 60) + 20;
        const animY = new Animated.Value(-50);

        const newEmoji = { id, emoji, x, animY };
        setFallingEmojis(prev => [...prev, newEmoji]);

        Animated.timing(animY, {
          toValue: windowHeight + 50,
          duration: Math.random() * 1000 + 2000,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) {
            setFallingEmojis(prev => prev.filter(item => item.id !== id));
          }
        });
      }, i * 80);
    }
  }, []);

  const triggerReactionToast = useCallback((name: string, emoji: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setReactionToasts(prev => [...prev, { id, name, emoji }]);
    setTimeout(() => {
      setReactionToasts(prev => prev.filter(item => item.id !== id));
    }, 3000);
  }, []);

  const lastReactionsCount = React.useRef(reactionsCount);
  const handledReactionEvents = React.useRef(new Set<string>());
  const lastDetailedReactionAt = React.useRef(0);
  const hasReactionCountBaseline = React.useRef(false);
  useEffect(() => {
    handledReactionEvents.current.clear();
    lastDetailedReactionAt.current = 0;
    lastReactionsCount.current = 0;
    hasReactionCountBaseline.current = false;
  }, [postId]);

  useEffect(() => {
    if (!isHost || reactionEvents.length === 0) return;

    reactionEvents.forEach(event => {
      if (handledReactionEvents.current.has(event.id)) return;
      handledReactionEvents.current.add(event.id);
      lastDetailedReactionAt.current = Date.now();
      spawnEmojiRain(event.emoji, 24);
      triggerReactionToast(event.name, event.emoji);
    });
  }, [isHost, reactionEvents, spawnEmojiRain, triggerReactionToast]);

  useEffect(() => {
    // Only host receives remote reaction animations and toasts
    if (!isHost) {
      lastReactionsCount.current = reactionsCount;
      hasReactionCountBaseline.current = false;
      return;
    }

    if (!hasLoadedComments) {
      return;
    }

    if (!hasReactionCountBaseline.current) {
      lastReactionsCount.current = reactionsCount;
      hasReactionCountBaseline.current = true;
      return;
    }

    const diff = reactionsCount - lastReactionsCount.current;
    const detailedEventJustHandled = Date.now() - lastDetailedReactionAt.current < 1200;
    if (diff > 0 && !detailedEventJustHandled) {
      const emojis = ['❤️', '😂', '👍'];
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
      const count = Math.min(diff * 18, 90);
      
      spawnEmojiRain(randomEmoji, count);
      triggerReactionToast('Người xem', randomEmoji);
    }
    lastReactionsCount.current = reactionsCount;
  }, [reactionsCount, isHost, hasLoadedComments, reactionEvents.length, spawnEmojiRain, triggerReactionToast]);
  


  const handleSendComment = useCallback(async () => {
    const trimmed = commentText.trim();
    if (!trimmed || isSendingComment) return;

    setIsSendingComment(true);
    try {
      await sendComment(trimmed);
      setCommentText('');
    } catch (err) {
      console.error('[LiveRoom] send comment error:', err);
      Alert.alert('Lỗi', 'Không gửi được bình luận.');
    } finally {
      setIsSendingComment(false);
    }
  }, [commentText, isSendingComment, sendComment]);

  const handleCommentPress = useCallback((item: LiveStreamComment) => {
    if (item.username) {
      setCommentText(`@${item.username} `);
      inputRef.current?.focus();
    }
  }, []);

  const handleLeave = useCallback(() => {
    Alert.alert(
      'Rời khỏi live',
      'Bạn có muốn rời khỏi live không?',
      [
        { text: 'Ở lại', style: 'cancel' },
        {
          text: 'Rời đi',
          style: 'destructive',
          onPress: () => {
            leave();
            navigation.goBack();
          },
        },
      ],
    );
  }, [leave, navigation]);

  const handleReaction = useCallback((emoji: string) => {
    react(emoji);
    if (isHost) {
      spawnEmojiRain(emoji, 24);
      const userName = currentUserProfile?.name || currentUserProfile?.username || 'Bạn';
      triggerReactionToast(userName, emoji);
    }
  }, [react, isHost, currentUserProfile, spawnEmojiRain, triggerReactionToast]);

  const handleToggleCamera = useCallback(() => {
    setCameraFacing(current => (current === 'front' ? 'back' : 'front'));
  }, []);

  const descriptionText = useMemo(() => {
    return streamInfo?.description?.trim() || 'Chào mừng mọi người đến với buổi live!';
  }, [streamInfo?.description]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="mt-3 text-white/70">Đang tải live...</Text>
      </View>
    );
  }

  if (!streamInfo) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Text className="text-center text-[16px] font-semibold text-white">
          {error || 'Live này không còn hoạt động.'}
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.goBack()}
          className="mt-5 rounded-full bg-white px-5 py-3"
        >
          <Text className="font-semibold text-[#111827]">Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      <View className="flex-1 relative bg-slate-950">
        {/* Full Screen Live Stream / Camera Preview */}
        <View className="absolute inset-0 bg-slate-900">
          {isHost && !hasLiveKitSession && (
            <LiveCameraPreview cameraFacing={cameraFacing} enabled />
          )}
          {hasLiveKitSession && liveSession ? (
            <LiveKitStreamView session={liveSession} isHost={isHost} />
          ) : null}
        </View>

        {/* Top Header Overlay */}
        <View 
          className="absolute left-4 right-4 flex-row items-center justify-between z-10"
          style={{ top: insets.top || 16 }}
        >
          {/* Host Info */}
          <View className="flex-row items-center gap-2">
            <Image
              source={{ uri: streamInfo.publisher.avatarUrl }}
              className="h-9 w-9 rounded-full border border-white/20 bg-slate-800"
            />
            <View>
              <Text className="text-[13px] font-semibold text-white shadow-sm">
                {streamInfo.publisher.name}
              </Text>
              <View className="mt-0.5 self-start rounded bg-red-600 px-1.5 py-0.5">
                <Text className="text-[8px] font-bold text-white tracking-wider">LIVE</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View className="flex-row items-center gap-2">
            {isHost && !hasLiveKitSession && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleToggleCamera}
                className="rounded-full bg-black/45 p-2 border border-white/10"
              >
                <RefreshCw size={16} color="#ffffff" />
              </TouchableOpacity>
            )}
            <View className="flex-row items-center gap-1.5 rounded-full bg-black/45 px-3 py-1.5 border border-white/10">
              <Eye size={14} color="#ffffff" />
              <Text className="text-[12px] font-medium text-white">
                {viewerCount}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLeave}
              className="rounded-full bg-black/45 p-2 border border-white/10"
            >
              <X size={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Content Overlay */}
        <View 
          className="absolute bottom-0 inset-x-0 p-4 z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          {/* Comments & Reactions Row */}
          <View className="flex-row items-end justify-between mb-3">
            {/* Comments List (Left) */}
            <View className="flex-1 mr-4">
              <FlatList
                data={comments}
                keyExtractor={item => item.id}
                style={{ maxHeight: 180 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => handleCommentPress(item)}
                    className="flex-row items-start self-start rounded-2xl bg-black/35 px-3 py-1.5 mb-2 max-w-[90%] border border-white/5"
                  >
                    <Image
                      source={{ uri: item.avatarUrl }}
                      className="h-6 w-6 rounded-full bg-slate-100 mr-2 mt-0.5"
                    />
                    <View className="flex-1">
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-[11px] font-bold text-white/95">
                          {item.author}
                        </Text>
                        {item.isHost && (
                          <View className="rounded bg-red-600 px-1 py-0.2">
                            <Text className="text-[7px] font-bold text-white">HOST</Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-[11px] text-white/85 mt-0.5">{item.message}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View className="self-start rounded-2xl bg-black/30 px-3 py-1.5">
                    <Text className="text-[11px] text-white/60">
                      Chưa có bình luận. Hãy là người đầu tiên!
                    </Text>
                  </View>
                }
                contentContainerStyle={commentsContentStyle}
              />
            </View>

            {/* Reactions Stack (Right) */}
            <View className="items-center gap-2.5">
              {reactionsCount > 0 && (
                <View className="rounded-full bg-black/55 px-2.5 py-1 border border-white/10 mb-0.5">
                  <Text className="text-[9px] font-extrabold text-white">❤️ {reactionsCount}</Text>
                </View>
              )}
              {/* Heart */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleReaction('❤️')}
                className="h-9 w-9 items-center justify-center rounded-full bg-[#ef4444]"
              >
                <Heart size={18} color="#ffffff" fill="#ffffff" />
              </TouchableOpacity>

              {/* Laugh */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleReaction('😂')}
                className="h-9 w-9 items-center justify-center rounded-full bg-amber-400"
              >
                <Text className="text-[18px] mt-[-2px]">😂</Text>
              </TouchableOpacity>

              {/* Like */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => handleReaction('👍')}
                className="h-9 w-9 items-center justify-center rounded-full bg-blue-600"
              >
                <Text className="text-[16px] mt-[-2px]">👍</Text>
              </TouchableOpacity>

              {/* Share */}
              <TouchableOpacity
                activeOpacity={0.85}
                className="h-9 w-9 items-center justify-center rounded-full bg-white/20 border border-white/10"
              >
                <Share2 size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Comment Input Bar */}
          <View className="flex-row items-center gap-2 mb-3">
            <View className="flex-1 flex-row items-center rounded-full bg-black/35 border border-white/10 px-4 py-2">
              <TextInput
                ref={inputRef}
                className="flex-1 text-white text-[13px] p-0"
                placeholder="Viết bình luận..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={commentText}
                onChangeText={setCommentText}
                onSubmitEditing={handleSendComment}
              />
              <TouchableOpacity activeOpacity={0.8} className="ml-2">
                <Smile size={18} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            </View>
            
            {commentText.trim().length > 0 && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleSendComment}
                className="h-9 w-9 items-center justify-center rounded-full bg-blue-600"
              >
                <Send size={15} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>

          {/* Title & Description Info */}
          <View className="flex-row items-start justify-between bg-black/15 rounded-xl p-2.5">
            <View className="flex-1 mr-4">
              <Text className="text-[14px] font-bold text-white">
                {streamInfo.title}
              </Text>
              <Text 
                className="mt-0.5 text-[11px] text-white/80" 
                numberOfLines={showFullDescription ? undefined : 1}
              >
                {descriptionText}
              </Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowFullDescription(!showFullDescription)}
              className="p-1"
            >
              <ChevronDown 
                size={16} 
                color="#ffffff" 
                style={{ transform: [{ rotate: showFullDescription ? '180deg' : '0deg' }] }} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {isHost && (
          <>
            {/* Falling Emojis Layer */}
            <View 
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 20 }} 
              pointerEvents="none"
            >
              {fallingEmojis.map(item => (
                <Animated.View
                  key={item.id}
                  style={{
                    position: 'absolute',
                    left: item.x,
                    top: 0,
                    transform: [{ translateY: item.animY }],
                  }}
                >
                  <Text className="text-[28px]">{item.emoji}</Text>
                </Animated.View>
              ))}
            </View>

            {/* Left-side Reaction Toasts */}
            <View 
              style={{ position: 'absolute', left: 16, top: 120, zIndex: 25 }} 
              pointerEvents="none"
              className="gap-2 max-w-[70%]"
            >
              {reactionToasts.map(toast => (
                <View 
                  key={toast.id} 
                  className="flex-row items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 border border-white/10 self-start shadow-sm"
                >
                  <Text className="text-[11px] font-bold text-white">
                    {toast.name}
                  </Text>
                  <Text className="text-[11px] text-white/85">đã thả cảm xúc</Text>
                  <Text className="text-[14px]">{toast.emoji}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
