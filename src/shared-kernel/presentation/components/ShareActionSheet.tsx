// ShareActionSheet - UI Component for sharing posts and stories
//
// A reusable modal that provides sharing options:
// - Facebook
// - WhatsApp
// - Telegram
// - Copy Link
// - More (opens native share)

import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Dimensions, Pressable } from 'react-native';
import { X, Facebook, MessageCircle, Paperclip, Copy } from 'lucide-react-native';
import type { FeedPost } from '../../../feed/domain/types/feed.types';
import type { StoryItem } from '../../../stories/domain/types/stories.types';
import { useShareViewModel } from '../../application/view-models/useShareViewModel';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ShareActionSheetProps {
  visible: boolean;
  onClose: () => void;
  post?: FeedPost;
  story?: StoryItem;
  onCopied?: () => void;
}

export function ShareActionSheet({
  visible,
  onClose,
  post,
  story,
  onCopied,
}: ShareActionSheetProps) {
  const { sharePost, shareStory, copyToClipboard } = useShareViewModel();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle copy to clipboard action
   */
  const handleCopyLink = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const targetType = post ? 'post' : 'story';
      const targetId = post?.id ?? story?.id;

      if (!targetId) {
        setError('Không có nội dung để chia sẻ');
        setIsLoading(false);
        return;
      }

      await copyToClipboard(targetId, targetType);

      if (onCopied) {
        onCopied();
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi sao chép');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle post sharing
   */
  const handleSharePost = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!post) {
        throw new Error('Không có bài viết để chia sẻ');
      }

      await sharePost(post, {
        title: 'Chia sẻ bài viết',
        subject: `Xem bài viết này từ VNSEEA`,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi chia sẻ');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle story sharing
   */
  const handleShareStory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!story) {
        throw new Error('Không có tin để chia sẻ');
      }

      await shareStory(story, {
        title: 'Chia sẻ tin tức',
        subject: `Xem tin mới từ VNSEEA`,
      });

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi chia sẻ');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Platform-specific sharing options
   * These are just placeholders - actual implementation may need libraries like:
   * - react-native-share-dialog
   * - @notifee/react-native-share
   */
  const shareOptions = React.useMemo(() => {
    if (post) {
      return [
        {
          id: 'facebook',
          label: 'Facebook',
          icon: Facebook,
          color: '#1877F2',
          onPress: () => console.log('Share to Facebook - requires SDK integration'),
        },
        {
          id: 'whatsapp',
          label: 'WhatsApp',
          icon: MessageCircle,
          color: '#25D366',
          onPress: () => console.log('Share to WhatsApp - requires URL intent'),
        },
        {
          id: 'telegram',
          label: 'Telegram',
          icon: Paperclip,
          color: '#0088cc',
          onPress: () => console.log('Share to Telegram - requires deep link'),
        },
        {
          id: 'copy',
          label: 'Sao chép',
          icon: Copy,
          color: '#64748B',
          onPress: handleCopyLink,
        },
      ];
    } else if (story) {
      return [
        {
          id: 'facebook',
          label: 'Facebook',
          icon: Facebook,
          color: '#1877F2',
          onPress: () => console.log('Share to Facebook - requires SDK integration'),
        },
        {
          id: 'whatsapp',
          label: 'WhatsApp',
          icon: MessageCircle,
          color: '#25D366',
          onPress: () => console.log('Share to WhatsApp - requires URL intent'),
        },
        {
          id: 'telegram',
          label: 'Telegram',
          icon: Paperclip,
          color: '#0088cc',
          onPress: () => console.log('Share to Telegram - requires deep link'),
        },
        {
          id: 'copy',
          label: 'Sao chép',
          icon: Copy,
          color: '#64748B',
          onPress: handleCopyLink,
        },
      ];
    }
    return [];
  }, [post, story, handleCopyLink]);

  // Conditional rendering at the bottom of JSX, not before hooks
  if (!visible || (!post && !story)) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable
        onPress={() => onClose()}
        style={{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      />

      {/* Action Sheet Content */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#FFFFFF',
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingBottom: 24,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2, },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 10,
        }}
      >
        {/* Header */}
        <View className="p-4 border-b border-gray-200">
          <View className="flex-row items-center justify-between">
            <Text className="text-title-primary text-xl font-bold">
              {post ? 'Chia sẻ bài viết' : 'Chia sẻ tin tức'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Loading/Error States */}
        {(isLoading || error) && (
          <View className="px-4 py-2">
            {isLoading && (
              <Text className="text-body-secondary text-center py-2">
                Đang xử lý...
              </Text>
            )}
            {error && (
              <Text className="text-red-500 text-center py-2">
                {error}
              </Text>
            )}
          </View>
        )}

        {/* Options List */}
        <View className="py-2">
          {shareOptions.map((option) => {
            const Icon = option.icon;
            if (!Icon) return null;
            return (
              <TouchableOpacity
                key={option.id}
                onPress={option.onPress}
                disabled={isLoading}
                className="flex-row items-center px-4 py-4 hover:bg-gray-50"
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: `${option.color}20`, // Add transparency
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: 12,
                  }}
                >
                  {React.createElement(Icon, { size: 20, color: option.color })}
                </View>
                <Text className="text-body-primary text-lg font-medium">
                  {option.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}
