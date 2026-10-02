// Description: Shows post, reel and story videos uploading in the background (progress, processing, published or failed) above the feed.
import React, { useSyncExternalStore } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { CheckCircle2, Film, RotateCcw, X, XCircle } from 'lucide-react-native';
import { useAppLanguage } from '../../application/hooks/useAppLanguage';
import {
  videoPublishQueue,
  type VideoPublishPurpose,
  type VideoPublishTask,
} from '../../application/services/videoPublishQueue';
import { APP_COLORS } from '../theme/appColors';

type ItemCopy = Record<VideoPublishPurpose, string>;

const COPY = {
  vi: {
    preparing: 'Đang chuẩn bị video…',
    uploading: 'Đang tải video lên…',
    processing: {
      post: 'Đang xử lý video. Bài viết sẽ hiện khi xong.',
      reel: 'Đang xử lý video. Reel sẽ hiện khi xong.',
      story: 'Đang xử lý video. Tin sẽ hiện khi xong.',
    } as ItemCopy,
    waiting: {
      post: 'Video vẫn đang xử lý. Bạn sẽ nhận thông báo khi bài viết được đăng.',
      reel: 'Video vẫn đang xử lý. Bạn sẽ nhận thông báo khi reel được đăng.',
      story: 'Video vẫn đang xử lý. Bạn sẽ nhận thông báo khi tin được đăng.',
    } as ItemCopy,
    published: { post: 'Đã đăng bài viết.', reel: 'Đã đăng reel.', story: 'Đã đăng tin.' } as ItemCopy,
    review: {
      post: 'Video đã xử lý xong, bài viết đang chờ duyệt.',
      reel: 'Video đã xử lý xong, reel đang chờ duyệt.',
      story: 'Đã đăng tin.',
    } as ItemCopy,
    failed: {
      post: 'Không đăng được bài viết.',
      reel: 'Không đăng được reel.',
      story: 'Không đăng được tin.',
    } as ItemCopy,
    retry: 'Thử lại',
    dismiss: 'Ẩn',
  },
  en: {
    preparing: 'Preparing video…',
    uploading: 'Uploading video…',
    processing: {
      post: 'Processing video. Your post will appear when it is ready.',
      reel: 'Processing video. Your reel will appear when it is ready.',
      story: 'Processing video. Your story will appear when it is ready.',
    } as ItemCopy,
    waiting: {
      post: 'Still processing. We will notify you when your post is published.',
      reel: 'Still processing. We will notify you when your reel is published.',
      story: 'Still processing. We will notify you when your story is published.',
    } as ItemCopy,
    published: { post: 'Post published.', reel: 'Reel published.', story: 'Story published.' } as ItemCopy,
    review: {
      post: 'Video ready, your post is waiting for review.',
      reel: 'Video ready, your reel is waiting for review.',
      story: 'Story published.',
    } as ItemCopy,
    failed: {
      post: 'Your post could not be published.',
      reel: 'Your reel could not be published.',
      story: 'Your story could not be published.',
    } as ItemCopy,
    retry: 'Retry',
    dismiss: 'Dismiss',
  },
};

type Copy = (typeof COPY)['vi'];

function describeTask(task: VideoPublishTask, copy: Copy): string {
  const percent = Math.round(task.progress * 100);
  switch (task.phase) {
    case 'preparing':
      return percent > 0 ? `${copy.preparing} ${percent}%` : copy.preparing;
    case 'uploading':
      return `${copy.uploading} ${percent}%`;
    case 'processing':
      return task.waitingInBackground
        ? copy.waiting[task.purpose]
        : copy.processing[task.purpose];
    case 'published':
      return copy.published[task.purpose];
    case 'review':
      return copy.review[task.purpose];
    case 'failed':
      return task.errorMessage
        ? `${copy.failed[task.purpose]} ${task.errorMessage}`
        : copy.failed[task.purpose];
  }
}

function TaskRow({ task, copy }: { task: VideoPublishTask; copy: Copy }) {
  const showsProgress = task.phase === 'preparing' || task.phase === 'uploading';
  const canDismiss =
    task.phase === 'failed' ||
    task.phase === 'published' ||
    task.phase === 'review' ||
    Boolean(task.waitingInBackground);

  return (
    <View style={styles.row}>
      {task.thumbnailUri ? (
        <Image source={{ uri: task.thumbnailUri }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Film size={18} color={APP_COLORS.neutral.iconMuted} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.label} numberOfLines={2}>
          {describeTask(task, copy)}
        </Text>
        {showsProgress ? (
          <View style={styles.track}>
            <View
              style={[styles.fill, { width: `${Math.max(4, Math.round(task.progress * 100))}%` }]}
            />
          </View>
        ) : null}
      </View>
      {task.phase === 'processing' && !task.waitingInBackground ? (
        <ActivityIndicator size="small" color={APP_COLORS.brand.primary} />
      ) : null}
      {task.phase === 'published' || task.phase === 'review' ? (
        <CheckCircle2 size={20} color={APP_COLORS.status.success} />
      ) : null}
      {task.phase === 'failed' ? (
        <>
          <XCircle size={20} color={APP_COLORS.status.error} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.retry}
            hitSlop={8}
            onPress={() => videoPublishQueue.retry(task.id)}
            style={styles.iconButton}
          >
            <RotateCcw size={18} color={APP_COLORS.neutral.text} />
          </Pressable>
        </>
      ) : null}
      {canDismiss ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.dismiss}
          hitSlop={8}
          onPress={() => videoPublishQueue.dismiss(task.id)}
          style={styles.iconButton}
        >
          <X size={18} color={APP_COLORS.neutral.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function VideoPublishStatusBar() {
  const tasks = useSyncExternalStore(
    videoPublishQueue.subscribe,
    videoPublishQueue.getTasks,
  );
  const language = useAppLanguage();
  if (tasks.length === 0) return null;
  const copy = COPY[language] ?? COPY.vi;

  return (
    <View style={styles.container}>
      {tasks.map(task => (
        <TaskRow key={task.id} task={task} copy={copy} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    backgroundColor: APP_COLORS.neutral.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: APP_COLORS.neutral.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  thumbnail: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: APP_COLORS.neutral.muted,
  },
  thumbnailPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    gap: 6,
  },
  label: {
    fontSize: 14,
    color: APP_COLORS.neutral.text,
  },
  track: {
    height: 4,
    borderRadius: 2,
    backgroundColor: APP_COLORS.neutral.muted,
    overflow: 'hidden',
  },
  fill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: APP_COLORS.brand.primary,
  },
  iconButton: {
    padding: 4,
  },
});
