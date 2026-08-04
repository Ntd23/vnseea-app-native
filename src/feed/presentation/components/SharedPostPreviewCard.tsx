import { APP_BRAND_COLOR } from '../../../shared-kernel/presentation/theme/appColors';
import React from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarDays,
  ChevronRight,
  Eye,
  Globe2,
  Lock,
  MapPin,
  Megaphone,
  Package,
  Play,
  Radio,
  Users,
} from 'lucide-react-native';
import type { SharedPostPreviewModel } from '../../domain/types/feed.types';
import { useAppLanguage } from '../../../shared-kernel/application/hooks/useAppLanguage';
import { buildPostActivityContext } from '../../application/composer/postActivityContext';
import {
  markFeedMediaLoaded,
  useFeedMediaLoaded,
} from '../../application/state/feedMediaLoadState';
import { PostTaggedUsersSheet } from './PostTaggedUsersSheet';

type Props = {
  model: SharedPostPreviewModel;
  mode?: 'feed' | 'story';
  mediaSlot?: React.ReactNode;
  onOpenPost?: (postId: string) => void;
  onOpenPhoto?: (index: number) => void;
  forceMediaFallback?: boolean;
  onAssetSettled?: (url: string) => void;
  mediaEnabled?: boolean;
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

const JOB_ACCENT_COLOR = '#0F766E';

function formatSourceTime(timestamp?: number) {
  if (!timestamp) return privacyLabels.public;
  const diff = Math.max(0, Math.floor(Date.now() / 1000) - timestamp);
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  return `${Math.floor(diff / 86400)} ngày`;
}

function RetainedSharedPreviewImage({
  uri,
  style,
  resizeMode = 'cover',
  mediaEnabled,
  forceMediaFallback,
  onAssetSettled,
}: {
  uri: string;
  style: React.ComponentProps<typeof Image>['style'];
  resizeMode?: React.ComponentProps<typeof Image>['resizeMode'];
  mediaEnabled: boolean;
  forceMediaFallback?: boolean;
  onAssetSettled?: (url: string) => void;
}) {
  const retainedLoaded = useFeedMediaLoaded(uri);
  if (forceMediaFallback || (!mediaEnabled && !retainedLoaded)) return null;

  return (
    <Image
      source={{ uri }}
      resizeMode={resizeMode}
      style={style}
      onLoad={() => {
        markFeedMediaLoaded(uri);
        onAssetSettled?.(uri);
      }}
      onError={() => onAssetSettled?.(uri)}
    />
  );
}

function SharedPhotoGrid({
  photos,
  onOpenPhoto,
  forceMediaFallback,
  onAssetSettled,
  mediaEnabled = true,
}: {
  photos: string[];
  onOpenPhoto?: (index: number) => void;
  forceMediaFallback?: boolean;
  onAssetSettled?: (url: string) => void;
  mediaEnabled?: boolean;
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
          <RetainedSharedPreviewImage
            uri={photo}
            style={styles.image}
            mediaEnabled={mediaEnabled}
            forceMediaFallback={forceMediaFallback}
            onAssetSettled={onAssetSettled}
          />
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
  mediaEnabled = true,
}: Props) {
  const [taggedUsersVisible, setTaggedUsersVisible] = React.useState(false);
  const content = model.content;
  const storyMode = mode === 'story';
  const language = useAppLanguage();
  const productLabel = language === 'vi' ? 'Sản phẩm' : 'Product';
  const viewProductLabel = language === 'vi' ? 'Xem sản phẩm' : 'View product';
  const jobLabel = language === 'vi' ? 'Việc làm' : 'Job';
  const viewJobLabel = language === 'vi' ? 'Xem việc làm' : 'View job';
  const missingJobLocationLabel =
    language === 'vi' ? 'Chưa cập nhật địa điểm' : 'Location not updated';
  const isProductAttachment =
    content.kind === 'attachment' && content.attachmentKind === 'product';
  const isJobAttachment =
    content.kind === 'attachment' && content.attachmentKind === 'job';
  const isCompactAttachment = isProductAttachment || isJobAttachment;
  const compactAttachmentLabel = isJobAttachment ? jobLabel : productLabel;
  const compactAttachmentActionLabel = isJobAttachment
    ? viewJobLabel
    : viewProductLabel;
  const CompactAttachmentIcon = isJobAttachment ? BriefcaseBusiness : Package;
  const compactAttachmentColor = isJobAttachment
    ? JOB_ACCENT_COLOR
    : APP_BRAND_COLOR;
  const groupContext = model.groupContext;
  const GroupPrivacyIcon = groupContext?.privacy === 'private' ? Lock : Globe2;
  const activity = buildPostActivityContext({
    language,
    feeling: model.feeling,
    taggedUsers: model.taggedUsers,
    location: model.location,
  });
  const isLiveContent = content.kind === 'live';
  const liveEnded = isLiveContent && content.state === 'offline';
  const liveTitle = isLiveContent
    ? content.title ||
      (language === 'vi'
        ? `${model.publisher.name || 'VNSEEA'} đang phát trực tiếp`
        : `${model.publisher.name || 'VNSEEA'} is live`)
    : '';
  const handleOpenPost = () => {
    if (liveEnded) {
      Alert.alert(
        language === 'vi' ? 'Phiên live đã kết thúc' : 'Live has ended',
        language === 'vi'
          ? 'Bạn không thể tham gia phiên live này nữa.'
          : 'You can no longer join this live session.',
      );
      return;
    }
    onOpenPost?.(model.postId);
  };

  return (
    <View
      testID="shared-post-preview-card"
      style={[styles.card, storyMode ? styles.storyCard : null]}
    >
      <Pressable
        disabled={!onOpenPost}
        onPress={handleOpenPost}
        style={styles.header}
      >
        {groupContext ? (
          <View style={styles.groupAvatarWrap}>
            {groupContext.avatarUrl && !forceMediaFallback ? (
              <Image
                source={{ uri: groupContext.avatarUrl }}
                style={styles.groupAvatar}
                onLoad={() => {
                  markFeedMediaLoaded(groupContext.avatarUrl);
                  onAssetSettled?.(groupContext.avatarUrl!);
                }}
                onError={() => onAssetSettled?.(groupContext.avatarUrl!)}
              />
            ) : (
              <View style={[styles.groupAvatar, styles.groupAvatarFallback]}>
                <Users size={20} color="#B91C1C" />
              </View>
            )}

            {model.publisher.avatarUrl && !forceMediaFallback ? (
              <Image
                source={{ uri: model.publisher.avatarUrl }}
                style={styles.publisherAvatarOverlay}
                onLoad={() => {
                  markFeedMediaLoaded(model.publisher.avatarUrl);
                  onAssetSettled?.(model.publisher.avatarUrl!);
                }}
                onError={() => onAssetSettled?.(model.publisher.avatarUrl!)}
              />
            ) : null}
          </View>
        ) : model.publisher.avatarUrl && !forceMediaFallback ? (
          <Image
            source={{ uri: model.publisher.avatarUrl }}
            style={styles.avatar}
            onLoad={() => {
              markFeedMediaLoaded(model.publisher.avatarUrl);
              onAssetSettled?.(model.publisher.avatarUrl!);
            }}
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
          {groupContext ? (
            <>
              <Text style={styles.groupTitle} numberOfLines={1}>
                {groupContext.title}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.groupPublisherName} numberOfLines={1}>
                  {model.publisher.name || 'VNSEEA'}
                </Text>
                <Text style={styles.metaDot}> · </Text>
                <Text style={styles.metaText}>
                  {formatSourceTime(model.postedAt)}
                </Text>
                <Text style={styles.metaDot}> · </Text>
                <GroupPrivacyIcon size={12} color="#64748B" />
              </View>
            </>
          ) : (
            <>
              <Text
                style={styles.publisherName}
                numberOfLines={activity.fullText ? 2 : 1}
              >
                <Text style={styles.publisherNameStrong}>
                  {model.publisher.name || 'VNSEEA'}
                </Text>
                {activity.fullText ? (
                  <>
                    {' '}
                    {activity.segments.map((segment, index) => {
                      const isEmphasized =
                        segment.kind === 'feeling' ||
                        segment.kind === 'location' ||
                        segment.kind === 'tagged_users';
                      return (
                        <Text
                          key={`${segment.kind}:${index}`}
                          style={
                            isEmphasized
                              ? styles.publisherActivityStrong
                              : styles.publisherActivity
                          }
                          onPress={
                            segment.kind === 'tagged_users'
                              ? () => setTaggedUsersVisible(true)
                              : undefined
                          }
                        >
                          {segment.text}
                        </Text>
                      );
                    })}
                  </>
                ) : null}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  {formatSourceTime(model.postedAt)}
                </Text>
                <Text style={styles.metaDot}> · </Text>
                <Globe2 size={12} color="#64748B" />
                <Text style={styles.metaText}>
                  {' '}
                  {privacyLabels[model.privacy]}
                </Text>
              </View>
            </>
          )}
        </View>
      </Pressable>

      {model.caption && !isLiveContent ? (
        <Pressable
          disabled={!onOpenPost}
          onPress={handleOpenPost}
          style={styles.captionWrap}
        >
          <Text style={styles.caption}>{model.caption}</Text>
        </Pressable>
      ) : null}

      {content.kind === 'text' ? (
        <>
          <SharedPhotoGrid
            photos={content.photos}
            onOpenPhoto={onOpenPhoto}
            forceMediaFallback={forceMediaFallback}
            onAssetSettled={onAssetSettled}
            mediaEnabled={mediaEnabled}
          />
          {content.linkPreview ? (
            <Pressable
              disabled={!onOpenPost}
              onPress={handleOpenPost}
              style={styles.linkPreview}
            >
              {content.linkPreview.image ? (
                <RetainedSharedPreviewImage
                  uri={content.linkPreview.image}
                  style={styles.linkImage}
                  mediaEnabled={mediaEnabled}
                  forceMediaFallback={forceMediaFallback}
                  onAssetSettled={onAssetSettled}
                />
              ) : null}
              <Text style={styles.attachmentTitle} numberOfLines={2}>
                {content.linkPreview.title || content.linkPreview.url}
              </Text>
            </Pressable>
          ) : null}
        </>
      ) : null}

      {isLiveContent ? (
        <Pressable
          disabled={!onOpenPost}
          onPress={handleOpenPost}
          style={styles.liveCard}
          accessibilityRole="button"
          accessibilityLabel={
            liveEnded
              ? language === 'vi'
                ? 'Phiên live đã kết thúc'
                : 'Live has ended'
              : language === 'vi'
                ? 'Xem trực tiếp'
                : 'Watch live'
          }
        >
          <View style={styles.liveMedia}>
            {content.thumbnailUrl ? (
              <RetainedSharedPreviewImage
                uri={content.thumbnailUrl}
                style={styles.image}
                mediaEnabled={mediaEnabled}
                forceMediaFallback={forceMediaFallback}
                onAssetSettled={onAssetSettled}
              />
            ) : (
              <View style={styles.liveMediaFallback}>
                <Radio size={44} color="#FFFFFF" strokeWidth={1.9} />
              </View>
            )}
            <View style={styles.liveShade} />
            <View
              style={[
                styles.liveStateBadge,
                liveEnded ? styles.liveEndedBadge : null,
              ]}
            >
              <View
                style={[
                  styles.livePulse,
                  liveEnded ? styles.liveEndedPulse : null,
                ]}
              />
              <Text style={styles.liveStateText}>
                {liveEnded
                  ? language === 'vi'
                    ? 'ĐÃ KẾT THÚC'
                    : 'ENDED'
                  : language === 'vi'
                    ? 'TRỰC TIẾP'
                    : 'LIVE'}
              </Text>
            </View>
            {!liveEnded && content.viewerCount !== undefined ? (
              <View style={styles.liveViewerBadge}>
                <Eye size={13} color="#FFFFFF" />
                <Text style={styles.liveViewerText}>
                  {Math.max(0, content.viewerCount).toLocaleString()}
                </Text>
              </View>
            ) : null}
            <View
              style={[
                styles.livePlayBadge,
                liveEnded ? styles.livePlayBadgeEnded : null,
              ]}
            >
              {liveEnded ? (
                <Radio size={25} color="#FFFFFF" />
              ) : (
                <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
              )}
            </View>
          </View>
          <View style={styles.liveCopy}>
            <Text style={styles.liveTitle} numberOfLines={2}>
              {liveTitle}
            </Text>
            {content.description ? (
              <Text style={styles.liveDescription} numberOfLines={2}>
                {content.description}
              </Text>
            ) : null}
            <View style={styles.liveFooter}>
              <View
                style={[
                  styles.liveFooterIcon,
                  liveEnded ? styles.liveFooterIconEnded : null,
                ]}
              >
                <Radio
                  size={15}
                  color={liveEnded ? '#64748B' : '#DC2626'}
                />
              </View>
              <Text
                style={[
                  styles.liveFooterText,
                  liveEnded ? styles.liveFooterTextEnded : null,
                ]}
              >
                {liveEnded
                  ? language === 'vi'
                    ? 'Phiên live đã kết thúc'
                    : 'This live has ended'
                  : language === 'vi'
                    ? 'Nhấn để xem trực tiếp'
                    : 'Tap to watch live'}
              </Text>
              <ChevronRight
                size={17}
                color={liveEnded ? '#94A3B8' : '#DC2626'}
              />
            </View>
          </View>
        </Pressable>
      ) : null}

      {content.kind === 'video'
        ? mediaSlot ?? (
            <Pressable
              disabled={!onOpenPost}
              onPress={handleOpenPost}
              style={styles.videoFallback}
            >
              {content.thumbnailUrl ? (
                <RetainedSharedPreviewImage
                  uri={content.thumbnailUrl}
                  style={styles.image}
                  mediaEnabled={mediaEnabled}
                  forceMediaFallback={forceMediaFallback}
                  onAssetSettled={onAssetSettled}
                />
              ) : null}
              <View style={styles.playBadge}>
                <Play size={24} color="#FFFFFF" fill="#FFFFFF" />
              </View>
            </Pressable>
          )
        : null}

      {content.kind === 'poll' ? (
        <Pressable
          disabled={!onOpenPost}
          onPress={handleOpenPost}
          style={styles.poll}
        >
          <View style={styles.attachmentHeading}>
            <BarChart3 size={18} color={APP_BRAND_COLOR} />
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
          onPress={handleOpenPost}
          style={[
            styles.attachment,
            isCompactAttachment ? styles.productAttachment : null,
          ]}
        >
          {isCompactAttachment ? (
            <>
              <View style={styles.productMedia}>
                <View style={styles.productMediaFallback}>
                  <CompactAttachmentIcon size={34} color="#94A3B8" />
                </View>
                {content.imageUrl ? (
                  <RetainedSharedPreviewImage
                    uri={content.imageUrl}
                    style={styles.productImage}
                    mediaEnabled={mediaEnabled}
                    forceMediaFallback={forceMediaFallback}
                    onAssetSettled={onAssetSettled}
                  />
                ) : null}
              </View>
              <View style={styles.productCopy}>
                <View
                  style={[
                    styles.productBadge,
                    isJobAttachment ? styles.jobBadge : null,
                  ]}
                >
                  <CompactAttachmentIcon
                    size={13}
                    color={compactAttachmentColor}
                  />
                  <Text
                    style={[
                      styles.productBadgeText,
                      isJobAttachment ? styles.jobAccentText : null,
                    ]}
                  >
                    {compactAttachmentLabel}
                  </Text>
                </View>
                <Text style={styles.productTitle} numberOfLines={2}>
                  {content.title}
                </Text>
                {isJobAttachment ? (
                  <View style={styles.jobLocation}>
                    <MapPin size={14} color="#64748B" />
                    <Text style={styles.jobLocationText} numberOfLines={2}>
                      {content.subtitle || missingJobLocationLabel}
                    </Text>
                  </View>
                ) : content.subtitle ? (
                  <Text
                    style={styles.productPrice}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.75}
                  >
                    {content.subtitle}
                  </Text>
                ) : null}
                <View style={styles.productAction}>
                  <Text
                    style={[
                      styles.productActionText,
                      isJobAttachment ? styles.jobAccentText : null,
                    ]}
                    numberOfLines={1}
                  >
                    {compactAttachmentActionLabel}
                  </Text>
                  <ChevronRight size={15} color={compactAttachmentColor} />
                </View>
              </View>
            </>
          ) : (
            <>
              {content.imageUrl ? (
                <RetainedSharedPreviewImage
                  uri={content.imageUrl}
                  style={styles.attachmentImage}
                  mediaEnabled={mediaEnabled}
                  forceMediaFallback={forceMediaFallback}
                  onAssetSettled={onAssetSettled}
                />
              ) : null}
              <View style={styles.attachmentCopy}>
                <View style={styles.attachmentHeading}>
                  {React.createElement(
                    attachmentIcons[content.attachmentKind],
                    {
                      size: 17,
                      color: APP_BRAND_COLOR,
                    },
                  )}
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
            </>
          )}
        </Pressable>
      ) : null}
      <PostTaggedUsersSheet
        visible={taggedUsersVisible}
        users={model.taggedUsers ?? []}
        onClose={() => setTaggedUsersVisible(false)}
      />
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
  groupAvatarWrap: {
    position: 'relative',
    width: 46,
    height: 46,
  },
  groupAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },
  groupAvatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  publisherAvatarOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#E2E8F0',
  },
  headerCopy: {
    flex: 1,
    marginLeft: 10,
  },
  groupTitle: {
    color: '#0F172A',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  groupPublisherName: {
    maxWidth: '48%',
    color: '#475569',
    fontSize: 12,
    fontWeight: '600',
  },
  publisherName: {
    color: '#0F172A',
    fontSize: 15,
    lineHeight: 20,
  },
  publisherNameStrong: {
    fontWeight: '800',
  },
  publisherActivity: {
    color: '#64748B',
    fontWeight: '500',
  },
  publisherActivityStrong: {
    color: '#0F172A',
    fontWeight: '700',
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
  liveCard: {
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  liveMedia: {
    position: 'relative',
    aspectRatio: 16 / 9,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#0F172A',
  },
  liveMediaFallback: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
  },
  liveShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(2,6,23,0.28)',
  },
  liveStateBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#DC2626',
  },
  liveEndedBadge: {
    backgroundColor: 'rgba(51,65,85,0.94)',
  },
  livePulse: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  liveEndedPulse: {
    backgroundColor: '#CBD5E1',
  },
  liveStateText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.45,
  },
  liveViewerBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: 'rgba(15,23,42,0.76)',
  },
  liveViewerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  livePlayBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.88)',
    backgroundColor: 'rgba(220,38,38,0.88)',
  },
  livePlayBadgeEnded: {
    backgroundColor: 'rgba(51,65,85,0.86)',
  },
  liveCopy: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 13,
  },
  liveTitle: {
    color: '#0F172A',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '900',
  },
  liveDescription: {
    marginTop: 4,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
  },
  liveFooter: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 11,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  liveFooterIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  liveFooterIconEnded: {
    backgroundColor: '#F1F5F9',
  },
  liveFooterText: {
    flex: 1,
    marginLeft: 8,
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '800',
  },
  liveFooterTextEnded: {
    color: '#64748B',
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
    width: '100%',
    minWidth: 0,
    overflow: 'hidden',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  productAttachment: {
    minHeight: 146,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 12,
    padding: 10,
    backgroundColor: '#F8FAFC',
  },
  productMedia: {
    width: 126,
    minHeight: 126,
    overflow: 'hidden',
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
  productMediaFallback: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#E2E8F0',
  },
  productCopy: {
    minWidth: 0,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  productBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEF2F2',
  },
  productBadgeText: {
    color: APP_BRAND_COLOR,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
  },
  jobBadge: {
    backgroundColor: '#ECFDF5',
  },
  jobAccentText: {
    color: JOB_ACCENT_COLOR,
  },
  productTitle: {
    flexShrink: 1,
    marginTop: 8,
    color: '#0F172A',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  jobLocation: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
    marginTop: 6,
  },
  jobLocationText: {
    flex: 1,
    minWidth: 0,
    color: '#64748B',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  productPrice: {
    flexShrink: 1,
    marginTop: 5,
    color: APP_BRAND_COLOR,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  productAction: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 8,
  },
  productActionText: {
    flexShrink: 1,
    color: APP_BRAND_COLOR,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
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
