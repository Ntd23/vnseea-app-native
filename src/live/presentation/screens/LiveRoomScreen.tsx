// Description: Live stream viewer room - shows live metadata, comments, and actions.
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Heart,
  MessageCircle,
  MoreHorizontal,
  Phone,
  RefreshCw,
  Send,
  Share2,
  Users,
  X,
} from 'lucide-react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLiveRoomViewModel } from '../../application/view-models/useLiveViewModel';
import { LiveCameraPreview } from '../components/LiveCameraPreview';

type LiveRouteParams = {
  postId: number;
  isHost?: boolean;
};

const commentsContentStyle = { paddingBottom: 10 };

export default function LiveRoomScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<{ params: LiveRouteParams }, 'params'>>();
  const { postId, isHost: routeIsHost = false } = route.params || {
    postId: 0,
    isHost: false,
  };

  const {
    streamInfo,
    comments,
    viewerCount,
    reactionsCount,
    state,
    isHost: streamIsHost,
    isLoading,
    error,
    sendComment,
    leave,
  } = useLiveRoomViewModel(postId);

  const [commentText, setCommentText] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'front' | 'back'>('front');
  const isHost = routeIsHost || streamIsHost;

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

  const handleReaction = useCallback((type: string) => {
    setShowReactions(false);
    console.log('[LiveRoom] reaction:', type);
  }, []);

  const handleToggleCamera = useCallback(() => {
    setCameraFacing(current => (current === 'front' ? 'back' : 'front'));
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator size="large" color="#ffffff" />
        <Text className="mt-3 text-white/70">Đang tải live...</Text>
      </SafeAreaView>
    );
  }

  if (!streamInfo) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black px-6">
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <View className="relative h-3/5">
        <View className="absolute inset-0 items-center justify-center bg-slate-950">
          <View className="rounded-full bg-white/10 p-5">
            <Users size={42} color="#ffffff" />
          </View>
          <Text className="mt-4 text-[15px] font-semibold text-white">
            {state === 'live' ? 'Đang phát trực tiếp' : 'Đang chờ tín hiệu live'}
          </Text>
          <Text className="mt-2 max-w-[280px] text-center text-[12px] text-white/60">
            App đã nối dữ liệu live thật. Để hiển thị video trực tiếp cần tích hợp SDK LiveKit hoặc Agora.
          </Text>
          {isHost && <LiveCameraPreview cameraFacing={cameraFacing} enabled />}
        </View>

        {isHost && <View className="absolute inset-x-0 bottom-0 h-40 bg-black/30" />}

        <View className="absolute left-4 right-4 top-4 flex-row items-center justify-between">
          <TouchableOpacity
            activeOpacity={0.8}
            className="flex-row items-center gap-2 rounded-full bg-black/50 px-3 py-2"
          >
            <Image
              source={{ uri: streamInfo.publisher.avatarUrl }}
              className="h-8 w-8 rounded-full bg-slate-100"
            />
            <View>
              <Text className="text-[12px] font-semibold text-white">
                {streamInfo.publisher.name}
              </Text>
              <View className="flex-row items-center gap-1">
                <View
                  className={`h-2 w-2 rounded-full ${
                    state === 'live' ? 'bg-red-500' : 'bg-orange-400'
                  }`}
                />
                <Text className="text-[10px] text-white/70">
                  {state === 'live' ? 'LIVE' : 'ĐANG CHỜ'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center gap-2">
            {isHost && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleToggleCamera}
                className="rounded-full bg-black/50 p-2"
              >
                <RefreshCw size={18} color="#ffffff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              activeOpacity={0.8}
              className="flex-row items-center gap-1 rounded-full bg-black/50 px-3 py-2"
            >
              <Users size={14} color="#ffffff" />
              <Text className="text-[12px] font-medium text-white">
                {viewerCount}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleLeave}
              className="rounded-full bg-red-500 p-2"
            >
              <X size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="absolute bottom-16 left-4 right-4">
          <Text className="text-[16px] font-semibold text-white">
            {streamInfo.title}
          </Text>
          {streamInfo.description && (
            <Text className="mt-1 text-[12px] text-white/70" numberOfLines={2}>
              {streamInfo.description}
            </Text>
          )}
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 rounded-t-3xl bg-white"
      >
        <View className="flex-row items-center justify-around border-b border-[rgba(0,0,255,0.08)] py-3">
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowReactions(!showReactions)}
            className="items-center gap-1"
          >
            <View className="relative">
              <Heart size={26} color="#ef4444" />
              {reactionsCount > 0 && (
                <View className="absolute -right-2 -top-1 rounded-full bg-gray-200 px-1">
                  <Text className="text-[8px]">{reactionsCount}</Text>
                </View>
              )}
            </View>
            <Text className="text-[10px] text-[#64748b]">Cảm xúc</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} className="items-center gap-1">
            <MessageCircle size={26} color="#0000ff" />
            <Text className="text-[10px] text-[#64748b]">Bình luận</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} className="items-center gap-1">
            <Share2 size={26} color="#0000ff" />
            <Text className="text-[10px] text-[#64748b]">Chia sẻ</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} className="items-center gap-1">
            <Phone size={26} color="#0000ff" />
            <Text className="text-[10px] text-[#64748b]">Gọi</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} className="items-center gap-1">
            <MoreHorizontal size={26} color="#64748b" />
            <Text className="text-[10px] text-[#64748b]">Khác</Text>
          </TouchableOpacity>
        </View>

        {showReactions && (
          <View className="absolute bottom-20 left-4 z-20 flex-row gap-3 rounded-full bg-white p-3 shadow-lg">
            {['❤️', '😂', '😮', '😢', '😡'].map(emoji => (
              <TouchableOpacity
                key={emoji}
                activeOpacity={0.7}
                onPress={() => handleReaction(emoji)}
                className="p-1"
              >
                <Text className="text-[28px]">{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <FlatList
          data={comments}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View className="flex-row gap-2 px-4 py-2">
              <Image
                source={{ uri: item.avatarUrl }}
                className="h-7 w-7 rounded-full bg-slate-100"
              />
              <View className="flex-1">
                <View className="flex-row items-center gap-1">
                  <Text className="text-[12px] font-semibold text-[#1a1c1e]">
                    {item.author}
                  </Text>
                  {item.isHost && (
                    <View className="rounded-full bg-[#0000ff] px-1.5 py-0.5">
                      <Text className="text-[8px] text-white">HOST</Text>
                    </View>
                  )}
                </View>
                <Text className="text-[12px] text-[#64748b]">{item.message}</Text>
                <Text className="text-[10px] text-[#94a3b8]">{item.timeText}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View className="items-center py-8">
              <Text className="text-[13px] text-[#94a3b8]">
                Chưa có bình luận
              </Text>
            </View>
          }
          contentContainerStyle={commentsContentStyle}
          showsVerticalScrollIndicator={false}
        />

        <View className="flex-row items-center gap-2 border-t border-[rgba(0,0,255,0.08)] p-3">
          <TextInput
            className="input-shell flex-1 px-4 py-2"
            placeholder="Viết bình luận..."
            placeholderTextColor="#94a3b8"
            value={commentText}
            onChangeText={setCommentText}
            onSubmitEditing={handleSendComment}
          />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSendComment}
            disabled={isSendingComment || !commentText.trim()}
            className="rounded-full bg-[#0000ff] p-2"
          >
            <Send size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
