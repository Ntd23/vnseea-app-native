import React from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  Globe2,
  Megaphone,
  Package,
  Play,
} from 'lucide-react-native';
import type { SharedPostPreviewModel } from '../../domain/types/feed.types';

type Props = {
  model: SharedPostPreviewModel;
  mode?: 'feed' | 'story';
  mediaSlot?: React.ReactNode;
  onOpenPost?: (postId: string) => void;
  onOpenPhoto?: (index: number) => void;
  forceMediaFallback?: boolean;
  onAssetSettled?: (url: string) => void;
};

const privacyLabels: Record<SharedPostPreviewModel['privacy'], string> = {
  public: 'Công khai',
  friends: 'Bạn bè',
  followers: 'Người theo dõi',
  only_me: 'Chỉ mình tôi',
};

const attachmentIcons = {
  product: Package,
  event: CalendarDays,
  job: BriefcaseBusiness,
  ad: Megaphone,
} as const;

function formatSourceTime(timestamp?: number) {
  if (!timestamp) return privacyLabels.public;
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  return `${Math.floor(diff / 86400)} ngày`;
}

function SharedPhotoGrid({
  photos,
  onOpenPhoto,
  forceMediaFallback,
  onAssetSettled,
}: {
  photos: string[];
  onOpenPhoto?: (index: number) => void;
  forceMediaFallback?: boolean;
  onAssetSettled?: (url: string) => void;
}) {
  if (photos.length === 0) return null;
  const visible = photos.slice(0, 4);
  const single = visible.length === 1;

  return (
    <View style={[styles.photoGrid, single ? styles.singlePhotoGrid : null]}>
      {visible.map((photo, index) => (
        <Pressable
          key={`${photo}:${index}`}
          onPress={() => onOpenPhoto?.(index)}
          style={single ? styles.singlePhoto : styles.gridPhoto}
        >
          {!forceMediaFallback ? (
            <Image
              source={{ uri: photo }}
              resizeMode="cover"
              style={styles.image}
              onLoad={() => onAssetSettled?.(photo)}
              onError={() => onAssetSettled?.(photo)}
            />
          ) : null}
          {index === 3 && photos.length > 4 ? (
            <View style={styles.moreOverlay}>
              <Text style={styles.moreText}>+{photos.length - 4}</Text>
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}

export function SharedPostPreviewCard({
  model,
  mode = 'feed',
  mediaSlot,
  onOpenPost,
  onOpenPhoto,
  forceMediaFallback = false,
  onAssetSettled,
}: Props) {
  const content = model.content;
  const storyMode = mode === 'story';

  return (
    <View
      testID="shared-post-preview-card"
      style={[styles.card, storyMode ? styles.storyCard : null]}
    >
      <Pressable
        disabled={!onOpenPost}
        onPress={() => onOpenPost?.(model.postId)}
        style={styles.header}
      >
        {model.publisher.avatarUrl && !forceMediaFallback ? (
          <Image
            source={{ uri: model.publisher.avatarUrl }}
            style={styles.avatar}
            onLoad={() => onAssetSettled?.(model.publisher.avatarUrl!)}
            onError={() => onAssetSettled?.(model.publisher.avatarUrl!)}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <Text style={styles.avatarFallbackText}>
              {(model.publisher.name || 'V').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.headerCopy}>
          <Text style={styles.publisherName} numberOfLines={1}>
            {model.publisher.name || 'VNSEEA'}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{formatSourceTime(model.postedAt)}</Text>
            <Text style={styles.metaDot}> · </Text>
            <Globe2 size={12} color="#64748B" />
            <Text style={styles.metaText}> {privacyLabels[model.privacy]}</Text>
          </View>
        </View>
      </Pressable>

      {model.caption ? (
        <Pressable
          disabled={!onOpenPost}
          onPress={() => onOpenPost?.(model.postId)}
          style={styles.captionWrap}
        >
          <Text style={styles.caption}>
            {model.caption}
          </Text>
        </Pressable>
      ) : null}

      {content.kind === 'text' ? (
        <>
          <SharedPhotoGrid
            photos={content.photos}
            onOpenPhoto={onOpenPhoto}
            forceMediaFallback={forceMediaFallback}
            onAssetSettled={onAssetSettled}
          />
          {content.linkPreview ? (
            <Pressable
              disabled={!onOpenPost}
              onPress={() => onOpenPost?.(model.postId)}
              style={styles.linkPreview}
            >
              {content.linkPreview.image && !forceMediaFallback ? (
                <Image
                  source={{ uri: content.linkPreview.image }}
                  style={styles.linkImage}
                  resizeMode="cover"
                  onLoad={() => onAssetSettled?.(content.linkPreview!.image!)}
                  onError={() => onAssetSettled?.(content.linkPreview!.image!)}
                />
              ) : null}
              <Text style={styles.attachmentTitle} numberOfLines={2}>
                {content.linkPreview.title || content.linkPreview.url}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      {content.kind === 'video' ? (
        mediaSlot ?? (
          <Pressable
            disabled={!onOpenPost}
            onPress={() => onOpenPost?.(model.postId)}
            style={styles.videoFallback}
          >
            {content.thumbnailUrl && !forceMediaFallback ? (
              <Image
                source={{ uri: content.thumbnailUrl }}
                style={styles.image}
                resizeMode="cover"
                onLoad={() => onAssetSettled?.(content.thumbnailUrl!)}
                onError={() => onAssetSettled?.(content.thumbnailUrl!)}
              />
            ) : null}
            <View style={styles.playBadge}>
              <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
            </View>
          </Pressable>
        )
      ) : null}

      {content.kind === 'poll' ? (
        <Pressable
          disabled={!onOpenPost}
          onPress={() => onOpenPost?.(model.postId)}
          style={styles.poll}
        >
          <View style={styles.attachmentHeading}>
            <BarChart3 size={18} color="#0000FF" />
            <Text style={styles.attachmentTitle} numberOfLines={2}>
              {content.question}
            </Text>
          </View>
          {content.options.map(option => (
            <View key={option} style={styles.pollOption}>
              <Text style={styles.pollOptionText} numberOfLines={1}>
                {option}
              </Text>
            </View>
          ))}
        </Pressable>
      ) : null}

      {content.kind === 'attachment' ? (
        <Pressable
          disabled={!onOpenPost}
          onPress={() => onOpenPost?.(model.postId)}
          style={styles.attachment}
        >
          {content.imageUrl && !forceMediaFallback ? (
            <Image
              source={{ uri: content.imageUrl }}
              style={styles.attachmentImage}
              resizeMode="cover"
              onLoad={() => onAssetSettled?.(content.imageUrl!)}
              onError={() => onAssetSettled?.(content.imageUrl!)}
            />
          ) : null}
          <View style={styles.attachmentCopy}>
            <View style={styles.attachmentHeading}>
              {React.createElement(attachmentIcons[content.attachmentKind], {
                size: 17,
                color: '#0000FF',
              })}
              <Text style={styles.attachmentTitle} numberOfLines={2}>
                {content.title}
              </Text>
            </View>
            {content.subtitle ? (
              <Text style={styles.attachmentSubtitle} numberOfLines={2}>
                {content.subtitle}
              </Text>
            ) : null}
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  storyCard: {
    width: '100%',
    borderWidth: 0,
  },
  header: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E2E8F0',
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    color: '#475569',
    fontSize: 17,
    fontWeight: '800',
  },
  headerCopy: {
    flex: 1,
    marginLeft: 10,
  },
  publisherName: {
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  metaText: {
    color: '#64748B',
    fontSize: 12,
  },
  metaDot: {
    color: '#94A3B8',
    fontSize: 12,
  },
  captionWrap: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  caption: {
    color: '#0F172A',
    fontSize: 15,
    lineHeight: 21,
  },
  photoGrid: {
    minHeight: 240,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    backgroundColor: '#E2E8F0',
  },
  singlePhotoGrid: {
    aspectRatio: 4 / 3,
  },
  singlePhoto: {
    width: '100%',
    height: '100%',
  },
  gridPhoto: {
    width: '49.7%',
    height: 150,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  moreOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.58)',
  },
  moreText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  videoFallback: {
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  playBadge: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  linkPreview: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    padding: 12,
  },
  linkImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 6,
    marginBottom: 8,
    backgroundColor: '#E2E8F0',
  },
  poll: {
    gap: 8,
    padding: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  pollOption: {
    minHeight: 38,
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
  },
  pollOptionText: {
    color: '#334155',
    fontSize: 13,
    fontWeight: '700',
  },
  attachment: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  attachmentImage: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#E2E8F0',
  },
  attachmentCopy: {
    padding: 14,
  },
  attachmentHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachmentTitle: {
    flex: 1,
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '800',
  },
  attachmentSubtitle: {
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
});
