// Description: Presents post-level actions such as save, hide, delete, and report.

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bookmark, EyeOff, Flag, Trash2, X } from 'lucide-react-native';
import type { FeedPost } from '../../../feed/domain/types/feed.types';

interface PostMenuActionSheetProps {
  visible: boolean;
  onClose: () => void;
  post: FeedPost | null;
  canDelete?: boolean;
  onSave: (postId: string) => Promise<void>;
  onHide: (postId: string) => Promise<void> | void;
  onDelete: (postId: string) => Promise<void>;
  onReport: (postId: string) => Promise<void>;
}

type ActionId = 'save' | 'hide' | 'delete' | 'report';

export function PostMenuActionSheet({
  visible,
  onClose,
  post,
  canDelete = false,
  onSave,
  onHide,
  onDelete,
  onReport,
}: PostMenuActionSheetProps) {
  const [loadingId, setLoadingId] = useState<ActionId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAction = async (
    actionId: ActionId,
    action: (postId: string) => Promise<void> | void,
  ) => {
    if (!post) return;
    setLoadingId(actionId);
    setError(null);
    try {
      await action(post.id);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Không thực hiện được thao tác.',
      );
    } finally {
      setLoadingId(null);
    }
  };

  if (!visible || !post) return null;

  const isBusy = loadingId !== null;

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      />

      <View className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-white px-4 pb-6 pt-4 shadow-lg">
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-gray-900">
            Tùy chọn bài viết
          </Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        {error ? (
          <Text className="mb-3 text-center text-sm text-red-500">{error}</Text>
        ) : null}

        <MenuAction
          label="Lưu bài viết"
          loading={loadingId === 'save'}
          disabled={isBusy}
          icon={<Bookmark size={20} color="#3B82F6" />}
          iconClassName="bg-blue-100"
          onPress={() => runAction('save', onSave)}
        />
        <Divider />
        <MenuAction
          label="Ẩn bài viết"
          loading={loadingId === 'hide'}
          disabled={isBusy}
          icon={<EyeOff size={20} color="#64748B" />}
          iconClassName="bg-slate-100"
          onPress={() => runAction('hide', onHide)}
        />
        <Divider />
        {canDelete ? (
          <>
            <MenuAction
              label="Xóa bài viết"
              loading={loadingId === 'delete'}
              disabled={isBusy}
              icon={<Trash2 size={20} color="#EF4444" />}
              iconClassName="bg-red-100"
              textClassName="text-red-600"
              onPress={() => runAction('delete', onDelete)}
            />
            <Divider />
          </>
        ) : null}
        <MenuAction
          label="Báo cáo bài viết"
          loading={loadingId === 'report'}
          disabled={isBusy}
          icon={<Flag size={20} color="#EF4444" />}
          iconClassName="bg-red-100"
          onPress={() => runAction('report', onReport)}
        />
      </View>
    </Modal>
  );
}

function Divider() {
  return <View className="h-px bg-gray-200" />;
}

function MenuAction({
  label,
  loading,
  disabled,
  icon,
  iconClassName,
  textClassName = 'text-gray-900',
  onPress,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  iconClassName: string;
  textClassName?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center py-4"
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#3B82F6" className="mr-3" />
      ) : (
        <View
          className={`mr-3 h-10 w-10 items-center justify-center rounded-full ${iconClassName}`}
        >
          {icon}
        </View>
      )}
      <Text className={`text-lg font-medium ${textClassName}`}>{label}</Text>
    </TouchableOpacity>
  );
}
