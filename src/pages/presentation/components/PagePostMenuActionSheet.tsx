// Description: Presents page post management actions in a WoWonder-style bottom sheet.
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  MessageSquareOff,
  Pencil,
  Pin,
  Trash2,
  X,
} from 'lucide-react-native';
import type { FeedPost } from '../../../feed/domain/types/feed.types';

type PagePostMenuAction = 'edit' | 'delete' | 'comments' | 'pin';

interface PagePostMenuActionSheetProps {
  visible: boolean;
  post: FeedPost | null;
  onClose: () => void;
  onEdit: (post: FeedPost) => void;
  onDelete: (post: FeedPost) => Promise<void>;
  onToggleComments: (post: FeedPost) => Promise<void>;
  onPin: (post: FeedPost) => Promise<void>;
}

export function PagePostMenuActionSheet({
  visible,
  post,
  onClose,
  onEdit,
  onDelete,
  onToggleComments,
  onPin,
}: PagePostMenuActionSheetProps) {
  const [loadingAction, setLoadingAction] = useState<PagePostMenuAction | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!visible || !post) {
    return null;
  }

  const runAsyncAction = async (
    actionId: PagePostMenuAction,
    action: (selectedPost: FeedPost) => Promise<void>,
  ) => {
    setLoadingAction(actionId);
    setError(null);
    try {
      await action(post);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thực hiện được thao tác.');
    } finally {
      setLoadingAction(null);
    }
  };

  const isBusy = loadingAction !== null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.42)' }}
      />

      <View className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white px-4 pb-6 pt-4 shadow-lg">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-slate-900">Tùy chọn bài viết</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <X size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        {error ? (
          <Text className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-center text-sm font-semibold text-red-600">
            {error}
          </Text>
        ) : null}

        <MenuAction
          title="Chỉnh sửa bài"
          description="Chỉnh sửa thông tin bài viết."
          icon={<Pencil size={19} color="#334155" />}
          loading={loadingAction === 'edit'}
          disabled={isBusy}
          onPress={() => {
            setError(null);
            onEdit(post);
            onClose();
          }}
        />
        <Divider />
        <MenuAction
          title="Xóa bài đăng"
          description="Xóa hoàn toàn bài đăng này."
          icon={<Trash2 size={19} color="#EF4444" />}
          loading={loadingAction === 'delete'}
          disabled={isBusy}
          onPress={() => void runAsyncAction('delete', onDelete)}
        />
        <Divider />
        <MenuAction
          title="Tắt nhận xét"
          description="Cho phép hoặc không cho phép người dùng bình luận về bài đăng này."
          icon={<MessageSquareOff size={19} color="#64748B" />}
          loading={loadingAction === 'comments'}
          disabled={isBusy}
          onPress={() => void runAsyncAction('comments', onToggleComments)}
        />
        <Divider />
        <MenuAction
          title="Ghim bài đăng"
          description="Ghim bài đăng này lên đầu trang."
          icon={<Pin size={19} color="#64748B" />}
          loading={loadingAction === 'pin'}
          disabled={isBusy}
          onPress={() => void runAsyncAction('pin', onPin)}
        />
      </View>
    </Modal>
  );
}

function Divider() {
  return <View className="h-px bg-slate-100" />;
}

function MenuAction({
  title,
  description,
  icon,
  loading,
  disabled,
  onPress,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  loading: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.76}
      disabled={disabled}
      onPress={onPress}
      className="flex-row items-start py-3.5"
    >
      <View className="mt-0.5 h-9 w-9 items-center justify-center rounded-full bg-slate-100">
        {loading ? <ActivityIndicator size="small" color="#0000ff" /> : icon}
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-base font-bold text-slate-900">{title}</Text>
        <Text className="mt-0.5 text-sm text-slate-500">{description}</Text>
      </View>
    </TouchableOpacity>
  );
}
