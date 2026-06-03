// Description: Live stream viewer room - shows video, comments, reactions.
import React, { useState, useCallback } from 'react';
import {
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
  Send,
  Share2,
  Users,
  X,
} from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useLiveRoomViewModel } from '../../application/view-models/useLiveViewModel';

type LiveRouteParams = {
  postId: number;
};

export default function LiveRoomScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<{ params: LiveRouteParams }, 'params'>>();
  const { postId } = route.params || { postId: 101 };

  const {
    streamInfo,
    comments,
    viewerCount,
    reactionsCount,
    sendComment,
  } = useLiveRoomViewModel(postId);

  const [commentText, setCommentText] = useState('');
  const [showReactions, setShowReactions] = useState(false);

  const handleSendComment = useCallback(() => {
    if (commentText.trim()) {
      sendComment(commentText);
      setCommentText('');
    }
  }, [commentText, sendComment]);

  const handleLeave = useCallback(() => {
    Alert.alert(
      'Rời khỏi',
      'Bạn có muốn rời khỏi live không?',
      [
        { text: 'Ở lại', style: 'cancel' },
        {
          text: 'Rời đi',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ],
    );
  }, [navigation]);

  const handleReaction = useCallback((type: string) => {
    setShowReactions(false);
    console.log('Reacted:', type);
  }, []);

  if (!streamInfo) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">Đang tải...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      {/* Video Area */}
      <View className="relative h-3/5">
        {/* Placeholder video - thay bằng video player thực tế */}
        <View className="absolute inset-0 items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900">
          <Text className="text-white/50">Video Stream</Text>
        </View>

        {/* Top Bar */}
        <View className="absolute top-4 left-4 right-4 flex-row items-center justify-between">
          {/* Host Info */}
          <TouchableOpacity
            activeOpacity={0.8}
            className="flex-row items-center gap-2 rounded-full bg-black/50 px-3 py-2"
          >
            <Image
              source={{ uri: streamInfo.publisher.avatarUrl }}
              className="h-8 w-8 rounded-full"
            />
            <View>
              <Text className="text-[12px] font-semibold text-white">
                {streamInfo.publisher.name}
              </Text>
              <View className="flex-row items-center gap-1">
                <View className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <Text className="text-[10px] text-white/70">LIVE</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Actions */}
          <View className="flex-row items-center gap-2">
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

        {/* Title */}
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

      {/* Comments & Actions Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 rounded-t-3xl bg-white"
      >
        {/* Action Buttons */}
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

        {/* Reactions Popup */}
        {showReactions && (
          <View className="absolute bottom-20 left-4 flex-row gap-3 rounded-full bg-white p-3 shadow-lg">
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

        {/* Comments List */}
        <FlatList
          data={comments}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View className="flex-row gap-2 px-4 py-2">
              <Image
                source={{ uri: item.avatarUrl }}
                className="h-7 w-7 rounded-full"
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
          contentContainerStyle={{ paddingBottom: 10 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Comment Input */}
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
            className="rounded-full bg-[#0000ff] p-2"
          >
            <Send size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}