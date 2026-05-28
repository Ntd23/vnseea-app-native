// PostMenuActionSheet - Action menu for individual posts
//
// Appears when user taps the "..." (MoreHorizontal) button on a post.
// Provides Save and Report options.

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Bookmark, Flag, X } from 'lucide-react-native';
import type { FeedPost } from '../../../feed/domain/types/feed.types';

interface PostMenuActionSheetProps {
  visible: boolean;
  onClose: () => void;
  post: FeedPost | null;
  onSave: (postId: string) => Promise<void>;
  onReport: (postId: string) => Promise<void>;
}

export function PostMenuActionSheet({
  visible,
  onClose,
  post,
  onSave,
  onReport,
}: PostMenuActionSheetProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!post) return;
    setLoadingId('save');
    setError(null);
    try {
      await onSave(post.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu bài viết.');
    } finally {
      setLoadingId(null);
    }
  };

  const handleReport = async () => {
    if (!post) return;
    setLoadingId('report');
    setError(null);
    try {
      await onReport(post.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi gửi báo cáo.');
    } finally {
      setLoadingId(null);
    }
  };

  if (!visible || !post) return null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      {/* Backdrop */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      />

      {/* Action Sheet */}
      <View className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white px-4 pb-6 pt-4 shadow-lg">
        {/* Header */}
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-gray-900">
            Tùy chọn bài viết
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Error */}
        {error && (
          <Text className="mb-3 text-center text-sm text-red-500">{error}</Text>
        )}

        {/* Save Option */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loadingId !== null}
          className="flex-row items-center py-4"
          activeOpacity={0.7}
        >
          {loadingId === 'save' ? (
            <ActivityIndicator size="small" color="#3B82F6" className="mr-3" />
          ) : (
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Bookmark size={20} color="#3B82F6" />
            </View>
          )}
          <Text className="text-lg font-medium text-gray-900">Lưu bài viết</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View className="h-px bg-gray-200" />

        {/* Report Option */}
        <TouchableOpacity
          onPress={handleReport}
          disabled={loadingId !== null}
          className="flex-row items-center py-4"
          activeOpacity={0.7}
        >
          {loadingId === 'report' ? (
            <ActivityIndicator size="small" color="#EF4444" className="mr-3" />
          ) : (
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <Flag size={20} color="#EF4444" />
            </View>
          )}
          <Text className="text-lg font-medium text-gray-900">Báo cáo bài viết</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}