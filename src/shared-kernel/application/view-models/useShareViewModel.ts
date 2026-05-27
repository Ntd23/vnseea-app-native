// Post/Story Share Hook - Client-side sharing using React Native Share
//
// This hook provides share functionality for posts and stories without
// requiring any backend API. It uses @react-native-share package to
// open native share sheet (Facebook, WhatsApp, Telegram, Copy Link, etc.)

import { Linking, Share } from 'react-native';
import type { FeedPost } from '../../../feed/domain/types/feed.types';
import type { StoryItem } from '../../../stories/domain/types/stories.types';

interface ShareOptions {
  title?: string;
  subject?: string;
  dialogTitle?: string;
}

interface ShareResult {
  action: string;
  method: string;
}

export function useShareViewModel() {
  /**
   * Share a feed post to other apps
   */
  const sharePost = async (
    post: FeedPost,
    options?: ShareOptions
  ): Promise<ShareResult | null> => {
    try {
      // Build share message
      const appName = 'VNSEEA';
      const posterName = post.publisher.name || 'VNSEEA User';

      let message = `${posterName} đang đăng trên ${appName}\n`;

      if (post.kind === 'text') {
        message += `\n${post.caption || ''}`;
        if (post.photos.length > 0) {
          message += `\n\n📸 ${post.photos.length} ảnh`;
        }
      } else if (post.kind === 'video') {
        message += `${post.caption || ''}\n\n🎥 Video từ VNSEEA`;
      }

      message += `\n\n#${appName.split(' ')[0]} #SocialNetwork`;
      message += `\n\nXem tại: ${await getShareableUrl(post.id, 'post')}`;

      // Get current time for formatting
      const now = new Date();
      const timeString = now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const dateString = now.toLocaleDateString('vi-VN');

      const shareText = `💬 [${dateString}] ${timeString}\n${message}`;

      const result = await Share.share(
        {
          title: options?.title || 'Chia sẻ bài viết',
          message: shareText,
          url: await getShareableUrl(post.id, 'post'),
        },
        {
          dialogTitle: options?.dialogTitle || 'Chia sẻ qua ứng dụng nào?',
          subject: options?.subject || `Bài viết từ ${appName}`,
        }
      );

      console.log('[useShare] Post shared:', result.action);

      return {
        action: result.action,
        method: result.action === 'sharedAction' ? 'shared' : 'dismissed',
      };
    } catch (error) {
      console.error('[useShare] Error sharing post:', error);
      return null;
    }
  };

  /**
   * Share a story to other apps
   */
  const shareStory = async (
    story: StoryItem,
    options?: ShareOptions
  ): Promise<ShareResult | null> => {
    try {
      const appName = 'VNSEEA';
      const publisherName = story.publisher.name || 'VNSEEA User';

      let message = `${publisherName} đã đăng tin mới trên ${appName}\n`;

      // Determine media type
      const hasImages = story.media.some(m => m.type === 'image');
      const hasVideos = story.media.some(m => m.type === 'video');

      if (hasImages && !hasVideos) {
        message += `\n📸 Bộ ảnh mới (${story.media.length} ảnh)`;
      } else if (hasVideos && !hasImages) {
        message += `\n🎥 Video mới (${story.media.length} clip)`;
      } else {
        message += `\n📱 Tin tức (${story.media.length} đoạn)`;
      }

      if (story.description) {
        message += `\n"${story.description}"`;
      }

      message += `\n\n#${appName.split(' ')[0]} #Stories`;
      message += `\n\nXem ngay: ${await getShareableUrl(story.id, 'story')}`;

      const now = new Date();
      const timeString = now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
      });
      const dateString = now.toLocaleDateString('vi-VN');

      const shareText = `🌟 [${dateString}] ${timeString}\n${message}`;

      const result = await Share.share(
        {
          title: options?.title || 'Chia sẻ tin tức',
          message: shareText,
          url: await getShareableUrl(story.id, 'story'),
        },
        {
          dialogTitle: options?.dialogTitle || 'Chia sẻ qua ứng dụng nào?',
          subject: options?.subject || `Tin mới từ ${appName}`,
        }
      );

      console.log('[useShare] Story shared:', result.action);

      return {
        action: result.action,
        method: result.action === 'sharedAction' ? 'shared' : 'dismissed',
      };
    } catch (error) {
      console.error('[useShare] Error sharing story:', error);
      return null;
    }
  };

  /**
   * Copy shareable URL to clipboard
   */
  const copyToClipboard = async (postId: string, type: 'post' | 'story'): Promise<boolean> => {
    try {
      const url = await getShareableUrl(postId, type);

      // Use platform-specific clipboard
      const { Clipboard } = require('react-native');
      await Clipboard.setString(url);

      console.log('[useShare] Copied to clipboard:', url);

      return true;
    } catch (error) {
      console.error('[useShare] Error copying to clipboard:', error);
      return false;
    }
  };

  /**
   * Generate a shareable URL for post or story
   * In production, this would be a real deep link or web URL
   */
  const getShareableUrl = async (id: string, type: 'post' | 'story'): Promise<string> => {
    // Current app URL scheme (adjust based on your app configuration)
    const appScheme = 'vnseea://';

    // For web fallback, you can provide an actual website URL
    // const baseUrl = 'https://vnseea.vn';

    if (type === 'post') {
      return `${appScheme}post/${id}`;
      // Or for web: `${baseUrl}/post/${id}`;
    } else if (type === 'story') {
      return `${appScheme}story/${id}`;
      // Or for web: `${baseUrl}/story/${id}`;
    }

    return `${appScheme}${type}/${id}`;
  };

  /**
   * Open specific app directly (optional advanced feature)
   * Requires platform-specific handling and may need additional libraries
   */
  const openInApp = async (platform: 'facebook' | 'whatsapp' | 'telegram'): Promise<void> => {
    switch (platform) {
      case 'facebook':
        // Facebook requires special handling with their SDK
        // This is a placeholder
        break;
      case 'whatsapp':
        // WhatsApp Web Intent
        break;
      case 'telegram':
        // Telegram Deep Link
        break;
    }
  };

  return {
    sharePost,
    shareStory,
    copyToClipboard,
  };
}
