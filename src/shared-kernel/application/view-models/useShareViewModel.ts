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
   * Copy shareable URL to clipboard. Accepts a free-form URL so
   * `PageShareActionSheet` can pass `vm.page.url` directly (the page
   * already exposes a public URL on the wire) instead of building a
   * deep link from an id.
   */
  const copyToClipboard = async (
    idOrUrl: string,
    type: 'post' | 'story' | 'page',
  ): Promise<boolean> => {
    try {
      const url = await getShareableUrl(idOrUrl, type);

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
   * Generate a shareable URL for post / story / page.
   *
   * For 'page' the `id` argument is treated as a full URL (the page
   * record already ships a public `url` on the wire — building a
   * deep link from the page id would not work because the page id
   * is meaningless outside the app's internal router). Callers that
   * want a deep link for a page can pass `''` and we fall back to
   * a `vnseea://page/<id>` scheme.
   *
   * Exported so other repositories (e.g. `ApiFeedRepository.sharePost`
   * for the 'message' destination) can build the same URL the
   * share sheet does — keeping a single source of truth for the
   * scheme.
   */
  const getShareableUrl = async (
    id: string,
    type: 'post' | 'story' | 'page',
  ): Promise<string> => {
    // Current app URL scheme (adjust based on your app configuration)
    const appScheme = 'vnseea://';

    if (type === 'post') {
      return `${appScheme}post/${id}`;
    } else if (type === 'story') {
      return `${appScheme}story/${id}`;
    } else if (type === 'page') {
      // If the caller already has a fully-formed public URL
      // (e.g. from `PagesItem.url`), use it verbatim. Otherwise
      // synthesise a deep link.
      if (/^https?:\/\//i.test(id)) {
        return id;
      }
      return `${appScheme}page/${id}`;
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

/**
 * Stand-alone helper — same logic the in-hook `getShareableUrl`
 * uses, but exposed at module scope so other modules (notably
 * `ApiFeedRepository.sharePost` for the 'message' destination)
 * can build shareable URLs without going through the React hook.
 * Keeping this in lockstep with the in-hook version is important
 * — both should produce identical deep-link shapes.
 */
export const getShareableUrl = async (
  id: string,
  type: 'post' | 'story' | 'page',
): Promise<string> => {
  const appScheme = 'vnseea://';

  if (type === 'post') {
    return `${appScheme}post/${id}`;
  } else if (type === 'story') {
    return `${appScheme}story/${id}`;
  } else if (type === 'page') {
    if (/^https?:\/\//i.test(id)) {
      return id;
    }
    return `${appScheme}page/${id}`;
  }

  return `${appScheme}${type}/${id}`;
};
